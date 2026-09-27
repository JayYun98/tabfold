// Titles can themselves be URLs; redact credentials and query/fragment tokens there too.
export function safeTitle(value) {
  return String(value || '').replace(/(?:https?:\/\/|(?:[a-z0-9-]+\.)+[a-z]{2,}\/)[^\s]+/gi,raw=>{
    try {const url=new URL(/^https?:/i.test(raw)?raw:`https://${raw}`);return `${url.hostname}${url.pathname}`;} catch {return '[URL]';}
  }).slice(0,240);
}
function safe(tab) {
  if(tab?.incognito) return null;
  try {
    const url=new URL(tab.url);
    if(!['http:','https:'].includes(url.protocol)) return null;
    return {title:safeTitle(tab.title),url:`${url.origin}${url.pathname}`.slice(0,1000)};
  } catch {return null;}
}
// Kept for callers migrating to model-based classification; no category rules.
export function matchExistingGroup() { return null; }
export function groupContext(group) {
  const candidates=[...new Map((group.tabs || []).map(safe).filter(Boolean).map(tab=>[tab.url+'\u0000'+tab.title,tab])).values()];
  const members=[],seenHosts=new Set(),seenWords=new Set();
  // Pick different sites first, then different title vocabulary within a site.
  while(candidates.length && members.length<6) {
    const scored=candidates.map((tab,index)=>{
      const host=new URL(tab.url).hostname;
      const words=new Set(tab.title.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
      const novelty=[...words].filter(word=>!seenWords.has(word)).length / Math.max(1,words.size);
      return {tab,index,host,words,score:(seenHosts.has(host)?0:2)+novelty};
    }).sort((a,b)=>b.score-a.score || a.tab.url.localeCompare(b.tab.url,'en'));
    const chosen=scored[0];members.push(chosen.tab);seenHosts.add(chosen.host);chosen.words.forEach(word=>seenWords.add(word));candidates.splice(chosen.index,1);
  }
  const description=String(group.criteria || group.description || '').trim().slice(0,500);
  return {criteria:[group.template ? 'Existing category name from another window. Reuse its purpose in this window without moving tabs between windows.' : 'Existing group in this window. Prefer it when the tab fits its name and purpose.',description].filter(Boolean).join(' '),members};
}

export function isNamedGroup(group) {
  const title=String(group.title || '').trim();
  return Boolean(title) && !/^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z0-9-]+(?::\d+)?(?:\/.*)?$/i.test(title) && !/^\[?[a-f0-9]*:[a-f0-9:]+\]?(?::\d+)?$/i.test(title);
}

export function groupsForWindow(groups,windowId) {
  const local=groups.filter(group=>group.windowId===windowId);
  const names=new Set(local.map(group=>String(group.title || '').trim().toLowerCase()));
  const templates=[];
  for(const group of groups) {
    const title=String(group.title || '').trim(),key=title.toLowerCase();
    if(group.windowId===windowId || !isNamedGroup(group) || names.has(key)) continue;
    names.add(key);templates.push({...group,windowId,template:true});
  }
  return [...local,...templates];
}
