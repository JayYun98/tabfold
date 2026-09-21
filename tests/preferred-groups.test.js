import test from 'node:test';
import assert from 'node:assert/strict';
import {preferredGroup} from '../extension/preferred-groups.js';
const tab=(url,extra={})=>({id:1,windowId:10,url,title:'irrelevant',...extra});
test('explicit preferences classify actual Toss and Google Search URLs regardless of title or query',()=>{
 for(const url of ['https://tossinvest.com/','https://www.tossinvest.com/stocks/US123','https://app.tossinvest.com/account']) assert.deepEqual(preferredGroup(tab(url)),{title:'Investment',color:'green',clusterId:'preferred:investment'});
 for(const url of ['https://google.com/search?q=Jev','https://www.google.com/search?q=Toss+Invest','https://google.co.kr/search?q=anything','https://www.google.co.kr/search']) assert.deepEqual(preferredGroup(tab(url)),{title:'Google search',color:'blue',clusterId:'preferred:google-search'});
 // A search wrapper is a search tab even if its label advertises an investment page.
 assert.equal(preferredGroup(tab('https://google.com/search?q=tossinvest.com',{title:'Toss Invest'})).title,'Google search');
});
test('unrelated pages, spoof hosts, title-only matches and protected tabs abstain',()=>{
 for(const url of ['https://google.com/maps','https://google.com/','https://docs.google.com/search','https://mail.google.com/search','https://gemini.google.com/search','https://google.com.evil.test/search','https://evilgoogle.com/search','https://tossinvest.com.evil.test/','https://eviltossinvest.com/','https://example.com/','chrome://settings','file:///search','not a URL']) assert.equal(preferredGroup(tab(url,{title:'Investment Google search Toss Invest'})),null,url);
 for(const flag of ['incognito','pinned','audible']) assert.equal(preferredGroup(tab('https://tossinvest.com',{[flag]:true})),null);
});
test('only a unique exact-name group in the same window can be targeted',()=>{
 const existing={id:30,windowId:10,title:'iNvEsTmEnT',color:'purple'};
 assert.deepEqual(preferredGroup(tab('https://tossinvest.com'),[existing]),{title:'iNvEsTmEnT',color:'purple',targetGroupId:30});
 for(const [groups,options] of [[[existing],{regroup:true}],[[{...existing,windowId:20}],{}],[[{...existing,template:true}],{}],[[{...existing,title:'Investment research'}],{}]]) {
  const result=preferredGroup(tab('https://tossinvest.com'),groups,options);assert.equal(result.targetGroupId,undefined);assert.equal(result.clusterId,'preferred:investment');
 }
});

test('ambiguous physical group names leave each incoming tab separate unless regrouping',()=>{
 const groups=[{id:1,windowId:10,title:'Investment',color:'green'},{id:2,windowId:10,title:'investment',color:'purple'}];
 const first=preferredGroup(tab('https://tossinvest.com/a',{id:20}),groups);
 const second=preferredGroup(tab('https://tossinvest.com/b',{id:21}),groups);
 assert.equal(first.targetGroupId,undefined);assert.equal(second.targetGroupId,undefined);assert.notEqual(first.clusterId,second.clusterId);
 assert.equal(preferredGroup(tab('https://tossinvest.com/a'),groups,{regroup:true}).clusterId,'preferred:investment');
 const result=preferredGroup(tab('https://tossinvest.com'),[groups[0],{...groups[1],template:true}]);assert.equal(result.targetGroupId,1);
});
