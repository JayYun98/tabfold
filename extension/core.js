const GROUP_NONE = -1;
const COLORS = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange', 'grey'];

const KEYWORDS = [
  ['work', '작업', 'blue', /\b(github|gitlab|notion|figma|docs?|sheets?|slides?|jira|linear|stackoverflow)\b/i],
  ['video', '동영상', 'red', /\b(youtube|netflix|vimeo|twitch)\b/i],
  ['shopping', '쇼핑', 'orange', /\b(amazon|ebay|etsy|shopping|store|shop|coupang)\b/i],
  ['reading', '읽을거리', 'green', /\b(news|medium|substack|blog|article|wiki)\b/i],
  ['social', '소통', 'purple', /\b(slack|discord|mail|gmail|outlook|reddit|x\.com|twitter)\b/i],
];

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

export function isEligible(tab) {
  return Boolean(tab && Number.isInteger(tab.id) && normalUrl(tab.url) && !tab.pinned && !tab.audible && !tab.incognito && isUngrouped(tab));
}

export function classifyTab(tab) {
  const url = normalUrl(tab.url);
  if (!url) return null;
  const text = `${tab.title || ''} ${url.hostname}${url.pathname}`;
  const keyword = KEYWORDS.find(([, , , pattern]) => pattern.test(text));
  if (keyword) return { key: keyword[0], title: keyword[1], color: keyword[2] };
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  return { key: `domain:${host}`, title: host, color: 'grey' };
}

function publicTab(tab) {
  return { id: tab.id, title: tab.title || '', url: tab.url, windowId: tab.windowId };
}

export function buildPreview(tabs, { windowId, allWindows = false } = {}, classifications) {
  const selected = tabs.filter((tab) => allWindows || windowId === undefined || tab.windowId === windowId);
  const buckets = new Map();
  for (const tab of selected) {
    if (!isEligible(tab)) continue;
    const override = classifications?.get(tab.id);
    const category = typeof override?.title === 'string' && override.title.trim()
      ? { key: `ai:${override.title.trim()}\u0000${validGroupColor(override.color)}`, title: override.title.trim().slice(0, 80), color: validGroupColor(override.color) }
      : classifyTab(tab);
    const bucketKey = `${tab.windowId}\u0000${category.key}`;
    const bucket = buckets.get(bucketKey) || { ...category, tabs: [] };
    bucket.tabs.push(publicTab(tab));
    buckets.set(bucketKey, bucket);
  }
  const groups = [...buckets.values()]
    .filter((bucket) => bucket.tabs.length >= 2)
    .map(({ title, color, tabs }) => ({
      windowId: tabs[0].windowId,
      title,
      color,
      tabIds: tabs.map((tab) => tab.id),
      tabs,
    }));
  return {
    groups,
    duplicates: findDuplicateCandidates(selected),
    total: selected.length,
    protectedCount: selected.filter((tab) => !isEligible(tab)).length,
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
