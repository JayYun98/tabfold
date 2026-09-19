const $ = id => document.getElementById(id);
let plan;
let busy = false;
let undoAvailable = false;
const colors = {grey:'#8190a5',blue:'#4d74cc',red:'#cf6977',yellow:'#c09c39',green:'#479278',pink:'#c375a3',purple:'#987ac5',cyan:'#469dab',orange:'#ce8c52'};
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
async function send(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || '응답을 받지 못했습니다. 확장을 다시 열어주세요.');
  return result;
}
function render() {
  $('total').textContent = plan.total;
  $('groupCount').textContent = plan.groups.length;
  $('duplicateCount').textContent = plan.duplicates.length;
  $('protected').textContent = `${plan.protectedCount}개 보호`;
  $('groups').replaceChildren();
  for (const group of plan.groups) {
    const item = document.createElement('details'); item.className = 'group';
    const summary = document.createElement('summary');
    const dot = document.createElement('span'); dot.className = 'dot'; dot.style.setProperty('--group-color', colors[group.color] || colors.grey);
    const title = document.createElement('span'); title.textContent = group.title;
    const count = document.createElement('span'); count.className = 'count'; count.textContent = group.tabIds.length;
    summary.append(dot, title, count);
    const list = document.createElement('ul');
    for (const tab of group.tabs) { const li = document.createElement('li'); li.textContent = tab.title || tab.url; li.title = tab.url; list.append(li); }
    item.append(summary, list); $('groups').append(item);
  }
  $('empty').hidden = plan.groups.length > 0;
  $('apply').disabled = !plan.groups.length;
  $('duplicates').disabled = !plan.duplicates.length;
  $('duplicateReview').hidden = true;
}
async function refresh(ai = false) {
  const window = await chrome.windows.getCurrent();
  const result = await send({type:'preview',windowId:window.id,allWindows:$('allWindows').checked,ai});
  plan = result.plan; render(); undoAvailable = result.undoAvailable; $('undo').disabled = !undoAvailable;
  $('keyState').textContent = result.keyConfigured ? '키가 이번 브라우저 세션에 저장되어 있습니다.' : '키는 브라우저를 종료하면 지워집니다.';
}
async function run(action) {
  if (busy) return; busy = true;
  const buttons = [...document.querySelectorAll('button,input')];
  const states = buttons.map(button => button.disabled);
  buttons.forEach(button => button.disabled = true);
  try { await action(); } catch (error) { status(error.message, true); }
  finally { busy = false; buttons.forEach((button,i) => button.disabled = states[i]); if(plan){$('apply').disabled=!plan.groups.length;$('duplicates').disabled=!plan.duplicates.length;$('undo').disabled=!undoAvailable;} }
}
$('refresh').onclick = () => run(async()=>{await refresh();status('정리안을 업데이트했습니다.');});
$('allWindows').onchange = $('refresh').onclick;
$('apply').onclick = () => run(async()=>{const result=await send({type:'apply',plan,collapse:$('collapse').checked});await refresh();status(result.message);});
$('undo').onclick = () => run(async()=>{const result=await send({type:'undo'});await refresh();status(result.message);});
$('duplicates').onclick = () => {
  $('duplicateList').replaceChildren();
  for (const tab of plan.duplicates) {const li=document.createElement('li');li.textContent=tab.title||tab.url;li.title=tab.url;$('duplicateList').append(li);}
  $('duplicateReview').hidden = !$('duplicateReview').hidden;
};
$('dedupe').onclick = () => run(async()=>{const result=await send({type:'dedupe',plan});await refresh();status(result.message);});
$('restore').onclick = () => run(async()=>{const result=await send({type:'restore'});await refresh();status(result.message);});
run(async()=>{await refresh();status('고정 탭·재생 중인 탭·기존 그룹은 보호합니다.');});

$('saveKey').onclick = () => run(async()=>{await send({type:'setKey',key:$('apiKey').value.trim()});$('apiKey').value='';$('keyState').textContent='키가 이번 브라우저 세션에 저장되어 있습니다.';status('API 키를 저장했습니다.');});
$('clearKey').onclick = () => run(async()=>{await send({type:'setKey',key:''});$('apiKey').value='';$('keyState').textContent='저장된 키가 없습니다.';status('API 키를 지웠습니다.');});
$('aiPreview').onclick = async () => {
  if(busy) return;
  const granted = await chrome.permissions.request({origins:['https://openrouter.ai/*']});
  if(!granted){status('AI 분류에는 OpenRouter 연결 권한이 필요합니다.',true);return;}
  run(async()=>{status('Jev가 탭을 분류하고 있어요…');await refresh(true);status('Jev 정리안입니다. 내용을 확인한 뒤 적용하세요.');});
};
