import fs from 'node:fs';
import assert from 'node:assert/strict';
let source=fs.readFileSync('tools/rust-r4ghi/format-rust-source03.mjs','utf8');
assert.equal(source.split('rust-format03').length,2);source=source.replace('rust-format03','rust-format04');
fs.writeFileSync('tools/rust-r4ghi/format-rust-source04.mjs',source,{flag:'wx'});
