// Preserve original mutable-path identities with an immutable same-byte mapping.
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto';
const P = '/home/wangzishi/.local/share/poms-r4ghi/private', D = P + '/business/g2-business15/main01', O = P + '/source15-initial-state-retained119-01';
const sha = b => createHash('sha256').update(b).digest('hex');
function read(file, h) { const st = fs.lstatSync(file); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1); assert.equal(fs.realpathSync(file), file); const b = fs.readFileSync(file); if (h) assert.equal(sha(b), h); return { b, pin: { file, bytes: b.length, rawBytesSha256: sha(b) } }; }
assert.equal(process.platform, 'linux'); assert(!fs.existsSync(O));
const state = read(D + '/state.json', 'a6fda93cca0b21d8377254b3bbe7bce80687108cfd67cc1c7380012fef00b7fd');
const ownership = read(D + '/ownership.jsonl', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
const s = JSON.parse(state.b); assert.equal(s.epoch, 'g2-business15'); assert.equal(s.sequence, 0); assert(!s.taxContinuation15);
assert(!fs.existsSync(D + '/driver.lock'));
const publication = read(D + '/publication119-d9c7686b-cb40-4744-889b-7ebb0f8bafde.json', 'a9bb04cf275c9734536a5360324a9fddc0a3c4ce871fd7201c04bfd97a9debdb');
const journal = read(D + '/source15-publication119-intent.jsonl');
fs.mkdirSync(O, { mode: 0o700 });
function copy(name, original) { const file = O + '/' + name; fs.writeFileSync(file, original.b, { flag: 'wx', mode: 0o600 }); return { original: original.pin, immutableCopy: read(file, original.pin.rawBytesSha256).pin, rawBytesIdentical: true }; }
const mappings = [copy('state-initial15.json', state), copy('ownership-initial15.jsonl', ownership), copy('publication-original.json', publication), copy('publication-journal-original.jsonl', journal)];
read(state.pin.file, state.pin.rawBytesSha256); read(ownership.pin.file, ownership.pin.rawBytesSha256);
const file = O + '/retained-initial15-mapping.json'; fs.writeFileSync(file, JSON.stringify({ kind: 'Root-preserved-actual-initial-Source15-state119', mappings,
  originalPublicationAndPathsUnchanged: true, initialSequence: 0, beforeAnyOrdinaryContext: true,
  source15BusinessExecuted: false, G3Certified: false, G4Certified: false }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ mapping: read(file).pin, sourceStateUnchanged: true, ordinaryContextCreated: false }));
