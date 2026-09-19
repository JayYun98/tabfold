import { getProvider } from './ai.js';
import { t, initI18n, applyI18n } from './i18n.js';
const $ = id => document.getElementById(id);
let plan, suggestions = [], busy = false, undoAvailable = false;
let provider = getProvider();
let preferences = {suggestNew:true};
const colors = {grey:'#8190a5',blue:'#4d74cc',red:'#cf6977',yellow:'#c09c39',green:'#479278',pink:'#c375a3',purple:'#987ac5',cyan:'#469dab',orange:'#ce8c52'};
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
async function send(message){const result=await chrome.runtime.sendMessage(message);if(!result?.ok)throw new Error(result?.error||t('No response. Reopen the extension.'));return result;}
function controls(){document.querySelectorAll('button,input,select').forEach(el=>el.disabled=busy);$('apply').disabled=busy||!plan?.groups.length;$('duplicates').disabled=busy||!plan?.duplicates.length;$('undo').disabled=busy||!undoAvailable;}
async function run(action){if(busy)return;busy=true;controls();try{await action();}catch(error){status(error.message,true);}finally{busy=false;controls();}}
function tabList(tabs){const list=document.createElement('ul');for(const tab of tabs){const li=document.createElement('li');li.textContent=tab.title||tab.url;li.title=tab.url;list.append(li);}return list;}
function render(){
  $('total').textContent=plan.total;$('groupCount').textContent=plan.groups.length;$('duplicateCount').textContent=plan.duplicates.length;$('protected').textContent=t('{count} protected',{count:plan.protectedCount});$('groups').replaceChildren();
  for(const group of plan.groups){const item=document.createElement('details');item.className='group';const summary=document.createElement('summary');const dot=document.createElement('span');dot.className='dot';dot.style.setProperty('--group-color',colors[group.color]||colors.grey);const title=document.createElement('span');title.className='group-title';title.textContent=group.title;title.title=group.title;const count=document.createElement('span');count.className='count';count.textContent=group.tabIds.length;summary.append(dot,title,count);item.append(summary,tabList(group.tabs));$('groups').append(item);}
  $('empty').hidden=!!plan.groups.length;$('duplicateReview').hidden=true;renderSuggestions();controls();
}
function renderSuggestions(){
  $('suggestionsSection').hidden=!suggestions.length;$('suggestionRows').replaceChildren();
  suggestions.forEach((suggestion,index)=>{const row=document.createElement('div');row.className='suggestion-row';const name=document.createElement('input');name.value=suggestion.title;name.maxLength=40;name.setAttribute('aria-label',t('Suggested category name'));const description=document.createElement('p');description.textContent=t('{count} matching tabs',{count:suggestion.tabIds.length});const button=document.createElement('button');button.textContent=t('Add category to preview');button.onclick=()=>run(async()=>{const result=await send({type:'acceptSuggestion',index,title:name.value,plan});plan=result.plan;suggestions=result.suggestions;render();status(t('Category added. Review and apply the groups.'));});row.append(name,description,tabList(suggestion.tabs||[]),button);$('suggestionRows').append(row);});
}
async function refresh(ai=false){const window=await chrome.windows.getCurrent();const result=await send({type:'preview',windowId:window.id,provider:provider.id,allWindows:$('scope').value==='all',ai,suggestNew:preferences.suggestNew});plan=result.plan;suggestions=result.suggestions||[];undoAvailable=result.undoAvailable;render();if(result.suggestionError)status(t('Groups are ready, but category suggestions failed.')+' '+result.suggestionError,true);return result;}
$('settings').onclick=()=>chrome.runtime.openOptionsPage();
$('refresh').onclick=()=>run(async()=>{status(t('Reading your tabs…'));await refresh();status(t('Preview ready. Your tabs have not changed.'));});$('scope').onchange=$('refresh').onclick;
$('aiPreview').onclick=async()=>{if(busy)return;try{const granted=await chrome.permissions.request({origins:[provider.origin]});if(!granted){status(t('Allow {provider} access to use AI preview.',{provider:provider.name}),true);return;}await run(async()=>{status(t('AI is sorting your tabs…'));const result=await refresh(true);if(!result.suggestionError)status(t('AI preview ready. Review before applying.'));});}catch(error){status(error.message,true);}};
$('apply').onclick=()=>run(async()=>{const result=await send({type:'apply',plan,collapse:$('collapse').checked});await refresh();status(result.message);});
$('undo').onclick=()=>run(async()=>{const result=await send({type:'undo'});await refresh();status(result.message);});
$('duplicates').onclick=()=>{$('duplicateList').replaceChildren(...tabList(plan.duplicates).children);$('duplicateReview').hidden=!$('duplicateReview').hidden;if(!$('duplicateReview').hidden)$('duplicateReview').scrollIntoView({block:'nearest'});};
$('dedupe').onclick=()=>run(async()=>{const result=await send({type:'dedupe',plan});await refresh();status(result.message);});
$('restore').onclick=()=>run(async()=>{const result=await send({type:'restore'});await refresh();status(result.message);});
await initI18n();applyI18n();await run(async()=>{const settings=await send({type:'getSettings'});provider=getProvider(settings.provider);preferences=settings.preferences||preferences;await refresh();status(t('Pinned, playing and grouped tabs stay protected.'));});
