// Real extension UI and native tab groups in a disposable Chrome profile.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/promo-screenshots.mjs
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const profile=await mkdtemp(join(tmpdir(),'tabfold-promo-'));
const extension=new URL('../extension',import.meta.url).pathname;
const output=new URL('../docs/assets/promo/',import.meta.url).pathname;
await mkdir(output,{recursive:true});
const shots=[], checks=[], errors=[];
let context;
try {
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:380,height:560},deviceScaleFactor:2,colorScheme:'light',locale:'en-US',args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 const examples=[
  ['https://research.invalid/papers/attention','Neural network research papers · Attention'],
  ['https://research.invalid/papers/benchmarks','Neural network research papers · Benchmarks'],
  ['https://research.invalid/papers/experiments','Neural network research papers · Experiments'],
  ['https://design.invalid/guide/type','Design system reference guide · Typography'],
  ['https://design.invalid/guide/color','Design system reference guide · Colors'],
  ['https://design.invalid/guide/components','Design system reference guide · Components'],
  ['https://travel.invalid/kyoto/hotels','Kyoto weekend travel planning · Hotels'],
  ['https://travel.invalid/kyoto/itinerary','Kyoto weekend travel planning · Itinerary'],
  ['https://travel.invalid/kyoto/restaurants','Kyoto weekend travel planning · Restaurants'],
 ];
 const titles=new Map(examples);
 titles.set('https://design.invalid/guide/patterns','Design system reference guide · Patterns');
 titles.set('https://design.invalid/guide/layouts','Design system reference guide · Layouts');
 await context.route(url=>url.hostname.endsWith('.invalid'),route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><title>${titles.get(route.request().url()) || 'Demo reference page'}</title><h1>Tabfold demonstration page</h1><p>Fictional sample content for promotional screenshots.</p>`}));
 const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
 const id=new URL(worker.url()).host;
 const popup=context.pages()[0];
 popup.on('pageerror',error=>errors.push(error.message));
 await popup.goto(`chrome-extension://${id}/options.html`);
 await popup.evaluate(()=>chrome.storage.local.set({tabfoldLanguage:'en'}));
 for(const [url] of examples){const tab=await context.newPage();await tab.goto(url);}
 const idle=()=>popup.waitForFunction(()=>document.querySelector('#total').textContent!=='—' && !document.querySelector('#refresh').disabled);
 const openPopup=async()=>{await popup.setViewportSize({width:380,height:560});await popup.goto(`chrome-extension://${id}/popup.html`);await idle();};
 const native=()=>popup.evaluate(async()=>(await chrome.tabs.query({})).filter(tab=>tab.url?.includes('.invalid/')).map(tab=>({id:tab.id,url:tab.url,windowId:tab.windowId,groupId:tab.groupId})).sort((a,b)=>a.id-b.id));
 const shot=async(name,caption,locator)=>{await popup.mouse.move(0,0);const path=join(output,name+'.png');if(locator){await locator.evaluate(element=>element.scrollIntoView({block:'center'}));const box=await locator.boundingBox();await popup.screenshot({path,clip:{x:box.x-24,y:box.y-24,width:box.width+48,height:box.height+48}});}else await popup.screenshot({path});shots.push({file:name+'.png',caption});};
 await openPopup();
 assert.equal(await popup.locator('#aiPreview').textContent(),'Set up AI');
 assert.equal(await popup.locator('#apply').isEnabled(),true);
 await shot('01-quick-preview','Local quick preview, before tabs change. No API key and no AI request.');
 await popup.locator('#groups .group summary').first().click();
 await shot('02-review-group-members','Expand a proposed group to review its sample tabs.');
 const before=await native();
 await popup.locator('#apply').click();await idle();
 assert.equal(await popup.locator('#undo').isEnabled(),true);
 const applied=await native();
 assert.ok(applied.every(tab=>tab.groupId>=0));
 assert.deepEqual(applied.map(tab=>tab.windowId),before.map(tab=>tab.windowId));
 await popup.locator('#existingSection > summary').click();
 await popup.locator('#existingSection > summary').evaluate(element=>element.scrollIntoView({block:'start'}));
 await shot('03-applied-groups','Real Apply result: native Chrome groups created; Undo is available.');
 await popup.locator('#undo').click();await idle();
 assert.deepEqual(await native(),before);
 assert.equal(await popup.locator('#undo').isDisabled(),true);
 await shot('04-undo-grouping','Real Undo result: original tab group assignments restored.');
 checks.push('Apply created native groups for all 9 demo tabs and retained their window; Undo restored every original group assignment.');
 await popup.locator('#apply').click();await idle();
 await popup.locator('#regroup').check();await idle();
 assert.equal(await popup.locator('#groupingModeNotice').textContent(),'Regroup mode: existing groups may be rebuilt.');
 await shot('05-regroup-preview','Regroup mode previews rebuilding existing groups; protected tabs are excluded.');
 await popup.locator('#regroup').uncheck();await idle();
 await popup.locator('#undo').click();await idle();
 const secondWindow=await popup.evaluate(()=>chrome.windows.create({url:['https://design.invalid/guide/patterns','https://design.invalid/guide/layouts'],focused:false}));
 await popup.waitForFunction(async windowId=>(await chrome.tabs.query({windowId})).every(tab=>tab.status==='complete' && tab.title.includes('Design system')),secondWindow.id);
 await popup.locator('#allWindows').check();await idle();
 assert.equal(await popup.locator('#scopeName').textContent(),'All windows');
 assert.equal(new Set(await popup.locator('#groups .window-label').allTextContents()).size,2);
 await shot('06-all-windows','All windows scope, with window labels on proposed groups.');
 await popup.evaluate(windowId=>chrome.windows.remove(windowId),secondWindow.id);
 await popup.locator('#allWindows').uncheck();await idle();
 const duplicate=await context.newPage();await duplicate.goto(examples[0][0]);
 await popup.locator('#refresh').click();await idle();
 await popup.locator('#cleanup > summary').click();
 await popup.locator('#duplicates').click();
 assert.equal(await popup.locator('#duplicateList li').count(),1);
 await shot('07-review-duplicates','Explicit duplicate review with the unsaved-edits warning.');
 await popup.locator('#dedupe').click();await idle();
 assert.equal((await native()).length,before.length);
 await popup.locator('#restore').click();await idle();
 assert.equal((await native()).length,before.length+1);
 checks.push('Duplicate review identified 1 demo duplicate; Close removed it and Restore reopened its URL.');
 await popup.setViewportSize({width:1280,height:900});
 await popup.goto(`chrome-extension://${id}/options.html`);
 await popup.waitForSelector('.category-row');
 await popup.locator('#tabOrder').selectOption('oldest');
 await popup.waitForFunction(()=>!document.querySelector('#tabOrder').disabled);
 await shot('08-settings-language-sorting','Settings: language, preservation mode, and least-recently-used-first ordering.');
 await popup.setViewportSize({width:1280,height:1100});
 const provider=popup.locator('section').filter({has:popup.locator('#provider')});
 await shot('09-openrouter-privacy','Optional OpenRouter configuration, empty key field, session-only storage and privacy disclosure.',provider);
 await popup.locator('#provider').selectOption('typesafe');
 await popup.waitForFunction(()=>!document.querySelector('#provider').disabled);
 assert.equal(await popup.locator('#apiKey').inputValue(),'');
 await shot('10-typesafe-privacy','Optional TypeSafe configuration, empty key field, same privacy disclosure.',provider);
 const categories=[
  {title:'Research',criteria:'Research papers, benchmarks, experiments and technical reading.',color:'green'},
  {title:'Design',criteria:'Design systems, typography, color palettes and product UI references.',color:'blue'},
  {title:'Travel',criteria:'Trip planning, hotels, itineraries, maps and restaurant ideas.',color:'cyan'},
 ];
 await popup.locator('#categoryFile').setInputFiles({name:'tabfold-demo-categories.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(categories))});
 await popup.waitForFunction(()=>!document.querySelector('#saveCategories').disabled);
 assert.match(await popup.locator('#status').textContent(),/Imported 3 categories/);
 const categorySection=popup.locator('section').filter({has:popup.locator('#categoryRows')});
 await shot('11-categories-json-import','Three demo categories imported into the form. They remain drafts until Save.',categorySection);
 await popup.locator('#saveCategories').click();
 await popup.waitForFunction(()=>!document.querySelector('#saveCategories').disabled);
 assert.match(await popup.locator('#status').textContent(),/^Saved\./);
 const downloadEvent=popup.waitForEvent('download');await popup.locator('#exportCategories').click();
 const download=await downloadEvent;const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
 assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString()),categories);
 await popup.locator('#saveCategories').click();await popup.waitForFunction(()=>!document.querySelector('#saveCategories').disabled);
 await categorySection.evaluate(element=>element.scrollIntoView({block:'center'}));
 await shot('12-categories-saved','Saved category preferences with Import/Export JSON controls and real save confirmation.');
 checks.push('Category JSON imported as draft, saved through the UI, and exported with identical content.');
 assert.deepEqual(errors,[]);
 checks.push('No uncaught page errors. No API key entered and no provider call made.');
 const revision=execFileSync('git',['rev-parse','--short','HEAD'],{cwd:new URL('..',import.meta.url),encoding:'utf8'}).trim();
 await writeFile(join(output,'capture-evidence.json'),JSON.stringify({revision,workingTree:'Uncommitted working tree at capture; revision is the base commit, not a clean-commit claim.',browser:context.browser()?.version(),deviceScaleFactor:2,source:'Unmodified extension UI; synthetic demo webpages; real extension worker and Chrome tab/group APIs.',shots,checks},null,2)+'\n');
 const cards=shots.map(shot=>`<article><a href="${shot.file}"><img src="${shot.file}" alt="${shot.caption}" loading="lazy"></a><h2>${shot.file.replace('.png','')}</h2><p>${shot.caption}</p></article>`).join('\n');
 await writeFile(join(output,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tabfold · Promotional screenshot gallery</title><style>body{margin:40px;background:#f4f6fa;color:#24344b;font:15px/1.5 system-ui}h1{font-size:32px;margin-bottom:8px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}article{background:#fff;border:1px solid #dfe5ee;border-radius:12px;padding:20px}img{display:block;width:100%;height:420px;object-fit:contain;object-position:top}h2{font-size:15px;margin:18px 0 6px}p{color:#64758b}header{margin-bottom:32px}</style><header><h1>Tabfold</h1><p>12 real UI captures for video editing · 2× PNG · fictional demo tabs · no AI calls</p></header><main>${cards}</main></html>`);
 console.log(JSON.stringify({screenshots:shots.length,output,checks},null,2));
}finally{await context?.close();await rm(profile,{recursive:true,force:true});}
