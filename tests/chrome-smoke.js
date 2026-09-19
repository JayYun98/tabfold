// Run in the extension page's DevTools console: paste this file's contents.
// Creates and closes only its own test window. Uses no AI credits.
(async () => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const send = (message) => chrome.runtime.sendMessage(message);
  const before = await chrome.tabs.query({});
  const window = await chrome.windows.create({url:'about:blank',focused:false});
  const windowId = window.id;
  try {
    const urls = ['https://example.com/?tabfold=1','https://example.com/?tabfold=2','https://example.org/?tabfold=3','https://example.org/?tabfold=3'];
    const tabs = [];
    for (const url of urls) tabs.push(await chrome.tabs.create({windowId,url,active:false}));
    const pinned = await chrome.tabs.create({windowId,url:'https://example.com/?tabfold=pinned',pinned:true,active:false});
    const kept = await chrome.tabs.create({windowId,url:'https://example.net/?tabfold=kept',active:false});
    const keptId = await chrome.tabs.group({tabIds:[kept.id],createProperties:{windowId}});
    await chrome.tabGroups.update(keptId,{title:'Keep me',color:'pink'});
    // Chrome reports pending URLs during initial navigation; wait for committed URLs only.
    for(let i=0;i<100;i++) {
      const current=await chrome.tabs.query({windowId});
      if(tabs.every((t,index)=>current.some(c=>c.id===t.id && c.url===urls[index])))break;
      await new Promise(r=>setTimeout(r,100));
    }
    let p=await send({type:'preview',windowId});
    assert(p.ok && p.plan.groups.length===2,'preview: expected two groups');
    let result=await send({type:'apply',plan:p.plan,collapse:true});
    assert(result.ok,'apply: '+result.error);
    const groups=await chrome.tabGroups.query({windowId});
    assert(groups.filter(g=>g.id!==keptId).every(g=>g.collapsed),'groups not collapsed');
    assert((await chrome.tabs.get(pinned.id)).pinned,'pinned changed');
    assert((await chrome.tabs.get(kept.id)).groupId===keptId,'existing group changed');
    assert((await send({type:'undo'})).ok,'undo failed');
    assert((await chrome.tabs.get(tabs[0].id)).groupId===-1,'undo did not ungroup');
    p=await send({type:'preview',windowId});
    assert(p.plan.duplicates.length===1,'duplicate preview mismatch: '+JSON.stringify({plan:p.plan,tabs:await chrome.tabs.query({windowId})}));
    assert((await send({type:'dedupe',plan:p.plan})).ok,'dedupe failed');
    assert((await chrome.tabs.query({windowId})).length===6,'dedupe wrong tab count');
    assert((await send({type:'restore'})).ok,'restore failed');
    assert((await chrome.tabs.query({windowId})).length===7,'restore wrong count');
    p=await send({type:'preview',windowId});
    await chrome.tabs.update(tabs[0].id,{pinned:true});
    assert(!(await send({type:'apply',plan:p.plan})).ok,'stale protected tab accepted');
    for(const original of before) {
      const current=await chrome.tabs.get(original.id);
      assert(current.groupId===original.groupId && current.windowId===original.windowId,'unrelated tab changed');
    }
    return {ok:true,checks:['preview','group','collapse','pinned protection','existing group protection','undo','dedupe','restore','stale rejection','other windows unchanged']};
  } finally { await chrome.windows.remove(windowId); }
})()
