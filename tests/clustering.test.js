import test from 'node:test';
import assert from 'node:assert/strict';
import {clusterTabs} from '../extension/clustering.js';
const tab=(id,title,url='https://example.test/'+id,windowId=1)=>({id,title,url,windowId});
test('local lexical clustering separates topics on one host and supports non-Latin titles',()=>{
 const tabs=[tab(1,'React component state tutorial'),tab(2,'React component state examples'),tab(3,'Sourdough bread baking recipe'),tab(4,'Sourdough bread baking guide'),tab(5,'제주도 여행 숙소 예약'),tab(6,'제주도 여행 숙소 추천')];
 const result=clusterTabs(tabs);
 assert.equal(result.get(1).clusterId,result.get(2).clusterId);
 assert.equal(result.get(3).clusterId,result.get(4).clusterId);
 assert.notEqual(result.get(1).clusterId,result.get(3).clusterId);
 assert.equal(result.get(5).clusterId,result.get(6).clusterId);
});
test('local model uses same-window existing examples, ignores them for regroup, and keeps windows separate',()=>{
 const existingGroups=[{id:20,windowId:1,title:'My React project',color:'blue',tabs:[tab(50,'React component state tutorial')]}];
 const tabs=[tab(1,'React component state examples'),tab(2,'React component state examples',undefined,2)];
 const result=clusterTabs(tabs,{existingGroups});assert.equal(result.get(1).targetGroupId,20);assert.equal(result.get(2).targetGroupId,undefined);
 const regrouped=clusterTabs(tabs,{existingGroups,regroup:true});assert.equal(regrouped.get(1).targetGroupId,undefined);assert.notEqual(regrouped.get(1).clusterId,regrouped.get(2).clusterId);
 assert.deepEqual([...clusterTabs([])],[]);
});

test('site boilerplate and common host never combine unrelated topics or append to unrelated existing groups',()=>{
 const tabs=[tab(1,'Sourdough bread starter - Google Search','https://google.com/search?q=bread'),tab(2,'Speculative decoding inference - Google Search','https://google.com/search?q=decode'),tab(3,'Meditation piano music - YouTube','https://youtube.com/watch?v=1'),tab(4,'Kubernetes deployment tutorial - YouTube','https://youtube.com/watch?v=2')];
 const existingGroups=[{id:20,windowId:1,title:'Coding',color:'blue',tabs:[tab(50,'Python type checking - Google Search','https://google.com/search?q=python')]}];
 const result=clusterTabs(tabs,{existingGroups});
 assert.equal(new Set([...result.values()].map(v=>v.clusterId)).size,4);
 assert.ok([...result.values()].every(v=>v.targetGroupId===undefined));
 assert.ok([...result.values()].every(v=>! /google|youtube|search/.test(v.title)));
});

test('cross-host topics cluster across search, papers and repositories independently of input order',()=>{
 const tabs=[tab(1,'Speculative decoding inference - Google Search','https://google.com/search?q=speculative'),tab(2,'Speculative decoding inference acceleration','https://arxiv.org/abs/2401.00001'),tab(3,'Speculative decoding inference - GitHub','https://github.com/lab/speculative-decoding'),tab(4,'Opencodex extension rendering bug - GitHub','https://github.com/team/opencodex/issues/21'),tab(5,'Opencodex extension rendering fix - GitHub','https://github.com/team/opencodex/pull/22')];
 const result=clusterTabs(tabs),reversed=clusterTabs([...tabs].reverse());
 assert.equal(result.get(1).clusterId,result.get(2).clusterId);assert.equal(result.get(1).clusterId,result.get(3).clusterId);
 assert.equal(result.get(4).clusterId,result.get(5).clusterId);assert.notEqual(result.get(3).clusterId,result.get(4).clusterId);
 for(const entry of tabs)assert.deepEqual(result.get(entry.id),reversed.get(entry.id));
});

test('recurring descriptive phrases survive long titles across sites without merging repositories by owner',()=>{
 const titles=['[Speculative Decoding] DFlash2 draft variant · Pull Request #2216 · NVIDIA/Model-Optimizer','DSpark: Confidence-Scheduled Speculative Decoding with Semi-Autoregressive Generation','lightseekorg/TorchSpec: A PyTorch native library for training speculative decoding models','DiffuSpec: Unlocking Diffusion Language Models for Speculative Decoding | OpenReview','Exploring Speculative Decoding in vLLM on AMD GPUs | vLLM Blog'];
 const input=titles.map((title,index)=>tab(index,title,`https://source${index}.test/paper`));
 input.push(tab(10,'Opencodex: coding client','https://github.com/team/opencodex'),tab(11,'Fix menu focus · Pull Request #42','https://github.com/team/opencodex/pull/42'),tab(12,'Recipe manager','https://github.com/team/cookbook'));
 const result=clusterTabs(input);
 assert.equal(new Set(titles.map((_,id)=>result.get(id).clusterId)).size,1);
 assert.equal(result.get(10).clusterId,result.get(11).clusterId);assert.notEqual(result.get(10).clusterId,result.get(12).clusterId);
 assert.match(result.get(0).title,/speculative|decoding/);assert.equal(result.get(10).title,'opencodex');
});
