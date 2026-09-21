// Explicit broad-category hints supplement lexical similarity; unknown names abstain.
const TOPICS = [
  {id:'media',name:/\b(media|sns|social|videos?|entertainment)\b|미디어|소셜|동영상|영상|엔터|소통/i,description:'Videos, music, entertainment, social feeds and personal social profiles.'},
  {id:'jobs',name:/\b(jobs?|careers?|recruiting|recruitment|hiring|employment)\b|취업|채용|구직|이직|커리어/i,description:'Job listings, applications, recruiting and career opportunities; not general social profiles.'},
  {id:'research',name:/\b(research|papers?|academic|science)\b|연구|논문|리서치|학술/i,description:'Academic papers, research publications and scientific references.'},
  {id:'dev',name:/\b(dev|development|coding|programming|repositories)\b|개발|코딩|프로그래밍/i,description:'Software repositories, programming tools, code changes and developer documentation.'},
  {id:'visa',name:/\b(visas?|immigration|immigrant)\b|비자|이민|체류/i,description:'Immigration, visas, residency permits and related application procedures; not payment cards.'},
];
function safe(tab) {
  if(tab?.incognito) return null;
  try {
    const url=new URL(tab.url);
    if(!['http:','https:'].includes(url.protocol)) return null;
    return {title:String(tab.title || '').slice(0,240),url:`${url.origin}${url.pathname}`.slice(0,1000)};
  } catch {return null;}
}
function topics(group) {
  const title=String(group.title || '').trim();
  // Domain labels encode location, not the user's intended topic.
  if(/^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/.*)?$/i.test(title)) return [];
  const text=`${title} ${String(group.criteria || group.description || '').slice(0,500)}`;
  return TOPICS.filter(topic=>topic.name.test(text));
}
function site(host,domain){return host===domain || host.endsWith('.'+domain);}
export function isHostedJobListing(url) {
  return ['jobs.ashbyhq.com','careers.nebius.com'].some(domain=>site(url.hostname,domain));
}
function tabTopics(tab) {
  const sample=safe(tab);if(!sample)return [];
  const {hostname:host,pathname:path}=new URL(sample.url);
  const text=`${sample.title} ${path}`;
  if(site(host,'linkedin.com')) return /^\/jobs(?:\/|$)/i.test(path) ? ['jobs'] : /^\/(in|feed|posts)(?:\/|$)/i.test(path) ? ['media'] : [];
  if(['youtube.com','youtu.be','netflix.com','vimeo.com','twitch.tv','spotify.com','instagram.com','facebook.com','reddit.com','x.com','twitter.com','tiktok.com'].some(domain=>site(host,domain))) return ['media'];
  if(['arxiv.org','openreview.net','semanticscholar.org','pubmed.ncbi.nlm.nih.gov','aclanthology.org'].some(domain=>site(host,domain))) return ['research'];
  if(isHostedJobListing(new URL(sample.url)) || ['boards.greenhouse.io','job-boards.greenhouse.io','jobs.lever.co','indeed.com','wellfound.com'].some(domain=>site(host,domain)) || /\/(jobs|careers|vacancies)(?:\/|$)/i.test(path)) return ['jobs'];
  if(/\b(immigration|immigrant|residency permit|work visa|student visa|visa application)\b|비자|이민|체류허가/i.test(text) || ['uscis.gov','immi.homeaffairs.gov.au'].some(domain=>site(host,domain))) return ['visa'];
  if((site(host,'github.com') || site(host,'gitlab.com')) && /^\/[^/]+\/[^/]+/.test(path) && !/^\/(search|settings|marketplace|topics|orgs)\//.test(path)) return ['dev'];
  return [];
}
export function matchExistingGroup(tab,groups) {
  const matches=tabTopics(tab);
  if(!matches.length)return null;
  const candidates=groups.filter(group=>group.windowId===tab.windowId && topics(group).some(topic=>matches.includes(topic.id)));
  const canonical={jobs:/^(?:jobs?|recruit|recruiting|recruitment|careers?|취업|채용|구직|이직)(?:[\s/·&+-]+(?:jobs?|recruit|recruiting|recruitment|careers?|취업|채용|구직|이직))*$/i};
  const broad=candidates.filter(group=>matches.some(topic=>canonical[topic]?.test(String(group.title || '').trim())));
  const ranked=broad.length ? broad : candidates;
  return ranked.length===1 ? ranked[0] : null;
}
export function groupContext(group) {
  const descriptions=topics(group).map(topic=>topic.description);
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
  return {criteria:[group.template ? 'Existing category name from another window. Reuse its purpose in this window without moving tabs between windows.' : 'Existing group in this window. Prefer it when the tab fits its name and purpose.',...descriptions,description].filter(Boolean).join(' '),members};
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
