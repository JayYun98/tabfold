import {preferredGroup} from './preferred-groups.js';
import {groupContext,groupsForWindow,isNamedGroup} from './group-context.js';
// Conservative lexical preview, not semantic classification.
// ponytail: complete-link comparisons suit hundreds of tabs; index candidates for thousands.
const STOP = new Set('the a an and or for of to in on with from by is are home page new tab com www html https http index'.split(' '));
const COLORS = ['blue','green','purple','cyan','orange','red','yellow'];
function features(tab) {
  const title=String(tab.title || '').slice(0,500).normalize('NFKC').trim();
  let text=title.toLowerCase();
  // Strip a publisher suffix only when it identifies this URL's host, without a site list.
  try {
    const hostWords=new URL(tab.url).hostname.toLowerCase().split('.').filter(word=>word.length>2 && !STOP.has(word));
    const segments=text.split(/\s+[|·–—-]\s+/u);
    if(segments.length>1 && hostWords.some(word=>(segments.at(-1).match(/[\p{L}\p{N}]+/gu)||[]).includes(word))) text=segments.slice(0,-1).join(' ');
  } catch {}
  const words=(text.match(/[\p{L}\p{N}]+/gu)||[]).filter(word=>word.length>1 && !STOP.has(word) && !/^\d+$/.test(word));
  const terms=new Map();
  for(const word of words)terms.set(word,(terms.get(word)||0)+1);
  return {title,terms,words:new Set(words)};
}
function cosine(a,b){let score=0;for(const [term,weight]of a)score+=weight*(b.get(term)||0);return score;}
function normalized(terms){const norm=Math.hypot(...terms.values());return new Map([...terms].map(([term,weight])=>[term,norm?weight/norm:0]));}
function similarity(a,b) {
  // Two substantive shared tokens and a strong vector match; no phrase/repository boosts.
  if([...a.words].filter(word=>b.words.has(word)).length<2)return 0;
  return cosine(a.vector,b.vector);
}
export function clusterTabs(tabs,{existingGroups=[],regroup=false}={}) {
  const groups=[...new Set(tabs.map(tab=>tab.windowId))].flatMap(windowId=>groupsForWindow(regroup ? existingGroups.filter(isNamedGroup) : existingGroups,windowId));
  const examples=new Map(groups.map(group=>[group,groupContext(group).members.map(tab=>({...features(tab),tab,ids:new Set((group.tabs || []).filter(source=>String(source.title || '').slice(0,240)===tab.title).map(source=>source.id))}))]));
  const documents=tabs.map(tab=>({...features(tab),tab}));
  const all=[...documents,...[...examples.values()].flat()];
  const frequency=new Map();
  for(const doc of all)for(const word of doc.words)frequency.set(word,(frequency.get(word)||0)+1);
  for(const doc of all)doc.vector=normalized(new Map([...doc.terms].map(([term,weight])=>[term,weight*(1+Math.log((1+all.length)/(1+frequency.get(term))))])));
  const result=new Map(),buckets=[];
  for(const doc of documents.sort((a,b)=>a.tab.windowId-b.tab.windowId || a.title.localeCompare(b.title,'en') || String(a.tab.url).localeCompare(String(b.tab.url),'en') || a.tab.id-b.tab.id)) {
    const preferred=preferredGroup(doc.tab,existingGroups,{regroup});
    if(preferred){result.set(doc.tab.id,preferred);continue;}
    const candidates=groups.filter(group=>group.windowId===doc.tab.windowId).map(group=>({group,score:Math.max(0,...examples.get(group).filter(sample=>!(sample.ids.size===1 && sample.ids.has(doc.tab.id))).map(sample=>similarity(doc,sample)))})).sort((a,b)=>b.score-a.score);
    const best=candidates[0];
    if(best && best.score>=.62 && best.score-(candidates[1]?.score||0)>=.15) {
      const target=best.group;
      result.set(doc.tab.id,{title:target.title,color:target.color,...(regroup || target.template ? {clusterId:`${target.template?'template':'existing'}:${target.id}`} : {targetGroupId:target.id})});
      continue;
    }
    // Every member must match; weak transitive chains cannot merge distinct topics.
    const ranked=buckets.filter(bucket=>bucket.windowId===doc.tab.windowId).map(bucket=>({bucket,score:Math.min(...bucket.docs.map(member=>similarity(doc,member)))})).filter(candidate=>candidate.score>=.62).sort((a,b)=>b.score-a.score);
    let bucket=ranked[0]?.bucket;
    if(!bucket){bucket={windowId:doc.tab.windowId,docs:[]};buckets.push(bucket);}
    bucket.docs.push(doc);
  }
  buckets.forEach((bucket,index)=>{
    // Use a readable representative title, never manufacture unordered keyword fragments.
    const representative=[...bucket.docs].sort((a,b)=>bucketsScore(b,bucket)-bucketsScore(a,bucket) || a.title.length-b.title.length || a.title.localeCompare(b.title,'en'))[0];
    const title=(representative.title || 'Tabs').slice(0,80);
    for(const doc of bucket.docs)result.set(doc.tab.id,{title,color:COLORS[index%COLORS.length],clusterId:`local:${index}`});
  });
  return result;
}
function bucketsScore(doc,bucket){return bucket.docs.reduce((score,member)=>score+similarity(doc,member),0);}
