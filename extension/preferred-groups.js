// File formats are the only deterministic category policy.
export function preferredGroup(tab,existingGroups=[],{regroup=false}={}) {
  if(!tab || tab.incognito || tab.pinned || tab.audible) return null;
  let url;
  try {url=new URL(tab.url);} catch {return null;}
  if(!['http:','https:'].includes(url.protocol)) return null;
  let pathname=url.pathname;
  try {pathname=decodeURIComponent(pathname);} catch {}
  let preference;
  if(/\.(?:png|jpe?g|gif|webp|avif|svg|bmp|ico|tiff?|heic)$/i.test(pathname)) preference={id:'images',title:'Images',color:'purple'};
  if(!preference) return null;
  const matches=existingGroups.filter(group=>!group.template && group.windowId===tab.windowId && Number.isInteger(group.id) && String(group.title || '').trim().toLowerCase()===preference.title.toLowerCase());
  if(!regroup && matches.length>1) return {title:preference.title,color:preference.color,clusterId:`preferred:ambiguous:${tab.id}`};
  if(!regroup && matches.length===1) return {title:matches[0].title,color:matches[0].color,targetGroupId:matches[0].id};
  return {title:preference.title,color:preference.color,clusterId:`preferred:${preference.id}`};
}
