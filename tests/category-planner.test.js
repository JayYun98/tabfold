import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverGeneratedCategories} from '../extension/category-planner.js';
const tab=(id,windowId=1)=>({id,windowId,title:'Document '+id,url:'https://example.test/'+id+'?token=secret'});
const planned=categories=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({categories})}}]});
const category=title=>({title,criteria:'Documents concerning '+title});
function decisions(request,select=()=>0,confidence=.9){
 return {answers:Object.fromEntries(Object.entries(request.questions).map(([id,q])=>{const keys=Object.keys(q.criteria),chosen=keys[select(Number(id.slice(4)),keys)]??'other',n=keys.length-1;return [id,{type:'choice',choice:chosen,confidence,probabilities:Object.fromEntries(keys.map(key=>[key,key===chosen?.9:.1/n]))}];}))};
}
test('fresh discovery uses one bounded vocabulary for all tabs',async()=>{
 let plans=0,decides=0;
 const result=await discoverGeneratedCategories([tab(1),tab(2),tab(3),tab(4)],{
  plan:async body=>{plans++;const state=JSON.parse(body.messages[1].content);assert.deepEqual(Object.keys(state),['tabs']);assert.equal(state.tabs.length,4);const schema=body.response_format.json_schema.schema.properties.categories;assert.equal(schema.maxItems,38);assert.equal(schema.items.properties.title.maxLength,undefined);return planned([category('Alpha'),category('Beta')]);},
  decide:async request=>{decides++;return decisions(request,id=>id<=2?0:1);},
 });
 assert.equal(plans,1);assert.equal(decides,1);assert.deepEqual(result.suggestions.map(s=>s.tabIds),[[1,2],[3,4]]);assert.equal(result.requests,2);
});
test('exact raw identities share decisions; different queries and windows do not',async()=>{
 const a={...tab(1),title:'https://user:password@example.test/doc?token=secret#hidden',url:'https://user:password@example.test/doc?token=secret#hidden'};
 const input=[a,{...a,id:2},{...a,id:3,url:'https://user:password@example.test/doc?token=different#hidden'},{...a,id:4,windowId:2}];let ids;
 const result=await discoverGeneratedCategories(input,{plan:async body=>{assert.ok(!JSON.stringify(body).match(/password|secret|different|hidden/));const state=JSON.parse(body.messages[1].content);assert.deepEqual(state.tabs.map(t=>t.count),[2,1,1]);return planned([category('Alpha')]);},decide:async request=>{ids=request.state.tabs.map(t=>t.id);assert.ok(!JSON.stringify(request).includes('secret'));return decisions(request);}});
 assert.deepEqual(ids,[1,3,4]);assert.deepEqual(result.suggestions[0].tabIds,[1,2,3]);
 const duplicateOnly=await discoverGeneratedCategories([a,{...a,id:2}],{plan:async()=>planned([category('Alpha')]),decide:async request=>decisions(request)});assert.deepEqual(duplicateOnly.suggestions[0].tabIds,[1,2]);
});
test('singletons, excluded categories, and low final confidence never create groups',async()=>{
 const noCall=()=>{throw Error('unexpected call');};assert.equal((await discoverGeneratedCategories([tab(1)],{plan:noCall,decide:noCall})).requests,0);
 const excluded=await discoverGeneratedCategories([tab(1),tab(2)],{excludeNames:[' ALPHA '],plan:async body=>{assert.deepEqual(JSON.parse(body.messages[1].content).excludedNames,[' ALPHA ']);return planned([category('Alpha')]);},decide:noCall});assert.deepEqual(excluded.suggestions,[]);
 const separate=await discoverGeneratedCategories([tab(1),tab(2,2)],{plan:async()=>planned([category('Alpha')]),decide:async request=>decisions(request)});assert.deepEqual(separate.suggestions,[]);
 const low=await discoverGeneratedCategories([tab(1),tab(2)],{plan:async()=>planned([category('Alpha')]),decide:async request=>decisions(request,()=>0,.6)});assert.deepEqual(low.suggestions,[]);
});
test('malformed planner names and malformed decision keys or probability distributions fail closed',async()=>{
 for(const categories of [[category('x'.repeat(81))],[category('Alpha'),category(' alpha ')]] )await assert.rejects(discoverGeneratedCategories([tab(1),tab(2)],{plan:async()=>planned(categories),decide:async()=>{throw Error('must not classify');}}),/Invalid generated/);
 for(const change of [a=>{delete a.tab_1;},a=>{a.tab_1.confidence=undefined;},a=>{a.tab_1.probabilities.generated_0=.5;},a=>{a.tab_1.probabilities.unknown=0;},a=>{delete a.tab_1.probabilities.other;}])await assert.rejects(discoverGeneratedCategories([tab(1),tab(2)],{plan:async()=>planned([category('Alpha')]),decide:async request=>{const r=decisions(request);change(r.answers);return r;}}),/Invalid generated/);
});
test('reserved abstention names cannot become generated groups',async()=>{
 for(const title of ['Other',' 기타 ','UNASSIGNED','Unknown']){
  let classified=false;
  await assert.rejects(discoverGeneratedCategories([tab(1),tab(2)],{plan:async()=>planned([category(title)]),decide:async request=>{classified=true;return decisions(request);}}),/Invalid generated/);
  assert.equal(classified,false);
 }
});
test('complete generated names beyond aesthetic target remain intact within backend limit',async()=>{
 for(const title of ['Collaborative Research Project References','Collaborative Research Project Collections']){
  assert.ok(title.length>=41&&title.length<=42);
  const result=await discoverGeneratedCategories([tab(1),tab(2)],{plan:async body=>{assert.equal(body.response_format.json_schema.schema.properties.categories.items.properties.title.maxLength,undefined);return planned([category(title)]);},decide:async request=>decisions(request)});
  assert.equal(result.suggestions[0].title,title);
 }
 const title='A'.repeat(80);
 const boundary=await discoverGeneratedCategories([tab(1),tab(2)],{plan:async()=>planned([category(title)]),decide:async request=>decisions(request)});
 assert.equal(boundary.suggestions[0].title,title);
});
test('500 distinct tabs respect single-pass request cap without truncation',async()=>{
 let plans=0,classified=0;const result=await discoverGeneratedCategories(Array.from({length:500},(_,i)=>tab(i)),{plan:async()=>planned([category('Round '+ ++plans)]),decide:async request=>{classified+=request.state.tabs.length;return decisions(request,(_id,keys)=>keys.length-1);}});assert.equal(plans,1);assert.equal(classified,500);assert.equal(result.requests,26);assert.deepEqual(result.suggestions,[]);
 await assert.rejects(discoverGeneratedCategories(Array.from({length:501},(_,i)=>tab(i)),{plan:async()=>planned([]),decide:async()=>({})}),/500/);
});
test('failed later batches never expose partial assignments',async()=>{
 for(const failure of ['network','malformed']){
  let batches=0;
  await assert.rejects(discoverGeneratedCategories(Array.from({length:22},(_,i)=>tab(i+1)),{
   plan:async()=>planned([category('Alpha')]),
   decide:async request=>{if(++batches===2){if(failure==='network')throw new Error('Request timed out');return {answers:{}};}return decisions(request);},
  }),failure==='network'?/timed out/:/Invalid generated/);
  assert.equal(batches,2);
 }
});
