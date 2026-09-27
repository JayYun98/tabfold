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
 await context.route(url=>['www.google.com','www.tossinvest.com'].includes(url.hostname),route=>route.fulfill({contentType:'text/html',body:'<title>Unrelated test title</title>'}));
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
  await new Promise(resolve=>setTimeout(resolve,150));
  await chrome.tabs.update(one.tabs[0].id,{url:'https://www.youtube.com/watch?v=original'});
  for(let i=0;i<100;i++){if((await chrome.tabs.get(one.tabs[0].id)).title==='Unrelated video title')break;await new Promise(resolve=>setTimeout(resolve,50));}
  const two=await chrome.windows.create({url:'about:blank',focused:false});
  const make=async(windowId,key)=>{
   const tab=await chrome.tabs.create({windowId,url:'about:blank',active:false});
   await new Promise(resolve=>setTimeout(resolve,150));
   await chrome.tabs.update(tab.id,{url:'https://www.youtube.com/watch?v='+key});
   for(let i=0;i<100;i++){const fresh=await chrome.tabs.get(tab.id);if(fresh.status==='complete'&&fresh.title==='Unrelated video title')return fresh;await new Promise(resolve=>setTimeout(resolve,50));}
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

 const preferred=await page.evaluate(async()=>{
  const send=async request=>{const result=await chrome.runtime.sendMessage(request);if(!result.ok)throw new Error(result.error);return result;};
  const win=await chrome.windows.create({url:'about:blank',focused:false});
  const make=async(url,pinned=false)=>{
   const tab=await chrome.tabs.create({windowId:win.id,url:'about:blank',active:false,pinned});
   await new Promise(resolve=>setTimeout(resolve,150));
   await chrome.tabs.update(tab.id,{url});
   for(let i=0;i<100;i++){const fresh=await chrome.tabs.get(tab.id);if(fresh.status==='complete'&&fresh.url.startsWith('https:'))return fresh;await new Promise(resolve=>setTimeout(resolve,50));}
   throw new Error('Preferred test tab did not load');
  };
  try {
   const google=await make('https://images.invalid/first.png');
   const googleTwo=await make('https://images.invalid/second.webp');
   const toss=await make('https://www.tossinvest.com/stocks/US1');
   const tossTwo=await make('https://www.tossinvest.com/stocks/US2');
   const pinned=await make('https://images.invalid/protected.png',true);
   const tabs=[google,googleTwo,toss,tossTwo];
   const {plan}=await send({type:'preview',windowId:win.id});
   await send({type:'apply',plan});
   const applied=await Promise.all(tabs.map(tab=>chrome.tabs.get(tab.id)));
   if(applied.some(tab=>tab.groupId<0))throw new Error(JSON.stringify({plan:plan.groups.map(g=>({title:g.title,ids:g.tabIds})),tabs:applied.map(t=>({id:t.id,url:t.url,groupId:t.groupId}))}));
   const appliedNames=await Promise.all(applied.map(async tab=>(await chrome.tabGroups.get(tab.groupId)).title));
   const protectedAfter=await chrome.tabs.get(pinned.id);
   await send({type:'undo'});
   const restored=await Promise.all(tabs.map(tab=>chrome.tabs.get(tab.id)));
   const protectedRestored=await chrome.tabs.get(pinned.id);
   return {windowId:win.id,ids:tabs.map(t=>t.id),groups:plan.groups.map(g=>({title:g.title,ids:g.tabIds})),appliedNames,windows:applied.map(t=>t.windowId),restored:restored.map(t=>({windowId:t.windowId,groupId:t.groupId})),protectedAfter:{windowId:protectedAfter.windowId,pinned:protectedAfter.pinned,groupId:protectedAfter.groupId},protectedRestored:{windowId:protectedRestored.windowId,pinned:protectedRestored.pinned,groupId:protectedRestored.groupId}};
  }finally{await chrome.windows.remove(win.id);}
 });
 assert.equal(preferred.groups.length,2);
 assert.deepEqual(preferred.groups.find(g=>g.title==='Images').ids,preferred.ids.slice(0,2));
 assert.deepEqual(preferred.groups.find(g=>g.title==='Unrelated test title').ids,preferred.ids.slice(2));
 assert.deepEqual(preferred.appliedNames,['Images','Images','Unrelated test title','Unrelated test title']);
 assert.ok(preferred.windows.every(id=>id===preferred.windowId));
 assert.deepEqual(preferred.restored,preferred.ids.map(()=>({windowId:preferred.windowId,groupId:-1})));
 assert.deepEqual(preferred.protectedAfter,{windowId:preferred.windowId,pinned:true,groupId:-1});assert.deepEqual(preferred.protectedRestored,preferred.protectedAfter);
 console.log('Native Chromium: image rule and coherent title groups apply/undo without moving windows or pinned tabs');


 // Exercise the popup through the real extension worker and native tab-group APIs.
 await page.evaluate(async()=>{await chrome.runtime.sendMessage({type:'setGroupingMode',groupingMode:'preserve'});await chrome.runtime.sendMessage({type:'setPreferences',preferences:{useExistingGroups:false}});});
 const popupTabs=[];
 for(const suffix of ['popup-a','popup-b']){const tab=await context.newPage();await tab.goto('https://popup-ux.invalid/'+suffix);popupTabs.push(tab);}
 await page.goto(`chrome-extension://${id}/popup.html`);
 await page.waitForFunction(()=>!document.querySelector('#refresh').disabled&&document.querySelector('#total').textContent!=='—');
 assert.equal(await page.locator('#existingSection').getAttribute('open'),null);
 assert.equal(await page.locator('#aiPreview').textContent(),'Set up AI');
 assert.equal(await page.locator('#apply').isEnabled(),true);
 const nativeMembers=()=>page.evaluate(async()=>(await chrome.tabs.query({})).filter(t=>t.url?.startsWith('https://popup-ux.invalid/')).map(t=>({id:t.id,groupId:t.groupId,windowId:t.windowId})));
 const popupBefore=await nativeMembers();assert.equal(popupBefore.length,2);assert.ok(popupBefore.every(t=>t.groupId===-1));
 await page.locator('#apply').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled&&document.querySelector('#undo').disabled===false);
 const popupAfter=await nativeMembers();assert.ok(popupAfter.every(t=>t.groupId>=0));assert.equal(popupAfter[0].groupId,popupAfter[1].groupId);
 assert.deepEqual(popupAfter.map(t=>t.windowId),popupBefore.map(t=>t.windowId));
 await page.locator('#undo').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled&&document.querySelector('#undo').disabled);
 assert.deepEqual(await nativeMembers(),popupBefore);
 console.log('Native Chromium popup: real worker preview, Apply and Undo preserve tabs and windows');

} finally {await context?.close();await rm(profile,{recursive:true,force:true});}
