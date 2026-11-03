import fs from'node:fs';
const source=fs.readFileSync('tools/rust-r4abc/happy-http05.mjs','utf8').replaceAll('fixture-core02.mjs','fixture-core03.mjs').replaceAll('05','07');fs.writeFileSync('tools/rust-r4abc/happy-http07.mjs',source,{flag:'wx'});console.log('Smoke07 has new output, graph and request identities; originals05/06 remain.');
