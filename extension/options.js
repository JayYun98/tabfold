import { DEFAULT_CATEGORIES } from './ai.js';
import { t, initI18n, applyI18n, setLanguage, getLanguage, LANGUAGES } from './i18n.js';
const $=id=>document.getElementById(id);
let busy=false, keyConfigured=false;
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
async function send(message){const result=await chrome.runtime.sendMessage(message);if(!result?.ok)throw new Error(result?.error||t('No response. Reopen the extension.'));return result;}
async function run(action){if(busy)return;busy=true;document.querySelectorAll('button,input,select,textarea').forEach(el=>el.disabled=true);try{await action();}catch(error){status(error.message,true);}finally{busy=false;document.querySelectorAll('button,input,select,textarea').forEach(el=>el.disabled=false);}}
function keyState(configured){keyConfigured=configured;$('keyState').textContent=t(configured?'A key is saved for this browser session.':'No API key saved.');}
function addCategoryRow(category={title:'',criteria:'',color:'blue'}){
  if($('categoryRows').children.length>=12){status(t('You can add up to 12 categories.'),true);return;}
  const row=document.createElement('div');row.className='category-row';row.dataset.color=category.color;
  const label=document.createElement('label');label.textContent=t('Category name');const name=document.createElement('input');name.value=category.title;name.maxLength=40;name.placeholder=t('For example, Research');label.append(name);
  const remove=document.createElement('button');remove.className='remove';remove.textContent='×';remove.setAttribute('aria-label',t('Remove category'));remove.onclick=()=>row.remove();
  const criteriaLabel=document.createElement('label');criteriaLabel.className='criteria-label';criteriaLabel.textContent=t('What belongs here');const criteria=document.createElement('textarea');criteria.className='criteria';criteria.value=category.criteria;criteria.maxLength=240;criteria.rows=2;criteria.placeholder=t('For example, ML papers, benchmarks and experiments');criteriaLabel.append(criteria);
  row.append(label,remove,criteriaLabel);$('categoryRows').append(row);
}
function readCategories(){return [...$('categoryRows').children].map(row=>({title:row.querySelector('input').value,criteria:row.querySelector('textarea').value,color:row.dataset.color}));}
function renderCategories(categories){$('categoryRows').replaceChildren();categories.forEach(addCategoryRow);}
$('addCategory').onclick=()=>addCategoryRow();
$('resetCategories').onclick=()=>{renderCategories(DEFAULT_CATEGORIES);status(t('Defaults restored. Save to keep these changes.'));};
$('saveCategories').onclick=()=>run(async()=>{const categories=readCategories();const result=await send({type:'setCategories',categories});await chrome.storage.local.set({tabfoldPreferences:{suggestNew:$('suggestNew').checked}});renderCategories(result.categories);status(t('Saved. Your next AI preview will use these settings.'));});
$('saveKey').onclick=()=>run(async()=>{const key=$('apiKey').value.trim();await send({type:'setKey',key});$('apiKey').value='';keyState(!!key);status(t(key?'API key saved for this session.':'API key removed.'));});
$('clearKey').onclick=()=>run(async()=>{await send({type:'setKey',key:''});$('apiKey').value='';keyState(false);status(t('API key removed.'));});
$('language').onchange=()=>run(async()=>{const draft=readCategories();await setLanguage($('language').value);applyI18n();renderCategories(draft);keyState(keyConfigured);status('');});
await initI18n();applyI18n();
for(const language of LANGUAGES){const option=document.createElement('option');option.value=language.code;option.textContent=language.name;$('language').append(option);}
$('language').value=getLanguage();
await run(async()=>{const settings=await send({type:'getSettings'});renderCategories(settings.categories);$('suggestNew').checked=settings.preferences?.suggestNew!==false;keyState(settings.keyConfigured);});
