import test from 'node:test';
import assert from 'node:assert/strict';
import {preferredGroup} from '../extension/preferred-groups.js';
const tab=(url,extra={})=>({id:1,windowId:10,url,title:'irrelevant',...extra});
test('site identity and job URLs never trigger deterministic categories',()=>{
 for(const url of ['https://tossinvest.com/','https://google.com/search?q=Jev','https://jobs.ashbyhq.com/company/job','https://careers.nebius.com/']) assert.equal(preferredGroup(tab(url)),null);
});
test('unrelated pages, spoof hosts, title-only matches and protected tabs abstain',()=>{
 for(const url of ['https://google.com/maps','https://google.com/','https://docs.google.com/search','https://mail.google.com/search','https://gemini.google.com/search','https://google.com.evil.test/search','https://evilgoogle.com/search','https://tossinvest.com.evil.test/','https://eviltossinvest.com/','https://example.com/','chrome://settings','file:///search','not a URL']) assert.equal(preferredGroup(tab(url,{title:'Images Google search Toss Invest'})),null,url);
 for(const flag of ['incognito','pinned','audible']) assert.equal(preferredGroup(tab('https://assets.test/a.png',{[flag]:true})),null);
});
test('only a unique exact-name group in the same window can be targeted',()=>{
 const existing={id:30,windowId:10,title:'iMaGeS',color:'purple'};
 assert.deepEqual(preferredGroup(tab('https://assets.test/a.png'),[existing]),{title:'iMaGeS',color:'purple',targetGroupId:30});
 for(const [groups,options] of [[[existing],{regroup:true}],[[{...existing,windowId:20}],{}],[[{...existing,template:true}],{}],[[{...existing,title:'Images research'}],{}]]) {
  const result=preferredGroup(tab('https://assets.test/a.png'),groups,options);assert.equal(result.targetGroupId,undefined);assert.equal(result.clusterId,'preferred:images');
 }
});

test('ambiguous physical group names leave each incoming tab separate unless regrouping',()=>{
 const groups=[{id:1,windowId:10,title:'Images',color:'green'},{id:2,windowId:10,title:'images',color:'purple'}];
 const first=preferredGroup(tab('https://assets.test/a.png',{id:20}),groups);
 const second=preferredGroup(tab('https://assets.test/b.png',{id:21}),groups);
 assert.equal(first.targetGroupId,undefined);assert.equal(second.targetGroupId,undefined);assert.notEqual(first.clusterId,second.clusterId);
 assert.equal(preferredGroup(tab('https://assets.test/a.png'),groups,{regroup:true}).clusterId,'preferred:images');
 const result=preferredGroup(tab('https://assets.test/a.png'),[groups[0],{...groups[1],template:true}]);assert.equal(result.targetGroupId,1);
});
