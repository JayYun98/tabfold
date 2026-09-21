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

test('image path extensions replace opaque filenames in Quick and AI without inspecting query strings',async()=>{
 const images=[{id:1,windowId:1,title:'646556070-a03db9c0-f78a-46e8-8e50-b23634701635.png (4500×919)',url:'https://private-user-images.githubusercontent.com/123/646556070-a03db9c0-f78a-46e8-8e50-b23634701635.png?token=private#fragment'},{id:2,windowId:1,title:'Opaque filename',url:'https://images.example/asset%2EWEBP'}];
 const quick=clusterTabs(images);
 const ai=await classifyTabs(images,'test-key',()=>{throw new Error('Images need no AI request');});
 for(const result of [quick,ai]) for(const tab of images) assert.equal(result.get(tab.id).title,'Images');
 const plan=buildPreview(images,{allWindows:true},ai);assert.equal(plan.groups.length,1);assert.equal(plan.groups[0].title,'Images');
 const unrelated=clusterTabs([{id:3,windowId:1,title:'Photo instructions',url:'https://example.com/article?file=photo.png'},{id:4,windowId:1,title:'PNG tutorial',url:'https://example.com/photo.png.html'}]);
 for(const result of unrelated.values()) assert.notEqual(result.title,'Images');
 const existing={id:10,windowId:1,title:'Images',color:'cyan',tabs:[]};
 assert.equal(clusterTabs(images,{existingGroups:[existing]}).get(1).targetGroupId,10);
});

test('Ashby and Nebius hiring pages use Job or the existing recruiting group in both previews',async()=>{
 const jobs=['Forward Deployed Engineer - ML @ Modal','Senior Data Scientist @ Peec AI','AI Engineer @ Distyl AI','Find your role: Open positions at Nebius','Find your role: Open positions at Nebius'].map((title,i)=>({id:i+1,windowId:1,title,url:i<3?`https://jobs.ashbyhq.com/company/${i}`:'https://careers.nebius.com/',groupId:-1}));
 for(const existingGroups of [[],[{id:20,windowId:1,title:'Job Recruit',color:'green'}]]) for(const regroup of [false,true]) {
  const options={existingGroups,regroup};
  const quick=clusterTabs(jobs,options);
  const ai=await classifyTabs(jobs,'test-key',()=>{throw new Error('Known job pages need no AI request');},options);
  for(const result of [quick,ai]) for(const tab of jobs){
   assert.equal(result.get(tab.id).title,existingGroups.length?'Job Recruit':'Job');
   assert.equal(result.get(tab.id).targetGroupId,existingGroups.length&&!regroup?20:undefined);
  }
  assert.equal(buildPreview(jobs,{allWindows:true,groupingMode:regroup?'regroup':'preserve'},ai).groups.length,1);
 }
 const {preferredGroup}=await import('../extension/preferred-groups.js');
 for(const url of ['https://nebius.com/','https://ashbyhq.com/','https://app.ashbyhq.com/','https://jobs.ashbyhq.com.evil.example/','https://careers.nebius.com.evil.example/']) assert.equal(preferredGroup({id:10,windowId:1,url}),null);
 assert.equal(preferredGroup({id:11,windowId:1,url:'https://www.google.com/search?q=jobs.ashbyhq.com'}).title,'Google search');
});


test('job preferences reuse cross-window names and abstain from ambiguous recruiting targets',async()=>{
 const jobs=[1,2].map(id=>({id,windowId:1,url:`https://jobs.ashbyhq.com/company/${id}`,title:'Engineer',groupId:-1}));
 for(const existingGroups of [[{id:20,windowId:2,title:'Job Recruit',color:'green'}],[{id:20,windowId:1,title:'Job Recruit'},{id:21,windowId:1,title:'Job Recruit'}]]){
  const quick=clusterTabs(jobs,{existingGroups});
  const ai=await classifyTabs(jobs,'test-key',()=>{throw new Error('No AI expected');},{existingGroups});
  for(const result of [quick,ai]){
   for(const tab of jobs) assert.equal(result.get(tab.id).targetGroupId,undefined);
   const plan=buildPreview(jobs,{allWindows:true},result);
   if(existingGroups.length===1){assert.equal(plan.groups.length,1);assert.equal(plan.groups[0].title,'Job Recruit');assert.equal(plan.groups[0].windowId,1);}
   else assert.equal(plan.groups.length,0);
  }
 }
});


test('one Ashby and one LinkedIn job share the reused recruiting name in preview',async()=>{
 const jobs=[{id:1,windowId:1,url:'https://jobs.ashbyhq.com/company/1',title:'Engineer',groupId:-1},{id:2,windowId:1,url:'https://www.linkedin.com/jobs/view/2',title:'Scientist',groupId:-1}];
 const existingGroups=[{id:9,windowId:2,title:'Job Recruit',color:'green'}];
 for(const result of [clusterTabs(jobs,{existingGroups}),await classifyTabs(jobs,'test-key',()=>{throw new Error('No AI expected');},{existingGroups})]){
  const plan=buildPreview(jobs,{allWindows:true,existingGroups},result);
  assert.equal(plan.groups.length,1);assert.equal(plan.groups[0].title,'Job Recruit');assert.deepEqual(plan.groups[0].tabIds,[1,2]);
 }
});
