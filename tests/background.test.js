import assert from 'node:assert/strict';
import test from 'node:test';
import { TabfoldBackend } from '../extension/background.js';

function reordered(value) {
  if (Array.isArray(value)) return value.map(reordered);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().reverse().map((key) => [key, reordered(value[key])]));
}

function mockChrome(initialTabs, { reorderStorage = false, initialGroups = [] } = {}) {
  const tabs = new Map(initialTabs.map((tab) => [tab.id, { groupId: -1, ...tab }]));
  const groups = new Map(initialGroups.map(group=>[group.id,{...group}]));
  const session = {};
  const local = {};
  const created = [];
  const groupCalls = [];
  const moves = [];
  let nextGroupId = Math.max(0,...groups.keys())+1;
  const area = (store) => ({
    get: async (key) => ({ [key]: reorderStorage ? reordered(store[key]) : store[key] }),
    set: async (value) => Object.assign(store, value),
    remove: async (key) => { delete store[key]; },
  });
  return {
    tabs: {
      query: async (query={}) => [...tabs.values()].filter(tab=>query.windowId===undefined || tab.windowId===query.windowId).map((tab) => ({ ...tab })),
      get: async (id) => { if (!tabs.has(id)) throw new Error('missing'); return { ...tabs.get(id) }; },
      group: async (options) => {
        const {tabIds}=options; groupCalls.push(options);
        const groupId=options.groupId ?? nextGroupId++;
        if(options.groupId===undefined) groups.set(groupId,{id:groupId,windowId:options.createProperties.windowId,title:'',color:'grey',collapsed:false});
        const original=[...tabs.values()].filter(tab=>tab.groupId===groupId);
        tabIds.forEach(id=>{tabs.get(id).groupId=groupId;});
        if(original.length){
          const windowTabs=[...tabs.values()].filter(tab=>tab.windowId===original[0].windowId).sort((a,b)=>a.index-b.index);
          const remaining=windowTabs.filter(tab=>!tabIds.includes(tab.id));
          const end=Math.max(...remaining.map((tab,index)=>original.some(t=>t.id===tab.id)?index:-1));
          remaining.splice(end+1,0,...tabIds.map(id=>tabs.get(id)));remaining.forEach((tab,index)=>{tab.index=index;});
        }
        for(const id of [...groups.keys()]) if(![...tabs.values()].some(tab=>tab.groupId===id)) groups.delete(id);
        return groupId;
      },
      move: async (id, properties) => {
        moves.push({id,...properties});
        const moving=tabs.get(id);
        const ordered=[...tabs.values()].filter(t=>t.windowId===moving.windowId).sort((a,b)=>a.index-b.index);
        ordered.splice(ordered.findIndex(t=>t.id===id),1);ordered.splice(properties.index,0,moving);
        ordered.forEach((tab,index)=>{tab.index=index;});return {...moving};
      },
      ungroup: async (ids) => ids.forEach((id) => { tabs.get(id).groupId = -1; }),
      remove: async (id) => tabs.delete(id),
      create: async ({ url, windowId }) => { created.push({ url, windowId }); return { id: 100 + created.length, url, windowId }; },
    },
    tabGroups: {
      query: async () => [...groups.values()].map(group=>({...group})),
      get: async (id) => { if (!groups.has(id)) throw new Error('missing'); return { ...groups.get(id) }; },
      update: async (id, changes) => Object.assign(groups.get(id), changes),
    },
    storage: { session: area(session), local: area(local) },
    _tabs: tabs,
    _groups: groups,
    _created: created,
    _groupCalls: groupCalls,
    _moves: moves,
  };
}

test('apply rejects a stale snapshot before mutation', async () => {
  const chrome = mockChrome([
    { id: 1, windowId: 1, title: 'Atlas platform documentation A', url: 'https://example.com/a' },
    { id: 2, windowId: 1, title: 'Atlas platform documentation B', url: 'https://example.com/b' },
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
    { id: 1, windowId: 1, title: 'Atlas platform documentation A', url: 'https://example.com/a' },
    { id: 2, windowId: 1, title: 'Atlas platform documentation B', url: 'https://example.com/b' },
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
    { id: 1, windowId: 7, title: 'Atlas platform documentation A', url: 'https://example.com/a' },
    { id: 2, windowId: 7, title: 'Atlas platform documentation B', url: 'https://example.com/b' },
  ]);
  const backend = new TabfoldBackend(chrome);
  const preview = await backend.preview({ windowId: 7 });
  await backend.handle({ type: 'apply', plan: preview.plan });
  assert.deepEqual(chrome._groupCalls[0], { tabIds: [1, 2], createProperties: { windowId: 7 } });
});

test('apply accepts an authoritative plan after storage reorders object keys', async () => {
  const chrome = mockChrome([
    { id: 1, windowId: 1, title: 'Atlas platform documentation A', url: 'https://example.com/a' },
    { id: 2, windowId: 1, title: 'Atlas platform documentation B', url: 'https://example.com/b' },
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

test('settings reports key presence without exposing credentials and preserves custom categories', async () => {
  const backend = new TabfoldBackend(mockChrome([]));
  const defaults = await backend.handle({type:'getSettings'});
  assert.equal(defaults.ok, true);
  assert.equal(defaults.keyConfigured, false);
  assert.deepEqual(defaults.preferences, {suggestNew:true,ignoreCategories:false});
  assert.equal(defaults.categories[0].title, 'Development');
  const categories = [{title:'내 논문', criteria:'Research papers', color:'green'}];
  await backend.handle({type:'setCategories', categories});
  await backend.handle({type:'setKey', key:'private-test-key'});
  await backend.write('tabfoldPreferences', {suggestNew:false}, 'local');
  const configured = await backend.handle({type:'getSettings'});
  assert.deepEqual(configured, {ok:true, provider:'openrouter', groupingMode:'preserve', tabOrder:'current', keyConfigured:true, categories, preferences:{suggestNew:false,ignoreCategories:false}});
  assert.equal(JSON.stringify(configured).includes('private-test-key'), false);
});

test('provider keys are isolated, old OpenRouter keys remain usable, and selection invalidates previews',async()=>{
  const backend=new TabfoldBackend(mockChrome([]));
  await backend.write('openrouterKey','openrouter-only');
  assert.equal((await backend.handle({type:'getSettings'})).keyConfigured,true);
  await backend.write('tabfoldPreview',{plan:{groups:[]}});
  assert.equal((await backend.handle({type:'setProvider',provider:'typesafe'})).keyConfigured,false);
  assert.equal(await backend.read('tabfoldPreview'),undefined);
  assert.equal((await backend.handle({type:'preview',ai:true})).ok,false);
  await backend.handle({type:'setKey',provider:'typesafe',key:'typesafe-only'});
  assert.equal(await backend.read('openrouterKey'),'openrouter-only');
  assert.equal(await backend.read('typesafeKey'),'typesafe-only');
  assert.equal((await backend.handle({type:'getSettings'})).provider,'typesafe');
  await backend.handle({type:'setKey',provider:'typesafe',key:''});
  assert.equal(await backend.read('typesafeKey'),undefined);
  assert.equal((await backend.handle({type:'setProvider',provider:'openrouter'})).keyConfigured,true);
  assert.equal((await backend.handle({type:'setProvider',provider:'evil'})).ok,false);
  assert.equal((await backend.handle({type:'getSettings'})).provider,'openrouter');
});

test('saved sorting matches apply order inside each window and never moves protected tabs',async()=>{
  const chrome=mockChrome([
    {id:90,windowId:1,index:0,url:'https://protected.test',pinned:true},
    {id:1,windowId:1,index:1,url:'https://example.com/1',title:'Atlas platform documentation Zulu',lastAccessed:30},
    {id:2,windowId:1,index:2,url:'https://example.com/2',title:'Atlas platform documentation Alpha',lastAccessed:10},
    {id:3,windowId:1,index:3,url:'https://example.com/3',title:'Atlas platform documentation Beta',lastAccessed:20},
    {id:4,windowId:2,index:0,url:'https://example.com/4',title:'Atlas platform documentation Delta',lastAccessed:40},
    {id:5,windowId:2,index:1,url:'https://example.com/5',title:'Atlas platform documentation Charlie',lastAccessed:20},
  ]);
  const backend=new TabfoldBackend(chrome);
  const old=await backend.preview({allWindows:true});
  assert.equal((await backend.handle({type:'setTabOrder',tabOrder:'oldest'})).ok,true);
  assert.equal((await backend.handle({type:'apply',plan:old.plan})).ok,false);
  assert.equal((await backend.handle({type:'setTabOrder',tabOrder:'invalid'})).ok,false);
  assert.equal((await backend.handle({type:'getSettings'})).tabOrder,'oldest');
  const {plan}=await backend.preview({allWindows:true});
  assert.deepEqual(plan.groups.map(g=>g.tabIds),[[2,3,1],[5,4]]);
  assert.equal((await backend.handle({type:'apply',plan})).ok,true);
  const order=windowId=>[...chrome._tabs.values()].filter(t=>t.windowId===windowId).sort((a,b)=>a.index-b.index).map(t=>t.id);
  assert.deepEqual(order(1),[90,2,3,1]);assert.deepEqual(order(2),[5,4]);
  assert.ok(chrome._moves.every(m=>m.id!==90 && m.windowId===undefined));
  assert.equal((await backend.handle({type:'undo'})).ok,true);
  assert.equal(chrome._tabs.get(90).groupId,-1);
});

function existingFixture() {
  const chrome=mockChrome([
    {id:1,index:0,windowId:1,groupId:40,title:'Atlas platform Original A',url:'https://project.test/a'},
    {id:2,index:1,windowId:1,groupId:40,title:'Atlas platform Original B',url:'https://project.test/b'},
    {id:3,index:2,windowId:1,title:'Atlas platform New Z',url:'https://project.test/z'},
    {id:4,index:3,windowId:1,title:'Atlas platform New A',url:'https://project.test/new'},
    {id:5,index:4,windowId:1,title:'Pinned',url:'https://project.test/pinned',pinned:true},
    {id:6,index:0,windowId:2,title:'Other window',url:'https://project.test/else'},
  ],{initialGroups:[{id:40,windowId:1,title:'My project',color:'purple',collapsed:false}]});
  return {chrome,backend:new TabfoldBackend(chrome)};
}

test('preview reads existing groups before AI; append preserves members, metadata and undo',async()=>{
  const {chrome,backend}=existingFixture();
  await backend.handle({type:'setTabOrder',tabOrder:'title'});
  const {plan}=await backend.preview({allWindows:true});
  assert.equal(plan.existingGroups[0].title,'My project');
  assert.equal(plan.groupedCount,2);assert.equal(plan.otherProtectedCount,1);
  assert.equal(plan.groups.length,1);assert.equal(plan.groups[0].targetGroupId,40);
  assert.deepEqual(plan.groups[0].tabIds,[4,3]);
  const metadata={...chrome._groups.get(40)};
  assert.equal((await backend.handle({type:'apply',plan,collapse:true})).ok,true);
  assert.deepEqual(chrome._groups.get(40),metadata);
  assert.deepEqual(chrome._groupCalls,[{groupId:40,tabIds:[4,3]}]);
  assert.ok(chrome._moves.every(move=>[3,4].includes(move.id)));
  assert.deepEqual([...chrome._tabs.values()].filter(t=>t.groupId===40).sort((a,b)=>a.index-b.index).map(t=>t.id),[1,2,4,3]);
  assert.equal(chrome._tabs.get(6).groupId,-1);
  assert.equal((await backend.handle({type:'undo'})).ok,true);
  assert.equal(chrome._tabs.get(1).groupId,40);assert.equal(chrome._tabs.get(2).groupId,40);
  assert.equal(chrome._tabs.get(3).groupId,-1);assert.equal(chrome._tabs.get(4).groupId,-1);
  assert.deepEqual(chrome._groups.get(40),metadata);
});

test('changed target metadata, membership, or window rejects append before any mutation',async()=>{
  for(const change of [c=>c._groups.get(40).title='Renamed',c=>c._groups.get(40).collapsed=true,c=>c._groups.get(40).windowId=2,c=>c._tabs.get(2).groupId=-1,c=>c._tabs.get(2).url='https://changed.test']){
    const {chrome,backend}=existingFixture();const {plan}=await backend.preview({windowId:1});change(chrome);
    assert.equal((await backend.handle({type:'apply',plan})).ok,false);assert.equal(chrome._groupCalls.length,0);
  }
});

function regroupFixture() {
 const chrome=mockChrome([
  {id:1,windowId:1,index:0,title:'Atlas platform documentation docs',url:'https://atlas.example/a',groupId:10},
  {id:2,windowId:1,index:1,title:'Atlas platform documentation guide',url:'https://atlas.example/b',groupId:10},
  {id:3,windowId:1,index:2,title:'Atlas platform documentation playing',url:'https://atlas.example/c',groupId:10,audible:true},
  {id:4,windowId:1,index:3,title:'Atlas platform documentation tutorial',url:'https://atlas.example/d',groupId:11},
  {id:5,windowId:1,index:4,title:'Atlas platform documentation reference',url:'https://atlas.example/e'},
 ],{initialGroups:[{id:10,windowId:1,title:'First old',color:'red',collapsed:true},{id:11,windowId:1,title:'Second old',color:'green',collapsed:false}]});
 return {chrome,backend:new TabfoldBackend(chrome)};
}

test('grouping mode is persisted, validated, authoritative and invalidates preview',async()=>{
 const {backend}=regroupFixture();
 assert.equal((await backend.handle({type:'getSettings'})).groupingMode,'preserve');
 const previous=await backend.handle({type:'preview',groupingMode:'regroup'});assert.equal(previous.plan.groupingMode,'preserve');
 assert.equal((await backend.handle({type:'setGroupingMode',groupingMode:'regroup'})).ok,true);
 assert.equal((await backend.handle({type:'apply',plan:previous.plan})).ok,false);
 assert.equal((await backend.handle({type:'preview',groupingMode:'preserve'})).plan.groupingMode,'regroup');
 assert.equal((await backend.handle({type:'setGroupingMode',groupingMode:'anything'})).ok,false);
});

test('regroup restores emptied original groups and metadata while leaving protected members untouched',async()=>{
 const {backend,chrome}=regroupFixture();await backend.handle({type:'setGroupingMode',groupingMode:'regroup'});
 const {plan}=await backend.handle({type:'preview'});assert.equal(plan.groups.length,1);assert.deepEqual(plan.groups[0].tabIds,[1,2,4,5]);
 assert.equal((await backend.handle({type:'apply',plan})).ok,true);
 assert.equal(chrome._tabs.get(3).groupId,10);assert.equal(chrome._groups.has(11),false);
 assert.equal((await backend.handle({type:'undo'})).ok,true);
 assert.equal(chrome._tabs.get(1).groupId,10);assert.equal(chrome._tabs.get(2).groupId,10);assert.equal(chrome._tabs.get(3).groupId,10);assert.equal(chrome._tabs.get(5).groupId,-1);
 const recreated=chrome._groups.get(chrome._tabs.get(4).groupId);assert.equal(recreated.title,'Second old');assert.equal(recreated.color,'green');assert.equal(recreated.collapsed,false);
});

test('regroup rejects changed membership and undo preserves edited groups, navigated and moved tabs',async()=>{
 const {backend,chrome}=regroupFixture();await backend.handle({type:'setGroupingMode',groupingMode:'regroup'});
 let {plan}=await backend.handle({type:'preview'});chrome._tabs.get(1).groupId=-1;
 assert.equal((await backend.handle({type:'apply',plan})).ok,false);assert.equal(chrome._groupCalls.length,0);
 chrome._tabs.get(1).groupId=10;({plan}=await backend.handle({type:'preview'}));await backend.handle({type:'apply',plan});
 const created=chrome._tabs.get(1).groupId;chrome._tabs.get(1).url='https://elsewhere.example/';chrome._tabs.get(2).windowId=2;
 await backend.handle({type:'undo'});assert.equal(chrome._tabs.get(1).groupId,created);assert.equal(chrome._tabs.get(2).groupId,created);
 const next=regroupFixture();await next.backend.handle({type:'setGroupingMode',groupingMode:'regroup'});const preview=await next.backend.handle({type:'preview'});await next.backend.handle({type:'apply',plan:preview.plan});
 const edited=next.chrome._tabs.get(1).groupId;next.chrome._groups.get(edited).title='User renamed';await next.backend.handle({type:'undo'});assert.equal(next.chrome._tabs.get(1).groupId,edited);
});

test('regroup undo does not recreate an original group the user removed around protected members',async()=>{
 const {backend,chrome}=regroupFixture();await backend.handle({type:'setGroupingMode',groupingMode:'regroup'});
 const {plan}=await backend.handle({type:'preview'});await backend.handle({type:'apply',plan});
 const destination=chrome._tabs.get(1).groupId;
 chrome._groups.delete(10);chrome._tabs.get(3).groupId=-1;
 await backend.handle({type:'undo'});
 assert.equal(chrome._tabs.get(1).groupId,destination);
 assert.equal(chrome._tabs.get(2).groupId,destination);
 assert.equal(chrome._tabs.get(3).groupId,-1);
});

test('preferences merge strict booleans, invalidate previews, and protect against late preview races',async()=>{
 const {backend}=regroupFixture();
 assert.deepEqual(await backend.preferences(),{suggestNew:true,ignoreCategories:false});
 const previous=await backend.handle({type:'preview',suggestNew:false});assert.equal(previous.plan.preferences.suggestNew,true);
 assert.equal((await backend.handle({type:'setPreferences',preferences:{ignoreCategories:true}})).ok,true);
 assert.deepEqual(await backend.preferences(),{suggestNew:true,ignoreCategories:true});
 assert.equal((await backend.handle({type:'apply',plan:previous.plan})).ok,false);
 // A late request may rewrite its old plan after settings changed; matching the stored plan is insufficient.
 await backend.write('tabfoldPreview',{plan:previous.plan});assert.equal(await backend.matchesSavedPreview(previous.plan),false);
 await backend.handle({type:'setPreferences',preferences:{suggestNew:false}});assert.deepEqual(await backend.preferences(),{suggestNew:false,ignoreCategories:true});
 for(const preferences of [{ignoreCategories:1},{unknown:true},[],null]) assert.equal((await backend.handle({type:'setPreferences',preferences})).ok,false);
});

test('AI preview uses saved preferences and keeps saved categories untouched',async()=>{
 const chrome=mockChrome([{id:1,windowId:1,title:'Atlas',url:'https://atlas.example/a'},{id:2,windowId:1,title:'Atlas',url:'https://atlas.example/b'}]);
 const backend=new TabfoldBackend(chrome);const before=await backend.categories();
 await backend.handle({type:'setKey',key:'test'});await backend.handle({type:'setPreferences',preferences:{ignoreCategories:true,suggestNew:false}});
 const originalFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('unexpected network call');};
 try {const result=await backend.handle({type:'preview',ai:true,suggestNew:true});assert.equal(result.ok,true);assert.equal(calls,0);assert.deepEqual(result.plan.preferences,{ignoreCategories:true,suggestNew:false});assert.deepEqual(await backend.categories(),before);}finally{globalThis.fetch=originalFetch;}
});
