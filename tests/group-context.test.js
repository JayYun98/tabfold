import test from 'node:test';
import assert from 'node:assert/strict';
import {groupContext,matchExistingGroup,groupsForWindow,isNamedGroup} from '../extension/group-context.js';
const tab=(url,title='',windowId=1)=>({url,title,windowId});
const group=(id,title,windowId=1)=>({id,title,windowId,tabs:[]});
test('clear site routes require unique compatible semantic group names in the same window',()=>{
 const groups=[group(1,'Media / SNS'),group(2,'취업'),group(3,'Research'),group(4,'개발'),group(5,'Visa'),group(6,'youtube.com')];
 for(const [url,id] of [['https://youtube.com/watch?v=1',1],['https://linkedin.com/jobs/view/1',2],['https://linkedin.com/in/person',1],['https://arxiv.org/abs/1',3],['https://github.com/team/project/pull/1',4],['https://uscis.gov/forms',5]]) assert.equal(matchExistingGroup(tab(url),groups)?.id,id);
 assert.equal(matchExistingGroup(tab('https://youtube.com/watch', '',2),groups),null);
 assert.equal(matchExistingGroup(tab('https://youtube.com/watch'),[...groups,group(7,'동영상')]),null);
 assert.equal(matchExistingGroup(tab('https://youtube.com/watch'),[group(6,'youtube.com')]),null);
 assert.equal(matchExistingGroup(tab('https://linkedin.com/company/acme'),groups),null);
 assert.equal(matchExistingGroup(tab('https://visa.com','Visa payment cards'),groups),null);
 assert.equal(matchExistingGroup(tab('https://youtube.com.evil.test/watch'),groups),null);
 assert.equal(matchExistingGroup({...tab('https://youtube.com/watch'),incognito:true},groups),null);
});
test('group descriptions infer broad purpose, respect explicit criteria, and samples are safe and diverse',()=>{
 const source={...group(1,'Media SNS'),description:'Personal entertainment',tabs:[...Array.from({length:8},(_,i)=>tab(`https://user:secret@youtube.com/watch/${i}?token=secret#private`,'Same video title')),tab('https://reddit.com/r/science','Science discussion'),tab('https://vimeo.com/video/1','Documentary'),{...tab('https://private.test','Private'),incognito:true},tab('chrome://settings')]};
 const result=groupContext(source);
 assert.match(result.criteria,/Videos, music/);assert.match(result.criteria,/Personal entertainment/);
 assert.equal(result.members.length,6);assert.equal(new Set(result.members.slice(0,3).map(t=>new URL(t.url).hostname)).size,3);
 assert.doesNotMatch(JSON.stringify(result),/secret|token|#private|private.test|chrome:/);
 assert.equal(source.tabs.length,12);
 assert.equal(matchExistingGroup(tab('https://arxiv.org/abs/1'),[{...group(1,'Reading list'),criteria:'Academic research papers'}])?.id,1);
});

test('cross-window templates deduplicate semantic names and exclude domain/IP labels',()=>{
 const groups=[group(1,'Research',1),group(2,'Research',2),group(3,'Media',2),group(4,'github.com',2),group(5,'127.0.0.1',2),group(6,'[::1]',2)];
 const contexts=groupsForWindow(groups,1);assert.deepEqual(contexts.map(g=>g.id),[1,3]);assert.equal(contexts[1].template,true);assert.equal(contexts[1].windowId,1);
 assert.equal(isNamedGroup(groups[4]),false);assert.equal(isNamedGroup(groups[5]),false);
});

test('canonical job category wins over narrower career fragments but equal broad categories abstain',()=>{
 const input=tab('https://linkedin.com/jobs/view/123');
 const groups=[group(1,'Job Recruit'),group(2,'careers · ai')];
 assert.equal(matchExistingGroup(input,groups)?.id,1);
 assert.equal(matchExistingGroup(input,[...groups,group(3,'Jobs')]),null);
});
