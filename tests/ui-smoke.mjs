// Optional visual test: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/ui-smoke.mjs
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true});
const {LANGUAGES}=await import('../extension/i18n.js');
const languages=LANGUAGES.map(({code})=>code);
await mkdir(new URL('../docs/assets/',import.meta.url),{recursive:true});
try {
 for(const language of languages) for(const colorScheme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width:380,height:560},colorScheme});
  await context.route('https://tabfold.test/**',async route=>{
   const path=new URL(route.request().url()).pathname.slice(1)||'popup.html';
   const type=path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.json')?'application/json':'text/html';
   try{await route.fulfill({body:await readFile(new URL('../extension/'+path,import.meta.url)),contentType:type});}catch{await route.fulfill({status:404,body:''});}
  });
  await context.addInitScript(({language})=>{
   const data={tabfoldLanguage:language};
   const categories=[{title:'Research',criteria:'Papers and experiments',color:'blue'}];
   const groups=Array.from({length:24},(_,i)=>({title:i?'Research '+i:'A very long research category title that must not stretch the popup',color:'blue',windowId:i%2?1:2,tabIds:[1,2],tabs:[{title:'A long paper title '.repeat(12),url:'https://example.com/paper'},{title:'Experiments',url:'https://example.com/experiments'}]}));
   const existingGroups=[{id:71,title:'Existing research',color:'green',windowId:1,collapsed:true,tabs:Array.from({length:18},(_,i)=>({id:100+i,title:'Saved paper '+i,url:'https://example.com/saved/'+i,windowId:1}))},{id:72,title:'Existing reading',color:'purple',windowId:1,collapsed:false,tabs:Array.from({length:11},(_,i)=>({id:200+i,title:'Saved article '+i,url:'https://example.org/'+i,windowId:1}))}];
   groups[1]={...groups[1],title:existingGroups[0].title,color:existingGroups[0].color,targetGroupId:71};
   window.previewRequests=[];window.fixtureKeyConfigured=sessionStorage.getItem('testKeyConfigured')==='true';window.messageRequests=[];window.fixtureGroupingMode='preserve';window.fixturePreferences={suggestNew:true,ignoreCategories:false,useExistingGroups:true};
   window.chrome={storage:{local:{get:async key=>({[key]:data[key]}),set:async value=>Object.assign(data,value)}},windows:{getCurrent:async()=>({id:1})},permissions:{request:async request=>{window.requestedOrigins=request.origins;return true;}},runtime:{openOptionsPage:()=>{window.settingsOpened=true;},sendMessage:async request=>{window.messageRequests.push(request);
    if(request.type==='getSettings')return {ok:true,provider:sessionStorage.getItem('fixtureProvider')||'typesafe',groupingMode:window.fixtureGroupingMode,categories,keyConfigured:window.fixtureKeyConfigured,preferences:{...window.fixturePreferences}};
    if(request.type==='setPreferences'){if(window.failPreferences)return {ok:false,error:'Test save failure'};Object.assign(window.fixturePreferences,request.preferences);return {ok:true,preferences:{...window.fixturePreferences}};}
    if(request.type==='setGroupingMode'){window.fixtureGroupingMode=request.groupingMode;window.savedGroupingMode=request.groupingMode;return {ok:true,groupingMode:request.groupingMode};}
    if(request.type==='setTabOrder'){window.savedTabOrder=request.tabOrder;return {ok:true,tabOrder:request.tabOrder};}
    if(request.type==='setProvider')return {ok:true,provider:request.provider,keyConfigured:false};
    if(request.type==='preview'){window.previewRequests.push(request);if(window.previewDelay)await new Promise(resolve=>setTimeout(resolve,window.previewDelay));if(window.failPreview)return {ok:false,error:'Test preview failure'};return {ok:true,plan:{total:213,preferences:{...window.fixturePreferences},groupingMode:window.fixtureGroupingMode,protectedCount:window.fixtureGroupingMode==='regroup'?5:34,groupedCount:29,otherProtectedCount:5,existingGroups,groups, ...window.planOverrides,duplicates:[{title:'Duplicate test',url:'https://example.com/'}]},suggestions:window.fixtureSuggestions||[],suggestionError:window.fixtureSuggestionError,undoAvailable:true};}
    if(request.type==='setCategories'){window.savedCategories=request.categories;return {ok:true,categories:request.categories};}
    return {ok:true,message:'Done'};
   }}};
  },{language});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://tabfold.test/popup.html');await page.waitForFunction(()=>document.querySelector('#total').textContent==='213');
  assert.equal(await page.locator('html').getAttribute('lang'),language);
  const bounds=await page.evaluate(()=>({width:document.body.scrollWidth,height:document.body.scrollHeight,apply:document.querySelector('#apply').getBoundingClientRect().toJSON(),list:document.querySelector('main').getBoundingClientRect().toJSON()}));
  assert.equal(bounds.width,380);assert.ok(bounds.height<=560);assert.ok(bounds.apply.bottom<=560);assert.ok(bounds.list.height>70);
  assert.equal(await page.evaluate(()=>window.previewRequests[0].ai),false,'Existing groups must appear before an AI call');
  assert.doesNotMatch(await page.locator('#previewHint').textContent(),/GPT-4\.1/,'Quick preview must not imply an AI naming call');
  assert.match(await page.locator('#apply').textContent(),/2/,'Apply must state the unique tabs that will change');
  assert.deepEqual(await page.locator('.quick-options input').evaluateAll(inputs=>inputs.map(input=>input.id)),['regroup','useExistingGroups','ignoreCategories','suggestNew']);
  assert.equal(await page.locator('#existingGroups .group').count(),2);
  assert.equal(await page.locator('#existingGroups .group-title').first().textContent(),'Existing research');
  assert.equal(await page.locator('#existingGroups .count').first().textContent(),'18');
  assert.ok(await page.locator('#existingGroups .dot').first().evaluate(e=>e.style.getPropertyValue('--group-color')));
  await page.locator('#existingSection > summary').click();
  await page.locator('#existingGroups .group summary').first().click();
  assert.equal(await page.locator('#existingGroups .group').first().locator('li').count(),18);
  assert.equal(await page.locator('#existingGroups .group').first().locator('li').first().textContent(),'Saved paper 0');
  await page.locator('#existingGroups .group summary').first().click();
  await page.locator('#excluded summary').click();assert.match(await page.locator('#groupedReason').textContent(),/29/);assert.match(await page.locator('#otherProtectedReason').textContent(),/5/);await page.locator('#excluded summary').click();
  assert.equal(await page.locator('#groups [data-action="append"]').count(),1);
  assert.equal(await page.locator('#groups [data-action="new"]').count(),23);
  assert.equal(await page.locator('#groups [data-action="append"] .group-title').textContent(),'Existing research');
  assert.notEqual(await page.locator('#groups [data-action="append"] .group-action').textContent(),await page.locator('#groups [data-action="new"] .group-action').first().textContent());
  await page.locator('#groups .group summary').first().click();assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth),380);
  assert.equal(await page.locator('#groupingModeNotice').evaluate(e=>e.classList.contains('warning')),false);
  assert.equal(await page.locator('#regroup').isChecked(),false);
  await page.locator('#regroup').check();await page.waitForFunction(()=>!document.querySelector('#regroup').disabled);
  assert.equal(await page.evaluate(()=>window.savedGroupingMode),'regroup');
  assert.equal(await page.evaluate(()=>window.previewRequests.at(-1).ai),false);
  assert.equal(await page.locator('#groupingModeNotice').evaluate(e=>e.classList.contains('warning')),true);
  assert.equal(await page.locator('#groupedReason').isVisible(),false);
  assert.match(await page.locator('#excludedSummary').textContent(),/5/);
  assert.ok((await page.locator('#apply').boundingBox()).y+(await page.locator('#apply').boundingBox()).height<=560);
  assert.equal(await page.evaluate(()=>Object.hasOwn(window.previewRequests.at(-1),'groupingMode')),false,'Backend settings decide mode, not popup requests');
  await page.locator('#regroup').uncheck();await page.waitForFunction(()=>!document.querySelector('#regroup').disabled);
  assert.equal(await page.evaluate(()=>window.savedGroupingMode),'preserve');
  assert.equal(await page.locator('#groupingModeNotice').isVisible(),true);
  assert.equal(await page.locator('#groupingModeNotice').evaluate(e=>e.classList.contains('warning')),false);
  await page.locator('#allWindows').check();await page.waitForFunction(()=>!document.querySelector('#allWindows').disabled);assert.equal(await page.evaluate(()=>window.previewRequests.at(-1).allWindows),true);
  assert.equal(await page.locator('#useExistingGroups').isChecked(),true);
  await page.locator('#useExistingGroups').uncheck();await page.waitForFunction(()=>!document.querySelector('#useExistingGroups').disabled);assert.equal(await page.evaluate(()=>window.fixturePreferences.useExistingGroups),false);
  await page.locator('#ignoreCategories').check();await page.waitForFunction(()=>!document.querySelector('#ignoreCategories').disabled);assert.equal(await page.evaluate(()=>window.fixturePreferences.ignoreCategories),true);
  await page.locator('#suggestNew').uncheck();await page.waitForFunction(()=>!document.querySelector('#suggestNew').disabled);assert.equal(await page.evaluate(()=>window.fixturePreferences.suggestNew),false);
  await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
  assert.equal(await page.locator('#useExistingGroups').isChecked(),false);
  assert.equal(await page.locator('#ignoreCategories').isChecked(),true);assert.equal(await page.locator('#suggestNew').isChecked(),false);
  assert.equal(await page.evaluate(()=>window.previewRequests.every(request=>request.ai===false)),true,'Checkbox changes must never trigger AI');
  assert.equal(await page.evaluate(()=>window.previewRequests.some(request=>'suggestNew' in request||'ignoreCategories' in request||'useExistingGroups' in request)),false,'Preferences come from backend settings');
  await page.evaluate(()=>window.failPreferences=true);await page.locator('#useExistingGroups').click();await page.waitForFunction(()=>!document.querySelector('#useExistingGroups').disabled);assert.equal(await page.locator('#useExistingGroups').isChecked(),false);
  await page.evaluate(()=>window.failPreferences=true);await page.locator('#ignoreCategories').click();await page.waitForFunction(()=>!document.querySelector('#ignoreCategories').disabled);assert.equal(await page.locator('#ignoreCategories').isChecked(),true);
  await page.evaluate(()=>{window.failPreferences=false;window.failPreview=true;});await page.locator('#suggestNew').check();await page.waitForFunction(()=>!document.querySelector('#suggestNew').disabled);assert.equal(await page.locator('#apply').isDisabled(),true,'Failed preview must not apply stale plan');assert.equal(await page.locator('#status').getAttribute('role'),'alert');assert.ok((await page.locator('#status').textContent()).length>0,'AI/preview error must remain visible');
  await page.evaluate(()=>window.failPreview=false);await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
  await page.locator('#aiPreview').click();
  assert.equal(await page.evaluate(()=>window.settingsOpened),true,'No key should open setup');
  assert.equal(await page.evaluate(()=>window.requestedOrigins),undefined,'No key should not request network permission');
  await page.evaluate(()=>sessionStorage.setItem('testKeyConfigured','true'));
  await page.reload();await page.waitForFunction(()=>document.querySelector('#total').textContent==='213'&&!document.querySelector('#aiPreview').disabled);
  await page.locator('#aiPreview').click();await page.waitForFunction(()=>!document.querySelector('#aiPreview').disabled);assert.deepEqual(await page.evaluate(()=>window.requestedOrigins),['https://api.typesafe.ai/*']);
  assert.doesNotMatch(await page.locator('#previewHint').textContent(),/GPT-4\.1/,'TypeSafe AI preview must not claim an OpenRouter naming call');
  await page.locator('#settings').click();assert.equal(await page.evaluate(()=>window.settingsOpened),true);
  if(colorScheme==='light' && ['en','ko'].includes(language))await page.screenshot({path:new URL('../docs/assets/popup-'+language+'.png',import.meta.url).pathname});
  if(language==='en'&&colorScheme==='light'){
   await page.locator('#allWindows').check();await page.waitForFunction(()=>!document.querySelector('#allWindows').disabled);
   assert.equal(await page.locator('#groups .window-label').count(),24);
   assert.equal(new Set(await page.locator('#groups .window-label').allTextContents()).size,2);
   assert.equal(await page.locator('#existingSection').getAttribute('open'),null);
   await page.locator('#cleanup > summary').click();await page.locator('#duplicates').click();assert.equal(await page.locator('#duplicateReview').isVisible(),true);
   await page.evaluate(()=>window.failPreview=true);await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
   assert.equal(await page.locator('#apply').isDisabled(),true);
   assert.equal(await page.locator('#dedupe').isDisabled(),true,'Stale duplicate deletion must stay disabled');
   assert.equal(await page.locator('#existingSection').isVisible(),false,'Failed scope refresh must hide old inventory');
   await page.evaluate(()=>{window.failPreview=false;window.planOverrides={total:213,groupedCount:208,protectedCount:213,otherProtectedCount:5,groups:[]};});
   await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
   assert.match(await page.locator('#empty').textContent(),/Regroup/);assert.equal(await page.locator('#apply').isDisabled(),true);
   await page.evaluate(()=>window.planOverrides={total:5,groupedCount:0,protectedCount:5,otherProtectedCount:5,groups:[],existingGroups:[]});
   await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
   assert.doesNotMatch(await page.locator('#empty').textContent(),/Try AI/);
   await page.evaluate(()=>window.planOverrides={total:0,groupedCount:0,protectedCount:0,otherProtectedCount:0,groups:[],existingGroups:[]});
   await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
   assert.doesNotMatch(await page.locator('#empty').textContent(),/Try AI/);
   await page.evaluate(()=>{window.planOverrides=undefined;window.previewDelay=250;});
   await page.locator('#refresh').click();assert.equal(await page.locator('#apply').isDisabled(),true);assert.equal(await page.locator('#aiPreview').isDisabled(),true);
   await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
   await page.locator('#apply').click();await page.waitForFunction(()=>!document.querySelector('#apply').disabled);
   assert.equal(await page.evaluate(()=>window.messageRequests.filter(x=>x.type==='apply').length),1);
   await page.locator('#undo').click();await page.waitForFunction(()=>!document.querySelector('#undo').disabled);
   assert.equal(await page.evaluate(()=>window.messageRequests.filter(x=>x.type==='undo').length),1);
   await page.evaluate(()=>{window.fixtureSuggestions=[{title:'Research collection',tabIds:Array.from({length:100},(_,i)=>i+1),tabs:Array.from({length:100},(_,i)=>({title:'Paper '+i,url:'https://example.com/'+i}))}];});
   await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
   assert.equal(await page.locator('#suggestionRows details').getAttribute('open'),null);
   await page.locator('#suggestionRows summary').click();assert.equal(await page.locator('#suggestionRows li').count(),100);
   assert.ok((await page.locator('#apply').boundingBox()).y+(await page.locator('#apply').boundingBox()).height<=560);
   assert.ok(await page.evaluate(()=>document.querySelector('#suggestionsSection').compareDocumentPosition(document.querySelector('#existingSection'))&Node.DOCUMENT_POSITION_FOLLOWING));
   await page.evaluate(()=>{window.planOverrides={groups:[]};window.fixtureSuggestionError='Planner unavailable';});
   await page.locator('#aiPreview').click();await page.waitForFunction(()=>!document.querySelector('#aiPreview').disabled);
   assert.equal(await page.locator('#status').textContent(),'Planner unavailable');assert.equal(await page.locator('#apply').isDisabled(),true);
   await page.evaluate(()=>{window.planOverrides=undefined;window.fixtureSuggestionError=undefined;});
   console.log('Multiwindow, no-key, grouped/empty/protected, stale duplicate, loading, apply and undo UX passed');
  }
  await page.goto('https://tabfold.test/options.html');await page.waitForSelector('.category-row');
  assert.equal(await page.locator('html').getAttribute('lang'),language);
  assert.equal(await page.locator('#language option').count(),languages.length);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.equal(await page.locator('#groupingMode').inputValue(),'preserve');
  await page.locator('#groupingMode').selectOption('regroup');await page.waitForFunction(()=>window.savedGroupingMode==='regroup');
  assert.ok((await page.locator('#status').textContent()).length>0,'Grouping mode save must confirm its result');
  assert.ok(await page.locator('#status').evaluate(element=>element.getBoundingClientRect().top<innerHeight),'Saved grouping status must be visible without reaching the footer');
  await page.locator('#tabOrder').selectOption('oldest');await page.waitForFunction(()=>window.savedTabOrder==='oldest');
  assert.equal(await page.locator('#provider').inputValue(),'typesafe');
  await page.locator('#provider').selectOption('openrouter');await page.waitForFunction(()=>!document.querySelector('#provider').disabled);
  assert.match(await page.locator('#providerInfo').textContent(),/OpenRouter/);
  const providerInfoBeforeLanguageChange=await page.locator('#providerInfo').textContent();
  await page.locator('.category-row input').fill('Draft category');await page.locator('#apiKey').fill('test-only-not-a-real-key');
  await page.locator('#language').selectOption(language==='ko'?'en':'ko');
  await page.waitForFunction(()=>!document.querySelector('#language').disabled);
  assert.equal(await page.locator('#groupingMode').inputValue(),'regroup');
  assert.equal(await page.locator('#tabOrder').inputValue(),'oldest');
  assert.equal(await page.locator('.category-row input').inputValue(),'Draft category');assert.equal(await page.locator('#apiKey').inputValue(),'test-only-not-a-real-key');
  assert.match(await page.locator('#providerInfo').textContent(),/OpenRouter/);
  assert.notEqual(await page.locator('#providerInfo').textContent(),providerInfoBeforeLanguageChange,'Provider explanation must be translated on language change');
  if(language==='en' && colorScheme==='light'){
   const expected=[{title:'AI edited category',criteria:'Papers and benchmarks',color:'green'}];
   await page.locator('#categoryFile').setInputFiles({name:'categories.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(expected))});
   await page.waitForFunction(()=>!document.querySelector('#saveCategories').disabled);
   assert.equal(await page.locator('.category-row input').inputValue(),expected[0].title);
   assert.equal(await page.evaluate(()=>window.savedCategories),undefined,'Import must not persist before Save');
   for(const invalid of ['{broken',JSON.stringify([expected[0],expected[0]]),JSON.stringify({...expected[0]}),' '.repeat(65537)]){
    await page.locator('#categoryFile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(invalid)});
    await page.waitForFunction(()=>!document.querySelector('#saveCategories').disabled);
    assert.equal(await page.locator('.category-row input').inputValue(),expected[0].title);
    assert.equal(await page.locator('#status').evaluate(e=>e.classList.contains('error')),true);
   }
   const downloading=page.waitForEvent('download');await page.locator('#exportCategories').click();const download=await downloading;
   assert.equal(download.suggestedFilename(),'tabfold-categories.json');const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
   assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString()),expected);
   await page.locator('#saveCategories').click();await page.waitForFunction(()=>!!window.savedCategories);
   assert.deepEqual(await page.evaluate(()=>window.savedCategories),expected);
   assert.ok(await page.locator('#status').evaluate(element=>element.getBoundingClientRect().top<innerHeight),'Category save status must remain visible without reaching the footer');
   console.log('JSON import, rejection, export round-trip and explicit save passed');
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  await page.evaluate(()=>sessionStorage.setItem('fixtureProvider','openrouter'));await page.goto('https://tabfold.test/popup.html');await page.waitForSelector('#groups .group');
  assert.doesNotMatch(await page.locator('#previewHint').textContent(),/GPT-4\.1/,'OpenRouter quick preview must not imply GPT naming');
  await page.locator('#aiPreview').click();await page.waitForFunction(()=>!document.querySelector('#aiPreview').disabled);
  assert.match(await page.locator('#previewHint').textContent(),/GPT-4\.1/,'OpenRouter AI preview must disclose GPT naming');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const applyBox=await page.locator('#apply').boundingBox();assert.ok(applyBox.y+applyBox.height<=560);
  if(colorScheme==='light' && ['en','ko'].includes(language))await page.screenshot({path:new URL('../docs/assets/popup-'+language+'.png',import.meta.url).pathname});
  await context.close();console.log(language,colorScheme,'layout and draft preservation passed');
 }
}finally{await browser.close();}
