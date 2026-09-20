import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LANGUAGES,initI18n,t,setLanguage} from '../extension/i18n.js';

test('every shipped language covers UI and runtime messages with matching placeholders',async()=>{
  const keys=new Set(['Tabs have changed. Refresh the preview.','Work','Video','Shopping','Reading','Social','A key is saved for this browser session.','No API key saved.','API key saved for this session.','API key removed.']);
  for(const file of ['popup.js','options.js','ai.js','background.js','core.js','popup.html','options.html']){
    const source=await readFile(new URL('../extension/'+file,import.meta.url),'utf8');
    for(const match of source.matchAll(/\bt\('([^']+)'/g)) keys.add(match[1]);
    for(const match of source.matchAll(/data-i18n(?:-placeholder|-title|-label)?="([^"]+)"/g)) keys.add(match[1]);
  }
  const placeholders=s=>[...s.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();
  for(const {code}of LANGUAGES){
    const native=JSON.parse(await readFile(new URL('../extension/_locales/'+code.replace('-','_')+'/messages.json',import.meta.url)));
    for(const key of ['extensionName','extensionDescription','actionTitle']) assert.ok(native[key]?.message,`${code} missing manifest message ${key}`);
    if(code==='en') continue;
    const messages=JSON.parse(await readFile(new URL('../extension/locales/'+code+'.json',import.meta.url)));
    for(const key of keys){assert.ok(messages[key],`${code} missing ${key}`);assert.deepEqual(placeholders(messages[key]),placeholders(key),`${code}: ${key}`);}
  }
});
test('English fallback, language persistence and interpolation work',async()=>{
  let saved; const originalChrome=globalThis.chrome,originalFetch=globalThis.fetch;
  globalThis.chrome={storage:{local:{get:async()=>({tabfoldLanguage:saved}),set:async value=>{saved=value.tabfoldLanguage;}}}};
  globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(await readFile(url))});
  try{
    await initI18n();assert.equal(t('Settings'),'Settings');
    await setLanguage('ko');assert.equal(t('Settings'),'설정');assert.equal(t('{count} protected',{count:4}),'보호된 탭 4개');
    assert.equal(t('Untranslated {count}',{count:3}),'Untranslated 3');
    await assert.rejects(()=>setLanguage('invalid'));
    await setLanguage('en');assert.equal(t('Settings'),'Settings');
  }finally{globalThis.chrome=originalChrome;globalThis.fetch=originalFetch;await initI18n();}
});
