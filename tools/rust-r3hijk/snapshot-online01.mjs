import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pin} from './source-guard.mjs';
const [phase]=process.argv.slice(2);assert(/^[a-z0-9-]+$/.test(phase));
const directory='tmp/rust-r3hijk/online-'+phase;assert(!fs.existsSync(directory));fs.mkdirSync(directory,{recursive:true});
const api=(endpoint,extra=[])=>JSON.parse(execFileSync('gh',['api',endpoint,...extra],{encoding:'utf8',windowsHide:true,maxBuffer:16000000}));
const records=[];
for(const number of [93,94,95,96,85,57]){
 const issue=api('repos/illusion-tech/poms/issues/'+number),comments=api('repos/illusion-tech/poms/issues/'+number+'/comments',['--paginate','--slurp']).flat();
 const file=directory+'/issue'+number+'.json';fs.writeFileSync(file,JSON.stringify({issue,comments},null,2)+'\n',{flag:'wx'});records.push({...pin(file),number,state:issue.state,title:issue.title});
}
const children=api('repos/illusion-tech/poms/issues/85/sub_issues',['--paginate','--slurp']).flat();
assert([93,94,95,96].every(number=>children.some(x=>x.number===number)));
fs.writeFileSync(directory+'/parent85-subissues.json',JSON.stringify(children,null,2)+'\n',{flag:'wx'});
const receipt={kind:'R3HIJK-live-online-readback',createdAt:new Date().toISOString(),phase,records,nativeSubIssuesVerified:true,source:pin('tools/rust-r3hijk/snapshot-online01.mjs')};
fs.writeFileSync(directory+'/receipt01.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({phase,issues:records.map(x=>({number:x.number,state:x.state})),nativeSubIssuesVerified:true}));
