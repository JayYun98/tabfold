import { getProvider } from './ai.js';
import { t, initI18n, applyI18n } from './i18n.js';
const $ = id => document.getElementById(id);
let plan, suggestions = [], busy = false, undoAvailable = false;
let provider = getProvider();
let preferences = {suggestNew:true,ignoreCategories:false};
const colors = {grey:'#8190a5',blue:'#4d74cc',red:'#cf6977',yellow:'#c09c39',green:'#479278',pink:'#c375a3',purple:'#987ac5',cyan:'#469dab',orange:'#ce8c52'};
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
async function send(message){const result=await chrome.runtime.sendMessage(message);if(!result?.ok)throw new Error(result?.error||t('No response. Reopen the extension.'));return result;}
function controls(){document.querySelectorAll('button,input,select').forEach(el=>el.disabled=busy);$('apply').disabled=busy||!plan?.groups.length;$('duplicates').disabled=busy||!plan?.duplicates.length;$('undo').disabled=busy||!undoAvailable;}
async function run(action){if(busy)return;busy=true;controls();try{await action();}catch(error){status(error.message,true);}finally{busy=false;controls();}}
function tabList(tabs){const list=document.createElement('ul');for(const tab of tabs){const li=document.createElement('li');li.textContent=tab.title||tab.url;li.title=tab.url;list.append(li);}return list;}
function groupRow(group,existing=false){
  const item=document.createElement('details');item.className='group';
  if(existing)item.dataset.groupId=group.id;
  else item.dataset.action=group.targetGroupId==null?'new':'append';
  const summary=document.createElement('summary');
  const dot=document.createElement('span');dot.className='dot';dot.style.setProperty('--group-color',colors[group.color]||colors.grey);
  const title=document.createElement('span');title.className='group-title';title.textContent=group.title||t('Unnamed group');title.title=title.textContent;
  const count=document.createElement('span');count.className='count';count.textContent=existing?group.tabs.length:group.tabIds.length;
  summary.append(dot,title);
  if(!existing){const action=document.createElement('span');action.className='group-action';action.textContent=t(group.targetGroupId==null?'New group':'Add tabs');summary.append(action);}
  summary.append(count);item.append(summary,tabList(group.tabs));return item;
}
function render(){
  $('total').textContent=plan.total;$('groupCount').textContent=plan.groups.length;$('duplicateCount').textContent=plan.duplicates.length;
  const existing=plan.existingGroups||[];
  $('existingCount').textContent=existing.length;$('existingGroups').replaceChildren(...existing.map(group=>groupRow(group,true)));$('noExisting').hidden=!!existing.length;
  const regroup=plan.groupingMode==='regroup';
  $('regroup').checked=regroup;
  preferences=plan.preferences||preferences;
  $('ignoreCategories').checked=!!preferences.ignoreCategories;
  $('suggestNew').checked=preferences.suggestNew!==false;
  $('groupingModeNotice').hidden=!regroup;
  $('groupingModeNotice').textContent=t(regroup?'Regroup mode: existing groups may be rebuilt.':'Keep existing groups');
  $('groupingModeNotice').classList.toggle('warning',regroup);
  $('groupedReason').hidden=regroup;
  const grouped=plan.groupedCount||0;const other=plan.otherProtectedCount??Math.max(0,plan.protectedCount-grouped);
  $('excludedSummary').textContent=t('{count} tabs excluded from classification',{count:regroup?other:grouped+other});
  $('groupedReason').textContent=t('{count} already grouped — members stay in place.',{count:grouped});
  $('otherProtectedReason').textContent=t('{count} protected — pinned, playing, incognito or internal tabs.',{count:other});
  $('groups').replaceChildren(...plan.groups.map(group=>groupRow(group)));
  $('empty').hidden=!!plan.groups.length;$('duplicateReview').hidden=true;renderSuggestions();controls();
}
function renderSuggestions(){
  $('suggestionsSection').hidden=!suggestions.length;$('suggestionRows').replaceChildren();
  suggestions.forEach((suggestion,index)=>{const row=document.createElement('div');row.className='suggestion-row';const name=document.createElement('input');name.value=suggestion.title;name.maxLength=40;name.setAttribute('aria-label',t('Suggested category name'));const description=document.createElement('p');description.textContent=t('{count} matching tabs',{count:suggestion.tabIds.length});const button=document.createElement('button');button.textContent=t('Add category to preview');button.onclick=()=>run(async()=>{const result=await send({type:'acceptSuggestion',index,title:name.value,plan});plan=result.plan;suggestions=result.suggestions;render();status(t('Category added. Review and apply the groups.'));});row.append(name,description,tabList(suggestion.tabs||[]),button);$('suggestionRows').append(row);});
}
async function refresh(ai=false){const window=await chrome.windows.getCurrent();const result=await send({type:'preview',windowId:window.id,provider:provider.id,allWindows:$('allWindows').checked,ai});plan=result.plan;suggestions=result.suggestions||[];undoAvailable=result.undoAvailable;render();if(result.suggestionError)status(t('Groups are ready, but category suggestions failed.')+' '+result.suggestionError,true);return result;}
async function refreshAfterSetting(){
  plan=undefined;suggestions=[];$('groups').replaceChildren();renderSuggestions();controls();
  status(t('Reading your tabs…'));await refresh();status(t('Preview ready. Your tabs have not changed.'));
}
$('regroup').onchange=()=>run(async()=>{
  const previous=plan?.groupingMode==='regroup';
  try{await send({type:'setGroupingMode',groupingMode:$('regroup').checked?'regroup':'preserve'});}
  catch(error){$('regroup').checked=previous;throw error;}
  await refreshAfterSetting();
});
for(const key of ['ignoreCategories','suggestNew'])$(key).onchange=()=>run(async()=>{
  const previous=preferences[key];
  try{const result=await send({type:'setPreferences',preferences:{[key]:$(key).checked}});preferences=result.preferences;}
  catch(error){$(key).checked=previous;throw error;}
  await refreshAfterSetting();
});
$('settings').onclick=()=>chrome.runtime.openOptionsPage();
$('refresh').onclick=()=>run(async()=>{status(t('Reading your tabs…'));await refresh();status(t('Preview ready. Your tabs have not changed.'));});$('allWindows').onchange=()=>run(refreshAfterSetting);
$('aiPreview').onclick=async()=>{if(busy)return;try{const granted=await chrome.permissions.request({origins:[provider.origin]});if(!granted){status(t('Allow {provider} access to use AI preview.',{provider:provider.name}),true);return;}await run(async()=>{status(t('AI is sorting your tabs…'));const result=await refresh(true);if(!result.suggestionError)status(t('AI preview ready. Review before applying.'));});}catch(error){status(error.message,true);}};
$('apply').onclick=()=>run(async()=>{const result=await send({type:'apply',plan,collapse:$('collapse').checked});await refresh();status(result.message);});
$('undo').onclick=()=>run(async()=>{const result=await send({type:'undo'});await refresh();status(result.message);});
$('duplicates').onclick=()=>{$('duplicateList').replaceChildren(...tabList(plan.duplicates).children);$('duplicateReview').hidden=!$('duplicateReview').hidden;if(!$('duplicateReview').hidden)$('duplicateReview').scrollIntoView({block:'nearest'});};
$('dedupe').onclick=()=>run(async()=>{const result=await send({type:'dedupe',plan});await refresh();status(result.message);});
$('restore').onclick=()=>run(async()=>{const result=await send({type:'restore'});await refresh();status(result.message);});
await initI18n();applyI18n();await run(async()=>{const settings=await send({type:'getSettings'});provider=getProvider(settings.provider);preferences=settings.preferences||preferences;await refresh();status(t(plan.groupingMode==='regroup'?'Review the new groups before applying. Protected tabs stay in place.':'Only ungrouped tabs change. Existing group members stay in place.'));});
