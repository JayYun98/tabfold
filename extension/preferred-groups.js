// Explicit user preferences use URL identity, never page-title guesses.
export function preferredGroup(tab,existingGroups=[],{regroup=false}={}) {
  if(!tab || tab.incognito || tab.pinned || tab.audible) return null;
  let url;
  try {url=new URL(tab.url);} catch {return null;}
  if(!['http:','https:'].includes(url.protocol)) return null;
  const host=url.hostname.toLowerCase();
  let preference;
  if(host==='tossinvest.com' || host.endsWith('.tossinvest.com')) preference={id:'investment',title:'Investment',color:'green'};
  else if(['google.com','www.google.com','google.co.kr','www.google.co.kr'].includes(host) && url.pathname==='/search') preference={id:'google-search',title:'Google search',color:'blue'};
  if(!preference) return null;
  const matches=existingGroups.filter(group=>!group.template && group.windowId===tab.windowId && Number.isInteger(group.id) && String(group.title || '').trim().toLowerCase()===preference.title.toLowerCase());
  if(!regroup && matches.length>1) return {title:preference.title,color:preference.color,clusterId:`preferred:ambiguous:${tab.id}`};
  if(!regroup && matches.length===1) return {title:matches[0].title,color:matches[0].color,targetGroupId:matches[0].id};
  return {title:preference.title,color:preference.color,clusterId:`preferred:${preference.id}`};
}
