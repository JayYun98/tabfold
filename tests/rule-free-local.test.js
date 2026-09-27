import test from 'node:test';
import assert from 'node:assert/strict';
import {clusterTabs} from '../extension/clustering.js';
import {preferredGroup} from '../extension/preferred-groups.js';
import {groupContext,matchExistingGroup} from '../extension/group-context.js';
const tab=(id,title,url=`https://example.test/${id}`,windowId=1)=>({id,title,url,windowId});
test('only image file extensions trigger deterministic categories',()=>{
 for(const url of ['https://www.tossinvest.com/stocks/AMD','https://google.com/search?q=jobs','https://jobs.ashbyhq.com/modal/123','https://careers.nebius.com/','https://youtube.com/watch?v=a']) assert.equal(preferredGroup(tab(1,'Any title',url)),null);
 assert.equal(preferredGroup(tab(1,'opaque file','https://cdn.test/opaque.PNG?download=1')).title,'Images');
 assert.equal(preferredGroup(tab(1,'article.png','https://site.test/article?file=a.png')),null);
 assert.equal(matchExistingGroup(tab(1,'Video','https://youtube.com/watch'),[{title:'Media'}]),null);
 assert.ok(!groupContext({title:'Jobs',tabs:[]}).criteria.includes('Job listings'));
});
test('quick uses coherent title evidence across sites and no shared-host or project shortcut',()=>{
 const input=[tab(1,'Adaptive decoding latency benchmark','https://a.test/1'),tab(2,'Adaptive decoding latency benchmark results','https://b.test/2'),tab(3,'Piano solo recording','https://github.com/team/project/1'),tab(4,'Kubernetes cluster deployment','https://github.com/team/project/2')];
 const result=clusterTabs(input);
 assert.equal(result.get(1).clusterId,result.get(2).clusterId);
 assert.notEqual(result.get(3).clusterId,result.get(4).clusterId);
 assert.ok(input.some(t=>t.title===result.get(1).title));
 assert.deepEqual([...result],[...clusterTabs([...input].reverse())]);
});
test('quick protects windows, avoids self-membership, and abstains on ambiguous existing groups',()=>{
 const sample=tab(1,'Adaptive decoding latency benchmark');
 const group={id:40,windowId:1,title:'My experiment',color:'blue',tabs:[sample]};
 assert.equal(clusterTabs([sample],{existingGroups:[group]}).get(1).targetGroupId,undefined);
 const input=[tab(2,sample.title),tab(3,sample.title,undefined,2)];
 const result=clusterTabs(input,{existingGroups:[group]});
 assert.equal(result.get(2).targetGroupId,40);
 assert.equal(result.get(3).targetGroupId,undefined);
 assert.equal(clusterTabs(input,{existingGroups:[group,{...group,id:41}]}).get(2).targetGroupId,undefined);
 assert.equal(clusterTabs(input,{existingGroups:[group],regroup:true}).get(2).targetGroupId,undefined);
});
