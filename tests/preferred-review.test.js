import test from 'node:test';
import assert from 'node:assert/strict';
import {preferredGroup} from '../extension/preferred-groups.js';
import {clusterTabs} from '../extension/clustering.js';
import {classifyTabs} from '../extension/ai.js';
import {buildPreview} from '../extension/core.js';
const tab=(id,url,extra={})=>({id,url,title:'Unrelated topic',windowId:1,groupId:-1,...extra});
const images={id:20,windowId:1,title:'Images',color:'purple',tabs:[]};

test('review: image detection uses path extensions, not query or deceptive title',()=>{
 assert.equal(preferredGroup(tab(1,'https://example.test/file.png?private=1')).title,'Images');
 for(const url of ['https://google.com/search?q=photo.png','https://example.test/page?file=photo.png','https://example.test/photo.png.html'])assert.equal(preferredGroup(tab(3,url,{title:'photo.png'})),null);
});

test('review: preferred groups respect existing-name opt-out, ambiguity, regroup and protected members',()=>{
 const inputs=[tab(1,'https://assets.test/a.png'),tab(2,'https://assets.test/b.png')];
 assert.equal(clusterTabs(inputs,{existingGroups:[images]}).get(1).targetGroupId,20);
 for(const options of [{existingGroups:[]},{existingGroups:[images],regroup:true},{existingGroups:[images,{...images,id:21}]},{existingGroups:[{...images,windowId:2}]}]){
  const result=clusterTabs(inputs,options);for(const value of result.values())assert.equal(value.targetGroupId,undefined);
 }
 const protectedTabs=['pinned','audible','incognito'].map((flag,i)=>tab(30+i,'https://assets.test/'+i+'.png',{[flag]:true}));
 const member=tab(50,'https://assets.test/member.png',{groupId:20});
 const plan=buildPreview([...inputs,...protectedTabs,member],{allWindows:true,existingGroups:[images]});
 assert.deepEqual(plan.groups[0].tabIds,[1,2]);assert.equal(plan.groups[0].targetGroupId,20);
 assert.equal(plan.protectedCount,4);
});

test('review: mixed paid batch cannot override preferred tabs or reintroduce them as suggestions',async()=>{
 const inputs=[tab(1,'https://assets.test/first.png'),tab(2,'https://assets.test/a.png'),tab(3,'https://example.org/obscure')];
 let calls=0;
 const result=await classifyTabs(inputs,'test-key',async(_url,options)=>{
  calls++;const body=JSON.parse(options.body);assert.deepEqual(body.state.tabs.map(t=>t.id),[3]);
  return {ok:true,json:async()=>({answers:{tab_3:{type:'choice',choice:'other',confidence:1,probabilities:{other:1}}}})};
 },{existingGroups:[images],ignoreCategories:false,suggestNew:true});
 assert.equal(calls,1);assert.equal(result.get(1).title,'Images');assert.equal(result.get(2).targetGroupId,20);assert.deepEqual(result.suggestions,[]);
});

test('review round 2: model-selected preferred category and URL rule share one new group',async()=>{
 const inputs=[tab(1,'https://assets.test/a.png'),tab(2,'https://assets.test/b.png'),tab(3,'https://finance.example/stock-a'),tab(4,'https://finance.example/stock-b')];
 for(const color of ['green','purple']){
 const classifications=await classifyTabs(inputs,'test-key',async(_url,options)=>{
  const body=JSON.parse(options.body);
  return {ok:true,json:async()=>({answers:Object.fromEntries(body.state.tabs.map(t=>['tab_'+t.id,{type:'choice',choice:'c0',confidence:1}]))})};
 },{categories:[{title:'Images',criteria:'Image files.',color}],suggestNew:false});
 const plan=buildPreview(inputs,{allWindows:true},classifications);
 assert.equal(plan.groups.length,1,'one category must not split by classification origin');
 assert.deepEqual(plan.groups[0].tabIds,[1,2,3,4]);
 const pair=buildPreview([inputs[0],inputs[2]],{allWindows:true},classifications);
 assert.equal(pair.groups.length,1,'one preferred plus one model-classified tab must not disappear as singletons');
 }
});

test('review round 2: duplicate physical targets abstain instead of adding a third group',async()=>{
 const existing=[images,{...images,id:21,color:'red'}];
 const inputs=[tab(1,'https://assets.test/a.png'),tab(2,'https://assets.test/b.png')];
 const before=structuredClone(existing);
 const classifications=await classifyTabs(inputs,'test-key',()=>{throw new Error('No paid decision for explicit preferred URLs');},{existingGroups:existing,suggestNew:true});
 for(const result of [clusterTabs(inputs,{existingGroups:existing}),classifications]){
  const plan=buildPreview(inputs,{allWindows:true,existingGroups:existing},result);
  assert.equal(plan.groups.length,0,'ambiguous existing targets must not create a third group');
 }
 assert.deepEqual(existing,before);assert.deepEqual(classifications.suggestions,[]);
 const regrouped=buildPreview(inputs,{allWindows:true,existingGroups:existing,groupingMode:'regroup'});
 assert.equal(regrouped.groups.length,1);assert.equal(regrouped.groups[0].targetGroupId,undefined);
});

test('review round 3: canonical preferred identity attaches same-window AI category while keeping other windows separate',async()=>{
 const inputs=[tab(1,'https://assets.test/a.png'),tab(2,'https://finance.example/a'),tab(3,'https://finance.example/b',{windowId:2}),tab(4,'https://finance.example/c',{windowId:2})];
 const classifications=await classifyTabs(inputs,'test-key',async(_url,options)=>{
  const body=JSON.parse(options.body);
  return {ok:true,json:async()=>({answers:Object.fromEntries(body.state.tabs.map(t=>['tab_'+t.id,{type:'choice',choice:Object.hasOwn(body.questions['tab_'+t.id].criteria,'group_20')?'group_20':'c0',confidence:1}]))})};
 },{existingGroups:[images],categories:[{title:'images',criteria:'Image files.',color:'red'}],suggestNew:false});
 const plan=buildPreview(inputs,{allWindows:true,existingGroups:[images]},classifications);
 assert.equal(plan.groups.length,2);
 const first=plan.groups.find(g=>g.windowId===1),second=plan.groups.find(g=>g.windowId===2);
 assert.equal(first.targetGroupId,images.id);assert.equal(first.color,images.color);assert.deepEqual(first.tabIds,[1,2]);
 assert.equal(second.targetGroupId,undefined);assert.deepEqual(second.tabIds,[3,4]);
 // An explicitly model-selected different physical group is never absorbed by name alone.
 const other={...images,id:22,title:'Images',color:'yellow'};
 const explicit=new Map([[1,{title:'Images',color:'purple',targetGroupId:20}],[2,{title:'Images',color:'yellow',targetGroupId:22}]]);
 const separate=buildPreview(inputs.slice(0,2),{allWindows:true,existingGroups:[images,other]},explicit);
 assert.deepEqual(separate.groups.map(g=>g.targetGroupId),[20,22]);
});
