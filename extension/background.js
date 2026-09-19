import { t, initI18n } from './i18n.js';
import { buildPreview, isEligible, sameSnapshot, validGroupColor } from './core.js';
import { classifyTabs, DEFAULT_CATEGORIES, validateCategories, getProvider } from './ai.js';

const UNDO_KEY = 'tabfoldUndo';
const RECOVERY_KEY = 'tabfoldRecovery';
const PREVIEW_KEY = 'tabfoldPreview';
const STALE = 'Tabs have changed. Refresh the preview.';

function message(ok, text, extra = {}) {
  return ok ? { ok: true, message: text, ...extra } : { ok: false, error: text };
}

function safeTitle(title) {
  return typeof title === 'string' && title.trim() ? title.trim().slice(0, 80) : t('Organized tabs');
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
    const provider = getProvider(request.provider ?? await this.provider());
    const key = await this.read(provider.keyName);
    let classifications;
    if (request.ai) {
      if (!key) return message(false, t('Save your API key before using AI classification.'));
      const selectedEligible = tabs.filter((tab) => (request.allWindows || request.windowId === undefined || tab.windowId === request.windowId) && isEligible(tab));
      try {
        classifications = await classifyTabs(selectedEligible, key, fetch, {provider:provider.id, categories: await this.categories(), suggestNew: request.suggestNew !== false});
      } catch (error) {
        return message(false, error?.message || t('Unable to complete AI classification.'));
      }
    }
    if (classifications?.suggestions) {
      for (const suggestion of classifications.suggestions) {
        suggestion.tabs = tabs.filter(t => suggestion.tabIds.includes(t.id)).map(({id,title,url})=>({id,title,url}));
      }
    }
    const plan = buildPreview(tabs, request, classifications);
    await this.write(PREVIEW_KEY, { plan, suggestions: classifications?.suggestions || [], tabs: tabs.filter(isEligible).map(({id,title,url,windowId})=>({id,title,url,windowId})), categories: await this.categories() });
    const undo = await this.read(UNDO_KEY);
    return { ok: true, plan, undoAvailable: Boolean(undo?.groups?.length), keyConfigured: Boolean(key), suggestions: classifications?.suggestions || [], suggestionError: classifications?.suggestionError || '', otherCount: classifications?.otherCount || 0 };
  }

  async categories() {
    return validateCategories(await this.read('tabfoldCategories', 'local') || DEFAULT_CATEGORIES);
  }

  async setCategories(value) {
    const categories = validateCategories(value);
    await this.write('tabfoldCategories', categories, 'local');
    await this.remove(PREVIEW_KEY);
    return {ok: true, categories};
  }

  async acceptSuggestion(request) {
    if (!await this.matchesSavedPreview(request.plan)) return message(false, t(STALE));
    const saved = await this.read(PREVIEW_KEY);
    if (!Number.isInteger(request.index)) return message(false, t('Refresh the suggestions and try again.'));
    const suggestion = saved.suggestions?.[request.index];
    if (!suggestion) return message(false, t('Refresh the suggestions and try again.'));
    const categories = await this.categories();
    if (stableJson(categories) !== stableJson(saved.categories)) return message(false, t('Categories have changed. Refresh the preview.'));
    const next = validateCategories([...categories, {title: request.title, criteria: suggestion.criteria, color: suggestion.color}]);
    const category = next.at(-1);
    const ids = new Set(suggestion.tabIds);
    const candidateTabs = saved.tabs.filter(t => ids.has(t.id));
    const replacements = new Map(candidateTabs.map(t => [t.id, category]));
    const added = buildPreview(candidateTabs, {allWindows:true}, replacements).groups;
    if (!added.length || !await this.validateGroups({groups:added})) return message(false, t(STALE));
    const remaining = saved.plan.groups.map(group => {
      const tabs = group.tabs.filter(t => !ids.has(t.id));
      return {...group, tabs, tabIds: tabs.map(t => t.id)};
    }).filter(g => g.tabs.length >= 2);
    const plan = {...saved.plan, groups:[...remaining, ...added]};
    const suggestions = saved.suggestions.filter((_, index) => index !== request.index);
    await this.write('tabfoldCategories', next, 'local');
    await this.write(PREVIEW_KEY, {...saved, plan, suggestions, categories:next});
    return {ok:true, plan, suggestions, categories:next};
  }

  async provider() { return getProvider(await this.read('tabfoldProvider','local') || 'openrouter').id; }

  async setProvider(id) {
    const provider=getProvider(id);
    await this.write('tabfoldProvider',provider.id,'local');
    await this.remove(PREVIEW_KEY);
    return {ok:true,provider:provider.id,keyConfigured:Boolean(await this.read(provider.keyName))};
  }

  async setKey(key, id) {
    const provider=getProvider(id ?? await this.provider());
    if (typeof key !== 'string') return message(false, t('Invalid API key format.'));
    if (key.trim()) await this.write(provider.keyName, key.trim());
    else await this.remove(provider.keyName);
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
    if (!await this.matchesSavedPreview(plan)) return message(false, t(STALE));
    const groups = await this.validateGroups(plan);
    if (!groups) return message(false, t(STALE));
    if (!groups.length) return message(true, t('No tab groups to organize.'), { undoAvailable: false });

    // Persist the pre-mutation state before chrome.tabs.group can change it.
    const undo = { groups: [], tabs: groups.flatMap((group) => group.tabs.map((tab) => ({ id: tab.id, windowId: tab.windowId, groupId: tab.groupId }))) };
    await this.write(UNDO_KEY, undo);
    try {
      for (const group of groups) {
        if (!await this.revalidateGroup(group)) return message(false, t(STALE));
        const groupId = await this.chrome.tabs.group({ tabIds: group.tabIds, createProperties: { windowId: group.windowId } });
        const created = { groupId, tabIds: group.tabIds, windowId: group.windowId, title: safeTitle(group.title), color: validGroupColor(group.color) };
        undo.groups.push(created);
        await this.write(UNDO_KEY, undo);
        await this.chrome.tabGroups.update(groupId, { title: created.title, color: created.color, collapsed: Boolean(collapse) });
      }
      return message(true, t('Organized tabs into {count} groups.', { count: groups.length }), { undoAvailable: true });
    } catch {
      return message(false, t('Unable to create tab groups.'));
    }
  }

  async undo() {
    const undo = await this.read(UNDO_KEY);
    if (!undo?.groups?.length) return message(true, t('No Tabfold grouping to undo.'), { undoAvailable: false });
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
    return message(true, t('Undid grouping for {count} tabs.', { count: ungrouped }), { undoAvailable: false });
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
    if (!duplicates) return message(false, t(STALE));
    if (!duplicates.length) return message(true, t('No duplicate tabs to close.'));
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
    return message(true, t('Closed {count} duplicate tabs.', { count: closed }));
  }

  async restore() {
    const recovery = await this.read(RECOVERY_KEY, 'local');
    const entries = recovery?.entries?.filter((entry) => entry.closed && typeof entry.url === 'string') || [];
    if (!entries.length) return message(true, t('No tabs to restore.'));
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
    return message(true, t('Restored {count} tabs.', { count: restored }));
  }

  async handle(request = {}) {
    try {
      await initI18n();
      if (request.type === 'getSettings') { const provider=getProvider(await this.provider()); return { ok: true, provider:provider.id, keyConfigured:Boolean(await this.read(provider.keyName)), categories:await this.categories(), preferences:await this.read('tabfoldPreferences','local') || {suggestNew:true} }; }
      if (request.type === 'setProvider') return await this.mutate(() => this.setProvider(request.provider));
      if (request.type === 'preview') return await this.preview(request);
      if (request.type === 'getCategories') return {ok:true, categories:await this.categories()};
      if (request.type === 'setCategories') return await this.mutate(() => this.setCategories(request.categories));
      if (request.type === 'acceptSuggestion') return await this.mutate(() => this.acceptSuggestion(request));
      if (request.type === 'setKey') return await this.setKey(request.key, request.provider);
      if (request.type === 'apply') return await this.mutate(() => this.apply(request.plan, request.collapse));
      if (request.type === 'undo') return await this.mutate(() => this.undo());
      if (request.type === 'dedupe') return await this.mutate(() => this.dedupe(request.plan));
      if (request.type === 'restore') return await this.mutate(() => this.restore());
      return message(false, t('Unknown request.'));
    } catch (error) {
      return message(false, error.message || t('Unable to read tab information.'));
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
