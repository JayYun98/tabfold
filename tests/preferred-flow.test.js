import test from 'node:test';
import assert from 'node:assert/strict';
import {clusterTabs} from '../extension/clustering.js';
import {classifyTabs} from '../extension/ai.js';
import {buildPreview} from '../extension/core.js';
const titles=['$610.00 +8.96% | AMD','$11.60 +8.00% | 레드와이어','apple screenshot size decrease app - Google Search','잠실 필라 치클볼 오픈 기념 ㅁ쳉머 - Google Search','jev image encoder - Google Search','ㅐ ㅔ두챙ㄷ 해 - Google Search'];
const tabs=titles.map((title,id)=>({id:id+1,title,windowId:1,url:id<2?`https://www.tossinvest.com/stocks/${id}`:`https://www.google.com/search?q=${id}`,groupId:-1}));
test('six explicit preferred examples beat topic inference in quick and AI paths without a paid request',async()=>{
 const existingGroups=[{id:20,windowId:1,title:'Research',color:'blue',tabs:[{id:50,title:titles[4],url:tabs[4].url,windowId:1}]}];
 for(const regroup of [false,true]){
  const quick=clusterTabs(tabs,{existingGroups,regroup});
  const ai=await classifyTabs(tabs,'test-key',()=>{throw new Error('Preferred rules must run before paid AI');},{existingGroups,regroup,ignoreCategories:true,suggestNew:true});
  for(const result of [quick,ai]) for(const tab of tabs) assert.equal(result.get(tab.id).title,tab.id<=2?'Investment':'Google search');
  assert.deepEqual(ai.suggestions,[]);
 }
});
test('preferred preview respects source windows and protected tabs',()=>{
 const source=[...tabs,...tabs.map(t=>({...t,id:t.id+10,windowId:2})),{...tabs[0],id:30,pinned:true},{...tabs[1],id:31,audible:true},{...tabs[2],id:32,incognito:true}];
 const plan=buildPreview(source,{allWindows:true});
 assert.equal(plan.groups.length,4);assert.equal(plan.protectedCount,3);
 for(const group of plan.groups){assert.ok(group.tabs.every(t=>t.windowId===group.windowId));assert.ok(group.tabIds.every(id=>id<30));}
 assert.equal(plan.groups.filter(g=>g.title==='Google search').length,2);
});
