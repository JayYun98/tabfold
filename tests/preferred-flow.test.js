import test from 'node:test';
import assert from 'node:assert/strict';
import {clusterTabs} from '../extension/clustering.js';
import {classifyTabs} from '../extension/ai.js';
import {buildPreview} from '../extension/core.js';
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


test('image preview respects source windows and protected tabs',()=>{
 const tabs=[1,2].flatMap(windowId=>[1,2].map(n=>({id:windowId*10+n,windowId,title:'opaque '+n,url:`https://images.test/${windowId}/${n}.png`,groupId:-1})));
 const source=[...tabs,...['pinned','audible','incognito'].map((flag,i)=>({...tabs[0],id:30+i,[flag]:true}))];
 const plan=buildPreview(source,{allWindows:true});
 assert.equal(plan.groups.length,2);assert.equal(plan.protectedCount,3);
 for(const group of plan.groups){assert.equal(group.title,'Images');assert.ok(group.tabs.every(t=>t.windowId===group.windowId));assert.ok(group.tabIds.every(id=>id<30));}
});
test('job and financial sites go through model classification instead of site rules',async()=>{
 const tabs=[{id:1,windowId:1,title:'Engineer vacancy',url:'https://jobs.ashbyhq.com/company/1'},{id:2,windowId:1,title:'Open roles',url:'https://careers.nebius.com/'},{id:3,windowId:1,title:'Stock quote',url:'https://tossinvest.com/stocks/1'}];
 let calls=0;
 const result=await classifyTabs(tabs,'key',async(_url,options)=>{calls++;const body=JSON.parse(options.body);assert.deepEqual(body.state.tabs.map(t=>t.id),[1,2,3]);return {ok:true,json:async()=>({answers:Object.fromEntries(tabs.map(t=>['tab_'+t.id,{type:'choice',choice:t.id===3?'other':'group_9',confidence:.9}]))})};},{existingGroups:[{id:9,windowId:1,title:'My hiring list',color:'green'}],suggestNew:false});
 assert.equal(calls,1);assert.equal(result.get(1).targetGroupId,9);assert.equal(result.get(2).targetGroupId,9);assert.equal(result.get(3).clusterId,'unassigned:3');
});
