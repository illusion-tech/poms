import fs from'node:fs';import assert from'node:assert/strict';
let source=fs.readFileSync('tools/rust-r4abc/build-baseline-cache01.mjs','utf8');
source=source.replace("baseline-cache-build01'","baseline-cache-build02'");
assert(source.includes("CARGO_BUILD_JOBS:'4'"));source=source.replace("CARGO_BUILD_JOBS:'4'","CARGO_BUILD_JOBS:'4',CARGO_HOME:root+'/tmp/rust-r4abc/cargo-home'");
fs.writeFileSync('tools/rust-r4abc/build-baseline-cache02.mjs',source,{flag:'wx'});console.log('New executor02 uses freshly copied public cargo-home; failed01 preserved.');
