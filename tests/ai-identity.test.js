import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyTabs} from '../extension/ai.js';
import {buildPreview} from '../extension/core.js';
test('saved category cannot create a duplicate of a matching existing group',async()=>{
 const tabs=[1,2,3].map(id=>({id,windowId:1,title:'A new article '+id,url:'https://example.com/'+id,groupId:-1}));
 const existingGroups=[{id:10,windowId:1,title:'Research',color:'green',tabs:[]}];
 const result=await classifyTabs(tabs,'test',async(url,options)=>{
  const {questions}=JSON.parse(options.body);assert.deepEqual(Object.keys(questions.tab_1.criteria),['group_10','other']);
  return {ok:true,json:async()=>({answers:Object.fromEntries(tabs.map(t=>['tab_'+t.id,{type:'choice',choice:'group_10',confidence:.9}]))})};
 },{existingGroups,categories:[{title:'research',criteria:'Academic research',color:'blue'}]});
 const plan=buildPreview(tabs,{allWindows:true,existingGroups},result);assert.equal(plan.groups.length,1);assert.equal(plan.groups[0].targetGroupId,10);assert.equal(plan.groups[0].tabIds.length,3);
});

test('identical full metadata shares one decision per window without merging different private URLs',async()=>{
 const source=[
  {id:1,windowId:1,title:'Atlas reference',url:'https://example.test/page?q=one'},
  {id:2,windowId:1,title:'Atlas reference',url:'https://example.test/page?q=one'},
  {id:3,windowId:1,title:'Atlas reference',url:'https://example.test/page?q=two'},
  {id:4,windowId:2,title:'Atlas reference',url:'https://example.test/page?q=one'},
 ];
 const requested=[];
 const result=await classifyTabs(source,'test',async(_url,options)=>{
  const body=JSON.parse(options.body);requested.push(body.state.tabs.map(t=>t.id));
  assert.ok(body.state.tabs.every(t=>!t.url.includes('?')),'Private query stays outside provider payload');
  return {ok:true,json:async()=>({answers:Object.fromEntries(body.state.tabs.map(t=>['tab_'+t.id,{type:'choice',choice:t.id===2?'other':'c0',confidence:.9}]))})};
 },{categories:[{title:'Reference',criteria:'Project reference documentation',color:'blue'}]});
 assert.deepEqual(requested,[[1,3],[4]]);
 assert.deepEqual(result.get(1),result.get(2));assert.equal(result.size,4);
});
