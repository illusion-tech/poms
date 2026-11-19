// FS-only construction of the now-concrete exact119 plan.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private', D = P + '/business/g2-business13/main01';
const sha = v => createHash('sha256').update(v).digest('hex');
assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert(!fs.existsSync(D + '/driver.lock'));
const pin = (file, expected) => { const st = fs.lstatSync(file); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1); assert.equal(fs.realpathSync(file), path.resolve(file)); const rawBytesSha256 = sha(fs.readFileSync(file)); if (expected) assert.equal(rawBytesSha256, expected); return { file, rawBytesSha256 }; };
const read = p => { pin(p.file, p.rawBytesSha256); return JSON.parse(fs.readFileSync(p.file)); };
const fixed = read(pin(D + '/tool119-inputs217/fixed-inputs217.json', 'e8c6db598ca5a36c63ccd17a4d1f7d57eb986c8a416e9f0442e4293cbea9b209'));
const promotionPin = pin(D + '/tool119-promotion220/receipt220.json'), promotion = read(promotionPin); assert.equal(promotion.kind, 'actual-exact-reviewed-H1-runtime-promotion220'); assert(promotion.actualH1EqualsForecast && promotion.source416Unchanged && promotion.originalConsumerStateAndCounterUnchanged);
assert.equal(sha(fs.readFileSync(D + '/state.json')), fixed.entryState.rawBytesSha256);
const template = read(pin(R + '/tools/rust-r4ghi/business/resource-tool-admission119.template.json', 'b1a59c40ab2281bd2ddfbe38dcf63137aa3babab24f096b3feec9df07503bbf3'));
const plan = { ...template };
for (const key of Object.keys(template)) if (template[key] === null && fixed[key] !== null && fixed[key] !== undefined) plan[key] = fixed[key];
plan.H1 = pin(promotion.actualH1.file, '215178abdf1d385081c090d6d4fbea732760b35968c9d0a69d060f353bd0fa45');
plan.independentReview = pin(R + '/tools/rust-r4ghi/independent/review05/resource-tool119-review120/review120-final.json', '3bc0143cc962a87a258b3e9404cb45a7ed96188ef38b1b597aecafc94baa1531');
plan.deltaManifests = [
  { manifest: pin(R + '/tools/rust-r4ghi/H/implementation/support-patches/resource-tool-admission119-02/manifest119-code02.json', '43b9c1b0a51a59b0286620bc225b2c4b5446d5cd1d0e4a9480b8fd46bcdf3eb9'), review: plan.independentReview },
  { manifest: pin(R + '/tools/rust-r4ghi/period205-04/manifest205-04.json', 'f2ec3aefe405e1dc6b4d7dd12762d0c682e518d0fe40142ad083b9a45ec52073'), review: pin(R + '/tools/rust-r4ghi/independent/review05/period205-review119/review119-04.json', '2b24ff0915d461cee09c5d5c4d5dc3fd26d66e1c3b2de3e5acb7e6536e243171') },
];
plan.executionTool = pin(R + '/tools/rust-r4ghi/admit-resource-tool119.mjs', 'f7dfdee2393743d22f0f96210b53213f757f5a4c0945317e7f11a067147bcd83'); plan.nodeExecutable = pin(process.execPath);
assert.deepEqual(Object.keys(plan).sort(), Object.keys(template).sort()); for (const [key, value] of Object.entries(plan)) assert(value !== null && value !== undefined, 'Unbound actual plan field: ' + key);
const actual = fs.readdirSync(R + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).sort().map(n => ({ file: 'tools/rust-r4ghi/business/' + n, sha256: pin(R + '/tools/rust-r4ghi/business/' + n).rawBytesSha256 })); assert.deepEqual(actual, read(plan.H1)); assert.equal(actual.length, 198);
const out = D + '/tool119-plan221'; fs.mkdirSync(out, { mode: 0o700 }); const file = out + '/plan119-221.json'; fs.writeFileSync(file, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ actualPlan: pin(file), actualH1: plan.H1, helperCount: actual.length, exactTemplateFieldsBound: true, RootStateChanged: false, SQLOrHTTPExecuted: false, actual119Published: false }));
