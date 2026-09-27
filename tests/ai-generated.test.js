import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyTabs} from '../extension/ai.js';
import {buildPreview} from '../extension/core.js';
test('OpenRouter generated groups enter the preview without saved-category changes or secret URLs',async()=>{
 const tabs=[1,2].map(id=>({id,windowId:1,title:'Atlas reference '+id,url:'https://example.test/'+id+'?token=private',groupId:-1}));
 const categories=[{title:'Saved',criteria:'Saved category scope',color:'red'}],before=JSON.stringify(categories),calls=[];
 const result=await classifyTabs(tabs,'key',async(url,options)=>{
  const body=JSON.parse(options.body);calls.push(url);assert.ok(!options.body.includes('private'));assert.ok(!options.body.includes('Saved category scope'));
  if(url.endsWith('/chat/completions')){assert.equal(body.model,'openai/gpt-4.1');return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({categories:[{title:'Atlas',criteria:'Atlas project references'}]})}}]})};}
  assert.equal(body.model,'typesafe/jev-1.13');return {ok:true,json:async()=>({answers:Object.fromEntries(Object.entries(body.questions).map(([id,q])=>{const choice=Object.keys(q.criteria)[0];return [id,{type:'choice',choice,confidence:.95,probabilities:Object.fromEntries(Object.keys(q.criteria).map(k=>[k,k===choice?.95:.05]))}];}))})};
 },{categories,ignoreCategories:true,suggestNew:true});
 assert.equal(calls.length,2);assert.equal(JSON.stringify(categories),before);assert.equal(result.otherCount,0);assert.deepEqual(result.suggestions,[]);
 const preview=buildPreview(tabs,{allWindows:true},result);assert.equal(preview.groups.length,1);assert.deepEqual(preview.groups[0].tabIds,[1,2]);assert.equal(preview.groups[0].title,'Atlas');
});
test('disabled generation makes no planning request; planner failure keeps initial assignments safe',async()=>{
 const tabs=[1,2].map(id=>({id,windowId:1,title:'Atlas '+id,url:'https://example.test/'+id}));
 const off=await classifyTabs(tabs,'key',()=>{throw Error('must not call');},{ignoreCategories:true,suggestNew:false});assert.equal(off.otherCount,2);
 let calls=0;const failure=await classifyTabs(tabs,'key',async(url)=>{calls++;assert.ok(url.endsWith('/chat/completions'));return {ok:false,status:429};},{ignoreCategories:true,suggestNew:true});
 assert.equal(calls,1);assert.equal(failure.otherCount,2);assert.match(failure.suggestionError,/rate limit/);assert.ok([...failure.values()].every(g=>g.clusterId.startsWith('unassigned:')));
});
