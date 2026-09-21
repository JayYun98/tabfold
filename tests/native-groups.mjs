// Isolated Chromium only; never connects to the user's browser or calls AI.
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const profile=await mkdtemp(join(tmpdir(),'tabfold-native-'));
const extension=new URL('../extension',import.meta.url).pathname;
let context;
try {
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 await context.route(url=>url.hostname.endsWith('.invalid'),route=>route.fulfill({contentType:'text/html',body:'<title>Atlas platform documentation guide</title>'}));
 await context.route(url=>url.hostname==='www.youtube.com',route=>route.fulfill({contentType:'text/html',body:'<title>Unrelated video title</title>'}));
 const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
 const id=new URL(worker.url()).host;
 const page=await context.newPage();await page.goto(`chrome-extension://${id}/options.html`);
 const result=await page.evaluate(async()=>{
  const send=async request=>{const r=await chrome.runtime.sendMessage(request);if(!r.ok)throw new Error(r.error);return r;};
  const window=await chrome.windows.create({url:'about:blank',focused:false});
  const make=async path=>{const tab=await chrome.tabs.create({windowId:window.id,url:'https://tabfold-test.invalid/'+path,active:false});for(let i=0;i<100;i++){const fresh=await chrome.tabs.get(tab.id);if(fresh.status==='complete' && fresh.url.startsWith('https:'))return fresh;await new Promise(resolve=>setTimeout(resolve,50));}throw new Error('Test tab did not load');};
  const first=await make('original-a'),second=await make('original-b');
  const groupId=await chrome.tabs.group({tabIds:[first.id,second.id],createProperties:{windowId:window.id}});
  await chrome.tabGroups.update(groupId,{title:'Original project',color:'purple',collapsed:true});
  const added=await make('new');
  await send({type:'setTabOrder',tabOrder:'title'});
  const {plan}=await send({type:'preview',windowId:window.id});
  const before=await chrome.tabGroups.get(groupId);
  const proposed=plan.groups.map(g=>({target:g.targetGroupId,ids:g.tabIds}));
  await send({type:'apply',plan,collapse:false});
  const after=await chrome.tabGroups.get(groupId);
  const memberOrder=(await chrome.tabs.query({windowId:window.id})).filter(t=>t.groupId===groupId).map(t=>t.id);
  await send({type:'undo'});
  const remaining=(await chrome.tabs.query({windowId:window.id})).filter(t=>t.groupId===groupId).map(t=>t.id);
  await chrome.windows.remove(window.id);
  return {before,after,proposed,memberOrder,remaining,original:[first.id,second.id],added:added.id};
 });
 assert.deepEqual(result.after,result.before);
 assert.deepEqual(result.proposed,[{target:result.before.id,ids:[result.added]}]);
 assert.deepEqual(result.memberOrder,[...result.original,result.added]);
 assert.deepEqual(result.remaining,result.original);
 console.log('Native Chromium: existing group append, original metadata/order, and undo passed');
 const regroup=await page.evaluate(async()=>{
  const send=async request=>{const r=await chrome.runtime.sendMessage(request);if(!r.ok)throw new Error(r.error);return r;};
  const win=await chrome.windows.create({url:'about:blank',focused:false});
  const protectedTab=win.tabs[0];
  const make=async path=>{const tab=await chrome.tabs.create({windowId:win.id,url:'https://regroup-test.invalid/atlas-platform-documentation/'+path,active:false});for(let i=0;i<100;i++){const fresh=await chrome.tabs.get(tab.id);if(fresh.status==='complete' && fresh.url.startsWith('https:'))return fresh;await new Promise(resolve=>setTimeout(resolve,50));}throw new Error('Test tab did not load');};
  try {
   const a=await make('a'),b=await make('b'),c=await make('c'),d=await make('d');
   const original=await chrome.tabs.group({tabIds:[a.id,b.id,protectedTab.id],createProperties:{windowId:win.id}});
   const emptied=await chrome.tabs.group({tabIds:[c.id],createProperties:{windowId:win.id}});
   await chrome.tabGroups.update(original,{title:'protected.example',color:'purple',collapsed:true});
   await chrome.tabGroups.update(emptied,{title:'empty.example',color:'green',collapsed:false});
   const metadata=await chrome.tabGroups.get(original);
   await send({type:'setGroupingMode',groupingMode:'regroup'});
   const {plan}=await send({type:'preview',windowId:win.id});
   await send({type:'apply',plan});
   const protectedAfter=await chrome.tabs.get(protectedTab.id);
   let disappeared=false;try{await chrome.tabGroups.get(emptied);}catch{disappeared=true;}
   await send({type:'undo'});
   const restored=await Promise.all([a,b,c,d].map(tab=>chrome.tabs.get(tab.id)));
   const recreated=await chrome.tabGroups.get(restored[2].groupId);
   return {plan:plan.groups.map(g=>g.tabIds),ids:[a.id,b.id,c.id,d.id],original,emptied,disappeared,protectedGroup:protectedAfter.groupId,metadata,after:await chrome.tabGroups.get(original),restored:restored.map(t=>t.groupId),recreated};
  }finally{await chrome.windows.remove(win.id);}
 });
 assert.deepEqual(regroup.plan.flat().sort((a,b)=>a-b),regroup.ids.sort((a,b)=>a-b));
 assert.equal(regroup.disappeared,true);assert.equal(regroup.protectedGroup,regroup.original);
 assert.deepEqual(regroup.after,regroup.metadata);
 assert.equal(regroup.restored[0],regroup.original);assert.equal(regroup.restored[1],regroup.original);assert.equal(regroup.restored[3],-1);
 assert.notEqual(regroup.recreated.id,regroup.emptied);assert.equal(regroup.recreated.title,'empty.example');assert.equal(regroup.recreated.color,'green');assert.equal(regroup.recreated.collapsed,false);
 console.log('Native Chromium: regroup preserves protected members and undo recreates emptied original groups');

 const purpose=await page.evaluate(async()=>{
  const send=async request=>{const result=await chrome.runtime.sendMessage(request);if(!result.ok)throw new Error(result.error);return result;};
  const one=await chrome.windows.create({url:'about:blank',focused:false});
  const two=await chrome.windows.create({url:'about:blank',focused:false});
  const make=async(windowId,key)=>{
   const tab=await chrome.tabs.create({windowId,url:'https://www.youtube.com/watch?v='+key,active:false});
   for(let i=0;i<100;i++){const fresh=await chrome.tabs.get(tab.id);if(fresh.status==='complete'&&fresh.url.startsWith('https:'))return fresh;await new Promise(resolve=>setTimeout(resolve,50));}
   throw new Error('Media test tab did not load');
  };
  try {
   const original=await chrome.tabs.group({tabIds:[one.tabs[0].id],createProperties:{windowId:one.id}});
   await chrome.tabGroups.update(original,{title:'Media / SNS',color:'red',collapsed:true});
   const a=await make(one.id,'a'),b=await make(two.id,'b'),c=await make(two.id,'c');
   const before=await chrome.tabGroups.get(original);
   await send({type:'setGroupingMode',groupingMode:'preserve'});
   const {plan}=await send({type:'preview',allWindows:true});
   await send({type:'apply',plan});
   const applied=await Promise.all([a,b,c].map(tab=>chrome.tabs.get(tab.id)));
   const copied=await chrome.tabGroups.get(applied[1].groupId);
   await send({type:'undo'});
   const restored=await Promise.all([a,b,c].map(tab=>chrome.tabs.get(tab.id)));
   return {original,windows:[one.id,two.id],ids:[a.id,b.id,c.id],plan:plan.groups.map(g=>({target:g.targetGroupId,windowId:g.windowId,title:g.title,ids:g.tabIds})),applied:applied.map(t=>({windowId:t.windowId,groupId:t.groupId})),copied,restored:restored.map(t=>({windowId:t.windowId,groupId:t.groupId})),before,after:await chrome.tabGroups.get(original),originalMember:(await chrome.tabs.get(one.tabs[0].id)).groupId};
  }finally{await chrome.windows.remove(one.id);await chrome.windows.remove(two.id);}
 });
 assert.equal(purpose.plan.length,2);
 assert.deepEqual(purpose.plan.find(g=>g.windowId===purpose.windows[0]),{target:purpose.original,windowId:purpose.windows[0],title:'Media / SNS',ids:[purpose.ids[0]]});
 const copy=purpose.plan.find(g=>g.windowId===purpose.windows[1]);assert.equal(copy.target,undefined);assert.equal(copy.title,'Media / SNS');assert.deepEqual(copy.ids,[purpose.ids[1],purpose.ids[2]]);
 assert.deepEqual(purpose.applied.map(t=>t.windowId),[purpose.windows[0],purpose.windows[1],purpose.windows[1]]);
 assert.equal(purpose.applied[0].groupId,purpose.original);assert.notEqual(purpose.copied.id,purpose.original);assert.equal(purpose.applied[1].groupId,purpose.applied[2].groupId);assert.equal(purpose.copied.title,'Media / SNS');
 assert.deepEqual(purpose.restored,[{windowId:purpose.windows[0],groupId:-1},{windowId:purpose.windows[1],groupId:-1},{windowId:purpose.windows[1],groupId:-1}]);
 assert.deepEqual(purpose.after,purpose.before);assert.equal(purpose.originalMember,purpose.original);
 console.log('Native Chromium: named Media append and cross-window category copy preserve windows and undo');

} finally {await context?.close();await rm(profile,{recursive:true,force:true});}
