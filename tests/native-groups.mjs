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
 const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
 const id=new URL(worker.url()).host;
 const page=await context.newPage();await page.goto(`chrome-extension://${id}/options.html`);
 const result=await page.evaluate(async()=>{
  const send=async request=>{const r=await chrome.runtime.sendMessage(request);if(!r.ok)throw new Error(r.error);return r;};
  const window=await chrome.windows.create({url:'about:blank',focused:false});
  const make=path=>chrome.tabs.create({windowId:window.id,url:'https://tabfold-test.invalid/'+path,active:false});
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
} finally {await context?.close();await rm(profile,{recursive:true,force:true});}
