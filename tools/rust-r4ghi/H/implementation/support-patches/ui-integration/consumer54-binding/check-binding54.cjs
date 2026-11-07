// Synthetic VM/provenance-control tests only. Does not invoke the real admission helper or any HTTP/DB/process.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), { createHash } = require('node:crypto'), { createRequire } = require('node:module');
const rootRequire = createRequire('E:/projects/worktrees/poms-r3hijk-next28/poms/package.json'), ts = rootRequire('typescript');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const code = fs.readFileSync(path.join(__dirname, 'proposed/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime13/binding13.mjs'), 'utf8').replaceAll('import.meta.url', '"file:///synthetic/binding13.mjs"');
function harness(change = () => {}) {
    const store = new Map(), bin = Buffer.from('synthetic-new-current-binary'), sourcePins = [{ file: 'synthetic-current-source', sha256: 'a'.repeat(64) }];
    const put = (file, value) => { const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value)); store.set(file, bytes); return { file, rawBytesSha256: sha(bytes) }; };
    const actor = { id: 'current-actor', roleId: 'current-role', orgId: 'current-org', permissions: ['project:read'] }, record = { projectId: 'actual-retained-project', receipt: put('/synthetic-private/business/old10/receipt.json', { projectId: 'actual-retained-project', controlledCompatibilityFixture: true }) };
    const processRecord = { namespace: 'poms-r4ghi', port: 31441, root: '/synthetic-mirror', binary: '/synthetic-current-binary', binarySha256: sha(bin), pid: 1234, startTime: '987' };
    const ctx = { namespace: 'poms-r4ghi', epoch: 'current11', run: 'current-run', tables: 139, migrations: 97, database: 'poms_r4ghi_rust', private: '/synthetic-private', win: '/synthetic-win', mirror: '/synthetic-mirror',
        state: { marker: 'synthetic-marker', sourcePins, actors: { manager: actor }, fixtures: { legacyCompatibilityFixture: record } } };
    const processPin = put('/synthetic-private/process.json', processRecord); ctx.state.apiProcess = { ...processPin, record: processRecord };
    const binding = { schemaVersion: 1, namespace: ctx.namespace, epoch: ctx.epoch, run: ctx.run, marker: ctx.state.marker, tables: 139, migrations: 97, database: ctx.database,
        sourcePinsSHA256: sha(Buffer.from(JSON.stringify(sourcePins))), expectedCandidateBinarySHA256: sha(bin), apiProcess: processPin,
        sourceManifest: put('/synthetic-private/current-source.json', { current: true }), candidateReceipt: put('/synthetic-private/current-candidate.json', { current: true }),
        actorManifest: put('/synthetic-private/current-actors.json', { namespace: ctx.namespace, epoch: ctx.epoch, run: ctx.run, marker: ctx.state.marker, actors: [{ key: 'manager', ...actor }] }),
        compatibilityFixtures: [{ kind: 'legacy-anchor', qualification: 'controlled-compatibility-negative', businessProducer: false, projectId: record.projectId, seedReceipt: record.receipt }] };
    const state = { ctx, binding, store, calls: 0, put, verdict: { producerEpoch: 'old10', consumerEpoch: ctx.epoch, registryPath: '/fixtures/legacyCompatibilityFixture', retainedProducerOnly: true } };
    change(state); store.set('/synthetic-current-binary', bin);
    const fields = Array(20).fill('0'); fields[19] = processRecord.startTime; store.set('/proc/1234/stat', Buffer.from('1234 (synthetic control) ' + fields.join(' ')));
    const syntheticFs = { readFileSync(file, encoding) { assert(store.has(file), 'Unexpected synthetic input'); const bytes = store.get(file); return encoding ? bytes.toString(encoding) : bytes; },
        lstatSync() { return { nlink: 1, isFile: () => true, isSymbolicLink: () => false }; }, realpathSync(file) { return file === '/proc/1234/exe' ? processRecord.binary : file; } };
    const bridge = { assertAdmittedFixtureSource(context, args) { state.calls++; assert.equal(context, ctx); assert.equal(args.registryPath, '/fixtures/legacyCompatibilityFixture'); assert.equal(args.record, record);
        assert.deepEqual(args.projectIds, [record.projectId]); assert.equal(args.producerReceipt.file, record.receipt.file); assert.equal(args.producerReceipt.rawBytesSha256, record.receipt.rawBytesSha256); if (state.failure) throw state.failure; return state.verdict; } };
    const module = { exports: {} }, javascript = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    const ownRequire = name => name === 'node:fs' ? syntheticFs : name === 'node:path' ? path.posix : name === 'node:module' ? { createRequire: () => name => { assert.equal(name, '../../../../../business/consumer-admission54.mjs'); return bridge; } } : require(name);
    vm.runInThisContext(`(function(require,module,exports){${javascript}\n})`, { filename: 'synthetic-binding54-only.cjs' })(ownRequire, module, module.exports);
    state.invoke = () => { const bytes = Buffer.from(JSON.stringify(binding)); return module.exports.bindActualContext(ctx, binding, sha(bytes), bytes); }; return state;
}
let cases = 0; const check = fn => { fn(); cases++; };
check(() => { const h = harness(), before = JSON.stringify(h.ctx.state.fixtures.legacyCompatibilityFixture); h.invoke(); assert.equal(h.calls, 1); assert.equal(JSON.stringify(h.ctx.state.fixtures.legacyCompatibilityFixture), before); });
check(() => { const h = harness(h => { h.ctx.state.sourcePins = [{ file: 'synthetic-old-source', sha256: 'b'.repeat(64) }]; }); assert.throws(h.invoke); assert.equal(h.calls, 0); });
check(() => { const h = harness(h => { h.binding.expectedCandidateBinarySHA256 = 'c'.repeat(64); }); assert.throws(h.invoke); assert.equal(h.calls, 0); });
check(() => { const h = harness(h => { h.ctx.state.actors.manager.permissions = ['project:read', 'commission:assignments:manage']; }); assert.throws(h.invoke); assert.equal(h.calls, 0); });
check(() => { const h = harness(h => { h.binding.compatibilityFixtures[0].seedReceipt = h.put('/synthetic-private/business/old10/unregistered-wrapper.json', { projectId: 'actual-retained-project' }); }); assert.throws(h.invoke); assert.equal(h.calls, 0); });
check(() => { const h = harness(h => { h.verdict = Promise.resolve(h.verdict); }); assert.throws(h.invoke); });
check(() => { const h = harness(h => { h.verdict.consumerEpoch = 'old10'; }); assert.throws(h.invoke); });
check(() => { const h = harness(h => { h.verdict.registryPath = '/fixtures/other'; }); assert.throws(h.invoke); });
check(() => { const h = harness(h => { h.failure = new Error('Explicit admission absent'); }); assert.throws(h.invoke, /Explicit admission absent/); });
check(() => { const h = harness(h => { const p = h.put('/synthetic-private/business/old10/receipt.json', { projectId: 'actual-retained-project', epoch: 'different-producer' }); h.ctx.state.fixtures.legacyCompatibilityFixture.receipt = p; h.binding.compatibilityFixtures[0].seedReceipt = p; }); assert.throws(h.invoke); });
const result = { kind: 'synthetic-current-binding-and-old-producer-admission-controls-only', cases, passed: cases, realAdmissionInvoked: false, actualHTTPExecuted: false, actualDBExecuted: false, actualBrowserExecuted: false, G3Certified: false };
fs.writeFileSync(path.join(__dirname, 'unit-binding54.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result));
