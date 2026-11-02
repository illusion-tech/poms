import fs from 'node:fs';import assert from 'node:assert/strict';
const derive=(from,to,replacements)=>{assert(!fs.existsSync(to));let text=fs.readFileSync(from,'utf8');for(const [old,value]of replacements){assert(text.includes(old));text=text.replaceAll(old,value);}fs.writeFileSync(to,text,{flag:'wx'});};
derive('tools/rust-r3hijk/final-integrity03.mjs','tools/rust-r3hijk/final-integrity04.mjs',[['final-integrity03','final-integrity04'],['rust-check10','rust-check11'],['rust-candidate05.json','rust-candidate06.json']]);
derive('tools/rust-r3hijk/sync-derived-tools01.mjs','tools/rust-r3hijk/sync-derived-tools02.mjs',[['derived-tools-sync01.json','derived-tools-sync02.json']]);
console.log(JSON.stringify({preparedCurrentCandidate06Integrity:true,earlierRecipesUnchanged:true}));
