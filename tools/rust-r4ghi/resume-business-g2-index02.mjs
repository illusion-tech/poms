// Resume the interrupted process after the verified #110 update. Never append
// its marker twice, and do not repeat an already-identical body PATCH.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const original = 'tools/rust-r4ghi/activate-business-g2-index01.mjs';
let source = fs.readFileSync(original, 'utf8');
const replacements = [
  ["const out = 'tmp/rust-r4ghi/root/business-g2-activation01';", "const out = 'tmp/rust-r4ghi/root/business-g2-activation02';"],
  ["  assert(!prior.body.includes('<!-- poms-r4ghi-doing-01 -->'));", "  // A previously read-back activation marker is adopted idempotently."],
  ["  body = body.trimEnd() + '\\n\\n<!-- poms-r4ghi-doing-01 -->\\n';", "  if (!prior.body.includes('<!-- poms-r4ghi-doing-01 -->')) body = body.trimEnd() + '\\n\\n<!-- poms-r4ghi-doing-01 -->\\n';"],
  ["  api(`update-${number}`, `${repo}/issues/${number}`, 'PATCH', { body });", "  if (body !== prior.body) api(`update-${number}`, `${repo}/issues/${number}`, 'PATCH', { body });"],
];
for (const [before, after] of replacements) { assert(source.includes(before), 'resume must match the preserved original'); source = source.replace(before, after); }
fs.writeFileSync('tools/rust-r4ghi/activate-business-g2-index02.mjs', source, { flag: 'wx' });
