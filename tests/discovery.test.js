import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateLabels,discoverCategories} from '../extension/discovery.js';
const tab=(id,windowId=1)=>({id,windowId,title:'Adaptive decoding research '+id,url:'https://example.test/paper/'+id+'?secret=hidden#private'});
function ask({state,questions}){
 const answers={};for(const [id,q] of Object.entries(questions)){
  if(q.type==='noul')answers[id]={type:'noul',noul:.85};
  else if(state.representatives)answers[id]={type:'choice',choice:'r0',confidence:.55,probabilities:Object.fromEntries(Object.keys(q.criteria).map(key=>[key,key==='r0'?.8:key==='other'?.2:0]))};
  else {const key=Object.keys(q.criteria).find(k=>q.criteria[k]==='Adaptive decoding')||Object.keys(q.criteria)[0];answers[id]={type:'choice',choice:key,confidence:.1,probabilities:{[key]:.25,reject:.1}};}
 }return {answers};
}
test('discovery derives labels and verifies coherence without requiring label-choice confidence',async()=>{
 const result=await discoverCategories([tab(1),tab(2)],async request=>{assert.ok(!JSON.stringify(request).includes('hidden'));return ask(request);});
 assert.equal(result.suggestions.length,1);assert.deepEqual(result.suggestions[0].tabIds,[1,2]);assert.equal(result.requests,3);assert.equal(result.unassignedCount,0);
 assert.ok(candidateLabels([tab(1),tab(2)]).includes(result.suggestions[0].title));
});
test('no requests below two tabs; cross-window singleton candidates never become suggestions',async()=>{
 assert.equal((await discoverCategories([tab(1)],()=>{throw Error('must not call');})).requests,0);
 const result=await discoverCategories([tab(1,1),tab(2,2)],ask);assert.deepEqual(result.suggestions,[]);assert.equal(result.unassignedCount,2);
});
test('missing confidence or a small probability margin abstains, not coerces confidence into probability',async()=>{
 for(const answer of [{type:'choice',choice:'r0',probabilities:{r0:1}}, {type:'choice',choice:'r0',confidence:.99,probabilities:{r0:.51,other:.49}}]){
 const result=await discoverCategories([tab(1),tab(2)],async({questions})=>({answers:Object.fromEntries(Object.keys(questions).map(id=>[id,answer]))}));assert.deepEqual(result.suggestions,[]);
 }
});
test('invalid model answers and invalid input fail closed',async()=>{
 for(const answer of [{type:'choice',choice:'unknown',confidence:1},{type:'choice',choice:'r0',confidence:NaN},{type:'choice',choice:'r0',confidence:.8,probabilities:{r0:2}}])await assert.rejects(discoverCategories([tab(1),tab(2)],async({questions})=>({answers:Object.fromEntries(Object.keys(questions).map(id=>[id,answer]))})),/Invalid discovery/);
 await assert.rejects(discoverCategories([tab(1),tab(1)],ask),/Invalid discovery tab/);
 await assert.rejects(discoverCategories(Array.from({length:501},(_,i)=>tab(i)),ask),/Invalid discovery input/);
 await assert.rejects(discoverCategories([tab(1),tab(2)],async()=>({answers:{}})),/Invalid discovery response/);
});
test('reject/no readable choices returns no suggestion and labels never concatenate punctuation spans',async()=>{
 const labels=candidateLabels([{title:'Alpha | Beta',url:'https://alpha.test/'}]);assert.ok(!labels.includes('Alpha Beta'));assert.ok(!labels.includes('Alpha'));assert.ok(!candidateLabels([{title:'example.com',url:'https://example.com/'}]).length);
 const result=await discoverCategories([tab(1),tab(2)],async request=>request.state.representatives?ask(request):{answers:Object.fromEntries(Object.keys(request.questions).map(id=>[id,{type:'choice',choice:'reject'}]))});assert.deepEqual(result.suggestions,[]);
});
test('500 inputs are all classified within the twelve-request cap',async()=>{
 let classified=0;const result=await discoverCategories(Array.from({length:500},(_,i)=>tab(i)),async request=>{if(request.state.tabs)classified+=request.state.tabs.length;return ask(request);});assert.equal(classified,500);assert.ok(result.requests<=12);assert.equal(result.suggestions[0].count,500);
});


test('incomplete and non-normalized probabilities cannot create suggestions',async()=>{
 for(const probabilities of [{r0:.9,other:.7},{r0:.2}]){
  const result=await discoverCategories([tab(1),tab(2)],async({questions})=>({answers:Object.fromEntries(Object.keys(questions).map(id=>[id,{type:'choice',choice:'r0',confidence:.9,probabilities}]))}));
  assert.deepEqual(result.suggestions,[]);
 }
 assert.ok(!candidateLabels([{title:'Other notes',url:'https://example.com/'},{title:'기타 문서',url:'https://example.org/'}]).some(title=>['other','기타'].includes(title.toLowerCase())));
});
