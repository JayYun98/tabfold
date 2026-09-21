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
