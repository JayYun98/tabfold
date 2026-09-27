import test from 'node:test';
import assert from 'node:assert/strict';
import {safeTitle,groupContext} from '../extension/group-context.js';
import {classifyTabs} from '../extension/ai.js';
test('URL-shaped titles cannot leak query, hash or credentials through AI or group samples',async()=>{
 const tab={id:1,windowId:1,title:'https://user:password@example.com/page?token=SECRET#TOKEN',url:'https://example.com/page?token=SECRET'};
 assert.equal(safeTitle(tab.title),'example.com/page');
 assert.equal(safeTitle('shop.example.com/item?jwt=SECRET'),'shop.example.com/item');
 assert.equal(groupContext({title:'Example',tabs:[tab]}).members[0].title,'example.com/page');
 await classifyTabs([tab],'test-key',async(_url,options)=>{
  const body=JSON.parse(options.body);assert.ok(!/SECRET|TOKEN|password/.test(options.body));
  return {ok:true,json:async()=>({answers:{tab_1:{type:'choice',choice:'other',confidence:.9}}})};
 });
});
test('uppercase URL schemes redact credentials in titles',()=>{
 assert.equal(safeTitle('HTTPS://user:PASSWORD@example.test/page?token=SECRET'),'example.test/page');
});
