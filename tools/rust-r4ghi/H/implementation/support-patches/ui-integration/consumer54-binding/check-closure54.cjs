// Synthetic in-memory filesystem only. No actual Root promotion/admission/HTTP/DB occurs.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), { createHash } = require('node:crypto'), { createRequire } = require('node:module');
const rootRequire = createRequire('E:/projects/worktrees/poms-r3hijk-next28/poms/package.json'), ts = rootRequire('typescript'), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const prefix = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration', root = '/synthetic-root';
const originalNames = JSON.parse(fs.readFileSync(path.join(__dirname, '../handoff16/exact-copy-plan16.json'))).files.map(item => item.relativeFile);
const source = fs.readFileSync(path.join(__dirname, 'proposed/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/source-closure16.mjs'), 'utf8');
function harness(change = () => {}) {
    const store = new Map(), put = (file, text) => { const bytes = Buffer.from(text); store.set(file, bytes); return { rawBytesSha256: sha(bytes), bytes: bytes.length }; };
    const original = { files: originalNames.map(relativeFile => ({ relativeFile, ...put(`${root}/${prefix}/${relativeFile}`, 'synthetic-original:' + relativeFile) })) };
    const receiptFile = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/synthetic-unit-not-real-promotion.json';
    const receiptPin = { file: receiptFile, ...put(receiptFile, JSON.stringify({ kind: 'synthetic-only-no-real-promotion' })) }; delete receiptPin.bytes;
    const promoted = { schemaVersion: 1, kind: 'Root-reviewed-exact-tool-corrective-closure54', promotionReceipt: receiptPin,
        files: original.files.map(item => ({ ...item, baseRawBytesSha256: item.rawBytesSha256 })) };
    const changed = promoted.files.find(item => item.relativeFile === 'runtime13/binding13.mjs'); Object.assign(changed, put(`${root}/${prefix}/${changed.relativeFile}`, 'synthetic-corrective-candidate'));
    const entryFiles = ['binding-input16.mjs', 'source-closure16.mjs', 'prepare-plan16.mjs', 'collect-actor-proof16.mjs', 'make-generation-input16.mjs', 'generate-binding16.mjs', 'run-max-mask16.mjs', 'run-dom16.mjs', 'consumer-fixtures54.mjs'];
    for (const name of entryFiles) put(`${root}/${prefix}/handoff16/${name}`, 'synthetic-entry:' + name);
    const h = { original, promoted, store, put }; change(h);
    const fakeFs = { lstatSync: file => { assert(store.has(file)); return { isFile: () => true, isSymbolicLink: () => false }; }, realpathSync: file => file,
        readFileSync: (file, encoding) => { assert(store.has(file), 'Unexpected synthetic file'); const bytes = store.get(file); return encoding ? bytes.toString(encoding) : bytes; }, readdirSync: () => [] };
    const module = { exports: {} }, javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    const ownRequire = name => name === 'node:fs' ? fakeFs : name === 'node:path' ? path.posix : name === './binding-input16.mjs' ? { sha } : require(name);
    vm.runInThisContext(`(function(require,module,exports){${javascript}\n})`, { filename: 'synthetic-closure54-only.cjs' })(ownRequire, module, module.exports);
    h.invoke = useOverride => module.exports.inventoryClosure(root, original, [], 'dom', useOverride ? promoted : null); return h;
}
let cases = 0; const check = fn => { fn(); cases++; };
check(() => { const h = harness(); assert.throws(() => h.invoke(false)); });
check(() => { const h = harness(), actual = h.invoke(true); assert.equal(actual.length, 29); assert.equal(actual.find(item => item.file.endsWith('/runtime13/binding13.mjs')).rawBytesSha256, h.promoted.files.find(item => item.relativeFile === 'runtime13/binding13.mjs').rawBytesSha256); });
check(() => { const h = harness(h => { h.promoted.files[0].baseRawBytesSha256 = 'b'.repeat(64); }); assert.throws(() => h.invoke(true)); });
check(() => { const h = harness(h => { h.promoted.files[0].relativeFile = 'runtime14/unreviewed.mjs'; }); assert.throws(() => h.invoke(true)); });
check(() => { const h = harness(h => { h.promoted.files.pop(); }); assert.throws(() => h.invoke(true)); });
check(() => { const h = harness(h => { h.promoted.promotionReceipt.rawBytesSha256 = 'c'.repeat(64); }); assert.throws(() => h.invoke(true)); });
check(() => { const h = harness(h => { h.promoted.promotionReceipt.file = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/../outside.json'; }); assert.throws(() => h.invoke(true)); });
check(() => { const h = harness(h => { h.promoted.files[0].rawBytesSha256 = 'd'.repeat(64); }); assert.throws(() => h.invoke(true)); });
const result = { kind: 'synthetic-explicit-promoted-tool-closure-controls-only', cases, passed: cases, actualPromotionExecuted: false, actualAdmissionInvoked: false, actualHTTPExecuted: false, actualDBExecuted: false, G3Certified: false };
fs.writeFileSync(path.join(__dirname, 'unit-closure54.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
