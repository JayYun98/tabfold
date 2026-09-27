import { clusterTabs } from './clustering.js';
import { t, initI18n } from './i18n.js';
import { buildPreview, isEligible, sameSnapshot, validGroupColor, validateTabOrder, validateGroupingMode } from './core.js';
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
    this.previewGeneration = 0;
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
    if (key === PREVIEW_KEY) this.previewGeneration += 1;
    const storage = this.chrome?.storage?.[area];
    if (!storage) {
      delete this.memory[`${area}:${key}`];
      return;
    }
    await storage.remove(key);
  }

  async preview(request) {
    const generation = ++this.previewGeneration;
    const tabs = await this.chrome.tabs.query({});
    const privateWindows = new Set(tabs.filter(tab=>tab.incognito).map(tab=>tab.windowId));
    const existingGroups = (await this.chrome.tabGroups.query({})).filter(group=>!privateWindows.has(group.windowId));
    const availableGroups = existingGroups.map(group=>({...group,tabs:tabs.filter(tab=>tab.groupId===group.id && tab.windowId===group.windowId)}));
    const tabOrder=validateTabOrder(await this.read('tabfoldTabOrder','local'));
    const groupingMode=validateGroupingMode(await this.read('tabfoldGroupingMode','local'));
    const regroup=groupingMode==='regroup';
    const preferences=await this.preferences();
    const contextGroups=preferences.useExistingGroups ? availableGroups : [];
    const initial = buildPreview(tabs, {...request,tabOrder,existingGroups,groupingMode});
    const selectedEligible = tabs.filter(tab => (request.allWindows || request.windowId === undefined || tab.windowId === request.windowId) && isEligible(tab,{regroup}));
    const provider = getProvider(request.provider ?? await this.provider());
    const key = await this.read(provider.keyName);
    let classifications = request.ai ? undefined : clusterTabs(selectedEligible,{existingGroups:contextGroups,regroup});
    if (request.ai) {
      if (!key) return message(false, t('Save your API key before using AI classification.'));
      try {
        classifications = await classifyTabs(selectedEligible, key, fetch, {provider:provider.id, categories: await this.categories(), existingGroups:contextGroups, regroup, suggestNew:preferences.suggestNew, ignoreCategories:preferences.ignoreCategories});
      } catch (error) {
        return message(false, error?.message || t('Unable to complete AI classification.'));
      }
    }
    if (classifications?.suggestions) {
      for (const suggestion of classifications.suggestions) {
        suggestion.tabs = tabs.filter(t => suggestion.tabIds.includes(t.id)).map(({id,title,url})=>({id,title,url}));
      }
    }
    const plan = classifications ? buildPreview(tabs, {...request,tabOrder,existingGroups,groupingMode}, classifications) : initial;
    plan.preferences=preferences;
    // Serialize only the short commit with settings mutations, never the AI request.
    return this.mutate(async () => {
      const categories = await this.categories();
      const undo = await this.read(UNDO_KEY);
      if (generation !== this.previewGeneration) return message(false, t(STALE));
      await this.write(PREVIEW_KEY, { plan, suggestions: classifications?.suggestions || [], tabs: tabs.filter(tab=>isEligible(tab,{regroup})).map(({id,title,url,windowId,index,lastAccessed,groupId})=>({id,title,url,windowId,index,lastAccessed,groupId})), categories });
      if (generation !== this.previewGeneration) return message(false, t(STALE));
      return { ok: true, plan, undoAvailable: Boolean(undo?.groups?.length), keyConfigured: Boolean(key), suggestions: classifications?.suggestions || [], suggestionError: classifications?.suggestionError || '', otherCount: classifications?.otherCount || 0 };
    });
  }

  async preferences() {
    const saved=await this.read('tabfoldPreferences','local');
    return {useExistingGroups:typeof saved?.useExistingGroups==='boolean' ? saved.useExistingGroups : true,suggestNew:typeof saved?.suggestNew==='boolean' ? saved.suggestNew : true,ignoreCategories:typeof saved?.ignoreCategories==='boolean' ? saved.ignoreCategories : false};
  }

  async setPreferences(changes) {
    if(!changes || typeof changes!=='object' || Array.isArray(changes) || Object.entries(changes).some(([key,value])=>!['suggestNew','ignoreCategories','useExistingGroups'].includes(key) || typeof value!=='boolean')) throw new Error(t('Invalid AI classification options.'));
    const preferences={...await this.preferences(),...changes};
    await this.write('tabfoldPreferences',preferences,'local');
    await this.remove(PREVIEW_KEY);
    return {ok:true,preferences};
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
    const added = buildPreview(candidateTabs, {allWindows:true,tabOrder:saved.plan.tabOrder,groupingMode:saved.plan.groupingMode}, replacements).groups;
    if (!added.length || !await this.validateGroups({...saved.plan,groups:added})) return message(false, t(STALE));
    const remaining = saved.plan.groups.map(group => {
      const tabs = group.tabs.filter(t => !ids.has(t.id));
      return {...group, tabs, tabIds: tabs.map(t => t.id)};
    }).filter(g => g.tabs.length >= (Number.isInteger(g.targetGroupId) ? 1 : 2));
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
    const regroup=plan.groupingMode==='regroup';
    const seen = new Set();
    const valid = [];
    for (const group of plan.groups) {
      if (!Number.isInteger(group?.windowId) || !Array.isArray(group.tabs) || group.tabs.length < (Number.isInteger(group.targetGroupId) ? 1 : 2) || !Array.isArray(group.tabIds)) return null;
      if (group.targetGroupId !== undefined && (regroup || !Number.isInteger(group.targetGroupId) || !await this.targetUnchanged(group, plan))) return null;
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
        if (!sameSnapshot(tab, snapshot) || tab.windowId !== group.windowId || !isEligible(tab,{regroup}) || (regroup && (tab.groupId ?? -1)!==snapshot.groupId)) return null;
        seen.add(tab.id);
        fresh.push(tab);
      }
      valid.push({ ...group, tabs: fresh, tabIds: fresh.map((tab) => tab.id) });
    }
    return valid;
  }

  async targetUnchanged(group, plan) {
    const snapshot = plan.existingGroups?.find(item => item.id === group.targetGroupId);
    if (!snapshot || snapshot.windowId !== group.windowId) return false;
    try {
      const current = await this.chrome.tabGroups.get(snapshot.id);
      if (['windowId','title','color','collapsed'].some(key => (key === 'title' ? current[key] || '' : current[key]) !== snapshot[key])) return false;
      const members = (await this.chrome.tabs.query({windowId:group.windowId})).filter(tab => tab.groupId === snapshot.id);
      return members.length === snapshot.tabs.length && snapshot.tabs.every(tab => {
        const member = members.find(item => item.id === tab.id);
        return sameSnapshot(member,tab) && member.title === tab.title;
      });
    } catch { return false; }
  }

  async matchesSavedPreview(plan) {
    const saved = await this.read(PREVIEW_KEY);
    return Boolean(saved?.plan && stableJson(saved.plan) === stableJson(plan) && stableJson(plan.preferences) === stableJson(await this.preferences()));
  }

  async revalidateGroup(group, regroup = false) {
    for (const snapshot of group.tabs) {
      try {
        const tab = await this.chrome.tabs.get(snapshot.id);
        if (!sameSnapshot(tab, snapshot) || tab.windowId !== group.windowId || !isEligible(tab,{regroup}) || (regroup && (tab.groupId ?? -1)!==(snapshot.groupId ?? -1))) return false;
      } catch {
        return false;
      }
    }
    return true;
  }

  async orderGroup(groupId, group) {
    const members=(await this.chrome.tabs.query({windowId:group.windowId})).filter(tab=>tab.groupId===groupId);
    if(members.length!==group.tabIds.length || members.some(tab=>!group.tabIds.includes(tab.id)) || members.some(tab=>!Number.isInteger(tab.index))) throw new Error(STALE);
    const start=Math.min(...members.map(tab=>tab.index));
    for(let offset=0;offset<group.tabs.length;offset++) {
      const snapshot=group.tabs[offset];
      const current=await this.chrome.tabs.get(snapshot.id);
      if(!sameSnapshot(current,snapshot) || current.groupId!==groupId || current.pinned || current.audible) throw new Error(STALE);
      if(current.index!==start+offset) await this.chrome.tabs.move(current.id,{index:start+offset});
    }
  }

  async apply(plan, collapse = true) {
    if (!await this.matchesSavedPreview(plan) || validateGroupingMode(await this.read('tabfoldGroupingMode','local')) !== (plan.groupingMode || 'preserve')) return message(false, t(STALE));
    const groups = await this.validateGroups(plan);
    if (!groups) return message(false, t(STALE));
    if (!groups.length) return message(true, t('No tab groups to organize.'), { undoAvailable: false });

    const regroup=plan.groupingMode==='regroup';
    if(regroup) {
      for(const original of plan.existingGroups || []) {
        if(groups.some(group=>group.tabs.some(tab=>tab.groupId===original.id)) && !await this.targetUnchanged({targetGroupId:original.id,windowId:original.windowId},plan)) return message(false,t(STALE));
      }
    }
    // Persist the pre-mutation state before chrome.tabs.group can change it.
    const undo = { groupingMode:plan.groupingMode, groups: [], tabs: groups.flatMap(group => group.tabs.map(tab => ({id:tab.id,url:tab.url,windowId:tab.windowId,groupId:tab.groupId ?? -1}))), originalGroups:regroup ? (plan.existingGroups || []).filter(original=>groups.some(group=>group.tabs.some(tab=>tab.groupId===original.id))) : [] };
    await this.write(UNDO_KEY, undo);
    try {
      for (const group of groups) {
        if (!await this.revalidateGroup(group,regroup) || (Number.isInteger(group.targetGroupId) && !await this.targetUnchanged(group,plan))) return message(false, t(STALE));
        if (Number.isInteger(group.targetGroupId)) {
          const snapshot = plan.existingGroups.find(item => item.id === group.targetGroupId);
          const added = {groupId:group.targetGroupId,tabIds:group.tabIds,windowId:group.windowId,title:snapshot.title,color:snapshot.color,existing:true};
          undo.groups.push(added);
          await this.write(UNDO_KEY,undo);
          await this.chrome.tabs.group({tabIds:group.tabIds,groupId:group.targetGroupId});
          // Only move added tabs, after the original members; their order and metadata stay intact.
          const members = (await this.chrome.tabs.query({windowId:group.windowId})).filter(tab => tab.groupId === group.targetGroupId);
          const end = Math.max(...members.map(tab => tab.index));
          for (const tab of group.tabs) {
            const current = await this.chrome.tabs.get(tab.id);
            if (!sameSnapshot(current,tab) || current.groupId !== group.targetGroupId || current.pinned || current.audible) throw new Error(STALE);
            await this.chrome.tabs.move(tab.id,{index:end});
          }
          continue;
        }
        const groupId = await this.chrome.tabs.group({ tabIds: group.tabIds, createProperties: { windowId: group.windowId } });
        const created = { groupId, tabIds: group.tabIds, windowId: group.windowId, title: '', color: 'grey', collapsed:false };
        undo.groups.push(created);
        await this.write(UNDO_KEY, undo);
        const updated = await this.chrome.tabGroups.update(groupId, { title: safeTitle(group.title), color: validGroupColor(group.color), collapsed: Boolean(collapse) });
        Object.assign(created,{title:updated.title,color:updated.color,collapsed:updated.collapsed});
        await this.write(UNDO_KEY, undo);
        if(plan.tabOrder && plan.tabOrder!=='current') await this.orderGroup(groupId,group);
      }
      return message(true, t('Organized tabs into {count} groups.', { count: groups.length }), { undoAvailable: true });
    } catch {
      return message(false, t('Unable to create tab groups.'));
    }
  }

  async undo() {
    const undo = await this.read(UNDO_KEY);
    if (!undo?.groups?.length) return message(true, t('No Tabfold grouping to undo.'), { undoAvailable: false });
    if(undo.groupingMode==='regroup') return this.undoRegroup(undo);
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

  async undoRegroup(undo) {
    const candidates=[];
    for(const group of undo.groups) {
      let current;
      try {current=await this.chrome.tabGroups.get(group.groupId);} catch {continue;}
      if(current.windowId!==group.windowId || current.title!==group.title || current.color!==group.color || current.collapsed!==group.collapsed) continue;
      for(const id of group.tabIds) {
        const before=undo.tabs.find(tab=>tab.id===id);
        try {
          const tab=await this.chrome.tabs.get(id);
          if(before && sameSnapshot(tab,before) && tab.groupId===group.groupId && isEligible(tab,{regroup:true})) candidates.push({tab,before});
        } catch { /* Closed or moved tabs are left alone. */ }
      }
    }
    let restored=0;
    for(const original of undo.originalGroups || []) {
      const members=candidates.filter(item=>item.before.groupId===original.id);
      if(!members.length) continue;
      let target;
      try {target=await this.chrome.tabGroups.get(original.id);} catch { /* Recreate a group emptied by regrouping. */ }
      if(!target && original.tabs.some(tab=>!undo.groups.some(changed=>changed.tabIds.includes(tab.id)))) continue;
      if(target) {
        if(['windowId','title','color','collapsed'].some(key=>(key==='title' ? target[key] || '' : target[key])!==original[key])) continue;
        const currentMembers=(await this.chrome.tabs.query({windowId:original.windowId})).filter(tab=>tab.groupId===original.id);
        const expected=original.tabs.filter(tab=>!undo.groups.some(changed=>changed.tabIds.includes(tab.id)));
        if(currentMembers.length!==expected.length || expected.some(before=>!currentMembers.some(tab=>sameSnapshot(tab,before)))) continue;
      }
      // Recheck each candidate immediately before moving it back.
      const ids=[];
      for(const item of members) {
        try {const fresh=await this.chrome.tabs.get(item.tab.id);if(sameSnapshot(fresh,item.before) && fresh.groupId===item.tab.groupId && isEligible(fresh,{regroup:true})) ids.push(fresh.id);} catch {}
      }
      if(!ids.length) continue;
      const groupId=await this.chrome.tabs.group(target ? {tabIds:ids,groupId:target.id} : {tabIds:ids,createProperties:{windowId:original.windowId}});
      if(!target) await this.chrome.tabGroups.update(groupId,{title:original.title,color:original.color,collapsed:original.collapsed});
      restored+=ids.length;
    }
    for(const item of candidates.filter(item=>item.before.groupId===-1)) {
      try {const fresh=await this.chrome.tabs.get(item.tab.id);if(sameSnapshot(fresh,item.before) && fresh.groupId===item.tab.groupId && isEligible(fresh,{regroup:true})) {await this.chrome.tabs.ungroup([fresh.id]);restored++;}} catch {}
    }
    await this.write(UNDO_KEY,{groups:[],tabs:[]});
    return message(true,t('Undid grouping for {count} tabs.',{count:restored}),{undoAvailable:false});
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
      if (request.type === 'getSettings') { const provider=getProvider(await this.provider()); return { ok: true, provider:provider.id, groupingMode:validateGroupingMode(await this.read('tabfoldGroupingMode','local')), tabOrder:validateTabOrder(await this.read('tabfoldTabOrder','local')), keyConfigured:Boolean(await this.read(provider.keyName)), categories:await this.categories(), preferences:await this.preferences() }; }
      if(request.type==='setPreferences') return await this.mutate(()=>this.setPreferences(request.preferences));
      if(request.type==='setGroupingMode') return await this.mutate(async()=>{const groupingMode=validateGroupingMode(request.groupingMode);await this.write('tabfoldGroupingMode',groupingMode,'local');await this.remove(PREVIEW_KEY);return {ok:true,groupingMode};});
      if (request.type === 'setTabOrder') return await this.mutate(async()=>{const tabOrder=validateTabOrder(request.tabOrder);await this.write('tabfoldTabOrder',tabOrder,'local');await this.remove(PREVIEW_KEY);return {ok:true,tabOrder};});
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
