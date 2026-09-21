import { t } from './i18n.js';
import { clusterTabs } from './clustering.js';

const GROUP_NONE = -1;
const COLORS = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange', 'grey'];

export function normalUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

export function isUngrouped(tab) {
  return tab.groupId === undefined || tab.groupId === null || tab.groupId === GROUP_NONE;
}

export function isEligible(tab, {regroup = false} = {}) {
  return Boolean(tab && Number.isInteger(tab.id) && normalUrl(tab.url) && !tab.pinned && !tab.audible && !tab.incognito && (regroup || isUngrouped(tab)));
}

function publicTab(tab) {
  return { id: tab.id, title: tab.title || '', url: tab.url, windowId: tab.windowId, ...(tab.incognito ? {incognito:true} : {}) };
}

export function validateTabOrder(value = 'current') {
  if (!['current','title','oldest'].includes(value)) throw new Error(t('Invalid tab order.'));
  return value;
}

export function validateGroupingMode(value = 'preserve') {
  if (!['preserve','regroup'].includes(value)) throw new Error(t('Invalid grouping mode.'));
  return value;
}

function orderedTabs(tabs, order) {
  const position = (a,b) => (a.index ?? 0) - (b.index ?? 0);
  const time = tab => Number.isFinite(tab.lastAccessed) && tab.lastAccessed > 0 ? tab.lastAccessed : Infinity;
  return [...tabs].sort((a,b) => {
    if (order === 'title') return (a.title || a.url).localeCompare(b.title || b.url, undefined, {numeric:true,sensitivity:'base'}) || position(a,b);
    if (order === 'oldest') return (time(a)-time(b)) || position(a,b);
    return position(a,b);
  });
}

export function buildPreview(tabs, { windowId, allWindows = false, tabOrder = 'current', existingGroups = [], groupingMode = 'preserve' } = {}, classifications) {
  validateTabOrder(tabOrder);
  const regroup = validateGroupingMode(groupingMode) === 'regroup';
  const selected = tabs.filter((tab) => allWindows || windowId === undefined || tab.windowId === windowId);
  const snapshots = existingGroups
    .filter(group => Number.isInteger(group.id) && (allWindows || windowId === undefined || group.windowId === windowId))
    .map(group => ({id:group.id, windowId:group.windowId, title:group.title || '', color:validGroupColor(group.color), collapsed:Boolean(group.collapsed), tabs:selected.filter(tab => tab.groupId === group.id && tab.windowId === group.windowId).map(publicTab)}));
  const local = clusterTabs(selected.filter(tab => isEligible(tab,{regroup})), {existingGroups:snapshots,regroup});
  const buckets = new Map();
  for (const tab of selected) {
    if (!isEligible(tab,{regroup})) continue;
    const override = classifications?.get(tab.id) ?? local.get(tab.id);
    const sameWindow = (regroup ? [] : snapshots).filter(group => group.windowId === tab.windowId);
    const existing = Number.isInteger(override?.targetGroupId)
      ? sameWindow.find(group => group.id === override.targetGroupId)
      : undefined;
    const category = existing
      ? {key:`existing:${existing.id}`,title:existing.title,color:existing.color,targetGroupId:existing.id}
      : typeof override?.title === 'string' && override.title.trim()
      ? { key: `ai:${override.clusterId ?? override.title.trim()}\u0000${validGroupColor(override.color)}`, title: override.title.trim().slice(0, 80), color: validGroupColor(override.color) }
      : {key:`single:${tab.id}`,title:tab.title || 'Tabs',color:'grey'};
    const bucketKey = `${tab.windowId}\u0000${category.key}`;
    const bucket = buckets.get(bucketKey) || { ...category, tabs: [] };
    bucket.tabs.push(tab);
    buckets.set(bucketKey, bucket);
  }
  const groups = [...buckets.values()]
    .filter((bucket) => bucket.tabs.length >= (Number.isInteger(bucket.targetGroupId) ? 1 : 2))
    .map(bucket => ({...bucket,tabs:orderedTabs(bucket.tabs,tabOrder).map(tab=>({...publicTab(tab),...(regroup ? {groupId:tab.groupId ?? -1} : {})}))}))
    .map(({ title, color, tabs, targetGroupId }) => ({
      ...(Number.isInteger(targetGroupId) ? {targetGroupId} : {}),
      windowId: tabs[0].windowId,
      title,
      color,
      tabIds: tabs.map((tab) => tab.id),
      tabs,
    }));
  return {
    tabOrder,
    groupingMode,
    groups,
    existingGroups: snapshots,
    groupedCount: selected.filter(tab => !isUngrouped(tab)).length,
    otherProtectedCount: selected.filter(tab => (regroup || isUngrouped(tab)) && !isEligible(tab,{regroup})).length,
    duplicates: findDuplicateCandidates(selected),
    total: selected.length,
    protectedCount: selected.filter((tab) => !isEligible(tab,{regroup})).length,
  };
}

export function findDuplicateCandidates(tabs) {
  const byUrl = new Map();
  for (const tab of tabs) {
    if (!normalUrl(tab.url)) continue;
    const key = `${tab.windowId}\u0000${tab.url}`;
    const list = byUrl.get(key) || [];
    list.push(tab);
    byUrl.set(key, list);
  }
  const duplicates = [];
  for (const list of byUrl.values()) {
    if (list.length < 2) continue;
    const survivor = list.find((tab) => tab.active) || list.find((tab) => !isEligible(tab)) || list[0];
    for (const tab of list) if (tab.id !== survivor.id && isEligible(tab) && !tab.active) duplicates.push(publicTab(tab));
  }
  return duplicates;
}

export function validGroupColor(color) {
  return COLORS.includes(color) ? color : 'grey';
}

export function sameSnapshot(tab, snapshot) {
  return Boolean(tab && snapshot && tab.id === snapshot.id && tab.url === snapshot.url && tab.windowId === snapshot.windowId);
}
