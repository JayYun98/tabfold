// Small corpus-fitted lexical model: no weights, network, or runtime dependencies.
// ponytail: quadratic comparisons suit hundreds of tabs; use a nearest-neighbor index for thousands.
const STOP = new Set('the a an and or for of to in on with from by is are home page new tab com www html https http index github google youtube search 검색 検索 搜索 watch results result official repository pull pulls issues issue blob tree main master docs documentation tutorial guide examples introduction getting started request openreview blog www arxiv abs pdf'.split(' '));
const COLORS = ['blue','green','purple','cyan','orange','red','yellow'];
function features(tab) {
  let host='',path='';
  try { const url=new URL(tab.url);host=url.hostname.replace(/^www\./,'');path=decodeURIComponent(url.pathname).slice(0,300); } catch {}
  const text=String(tab.title || '').slice(0,500).normalize('NFKC').toLocaleLowerCase()
    .replace(/(?:[-|·–—]\s*)?(?:google search|google 검색|google 検索|google 搜索|youtube|github)\s*$/u,'');
  const words=(text.match(/[\p{L}\p{N}]+/gu)||[]).filter(word=>word.length>1 && !STOP.has(word));
  const terms=new Map();
  const add=(key,weight)=>terms.set(key,(terms.get(key)||0)+weight);
  for(const word of words){
    add('w:'+word,2);
    // Character features help inflections and languages without spaces, without claiming semantics.
    const chars=Array.from(word);
    for(let i=0;i+2<chars.length;i++)add('c:'+chars.slice(i,i+3).join(''),.3);
    if(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(word))
      for(let i=0;i+1<chars.length;i++)add('c:'+chars.slice(i,i+2).join(''),.3);
  }
  for(let index=0;index+1<words.length;index++)add('p:'+words.slice(index,index+2).join(' '),3);
  if(host==='github.com') {
    const [owner,repo]=path.toLowerCase().split('/').filter(Boolean);
    if(owner && repo && !['search','settings','marketplace','topics','orgs'].includes(owner)) add('repo:'+owner+'/'+repo,6);
  }
  for(const word of path.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[])if(word.length>2 && !STOP.has(word) && !/^\d+$/.test(word))add('w:'+word,.5);

  return {terms,host,words};
}
function cosine(a,b){let result=0;for(const [term,weight]of a)result+=weight*(b.get(term)||0);return result;}
function topicSimilarity(a,b) {
  const shared=[...a.terms.keys()].filter(term=>b.terms.has(term));
  if(shared.some(term=>term.startsWith('repo:'))) return Math.max(.85,cosine(a.vector,b.vector));
  const phrase=shared.some(term=>term.startsWith('p:') && term.slice(2).split(' ').every(word=>word.length>=4));
  return Math.max(phrase ? .5 : 0,cosine(a.vector,b.vector));
}
function normalized(terms){const norm=Math.hypot(...terms.values());return new Map([...terms].map(([term,weight])=>[term,norm?weight/norm:0]));}
export function clusterTabs(tabs,{existingGroups=[],regroup=false}={}) {
  const groups=regroup?[]:existingGroups;
  const samples=groups.flatMap(group=>(group.tabs||[]).filter(tab=>!tab.incognito && /^https?:/.test(tab.url||'')).slice(0,3).map(tab=>({...tab,group})));
  const documents=[...tabs,...samples].map(tab=>({...features(tab),tab}));
  const frequency=new Map();
  for(const {terms}of documents)for(const term of terms.keys())frequency.set(term,(frequency.get(term)||0)+1);
  for(const doc of documents)doc.vector=normalized(new Map([...doc.terms].map(([term,weight])=>[term,weight*(1+Math.log((1+documents.length)/(1+frequency.get(term))))])));
  const result=new Map(),buckets=[];
  for(const doc of documents.slice(0,tabs.length).sort((a,b)=>a.tab.windowId-b.tab.windowId || a.words.join(' ').localeCompare(b.words.join(' '),'en') || String(a.tab.url).localeCompare(String(b.tab.url),'en') || a.tab.id-b.tab.id)){
    const candidates=groups.filter(group=>group.windowId===doc.tab.windowId).map(group=>{
      const examples=documents.slice(tabs.length).filter(sample=>sample.tab.group.id===group.id);
      return {group,score:Math.max(0,...examples.map(sample=>topicSimilarity(doc,sample)))};
    }).sort((a,b)=>b.score-a.score);
    const best=candidates[0];
    const target=best && best.score>=.48 && best.score-(candidates[1]?.score||0)>=.1 ? best.group : null;
    if(target){result.set(doc.tab.id,{title:target.title,color:target.color,targetGroupId:target.id});continue;}
    let match=null,score=.38;
    for(const bucket of buckets){
      if(bucket.windowId!==doc.tab.windowId)continue;
      const anchorScore=topicSimilarity(doc,bucket.docs[0]);
      const similarity=Math.max(cosine(doc.vector,bucket.centroid),anchorScore);
      // Prevent a chain of weak links from joining unrelated topics.
      if(similarity>=score && anchorScore>=.25){match=bucket;score=similarity;}
    }
    if(!match){match={windowId:doc.tab.windowId,docs:[],sum:new Map(),centroid:new Map()};buckets.push(match);}
    match.docs.push(doc);
    for(const [term,weight]of doc.vector)match.sum.set(term,(match.sum.get(term)||0)+weight);
    match.centroid=normalized(match.sum);
  }
  buckets.forEach((bucket,index)=>{
    const shared=new Map();
    for(const doc of bucket.docs)for(const word of new Set(doc.words))shared.set(word,(shared.get(word)||0)+1);
    const labels=[...shared].filter(([,count])=>count>=2).sort((a,b)=>b[1]-a[1] || b[0].length-a[0].length || a[0].localeCompare(b[0],'en')).slice(0,2).map(([word])=>word);
    const repository=[...bucket.docs[0].terms.keys()].find(term=>term.startsWith('repo:') && bucket.docs.every(doc=>doc.terms.has(term)));
    const title=(repository?.split('/').at(-1) || labels.join(' · ') || bucket.docs[0].words.slice(0,3).join(' ') || bucket.docs[0].tab.title || 'Tabs').slice(0,80);
    for(const doc of bucket.docs)result.set(doc.tab.id,{title,color:COLORS[index%COLORS.length],clusterId:`local:${index}`});
  });
  return result;
}
