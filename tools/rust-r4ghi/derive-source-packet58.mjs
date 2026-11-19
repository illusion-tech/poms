import fs from 'node:fs';
import assert from 'node:assert/strict';
const file='tools/rust-r4ghi/package-retained-candidate36.mjs';let text=fs.readFileSync(file,'utf8');
for(const [before,after] of [
 ['g2-business10','g2-business11'],['404','405'],
 ['a379d62b5b583446b01f4a6bb3891b4bf9bdaf0e5966fb7a39dd7b07b643c589','06d80fa6e766c2704664dc1828ccbedadd6bb5fba2798e3e5b42cc02a759274e'],
 ['000091-candidate-source-binding10.json','002348-candidate-source-binding11.json'],
 ['0a1096457d239cdb16c6f75cec54f5bee994e0d68df0303f0fd27d48c2b81344','910ffeefb2d9b0322b53476034104fbc58aeb520e8de159790458eebbbc440fc'],
 ['46874','69377'],['06849f6a47997e1b0dcef2b87c3a61baccb051ee9162933149921096ec04b3d2','c73fcaa6cc9063e9a6b7dc481a51f9f52d4ed3f9855c55201d1ab46f0695bee4'],
 ['final10-source36','final11-source58'],['final10','final11']
]){assert(text.includes(before),'Missing precise derivation anchor '+before);text=text.split(before).join(after);}
fs.writeFileSync('tools/rust-r4ghi/package-retained-candidate58.mjs',text,{flag:'wx'});
console.log(JSON.stringify({newTool:'package-retained-candidate58.mjs',sourceFiles:405,executed:false}));
