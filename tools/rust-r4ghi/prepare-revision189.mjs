import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', sha = value => createHash('sha256').update(value).digest('hex');
const before = fs.readFileSync(R + '/tools/rust-r4ghi/build-source13-180.mjs'); assert.equal(sha(before), 'd35ef3b022c0e9905121d794781992978079f3fb0490ee7333fdc6450744dbaa');
let text = before.toString(); const replacements = [["P + '/source13-build180'", "P + '/source13-build180-02'"], ["R + '/tools/rust-r4ghi/build-source13-180.mjs'", "R + '/tools/rust-r4ghi/build-source13-180-02.mjs'"]];
for (const [a, b] of replacements) { assert.equal(text.split(a).length, 2); text = text.replace(a, b); }
const file = R + '/tools/rust-r4ghi/build-source13-180-02.mjs'; fs.writeFileSync(file, text, { flag: 'wx' });
console.log(JSON.stringify({ driver: { file: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/build-source13-180-02.mjs', rawBytesSha256: sha(text) }, onlyOutputAndSelfPathChanged: true, actualBuildExecuted: false }));
