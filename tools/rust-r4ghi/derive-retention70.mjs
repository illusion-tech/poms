import fs from 'node:fs';
import assert from 'node:assert/strict';
let text=fs.readFileSync('tools/rust-r4ghi/retain-epoch10-before-correction53.mjs','utf8');
for(const [from,to] of [
 ['g2-business10','g2-business11'],['epoch10-before-correction53','epoch11-before-noop70'],
 ['a379d62b5b583446b01f4a6bb3891b4bf9bdaf0e5966fb7a39dd7b07b643c589','06d80fa6e766c2704664dc1828ccbedadd6bb5fba2798e3e5b42cc02a759274e'],
 ['46874','69377'],['06849f6a47997e1b0dcef2b87c3a61baccb051ee9162933149921096ec04b3d2','c73fcaa6cc9063e9a6b7dc481a51f9f52d4ed3f9855c55201d1ab46f0695bee4'],
 ['api133.binary','api134.binary'],["'stop', '133'","'stop', '134'"],['retention53','retention70'],['retained53','retained70'],['state-at-retention53','state-at-retention70'],
 ['source10','source11'],['index53','index70'],['final10-source36','final11-source58'],['correction53.json','noop70.json'],['API133Stopped','API134Stopped']
]){if(!text.includes(from)){if(from==='state-at-retention53')continue;throw new Error('Missing exact retention derivation '+from);}text=text.split(from).join(to);}
assert(text.includes('epoch11-before-noop70')&&text.includes("'stop', '134'")&&text.includes('state-at-retention70'));
fs.writeFileSync('tools/rust-r4ghi/retain-epoch11-before-noop70.mjs',text,{flag:'wx'});
console.log(JSON.stringify({derived:'retain-epoch11-before-noop70.mjs',executed:false}));
