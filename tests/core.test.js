import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPreview, classifyTab, findDuplicateCandidates } from '../extension/core.js';

const tab = (id, url, extra = {}) => ({ id, windowId: 1, title: '', url, groupId: -1, ...extra });

test('classifier uses a known category before falling back to domain', () => {
  assert.deepEqual(classifyTab(tab(1, 'https://github.com/openai')), { key: 'work', title: 'Work', color: 'blue' });
  assert.deepEqual(classifyTab(tab(2, 'https://example.com/a')).title, 'example.com');
});

test('preview never groups protected tabs and does not mix windows', () => {
  const plan = buildPreview([
    tab(1, 'https://example.com/a'), tab(2, 'https://example.com/b'),
    tab(3, 'https://example.com/c', { windowId: 2 }), tab(4, 'https://example.com/d', { windowId: 2 }),
    tab(5, 'https://example.com/e', { pinned: true }), tab(6, 'chrome://settings'),
  ], { allWindows: true });
  assert.equal(plan.groups.length, 2);
  assert.deepEqual(plan.groups.map((group) => group.windowId).sort(), [1, 2]);
  assert.equal(plan.protectedCount, 2);
});

test('duplicates retain an active or protected survivor and match full URL only', () => {
  const candidates = findDuplicateCandidates([
    tab(1, 'https://example.com/a?x=1', { active: true }),
    tab(2, 'https://example.com/a?x=1'),
    tab(3, 'https://example.com/a?x=2'),
    tab(4, 'https://locked.example/a', { pinned: true }),
    tab(5, 'https://locked.example/a'),
  ]);
  assert.deepEqual(candidates.map((candidate) => candidate.id), [2, 5]);
});

test('group preview sorting is stable, numeric by title, and unknown activity goes last',()=>{
  const input=[tab(1,'https://example.com/1',{index:2,title:'Page 10',lastAccessed:300}),tab(2,'https://example.com/2',{index:1,title:'Page 2',lastAccessed:100}),tab(3,'https://example.com/3',{index:0,title:'Page 1'}),tab(4,'https://example.com/4',{index:3,title:'Page 2',lastAccessed:100})];
  const ids=order=>buildPreview(input,{tabOrder:order}).groups[0].tabIds;
  assert.deepEqual(ids('current'),[3,2,1,4]);
  assert.deepEqual(ids('title'),[3,2,4,1]);
  assert.deepEqual(ids('oldest'),[2,4,1,3]);
  assert.deepEqual(input.map(t=>t.id),[1,2,3,4]);
  assert.throws(()=>ids('invalid'),/Invalid tab order/);
});

test('existing groups are visible and a unique same-window hostname accepts one new tab',()=>{
  const input=[tab(1,'https://github.com/a',{groupId:10}),tab(2,'https://github.com/b'),tab(3,'https://github.com/c',{windowId:2}),tab(4,'https://private.example',{groupId:20,incognito:true}),tab(5,'https://safe.example',{pinned:true})];
  const existingGroups=[{id:10,windowId:1,title:'My project',color:'cyan',collapsed:true},{id:20,windowId:1,title:'Private',color:'red'}];
  const plan=buildPreview(input,{allWindows:true,existingGroups});
  assert.equal(plan.groups.length,1);assert.equal(plan.groups[0].targetGroupId,10);assert.deepEqual(plan.groups[0].tabIds,[2]);
  assert.deepEqual(plan.existingGroups[0],{...existingGroups[0],tabs:[{id:1,windowId:1,title:'',url:'https://github.com/a'}]});
  assert.equal(plan.groupedCount,2);assert.equal(plan.protectedCount,3);assert.equal(plan.otherProtectedCount,1);
  assert.deepEqual(input.map(t=>t.groupId),[10,-1,-1,20,-1]);
});

test('ambiguous domains do not choose existing groups; AI identity never merges equal names',()=>{
  const existingGroups=[{id:10,windowId:1,title:'Same',color:'blue'},{id:11,windowId:1,title:'Same',color:'blue'}];
  const input=[tab(1,'https://example.com/a',{groupId:10}),tab(2,'https://example.com/b',{groupId:11}),tab(3,'https://example.com/c'),tab(4,'https://example.com/d')];
  const quick=buildPreview(input,{existingGroups});assert.equal(quick.groups.length,1);assert.equal(quick.groups[0].targetGroupId,undefined);
  const classifications=new Map([[3,{targetGroupId:10,title:'Same',color:'blue'}],[4,{targetGroupId:11,title:'Same',color:'blue'}]]);
  const ai=buildPreview(input,{existingGroups},classifications);assert.deepEqual(ai.groups.map(g=>g.targetGroupId),[10,11]);
});
