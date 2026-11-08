import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const input = JSON.parse(fs.readFileSync(path.join(root, 'product-raw-precomparison183.json'), 'utf8'));
assert.equal(input.files.length, 10);
function diffLines(before, after) {
  const n = before.length, m = after.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = before[i] === after[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && before[i] === after[j]) { out.push({ type: ' ', text: before[i], old: i + 1, next: j + 1 }); i++; j++; }
    else if (i < n && (j === m || dp[i + 1][j] >= dp[i][j + 1])) { out.push({ type: '-', text: before[i], old: i + 1, next: j + 1 }); i++; }
    else { out.push({ type: '+', text: after[j], old: i + 1, next: j + 1 }); j++; }
  }
  assert.deepEqual(out.filter(x => x.type !== '+').map(x => x.text), before);
  assert.deepEqual(out.filter(x => x.type !== '-').map(x => x.text), after);
  return out;
}
const sections = [], summaries = [];
for (const item of input.files) {
  const oldBytes = item.beforeAbsent ? null : fs.readFileSync(item.beforePath);
  const newBytes = fs.readFileSync(item.afterPath);
  if (oldBytes) assert.equal(sha(oldBytes), item.beforeSHA256);
  assert.equal(sha(newBytes), item.afterSHA256);
  const oldLines = oldBytes ? oldBytes.toString('utf8').split('\n') : [];
  const newLines = newBytes.toString('utf8').split('\n');
  const ops = diffLines(oldLines, newLines);
  const changed = ops.map((x, i) => x.type === ' ' ? -1 : i).filter(i => i >= 0);
  const ranges = [];
  for (const i of changed) {
    const start = Math.max(0, i - 3), end = Math.min(ops.length, i + 4);
    if (ranges.length && start <= ranges.at(-1)[1]) ranges.at(-1)[1] = Math.max(end, ranges.at(-1)[1]);
    else ranges.push([start, end]);
  }
  sections.push(`--- ${item.beforeAbsent ? '/dev/null' : 'Source12/' + item.file}`, `+++ Staged106/${item.file}`);
  for (const [start, end] of ranges) {
    const hunk = ops.slice(start, end);
    sections.push(`@@ -${hunk[0].old},${hunk.filter(x => x.type !== '+').length} +${hunk[0].next},${hunk.filter(x => x.type !== '-').length} @@`);
    sections.push(...hunk.map(x => x.type + x.text.replace(/\r$/, '')));
  }
  summaries.push({ file: item.file, added: item.beforeAbsent, beforeSHA256: item.beforeSHA256, afterSHA256: item.afterSHA256, removedLines: ops.filter(x => x.type === '-').length, addedLines: ops.filter(x => x.type === '+').length, hunks: ranges.length });
}
const text = sections.join('\n') + '\n';
fs.writeFileSync(path.join(root, 'ten-product-diff183.patch'), text);
fs.writeFileSync(path.join(root, 'ten-product-diff183.json'), JSON.stringify({ kind: 'reviewer-fixed-file-line-diff183', rawPinsRemainAuthoritative: true, displayStripsTrailingCR: true, fullSourceComparisonReceipt: false, node: process.version, files: summaries, diffSHA256: sha(Buffer.from(text)) }, null, 2) + '\n');
process.stdout.write(JSON.stringify({ files: summaries.length, removedLines: summaries.reduce((n, x) => n + x.removedLines, 0), addedLines: summaries.reduce((n, x) => n + x.addedLines, 0), fullSource13Comparison: false }) + '\n');
