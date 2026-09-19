import assert from 'node:assert/strict';
import test from 'node:test';
import { TabfoldBackend } from '../extension/background.js';

function reordered(value) {
  if (Array.isArray(value)) return value.map(reordered);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().reverse().map((key) => [key, reordered(value[key])]));
}

function mockChrome(initialTabs, { reorderStorage = false } = {}) {
  const tabs = new Map(initialTabs.map((tab) => [tab.id, { groupId: -1, ...tab }]));
  const groups = new Map();
  const session = {};
  const local = {};
  const created = [];
  const groupCalls = [];
  let nextGroupId = 1;
  const area = (store) => ({
    get: async (key) => ({ [key]: reorderStorage ? reordered(store[key]) : store[key] }),
    set: async (value) => Object.assign(store, value),
    remove: async (key) => { delete store[key]; },
  });
  return {
    tabs: {
      query: async () => [...tabs.values()].map((tab) => ({ ...tab })),
      get: async (id) => { if (!tabs.has(id)) throw new Error('missing'); return { ...tabs.get(id) }; },
      group: async (options) => { const { tabIds } = options; groupCalls.push(options); const groupId = nextGroupId++; tabIds.forEach((id) => { tabs.get(id).groupId = groupId; }); groups.set(groupId, { id: groupId, title: '', color: 'grey' }); return groupId; },
      ungroup: async (ids) => ids.forEach((id) => { tabs.get(id).groupId = -1; }),
      remove: async (id) => tabs.delete(id),
      create: async ({ url, windowId }) => { created.push({ url, windowId }); return { id: 100 + created.length, url, windowId }; },
    },
    tabGroups: {
      get: async (id) => { if (!groups.has(id)) throw new Error('missing'); return { ...groups.get(id) }; },
      update: async (id, changes) => Object.assign(groups.get(id), changes),
    },
    storage: { session: area(session), local: area(local) },
    _tabs: tabs,
    _groups: groups,
    _created: created,
    _groupCalls: groupCalls,
  };
}

test('apply rejects a stale snapshot before mutation', async () => {
  const chrome = mockChrome([
    { id: 1, windowId: 1, url: 'https://example.com/a' },
    { id: 2, windowId: 1, url: 'https://example.com/b' },
  ]);
  const backend = new TabfoldBackend(chrome);
  const preview = await backend.preview({ windowId: 1 });
  chrome._tabs.get(2).url = 'https://elsewhere.example/';
  const result = await backend.handle({ type: 'apply', plan: preview.plan });
  assert.equal(result.ok, false);
  assert.equal(chrome._groups.size, 0);
});

test('apply and undo change only the created group', async () => {
  const chrome = mockChrome([
    { id: 1, windowId: 1, url: 'https://example.com/a' },
    { id: 2, windowId: 1, url: 'https://example.com/b' },
  ]);
  const backend = new TabfoldBackend(chrome);
  const preview = await backend.preview({ windowId: 1 });
  assert.equal((await backend.handle({ type: 'apply', plan: preview.plan })).ok, true);
  assert.notEqual(chrome._tabs.get(1).groupId, -1);
  assert.equal((await backend.handle({ type: 'undo' })).ok, true);
  assert.equal(chrome._tabs.get(1).groupId, -1);
});

test('apply creates each group in its source window', async () => {
  const chrome = mockChrome([
    { id: 1, windowId: 7, url: 'https://example.com/a' },
    { id: 2, windowId: 7, url: 'https://example.com/b' },
  ]);
  const backend = new TabfoldBackend(chrome);
  const preview = await backend.preview({ windowId: 7 });
  await backend.handle({ type: 'apply', plan: preview.plan });
  assert.deepEqual(chrome._groupCalls[0], { tabIds: [1, 2], createProperties: { windowId: 7 } });
});

test('apply accepts an authoritative plan after storage reorders object keys', async () => {
  const chrome = mockChrome([
    { id: 1, windowId: 1, url: 'https://example.com/a' },
    { id: 2, windowId: 1, url: 'https://example.com/b' },
  ], { reorderStorage: true });
  const backend = new TabfoldBackend(chrome);
  const preview = await backend.preview({ windowId: 1 });
  assert.equal((await backend.handle({ type: 'apply', plan: preview.plan })).ok, true);
  assert.equal(chrome._groups.size, 1);
});

test('dedupe persists a URL and restore recreates it', async () => {
  const chrome = mockChrome([
    { id: 1, windowId: 1, url: 'https://example.com/a?keep=all', active: true },
    { id: 2, windowId: 1, url: 'https://example.com/a?keep=all' },
  ]);
  const backend = new TabfoldBackend(chrome);
  const preview = await backend.preview({ windowId: 1 });
  assert.equal((await backend.handle({ type: 'dedupe', plan: preview.plan })).ok, true);
  assert.equal(chrome._tabs.has(2), false);
  assert.equal((await backend.handle({ type: 'restore' })).ok, true);
  assert.deepEqual(chrome._created, [{ url: 'https://example.com/a?keep=all', windowId: 1 }]);
});

test('category settings persist and invalidate old previews', async () => {
  const chrome = mockChrome([]);
  const backend = new TabfoldBackend(chrome);
  const first = await backend.preview({allWindows:true});
  const categories=[{title:'논문',criteria:'Machine learning papers',color:'green'}];
  assert.equal((await backend.handle({type:'setCategories',categories})).ok,true);
  assert.deepEqual((await backend.handle({type:'getCategories'})).categories,categories);
  assert.equal(await backend.matchesSavedPreview(first.plan),false);
  assert.equal((await backend.handle({type:'setCategories',categories:[]})).ok,false);
  assert.deepEqual((await backend.handle({type:'getCategories'})).categories,categories);
});

test('accepting a suggestion updates preview and categories without changing tabs', async () => {
  const chrome=mockChrome([{id:1,windowId:7,url:'https://example.com/a'},{id:2,windowId:7,url:'https://example.com/b'}]);
  const backend=new TabfoldBackend(chrome);
  const {plan}=await backend.preview({windowId:7});
  const saved=await backend.read('tabfoldPreview');
  await backend.write('tabfoldPreview',{...saved,suggestions:[{title:'프로젝트',criteria:'Project documentation',color:'blue',tabIds:[1,2]}]});
  const result=await backend.handle({type:'acceptSuggestion',plan,index:0,title:'내 프로젝트'});
  assert.equal(result.ok,true);
  assert.equal(result.plan.groups.length,1);
  assert.equal(result.plan.groups[0].title,'내 프로젝트');
  assert.equal(chrome._groups.size,0);
  assert.equal(result.categories.at(-1).title,'내 프로젝트');
  assert.equal((await backend.handle({type:'acceptSuggestion',plan,index:0,title:'재사용'})).ok,false);
  assert.equal((await backend.handle({type:'apply',plan:result.plan})).ok,true);
});

test('accepting a stale suggestion cannot change settings', async () => {
  const chrome=mockChrome([{id:1,windowId:7,url:'https://example.com/a'},{id:2,windowId:7,url:'https://example.com/b'}]);
  const backend=new TabfoldBackend(chrome);
  const {plan}=await backend.preview({windowId:7});
  const saved=await backend.read('tabfoldPreview');
  await backend.write('tabfoldPreview',{...saved,suggestions:[{title:'프로젝트',criteria:'Project documentation',color:'blue',tabIds:[1,2]}]});
  chrome._tabs.get(1).pinned=true;
  const result=await backend.handle({type:'acceptSuggestion',plan,index:0,title:'내 프로젝트'});
  assert.equal(result.ok,false);
  assert.deepEqual(await backend.categories(),saved.categories);
});
