import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPreview, classifyTab, findDuplicateCandidates } from '../extension/core.js';

const tab = (id, url, extra = {}) => ({ id, windowId: 1, title: '', url, groupId: -1, ...extra });

test('classifier uses a known category before falling back to domain', () => {
  assert.deepEqual(classifyTab(tab(1, 'https://github.com/openai')), { key: 'work', title: '작업', color: 'blue' });
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
