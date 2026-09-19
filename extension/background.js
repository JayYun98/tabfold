import { buildPreview, isEligible, sameSnapshot, validGroupColor } from './core.js';
import { classifyTabs } from './ai.js';

const UNDO_KEY = 'tabfoldUndo';
const RECOVERY_KEY = 'tabfoldRecovery';
const PREVIEW_KEY = 'tabfoldPreview';
const KEY_NAME = 'openrouterKey';
const STALE = '탭 상태가 바뀌어 계획을 다시 만드세요.';

function message(ok, text, extra = {}) {
  return ok ? { ok: true, message: text, ...extra } : { ok: false, error: text };
}

function safeTitle(title) {
  return typeof title === 'string' && title.trim() ? title.trim().slice(0, 80) : '정리한 탭';
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export class TabfoldBackend {
  constructor(chromeApi = globalThis.chrome) {
    this.chrome = chromeApi;
    this.memory = {};
    this.mutations = Promise.resolve();
  }

  async read(key, area = 'session') {
    const storage = this.chrome?.storage?.[area];
    if (!storage) return this.memory[`${area}:${key}`];
    const value = await storage.get(key);
    return value[key];
  }

  async write(key, value, area = 'session') {
    const storage = this.chrome?.storage?.[area];
    if (!storage) {
      this.memory[`${area}:${key}`] = value;
      return;
    }
    await storage.set({ [key]: value });
  }

  async remove(key, area = 'session') {
    const storage = this.chrome?.storage?.[area];
    if (!storage) {
      delete this.memory[`${area}:${key}`];
      return;
    }
    await storage.remove(key);
  }

  async preview(request) {
    const tabs = await this.chrome.tabs.query({});
    const key = await this.read(KEY_NAME);
    let classifications;
    if (request.ai) {
      if (!key) return message(false, 'AI 분류를 사용하려면 API 키를 먼저 저장하세요.');
      const selectedEligible = tabs.filter((tab) => (request.allWindows || request.windowId === undefined || tab.windowId === request.windowId) && isEligible(tab));
      try {
        classifications = await classifyTabs(selectedEligible, key);
      } catch (error) {
        return message(false, error?.message || 'AI 분류를 완료하지 못했습니다.');
      }
    }
    const plan = buildPreview(tabs, request, classifications);
    await this.write(PREVIEW_KEY, { plan });
    const undo = await this.read(UNDO_KEY);
    return { ok: true, plan, undoAvailable: Boolean(undo?.groups?.length), keyConfigured: Boolean(key) };
  }

  async setKey(key) {
    if (typeof key !== 'string') return message(false, 'API 키 형식이 올바르지 않습니다.');
    if (key.trim()) await this.write(KEY_NAME, key.trim());
    else await this.remove(KEY_NAME);
    return { ok: true, keyConfigured: Boolean(key.trim()) };
  }

  mutate(work) {
    const next = this.mutations.then(work, work);
    this.mutations = next.catch(() => undefined);
    return next;
  }

  async validateGroups(plan) {
    if (!plan || !Array.isArray(plan.groups)) return null;
    const seen = new Set();
    const valid = [];
    for (const group of plan.groups) {
      if (!Number.isInteger(group?.windowId) || !Array.isArray(group.tabs) || group.tabs.length < 2 || !Array.isArray(group.tabIds)) return null;
      const ids = group.tabs.map((tab) => tab?.id);
      if (ids.length !== group.tabIds.length || ids.some((id, index) => id !== group.tabIds[index])) return null;
      const fresh = [];
      for (const snapshot of group.tabs) {
        if (!Number.isInteger(snapshot?.id) || seen.has(snapshot.id)) return null;
        let tab;
        try {
          tab = await this.chrome.tabs.get(snapshot.id);
        } catch {
          return null;
        }
        if (!sameSnapshot(tab, snapshot) || tab.windowId !== group.windowId || !isEligible(tab)) return null;
        seen.add(tab.id);
        fresh.push(tab);
      }
      valid.push({ ...group, tabs: fresh, tabIds: fresh.map((tab) => tab.id) });
    }
    return valid;
  }

  async matchesSavedPreview(plan) {
    const saved = await this.read(PREVIEW_KEY);
    return Boolean(saved?.plan && stableJson(saved.plan) === stableJson(plan));
  }

  async revalidateGroup(group) {
    for (const snapshot of group.tabs) {
      try {
        const tab = await this.chrome.tabs.get(snapshot.id);
        if (!sameSnapshot(tab, snapshot) || tab.windowId !== group.windowId || !isEligible(tab)) return false;
      } catch {
        return false;
      }
    }
    return true;
  }

  async apply(plan, collapse = true) {
    if (!await this.matchesSavedPreview(plan)) return message(false, STALE);
    const groups = await this.validateGroups(plan);
    if (!groups) return message(false, STALE);
    if (!groups.length) return message(true, '정리할 탭 그룹이 없습니다.', { undoAvailable: false });

    // Persist the pre-mutation state before chrome.tabs.group can change it.
    const undo = { groups: [], tabs: groups.flatMap((group) => group.tabs.map((tab) => ({ id: tab.id, windowId: tab.windowId, groupId: tab.groupId }))) };
    await this.write(UNDO_KEY, undo);
    try {
      for (const group of groups) {
        if (!await this.revalidateGroup(group)) return message(false, STALE);
        const groupId = await this.chrome.tabs.group({ tabIds: group.tabIds, createProperties: { windowId: group.windowId } });
        const created = { groupId, tabIds: group.tabIds, windowId: group.windowId, title: safeTitle(group.title), color: validGroupColor(group.color) };
        undo.groups.push(created);
        await this.write(UNDO_KEY, undo);
        await this.chrome.tabGroups.update(groupId, { title: created.title, color: created.color, collapsed: Boolean(collapse) });
      }
      return message(true, `${groups.length}개 그룹으로 탭을 정리했습니다.`, { undoAvailable: true });
    } catch {
      return message(false, '탭 그룹을 만드는 중 문제가 생겼습니다.');
    }
  }

  async undo() {
    const undo = await this.read(UNDO_KEY);
    if (!undo?.groups?.length) return message(true, '되돌릴 Tabfold 정리가 없습니다.', { undoAvailable: false });
    let ungrouped = 0;
    for (const group of undo.groups) {
      let currentGroup;
      try {
        currentGroup = await this.chrome.tabGroups.get(group.groupId);
      } catch {
        continue;
      }
      // A renamed/recoloured group is a user edit; leave it alone.
      if (currentGroup.title !== group.title || currentGroup.color !== group.color) continue;
      const ids = [];
      for (const id of group.tabIds) {
        try {
          const tab = await this.chrome.tabs.get(id);
          if (tab.groupId === group.groupId) ids.push(id);
        } catch {
          // Closed tabs need no action.
        }
      }
      if (ids.length) {
        await this.chrome.tabs.ungroup(ids);
        ungrouped += ids.length;
      }
    }
    await this.write(UNDO_KEY, { groups: [], tabs: [] });
    return message(true, `${ungrouped}개 탭의 Tabfold 그룹을 되돌렸습니다.`, { undoAvailable: false });
  }

  async validateDedupe(plan) {
    const candidates = plan?.duplicates;
    if (!Array.isArray(candidates)) return null;
    const ids = new Set();
    const fresh = await this.chrome.tabs.query({});
    for (const snapshot of candidates) {
      if (!Number.isInteger(snapshot?.id) || ids.has(snapshot.id)) return null;
      let tab;
      try {
        tab = await this.chrome.tabs.get(snapshot.id);
      } catch {
        return null;
      }
      if (!sameSnapshot(tab, snapshot) || !isEligible(tab) || tab.active) return null;
      ids.add(tab.id);
    }
    for (const snapshot of candidates) {
      const survivor = fresh.find((tab) => tab.id !== snapshot.id && !ids.has(tab.id) && tab.windowId === snapshot.windowId && tab.url === snapshot.url);
      if (!survivor) return null;
    }
    return candidates;
  }

  async dedupe(plan) {
    const duplicates = await this.validateDedupe(plan);
    if (!duplicates) return message(false, STALE);
    if (!duplicates.length) return message(true, '닫을 중복 탭이 없습니다.');
    const recovery = { entries: duplicates.map((tab) => ({ url: tab.url, windowId: tab.windowId, closed: false })) };
    await this.write(RECOVERY_KEY, recovery, 'local');
    let closed = 0;
    const candidateIds = new Set(duplicates.map((tab) => tab.id));
    for (let index = 0; index < duplicates.length; index += 1) {
      try {
        const current = await this.chrome.tabs.get(duplicates[index].id);
        if (!sameSnapshot(current, duplicates[index]) || !isEligible(current) || current.active) continue;
        const currentTabs = await this.chrome.tabs.query({});
        const survivor = currentTabs.find((tab) => tab.id !== current.id && !candidateIds.has(tab.id) && tab.windowId === current.windowId && tab.url === current.url);
        if (!survivor) continue;
        await this.chrome.tabs.remove(duplicates[index].id);
        recovery.entries[index].closed = true;
        closed += 1;
        await this.write(RECOVERY_KEY, recovery, 'local');
      } catch {
        // The tab remains open; its URL was still persisted before this attempt.
      }
    }
    return message(true, `${closed}개 중복 탭을 닫았습니다.`);
  }

  async restore() {
    const recovery = await this.read(RECOVERY_KEY, 'local');
    const entries = recovery?.entries?.filter((entry) => entry.closed && typeof entry.url === 'string') || [];
    if (!entries.length) return message(true, '복원할 탭이 없습니다.');
    let restored = 0;
    for (const entry of [...entries]) {
      try {
        try {
          await this.chrome.tabs.create({ url: entry.url, windowId: entry.windowId });
        } catch {
          await this.chrome.tabs.create({ url: entry.url });
        }
        restored += 1;
        recovery.entries.splice(recovery.entries.indexOf(entry), 1);
        await this.write(RECOVERY_KEY, recovery, 'local');
      } catch {
        // Keep only URLs that still need recovery.
      }
    }
    return message(true, `${restored}개 탭을 복원했습니다.`);
  }

  async handle(request = {}) {
    try {
      if (request.type === 'preview') return await this.preview(request);
      if (request.type === 'setKey') return await this.setKey(request.key);
      if (request.type === 'apply') return await this.mutate(() => this.apply(request.plan, request.collapse));
      if (request.type === 'undo') return await this.mutate(() => this.undo());
      if (request.type === 'dedupe') return await this.mutate(() => this.dedupe(request.plan));
      if (request.type === 'restore') return await this.mutate(() => this.restore());
      return message(false, '알 수 없는 요청입니다.');
    } catch {
      return message(false, '탭 정보를 읽는 중 문제가 생겼습니다.');
    }
  }
}

if (globalThis.chrome?.runtime?.onMessage) {
  const backend = new TabfoldBackend(globalThis.chrome);
  globalThis.chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    backend.handle(request).then(sendResponse);
    return true;
  });
}
