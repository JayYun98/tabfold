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
test('local model uses same-window existing examples, reuses names without targets for regroup, and keeps windows separate',()=>{
 const existingGroups=[{id:20,windowId:1,title:'My React project',color:'blue',tabs:[tab(50,'React component state examples')]}];
 const tabs=[tab(1,'React component state examples'),tab(2,'React component state examples',undefined,2)];
 const result=clusterTabs(tabs,{existingGroups});assert.equal(result.get(1).targetGroupId,20);assert.equal(result.get(2).targetGroupId,undefined);
 const regrouped=clusterTabs(tabs,{existingGroups,regroup:true});assert.equal(regrouped.get(1).targetGroupId,undefined);assert.equal(regrouped.get(1).title,regrouped.get(2).title);assert.equal(regrouped.get(2).targetGroupId,undefined);
 assert.deepEqual([...clusterTabs([])],[]);
});

test('sites without preferred rules: boilerplate and common host never combine unrelated topics or append to unrelated existing groups',()=>{
 const tabs=[tab(1,'Sourdough bread starter - Google Search','https://search.example/search?q=bread'),tab(2,'Speculative decoding inference - Google Search','https://search.example/search?q=decode'),tab(3,'Meditation piano music - YouTube','https://youtube.com/watch?v=1'),tab(4,'Kubernetes deployment tutorial - YouTube','https://youtube.com/watch?v=2')];
 const existingGroups=[{id:20,windowId:1,title:'Coding',color:'blue',tabs:[tab(50,'Python type checking - Google Search','https://search.example/search?q=python')]}];
 const result=clusterTabs(tabs,{existingGroups});
 assert.equal(new Set([...result.values()].map(v=>v.clusterId)).size,4);
 assert.ok([...result.values()].every(v=>v.targetGroupId===undefined));
 assert.ok([...result.values()].every(v=>! /google|youtube|search/.test(v.title)));
});

test('cross-host topics cluster across search, papers and repositories independently of input order',()=>{
 const tabs=[tab(1,'Speculative decoding inference - Google Search','https://search.example/search?q=speculative'),tab(2,'Speculative decoding inference acceleration','https://arxiv.org/abs/2401.00001'),tab(3,'Speculative decoding inference - GitHub','https://github.com/lab/speculative-decoding'),tab(4,'Opencodex extension rendering bug - GitHub','https://github.com/team/opencodex/issues/21'),tab(5,'Opencodex extension rendering fix - GitHub','https://github.com/team/opencodex/pull/22')];
 const result=clusterTabs(tabs),reversed=clusterTabs([...tabs].reverse());
 assert.equal(result.get(1).clusterId,result.get(2).clusterId);assert.equal(result.get(1).clusterId,result.get(3).clusterId);
 assert.equal(result.get(4).clusterId,result.get(5).clusterId);assert.notEqual(result.get(3).clusterId,result.get(4).clusterId);
 for(const entry of tabs)assert.deepEqual(result.get(entry.id),reversed.get(entry.id));
});

test('short shared phrases and repository paths do not override weak title similarity',()=>{
 const input=[tab(1,'Speculative decoding draft training reference'),tab(2,'Speculative decoding benchmark results on GPU'),tab(3,'Opencodex coding client','https://github.com/team/opencodex'),tab(4,'Fix menu focus','https://github.com/team/opencodex/pull/42')];
 const result=clusterTabs(input);assert.notEqual(result.get(1).clusterId,result.get(2).clusterId);assert.notEqual(result.get(3).clusterId,result.get(4).clusterId);
 for(const t of input)assert.equal(result.get(t.id).title,t.title);
});

test('category names alone never route media sites',()=>{
 const media={id:80,windowId:1,title:'Media / SNS',color:'red',tabs:[]};
 const input=[tab(1,'Piano solo','https://youtube.com/watch?v=1'),tab(2,'Guitar solo','https://youtube.com/watch?v=2',2)];
 for(const regroup of [false,true])for(const result of clusterTabs(input,{existingGroups:[media],regroup}).values()){assert.equal(result.targetGroupId,undefined);assert.notEqual(result.title,media.title);}
});
test('repository URL alone does not override missing title evidence or self samples',()=>{
 const dev={id:80,windowId:1,title:'Development',color:'blue',tabs:[]};
 const project={id:81,windowId:1,title:'Opencodex',color:'green',tabs:[tab(50,'Opencodex home','https://github.com/team/opencodex')]};
 const input=[tab(1,'Fix menu','https://github.com/team/opencodex/pull/2')];
 assert.equal(clusterTabs(input,{existingGroups:[dev,project]}).get(1).targetGroupId,undefined);
 const wrong={id:90,windowId:1,title:'Wrong original',color:'red',tabs:input};
 assert.notEqual(clusterTabs(input,{existingGroups:[wrong],regroup:true}).get(1).clusterId,'existing:90');
});

test('distinct tabs with duplicate titles and URLs remain useful context',()=>{
 const sample=tab(20,'Atlas platform reference','https://atlas.test/docs');
 const existing={id:80,windowId:1,title:'Atlas',color:'blue',tabs:[sample]};
 assert.equal(clusterTabs([{...sample,id:21}],{existingGroups:[existing]}).get(21).targetGroupId,80);
 assert.equal(clusterTabs([sample],{existingGroups:[existing]}).get(20).targetGroupId,undefined);
});
