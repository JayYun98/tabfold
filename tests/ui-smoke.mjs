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
   const groups=Array.from({length:24},(_,i)=>({title:i?'Research '+i:'A very long research category title that must not stretch the popup',color:'blue',tabIds:[1,2],tabs:[{title:'A long paper title '.repeat(12),url:'https://example.com/paper'},{title:'Experiments',url:'https://example.com/experiments'}]}));
   const existingGroups=[{id:71,title:'Existing research',color:'green',windowId:1,collapsed:true,tabs:Array.from({length:18},(_,i)=>({id:100+i,title:'Saved paper '+i,url:'https://example.com/saved/'+i,windowId:1}))},{id:72,title:'Existing reading',color:'purple',windowId:1,collapsed:false,tabs:Array.from({length:11},(_,i)=>({id:200+i,title:'Saved article '+i,url:'https://example.org/'+i,windowId:1}))}];
   groups[1]={...groups[1],title:existingGroups[0].title,color:existingGroups[0].color,targetGroupId:71};
   window.previewRequests=[];
   window.chrome={storage:{local:{get:async key=>({[key]:data[key]}),set:async value=>Object.assign(data,value)}},windows:{getCurrent:async()=>({id:1})},permissions:{request:async request=>{window.requestedOrigins=request.origins;return true;}},runtime:{openOptionsPage:()=>{window.settingsOpened=true;},sendMessage:async request=>{
    if(request.type==='getSettings')return {ok:true,provider:'typesafe',categories,keyConfigured:false,preferences:{suggestNew:true}};
    if(request.type==='setTabOrder'){window.savedTabOrder=request.tabOrder;return {ok:true,tabOrder:request.tabOrder};}
    if(request.type==='setProvider')return {ok:true,provider:request.provider,keyConfigured:false};
    if(request.type==='preview'){window.previewRequests.push(request);return {ok:true,plan:{total:213,protectedCount:34,groupedCount:29,otherProtectedCount:5,existingGroups,groups,duplicates:[{title:'Duplicate test',url:'https://example.com/'}]},suggestions:[],undoAvailable:true};}
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
  assert.equal(await page.locator('#existingGroups .group').count(),2);
  assert.equal(await page.locator('#existingGroups .group-title').first().textContent(),'Existing research');
  assert.equal(await page.locator('#existingGroups .count').first().textContent(),'18');
  assert.equal(await page.locator('#existingGroups .dot').first().evaluate(e=>e.style.getPropertyValue('--group-color')),'#479278');
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
  await page.locator('#aiPreview').click();await page.waitForFunction(()=>!document.querySelector('#aiPreview').disabled);assert.deepEqual(await page.evaluate(()=>window.requestedOrigins),['https://api.typesafe.ai/*']);
  await page.locator('#settings').click();assert.equal(await page.evaluate(()=>window.settingsOpened),true);
  if(colorScheme==='light' && ['en','ko'].includes(language))await page.screenshot({path:new URL('../docs/assets/popup-'+language+'.png',import.meta.url).pathname});
  await page.goto('https://tabfold.test/options.html');await page.waitForSelector('.category-row');
  assert.equal(await page.locator('html').getAttribute('lang'),language);
  assert.equal(await page.locator('#language option').count(),languages.length);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#tabOrder').selectOption('oldest');await page.waitForFunction(()=>window.savedTabOrder==='oldest');
  assert.equal(await page.locator('#provider').inputValue(),'typesafe');
  await page.locator('#provider').selectOption('openrouter');await page.waitForFunction(()=>!document.querySelector('#provider').disabled);
  assert.match(await page.locator('#providerInfo').textContent(),/OpenRouter/);
  await page.locator('.category-row input').fill('Draft category');await page.locator('#apiKey').fill('test-only-not-a-real-key');
  await page.locator('#language').selectOption(language==='ko'?'en':'ko');
  await page.waitForFunction(()=>!document.querySelector('#language').disabled);
  assert.equal(await page.locator('#tabOrder').inputValue(),'oldest');
  assert.equal(await page.locator('.category-row input').inputValue(),'Draft category');assert.equal(await page.locator('#apiKey').inputValue(),'test-only-not-a-real-key');
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
   console.log('JSON import, rejection, export round-trip and explicit save passed');
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  await context.close();console.log(language,colorScheme,'layout and draft preservation passed');
 }
}finally{await browser.close();}
