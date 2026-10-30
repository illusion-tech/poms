// Independent strict 114-record/all-40-owned-table comparison. Read-only.
// Every clock/nonce substitution requires a typed saved origin and validation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { authority } from './catalog-complete.mjs';
import { digest, identities, supportedTables } from './fixture-core.mjs';
import { marker, sourceHead } from './fixture-guard.mjs';
import { contractInstant, strictContractDiff } from './l-contract-diff.mjs';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UUID_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const FINAL_RUST_SHA256 = '5b9ec4424e17e4e9bfd57055e6141e80594526dc437fde497ab95bfc2f464b16';
const CANDIDATE08=Object.freeze({bindingFile:'tmp/rust-r2l/rust-candidate08-binary-source.json',bindingBytes:32552,bindingSha256:'f9c79ee04f593645715e48f680236dc4c807d64bca63dacdf5e8f4bfecbe7dbb',binaryBytes:34026504,binarySha256:'ee558d02f8a5ee7f49d3e3aced266338282e958cf84bf1cb96ef2e3b61b8b475',sourceFiles:169,filesManifestSha256:'306bf96aac19bf9f7c5ebb696e51df07c92a233348afaf8bd66f4622da33f56a'});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isTime = (value) => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:/.test(value);
const toIso = (us) => new Date(Number(us / 1000n)).toISOString();
function readPublicSourceArchive(file) {
    const absolute=fs.realpathSync(file).replaceAll('\\','/');assert(absolute.includes('/tmp/rust-r2l/runtime-input/')&&!absolute.split('/').includes('private'),'Only saved public runtime-input source archives may be read');
    const stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink());return fs.readFileSync(file);
}
export function verifyCommissionRustBuildBinding(report,readArchive=readPublicSourceArchive) {
    const runtime=report.rustRuntime,build=report.buildBinding,files=report.runtimeInput.files,binary=files.filter(item=>item.target==='artifacts/poms-api-rust');
    assert(runtime?.stopped&&runtime.binaryUnchanged&&binary.length===1&&runtime.binaryRawBytesSha256===binary[0].rawBytesSha256,'Actual Rust binary/owner/capture not bound');
    if(runtime.binaryRawBytesSha256===FINAL_RUST_SHA256) {
        assert.equal(build.expectedBinarySha256,FINAL_RUST_SHA256);assert.notEqual(build.file,CANDIDATE08.bindingFile,'Old5b9e cannot be labeled candidate08');
        return {epoch:'legacy-final5b9e',binarySha256:FINAL_RUST_SHA256,legacyAdmissionPreserved:true,newSourceArchiveReads:0};
    }
    assert.equal(runtime.binaryRawBytesSha256,CANDIDATE08.binarySha256,'Unknown actual Rust binary is not admitted');assert.equal(runtime.binaryBytes,CANDIDATE08.binaryBytes);assert.equal(binary[0].bytes,CANDIDATE08.binaryBytes);
    assert.equal(build.file,CANDIDATE08.bindingFile,'Candidate08 exact build-binding epoch differs');assert.equal(build.rawBytesSha256,CANDIDATE08.bindingSha256);assert.equal(build.expectedBinarySha256,CANDIDATE08.binarySha256);assert.equal(build.sourceFiles,CANDIDATE08.sourceFiles);
    const binding=files.filter(item=>item.target==='artifacts/rust-build-source-binding.json');assert.equal(binding.length,1);assert.equal(binding[0].source,CANDIDATE08.bindingFile);assert.equal(binding[0].bytes,CANDIDATE08.bindingBytes);assert.equal(binding[0].rawBytesSha256,CANDIDATE08.bindingSha256);
    const bytes=readArchive(binding[0].snapshot);assert.equal(bytes.length,CANDIDATE08.bindingBytes);assert.equal(sha(bytes),CANDIDATE08.bindingSha256,'Captured candidate08 binding archive differs');const source=JSON.parse(bytes);
    assert.equal(source.tag,'candidate08');assert.equal(source.result,'pass-build-source-binding-not-runtime');assert.equal(source.files.length,CANDIDATE08.sourceFiles);assert.equal(new Set(source.files.map(x=>x.file)).size,CANDIDATE08.sourceFiles);
    assert.equal(source.filesManifestSha256,CANDIDATE08.filesManifestSha256);assert.equal(sha(JSON.stringify(source.files)),CANDIDATE08.filesManifestSha256);assert.equal(source.binary.rawBytesSha256,CANDIDATE08.binarySha256);assert.equal(source.binary.bytes,CANDIDATE08.binaryBytes);assert.equal(source.binary.file,runtime.binary);
    for(const item of source.files) {
        const captured=files.filter(row=>row.source===item.file);assert.equal(captured.length,1,'Each candidate08 source must have exactly one captured archive: '+item.file);assert.equal(captured[0].bytes,item.bytes);assert.equal(captured[0].rawBytesSha256,item.rawBytesSha256);
        const raw=readArchive(captured[0].snapshot);assert.equal(raw.length,item.bytes);assert.equal(sha(raw),item.rawBytesSha256,'Captured candidate08 source archive differs: '+item.file);
    }
    return {epoch:'candidate08',binarySha256:CANDIDATE08.binarySha256,binaryBytes:CANDIDATE08.binaryBytes,bindingFile:CANDIDATE08.bindingFile,bindingSha256:CANDIDATE08.bindingSha256,sourceArchivesVerified:CANDIDATE08.sourceFiles,filesManifestSha256:CANDIDATE08.filesManifestSha256,ELFReadByComparer:false,privateOrDBRead:false};
}
class CommissionEvidence {
    constructor(report, evidence, backend,readArchive) {
        this.readArchive=readArchive;
        this.r = report; this.a = evidence; this.backend = backend; this.failures = []; this.gaps = []; this.checks = 0; this.ids = new Map(); this.slots = new Map(); this.tables = new Map(); this.origins = new Map(); this.lastRows = new Map(); this.clocks = new Map(); this.clockFrames = []; this.clockEvidence = []; this.nonces = new Map(); this.nonceEvidence = []; this.identityEvidence = []; this.requestClockInputs = new Map(); this.authInputSlots = new Map(); this.usedMutations = new Set();
        this.schema = new Map(authority.tables.map((table) => [table.name, new Map(table.columns.map((column) => [column.name, column]))]));
        this.literal = new Set(['00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000014', ...Object.values(report.preparedSource.plan.readonlyBorrowedDefinitions)]);
        const fixed = fs.readFileSync(new URL('../../apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts', import.meta.url), 'utf8'); for (const id of fixed.match(UUID_TEXT) ?? []) this.literal.add(id);
        this.objects = new Map((evidence?.objects ?? []).map((object) => [object.table + ':' + object.id, object]));
    }
    check(value, at, reason) { this.checks++; if (!value) this.failures.push({ path: this.backend + '.' + at, reason }); return !!value; }
    gap(at, reason) { if (!this.gaps.some((item) => item.path === this.backend + '.' + at && item.reason === reason)) this.gaps.push({ path: this.backend + '.' + at, reason }); }
    bind(id, slot, table, origin) {
        if (!this.check(UUID.test(id ?? '') && !this.literal.has(id), slot, 'Invalid/fixed readonly UUID cannot become a mapped owned slot')) return;
        this.check(!this.ids.has(id) || this.ids.get(id) === slot, slot, 'One UUID maps to multiple source slots'); this.check(!this.slots.has(slot) || this.slots.get(slot) === id, slot, 'Source slot maps to multiple UUIDs');
        this.ids.set(id, slot); this.slots.set(slot, id); if (table) this.tables.set(id, table); if (origin) this.origins.set(id, origin); this.identityEvidence.push({ id, slot, table, origin });
    }
    sourceSetup() {
        const r = this.r, a = this.a;
        this.check(r.backend === this.backend && r.result === 'observed' && r.requests.length === 114 && new Set(r.requests.map(({ name }) => name)).size === 114 && r.doubleZero === true, 'actual', 'Actual complete 114-record run/double zero missing');
        this.authPolicy = r.authFreshnessPolicy ?? 'natural'; this.check(['natural','fresh-except-named-due'].includes(this.authPolicy), 'authFreshnessPolicy', 'Unknown source input policy');
        const originalNative114 = this.backend==='nest' && this.authPolicy==='natural' && r.kind==='actual-original-Native-L-commission-calibration-not-Rust-acceptance' && r.default114Only===undefined && r.baselineMatrixEndReached===undefined && r.phaseHooks===undefined && r.runtimeInput.files.some((item) => item.source==='tools/rust-r2l/l-commission-native-calibration.mjs' && item.rawBytesSha256==='e660f97ca35537038cee1c1bf2f609efd1046de2fa061cd6303480cf908b6e84');
        this.check(originalNative114 || r.default114Only === true && r.baselineMatrixEndReached === true && r.phaseHooks?.length === 0, 'originalMatrix', 'An edge/prefix run cannot stand in for the complete original114 matrix or exact original e660 Native source');
        this.check(r.cleanup.length === 2 && r.cleanup[0].deleted === 127 && r.cleanup[1].deleted === 0 && r.cleanup.every((entry) => entry.state === 'cleaned' && ['firstZero','secondZero'].every((key) => entry[key].objects === 0 && entry[key].logicalReferences === 0 && entry[key].tablesScanned === 107)), 'cleanup', 'Exact 127/0 deletes and both full107 zero scans missing');
        this.check(r.resourceCloseout.every((entry) => entry.result === 'pass') && r.pgObserverRestore.observerFootprintRestored === true && same(r.full107Before,r.full107After), 'closeout', 'Native/PG/product full107 restore or resource closeout incomplete');
        const expectedCloseout=['native-witness-final',...(this.backend==='rust' ? ['rust-owner-close'] : []),'pg7-observer-restore','native-owner-close','pg7-owner-connection-close','whole-owned-final-facts','exact-owned-cleanup-double-zero','fixture-connection-close'];
        this.check(same(r.resourceCloseout.map(({ name })=>name).sort(),expectedCloseout.sort()),'closeoutNames','Applicable independent resource closeout names must all occur exactly once');
        const witness=r.nativeFinal.witness;
        this.check(witness?.complete===true && witness.diagnostics.length===0 && witness.openTransactions.length===0 && witness.pendingStartCount===0 && r.nativeFinal.pgCaptureComplete===true,'globalWitness','Original Native global SDK witness or in-process PG capture is incomplete');
        this.check(r.sourceHead === sourceHead && r.marker === marker && r.runtimeInput.sourceCheckpoint === sourceHead, 'source', 'Wrong actual source/namespace');
        this.check(r.nativeFinal.binaryUnchanged && r.nativeFinal.binaryRawBytesSha256 === '0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4', 'nativeBinary', 'Original Native binary binding differs');
        if (this.backend === 'rust') {try {this.rustBuildAdmission=verifyCommissionRustBuildBinding(r,this.readArchive);this.check(true,'rustBinary','Exact admitted Rust binary and source archive epoch');}catch(error){this.check(false,'rustBinary',error.message);}}
        this.check(a?.kind === 'public-commission-diff-saved-ownership-and-response-bindings' && a.result === 'pass-saved-evidence-only' && a.backend === r.backend && a.runId === r.runId && a.marker === marker && a.sourceHead === sourceHead && a.actualReport.canonicalSha256 === sha(JSON.stringify(r)), 'savedEvidence', 'Ownership/response addendum differs from exact actual report');
        this.check(a.objects.length === 127 && new Set(a.objects.map(({ table, id }) => table + ':' + id)).size === 127, 'objects', 'Expected exact 127 distinct owned objects');
        this.check(a.readonlyDefinitions.length === 3 && a.readonlyDefinitions.every((entry) => entry.neverOwned && entry.beforeFullRowSha256 === entry.afterFullRowSha256), 'readonlyDefinitions', 'Readonly canonical definitions changed or became owned');
        this.check(new Set(a.authorities.map(({ id })=>id)).size===a.authorities.length,'authorityRegistry','Duplicate saved authority identity');
        for(const authority of a.authorities) {
            const expectedFile=authority.kind==='mikro-orm-afterCreate-outer-commit' ? 'tools/rust-r2l/k-native-write-witness.mjs' : authority.kind==='pg-after-insert-observed-outer-commit' ? 'tools/rust-r2l/l-pg-create-observer.mjs' : null;
            this.check(expectedFile && authority.source?.file===expectedFile && authority.sourceAuthority===authority.source.sha256 && r.runtimeInput.files.some(item=>item.source===expectedFile && item.rawBytesSha256===authority.source.sha256),'authorityRegistry.'+authority.id,'Saved authority kind/source does not match the actual captured runtime source');
            if(authority.kind==='pg-after-insert-observed-outer-commit') {
                const pg=r.pgObserverRegistration;
                this.check(authority.id===pg.id && authority.observerId===pg.observerId && authority.functionOid===pg.functionOid && authority.approvedDefinitionSha256===pg.approvedDefinitionSha256 && same(authority.source,pg.source) && pg.runId===r.runId && pg.backend===r.backend && pg.marker===marker && pg.database===r.database,'authorityRegistry.pg','Saved PG registry differs from the exact actual observer registration');
            }
        }
        this.check(a.committedCreates.length===58 && new Set(a.committedCreates.map(item=>item.table+':'+item.id)).size===58,'committedCoverage','Exactly58 distinct actual generated certificates are required');
        for(const certificate of a.committedCreates) {
            const matches=a.authorities.filter(({ id })=>id===certificate.authorityId);
            this.check(matches.length===1 && matches[0].kind===certificate.proof.kind,'certificateAuthority.'+certificate.id,'Original create certificate has no unique registered authority of its proof kind');
        }
        this.bind(r.runId, 'run', null, { kind: 'run' });
        for (const item of a.base.roles) this.bind(item.id, 'base.role.' + item.slot, 'role', { kind: 'base-plan' });
        for (const item of a.base.orgs) this.bind(item.id, 'base.org.' + item.slot, 'org_unit', { kind: 'base-plan' });
        for (const account of a.base.accounts) this.bind(account.userId, 'base.user.' + account.account, 'platform_user', { kind: 'base-plan' });
        const accountFor = (id) => a.base.accounts.find((account) => account.userId === id);
        for (const item of a.base.rows) {
            if (this.ids.has(item.values.id)) continue; const row = item.values; let slot;
            if (item.table === 'role_permission_assignment') slot = 'base.permission.' + this.ids.get(row.role_id) + '.' + row.permission_key;
            else if (item.table === 'local_credential') slot = 'base.credential.' + accountFor(row.user_id)?.account;
            else if (item.table === 'user_role_assignment') { const account = accountFor(row.user_id); this.check(account?.roleId === row.role_id, 'base.roleFK', 'Original base user/role relation differs'); slot = 'base.user-role.' + account?.account; }
            else if (item.table === 'user_org_membership') { const account = accountFor(row.user_id); this.check(account?.orgId === row.org_unit_id && row.membership_type === 'primary', 'base.orgFK', 'Original base primary membership differs'); slot = 'base.user-org.' + account?.account; }
            else this.gap('base.' + item.table, 'Unknown base source factory table');
            if (slot) this.bind(row.id, slot, item.table, { kind: 'base-plan' });
        }
        this.check(a.base.rows.length === 50, 'base.rows', 'Original base source plan is not 50 rows');
        for (const row of r.preparedSource.plan.rows) {
            const mapping = r.preparedSource.plan.mappings.filter(({ to }) => to === row.values.id); this.check(mapping.length === 1, 'prepared.' + row.table, 'No exact original seeder PK mapping');
            if (mapping.length) this.bind(row.values.id, 'prepared.' + row.table + '.' + mapping[0].from, row.table, { kind: 'prepared-literal', source: row.source });
        }
        this.bind(r.additionalPreparedContract.id, 'prepared.additional-draft-contract', 'contract', { kind: 'declared-extra-contract' });
        this.direct = new Map();
        for (const batch of a.directCreates) {
            this.check(batch.beforeAbsent && batch.state === 'promoted' && String(BigInt(batch.transaction) % 4294967296n) === batch.xmin, 'direct.' + batch.caseId, 'Recorded direct outer commit/before absence invalid');
            for (const item of batch.rows) { this.check(this.ids.has(item.id) && this.tables.get(item.id) === item.table, 'direct.' + item.id, 'Direct row not bound by exact source plan'); this.direct.set(item.id, { ...item, batch }); }
        }
        this.check(this.direct.size === 69, 'direct.rows', 'Exact base50+prepared18+draft1 expected');
        const proofById = new Map(a.committedCreates.map((item) => [item.table + ':' + item.id, item]));
        for (const [index, request] of r.requests.entries()) {
            const isL = request.path.startsWith('/api/approval-records/') || request.path === '/api/me/todos';
            if (this.backend === 'rust') this.check(request.executionBackend === (isL ? 'rust' : 'native'), request.name + '.backend', 'Actual L/native producer backend partition differs');
            this.check(request.certificates.sdkComplete === true, request.name + '.sdk', 'Actual source SDK observer incomplete');
            const full = [];
            for (const [kind, rows] of [['sdk', request.certificates.sdkCreates ?? []], ['pg', request.certificates.pgCommittedCreates ?? []]]) for (const row of rows) {
                const proof = proofById.get(row.table + ':' + row.id); this.check(!!proof, request.name + '.proof', 'Summary ID has no original saved create certificate'); if (!proof) continue;
                const context = proof.proof.createContext, intent = a.intents.find(({ id }) => id === proof.intentId);
                this.check(context.runId === r.runId && context.caseId === request.name && intent?.caseId === request.name && intent.table === row.table && intent.beforeObserved && !intent.beforeIds.includes(row.id) && intent.state === 'adopted', request.name + '.beforeIntent', 'Original create context and actual before-intent disagree');
                this.check(context.index===index && context.op===(kind==='sdk' ? 'l.producer' : 'l.http'),'context.'+request.name,'Original create context index/op differs from the exact actual HTTP source site');
                if (kind === 'sdk') {
                    this.check(proof.proof.kind === 'mikro-orm-afterCreate-outer-commit' && proof.proof.sdkVersion === '7.0.11', request.name + '.sdkKind', 'SDK proof type changed');
                    this.check(proof.authorityId===request.certificates.sdkAuthorityId && same(proof.proof.commitContext,context),'sdkAuthority.'+request.name,'SDK per-request authority or original outer commit context differs');
                    const observed = r.nativeFinal.witness.committed.find((item) => item.table === row.table && item.id === row.id); this.check(observed && same(observed.proof, proof.proof), request.name + '.sdkOriginal', 'Saved SDK certificate absent from actual original final trace');
                } else {
                    const p = proof.proof;
                    const authority=a.authorities.find(({ id })=>id===proof.authorityId),pg=r.pgObserverRegistration;
                    this.check(authority && proof.authorityId===pg.id && p.observerId===pg.observerId && p.functionOid===pg.functionOid && p.sourceAuthority===pg.source.sha256 && p.marker===marker && p.database===r.database,request.name+'.pgAuthority','PG original certificate is not bound to the actual registered observer/source/database');
                    this.check(p.kind === 'pg-after-insert-observed-outer-commit' && p.outerCommitObserved === true && p.visibleFromIndependentOwnerConnection === true && p.topXidStatus === 'committed' && p.eventXminStatus === 'committed' && p.outerStatus === 'committed' && BigInt(p.topXid8) <= BigInt(p.eventXid8) && BigInt(p.eventXid8) < BigInt(p.observedFullXid8) && BigInt(p.observedFullXid8) - BigInt(p.topXid8) < 2147483648n && String(BigInt(p.eventXid8) % 4294967296n) === String(p.eventXmin), request.name + '.pgOriginal', 'Independent actual PG outer/sub-xid proof incomplete');
                    this.check(digest(proof.identity) === row.identitySha256, request.name + '.pgIdentity', 'Actual PG immutable creation identity fingerprint differs');
                }
                full.push({ ...row, original: proof, ordinal: kind === 'sdk' ? Number(proof.proof.createEventSeq) : Number(proof.proof.eventId) });
            }
            const counters = new Map();
            for (const row of full.sort((a, b) => a.ordinal - b.ordinal)) { const ordinal = counters.get(row.table) ?? 0; counters.set(row.table, ordinal + 1); this.bind(row.id, 'create.' + request.name + '.' + row.table + '.' + ordinal, row.table, { kind: row.original.proof.kind, caseId: request.name, index, proof: row.original.proof }); }
            const snapshots = full.filter((row) => ['commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot'].includes(row.table));
            if (snapshots.length) {
                this.check(snapshots.length === 2 && new Set(snapshots.map(({ table }) => table)).size === 2, request.name + '.snapshotPair', 'Original linked snapshot pair cardinality differs');
                const proofs = snapshots.map(({ original }) => original.proof);
                this.check(proofs.every((proof) => proof.kind === proofs[0].kind) && (proofs[0].kind === 'mikro-orm-afterCreate-outer-commit' ? proofs.every((proof) => proof.outerTransaction === proofs[0].outerTransaction) : proofs.every((proof) => proof.topXid8 === proofs[0].topXid8)), request.name + '.snapshotOuter', 'Linked snapshot pair was not created in the same original outer commit');
            }
            const response = a.responseBindings.find(({ name }) => name === request.name);
            this.check(response?.originalPrivateComplete && response.sha256 === request.response.wireBodySha256 && response.bytes === request.response.wireBodyBytes && response.status === request.response.status, request.name + '.rawResponse', 'Actual private original bytes do not bind this public response');
            this.check(request.response.parseError === null, request.name + '.parseError', 'An unparsed response cannot claim exact DTO comparison');
            if (this.authPolicy==='fresh-except-named-due') this.check(response?.parsedPublicBodyEqualsOriginalBytes===true && response.publicBeforeAfterMatchOriginalPrivateRows===true,request.name + '.originalPrivateFields','New controlled source epoch requires exact original response parsing and full private/public before/after row bindings');
        }
        this.check([...this.ids].filter(([, slot]) => slot !== 'run').length === a.objects.length, 'bindings', 'Every owned object must have exactly one direct or original SDK/PG source slot');
        const actualSdk=r.requests.flatMap(q=>q.certificates.sdkCreates??[]);
        this.check(witness.committed.length===actualSdk.length && witness.committed.every(item=>actualSdk.some(row=>row.table===item.table && row.id===item.id)),'globalSdkCoverage','Original global SDK committed creates are not fully consumed by the actual HTTP summaries');
        for (const object of a.objects) this.check(this.ids.has(object.id) && this.tables.get(object.id) === object.table && object.postcondition.independentlyVisible, 'object.' + object.id, 'Unbound/unproven owned object');
        this.check(a.sessionBindings.length === 3 && a.sessionBindings.every((item) => item.actualCookieToStoredHashVerified && !item.rawTokenOrCookieExported), 'sessions', 'Actual new-session cryptographic cookie→stored-hash proof missing');
        const finalRows = Object.entries(r.finalFacts).flatMap(([table,rows]) => rows.map((row) => table + ':' + row.id));
        this.check(finalRows.length === a.objects.length && a.objects.every(({ table,id }) => finalRows.includes(table + ':' + id)), 'finalOwnedCoverage', 'Final facts do not cover every actually owned object');
        if (this.authPolicy === 'fresh-except-named-due') this.check(r.authInputPreparations.length === 108 && new Set(r.authInputPreparations.map(({ requestName }) => requestName)).size === 108, 'authInputPreparations', 'Controlled114 requires 108 distinct authenticated request input records');
        else this.check((r.authInputPreparations?.length ?? 0) === 0, 'authInputPreparations', 'Natural policy cannot contain controlled preparations');
    }
    prepareAuthInput(q,index) {
        const entry=q.authInputPreparation;
        if (this.authPolicy === 'natural') { this.check(entry == null,q.name + '.authInput','Natural source epoch cannot silently contain a controlled input'); return null; }
        if (index < 6) { this.check(entry == null,q.name + '.authInput','The six anonymous bootstrap/login requests may not prepare a session'); return null; }
        const at=q.name + '.authInput',isL=q.path.startsWith('/api/approval-records/') || q.path === '/api/me/todos';
        const account=isL ? q.name.startsWith('contract.') ? 'vp' : 'finance' : 'initiator',binding=this.a.sessionBindings.find(({ caseId }) => caseId===account + '.login');
        this.check(entry && binding && entry.sessionId===binding.id && entry.userId===binding.userId && entry.requestName===q.name && entry.policy===this.authPolicy && entry.handlerOrClockChanged===false,at,'Prepared auth input is not the actual source-selected session/case');
        if (!entry || !binding) return null;
        const aggregate=this.r.authInputPreparations.filter(({ requestName }) => requestName===q.name); this.check(aggregate.length===1 && same(aggregate[0],entry),at,'Per-request auth input differs from durable public aggregate');
        const mutation=this.a.mutations.find((item) => item.transaction===entry.mutationTransaction && item.expectedXmin===entry.expectedXmin && item.table==='auth_session' && item.id===entry.sessionId);
        this.check(mutation && mutation.state==='committed' && same(Object.keys(mutation.values),['last_seen_at']) && String(BigInt(mutation.transaction)%4294967296n)===mutation.expectedXmin,at,'Exact original fixture committed last_seen_at-only mutation/xmin missing');
        if (!mutation) return null; this.check(!this.usedMutations.has(mutation.transaction),at,'One prepared transaction reused for several HTTP inputs'); this.usedMutations.add(mutation.transaction);
        const omit=({ last_seen_at,...rest }) => rest,before=q.before.auth_session.find(({ id }) => id===entry.sessionId),previous=this.r.requests[index-1].after.auth_session.find(({ id }) => id===entry.sessionId);
        this.check(same(omit(mutation.before),omit(mutation.after)) && same(mutation.before,previous) && same(mutation.after,before),at,'Prepared mutation changed another field/version, or its actual before/after rows do not link adjacent HTTP facts');
        const namedDue=isL && q.method==='POST' && /:(?:approve|reject)$/.test(q.path),value=mutation.values.last_seen_at,parsed=contractInstant(value),bounds=this.sourceBounds(q,index,'before'),dueReason='Only this run actual owned session made due to observe original raw-touch plus managed coflush';
        let offset=0n;
        if (namedDue) {
            this.check(entry.action==='preserve-next-named-due-input' && entry.prepared===false && mutation.reason===dueReason && entry.lastSeenInput===before.last_seen_at,at,'Original named due decision preparation was overwritten or not preserved for its next call'); offset=120000000n;
        } else {
            this.check(entry.action==='prepared-owned-last-seen-fresh' && entry.prepared===true && entry.unchangedRowVersion===true && entry.sampledAt===value && entry.lastSeenBefore===mutation.before.last_seen_at && entry.lastSeenAfter===before.last_seen_at && mutation.reason==='Controlled114 owned session freshness before ' + q.name + '; explicit prepared last_seen_at input, no service/request clock change',at,'Controlled fresh input differs from the named actual new Date/unchanged-version source preparation');
        }
        this.check(value===toIso(parsed.us) && parsed.us+offset>=bounds[0] && parsed.us+offset<=bounds[1] && contractInstant(before.last_seen_at).us===parsed.us,at,'Prepared Date sample/due offset is outside the exact between-HTTP source window');
        const site='prepared.' + q.name + '.' + this.ids.get(entry.sessionId) + '.last_seen_at'; this.authInputSlots.set(q.name,{ id:entry.sessionId,raw:before.last_seen_at,site,offset,mutation });
        return { policy:this.authPolicy,action:entry.action,sessionId:this.any(entry.sessionId,at),userId:this.any(entry.userId,at),prepared:entry.prepared,lastSeenInput:{ clock:site,representation:'JS-Date-ISO-ms-Z',sourceOffsetUs:String(offset) },allOtherFieldsUnchanged:true,handlerOrClockChanged:false };
    }
    text(value, at) {
        let result = value;
        for (const account of this.a.base.accounts) result = result.replaceAll(account.username, '$base.username.' + account.account);
        for (const item of this.a.base.roles) result = result.replaceAll(item.key, '$base.role-key.' + item.slot);
        for (const item of this.a.base.orgs) result = result.replaceAll(item.key, '$base.org-key.' + item.slot);
        return result.replace(UUID_TEXT, (id) => { if (this.literal.has(id)) return id; const slot = this.ids.get(id); if (!slot) { this.gap(at, 'Unregistered UUID reference ' + id); return id; } return '$id:' + slot; });
    }
    any(value, at) {
        if (typeof value === 'string') return this.text(value, at);
        if (Array.isArray(value)) return value.map((item, index) => this.any(item, at + '[' + index + ']'));
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [this.text(key, at + '.<key>'), this.any(item, at + '.' + key)]));
        return value;
    }
    nonce(value, slot, at, bytes) {
        this.check(value?.redacted === true && /^[0-9a-f]{64}$/.test(value.sha256 ?? '') && (bytes === undefined || value.bytes === bytes), at, 'Opaque nonce/hash descriptor malformed');
        if (this.nonces.has(slot)) this.check(this.nonces.get(slot) === value.sha256, at, 'Opaque material changed inside one logical owned object');
        else { this.check(![...this.nonces.values()].includes(value.sha256), at, 'Distinct owned nonce roles reused a fingerprint'); this.nonces.set(slot, value.sha256); this.nonceEvidence.push({ slot, fingerprint: value.sha256, reason: slot.includes('credential') ? 'Fresh synthetic password/run and bcrypt salt, stable per actual new user credential' : 'Original independent random nonce issuance, stable and actual cryptographic session binding' }); }
        return { ...value, sha256: '$nonce:' + slot };
    }
    sourceBounds(q, index, phase) { return phase === 'after' ? [contractInstant(q.startedAt).us, contractInstant(q.httpFinishedAt).us] : [contractInstant(index ? this.r.requests[index - 1].finishedAt : this.r.startedAt).us, contractInstant(q.startedAt).us]; }
    clock(value, { q, index, phase, table, row, column, previous, rowPrevious }) {
        if (value === null) return null;
        const at = q.name + '.' + phase + '.' + table + '.' + row.id + '.' + column, parsed = contractInstant(value), slot = this.ids.get(row.id), key = table + ':' + row.id + ':' + column;
        this.check(parsed.zone === this.dbZone, at, 'PG timestamp timezone representation changed');
        const preparedAuth=phase==='before' && table==='auth_session' && column==='last_seen_at' ? this.authInputSlots.get(q.name) : null, explicitAuth=preparedAuth?.id===row.id;
        if (previous && value === previous.raw && !explicitAuth) return previous.normalized;
        if (previous && (column === 'created_at' || table === 'approval_record' && column === 'submitted_at' || table === 'auth_session' && column === 'absolute_expires_at' || ['commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot'].includes(table) && column === 'generated_at')) this.check(false, at, 'Immutable original birth/generated/submitted/absolute clock changed');
        let site, fixed = false, js = true, bounds = this.sourceBounds(q, index, phase), offset;
        const direct = this.direct.get(row.id), origin = this.origins.get(row.id);
        if (!rowPrevious && direct) {
            this.check(phase === 'before' && same(value, direct.row[column]), at, 'Direct input clock differs from its actual captured INSERT row');
            fixed = direct.original.columns.includes(column); js = !fixed ? false : true;
            site = 'input.' + slot + '.' + column + (fixed ? '.original-literal' : '.SQL-default');
        } else if (!rowPrevious) {
            this.check(phase === 'after' && origin?.caseId === q.name && origin.index === index, at, 'Generated clock has no original creation case'); site = 'create.' + q.name + '.' + slot + '.' + column;
        } else site = (phase === 'before' ? 'prepared.' : 'http.') + q.name + '.' + slot + '.' + column;
        if (explicitAuth) { site=preparedAuth.site; bounds=bounds.map((n) => n-preparedAuth.offset); this.check(preparedAuth.raw===value,at,'Explicit prepared source clock differs from the exact actual before row'); }
        if (phase === 'before' && previous && value !== rowPrevious[column]) {
            const mutation = this.a.mutations.find((item) => item.table === table && item.id === row.id && item.values[column] != null && contractInstant(item.values[column]).us === parsed.us);
            if (table === 'auth_session' && column === 'last_seen_at' && mutation?.state === 'committed') {
                const controlled=this.authInputSlots.get(q.name);
                if (this.authPolicy==='fresh-except-named-due') this.check(controlled?.id===row.id && controlled.raw===value && controlled.mutation.transaction===mutation.transaction,at,'Controlled clock lacks its exact validated fixture preparation');
                else { this.check(mutation.reason==='Only this run actual owned session made due to observe original raw-touch plus managed coflush',at,'Unknown direct auth clock mutation'); bounds=bounds.map((n) => n-120000000n); this.usedMutations.add(mutation.transaction); }
            }
            else this.gap(at, 'Between-HTTP clock mutation lacks exact named original preparation proof');
        }
        const prop = this.r.nativeMetadata.find((entry) => entry.tableName === table)?.properties.find((entry) => entry.fieldNames.includes(column))?.name;
        const explicit = q.name === 'producer.retention-receipt-create' && prop === 'receiptDate' ? q.request.body?.receiptDate : undefined;
        if (explicit && isTime(explicit) && parsed.us === contractInstant(explicit).us) {
            const input = this.requestClockInputs.get(q.name + '.receiptDate'); this.check(!!input, at, 'Original request-side receipt Date sample missing'); site = input.site; bounds = this.sourceBounds(q, index, 'before');
        }
        if (table === 'auth_session' && ['idle_expires_at', 'absolute_expires_at'].includes(column)) {
            const anchor = contractInstant(row.last_seen_at).us;
            if (!this.authOffsets) this.authOffsets = { idle: contractInstant(row.idle_expires_at).us - anchor, absolute: contractInstant(row.absolute_expires_at).us - anchor };
            offset = column === 'idle_expires_at' ? this.authOffsets.idle : this.authOffsets.absolute;
            this.check(offset > 0n && offset % 1000000n === 0n, at, 'Lifecycle derivative not whole positive seconds');
            const actual = column === 'absolute_expires_at' ? anchor + offset : anchor + offset < contractInstant(row.absolute_expires_at).us ? anchor + offset : contractInstant(row.absolute_expires_at).us;
            this.check(parsed.us === actual, at, 'Auth lifecycle/min-absolute derivative changed'); bounds = null;
        }
        if (!fixed) {
            if (js) this.check(parsed.us % 1000n === 0n, at, 'Original Date sample gained submillisecond precision');
            if (bounds) this.check(parsed.us >= bounds[0] && parsed.us <= bounds[1] + (js ? 0n : 999n), at, 'Source clock outside exact HTTP/input sampling window');
        }
        const normalized = fixed ? value : { clock: site, representation: 'pg-json', zone: parsed.zone, ...(offset !== undefined ? { lifecycleOffsetUs: String(offset) } : {}) };
        this.clocks.set(key, { raw: value, site, normalized, us: parsed.us, fixed }); this.clockEvidence.push({ path: at, samplingSite: site, actual: value, fixedOriginalInput: fixed, bounds: bounds?.map(String) ?? null, JavaScriptDateMilliseconds: js }); return normalized;
    }
    prepareRequestClocks(q, index) {
        if (q.name !== 'producer.retention-receipt-create') return;
        const value = q.request.body.receiptDate, parsed = contractInstant(value), bounds = this.sourceBounds(q, index, 'before');
        this.check(value === toIso(parsed.us) && parsed.us >= bounds[0] && parsed.us <= bounds[1], q.name + '.request.receiptDate', 'Original harness request-side Date.now sample outside source construction window');
        this.requestClockInputs.set(q.name + '.receiptDate', { raw: value, site: 'request.' + q.name + '.receiptDate' });
    }
    frame(q, index, phase) {
        const facts = q[phase], normalized = {};
        this.check(same(Object.keys(facts).sort(), [...supportedTables].sort()), q.name + '.' + phase, 'All 40 declared owned tables must be present');
        for (const table of supportedTables) {
            const rows = facts[table] ?? [], output = []; this.check(new Set(rows.map(({ id }) => id)).size === rows.length, q.name + '.' + table, 'Duplicate actual PK');
            for (const row of rows) {
                const slot = this.ids.get(row.id), object = this.objects.get(table + ':' + row.id); this.check(!!slot && !!object && this.tables.get(row.id) === table, q.name + '.' + table + '.identity', 'Actual row lacks exact owned/source identity');
                if (object) this.check(identities[table].every((field) => same(row[field], object.identity[field])), q.name + '.' + table + '.immutableIdentity', 'Actual immutable business identity changed from original owned certificate');
                this.check(same(Object.keys(row).sort(), [...this.schema.get(table).keys()].sort()), q.name + '.' + table + '.columns', 'Raw unchanged/default columns missing or extra');
                const last = this.lastRows.get(table + ':' + row.id), fields = {};
                for (const [column, value] of Object.entries(row)) {
                    const type = this.schema.get(table).get(column)?.udt;
                    if (['timestamp', 'timestamptz'].includes(type)) fields[column] = this.clock(value, { q, index, phase, table, row, column, previous: this.clocks.get(table + ':' + row.id + ':' + column), rowPrevious: last?.row });
                    else if (table === 'auth_session' && ['token_hash', 'csrf_token_hash'].includes(column)) {
                        fields[column] = this.nonce(value, slot + '.' + column, q.name + '.' + phase + '.' + slot + '.' + column, 64);
                        const binding = this.a.sessionBindings.find(({ id }) => id === row.id); this.check(binding && row.user_id === binding.userId && value.sha256 === (column === 'token_hash' ? binding.tokenHashFingerprint : binding.csrfHashFingerprint), q.name + '.session.crypto', 'Real response cookie/stored-hash/logical session relation differs');
                    } else if (table === 'local_credential' && column === 'password_hash') fields[column] = this.nonce(value, slot + '.password_hash', q.name + '.' + slot, 60);
                    else fields[column] = this.any(value, q.name + '.' + phase + '.' + table + '.' + column);
                }
                if (row.created_at && row.updated_at) this.check(contractInstant(row.updated_at).us >= contractInstant(row.created_at).us, q.name + '.' + slot, 'updatedAt precedes creation sample');
                if (row.generated_at && ['commission_final_settlement_snapshot', 'commission_rule_explanation_snapshot'].includes(table)) this.check(contractInstant(row.generated_at).us <= contractInstant(row.created_at).us, q.name + '.' + slot, 'Original generatedAt sample follows onCreate hook');
                if (table === 'approval_record' && row.decided_at) this.check(contractInstant(row.decided_at).us <= contractInstant(row.closed_at).us && contractInstant(row.closed_at).us <= contractInstant(row.updated_at).us, q.name + '.' + slot, 'Original decision→closed→onUpdate ordering changed');
                if (table === 'auth_session' && last && phase === 'after' && row.last_seen_at !== last.row.last_seen_at && row.row_version - last.row.row_version === 1) this.check(contractInstant(row.last_seen_at).us === contractInstant(row.updated_at).us, q.name + '.' + slot, 'Original raw auth touch must reuse one now');
                this.lastRows.set(table + ':' + row.id, { row, index, phase }); output.push({ slot, fields });
            }
            normalized[table] = output.sort((a, b) => (a.slot ?? '').localeCompare(b.slot ?? ''));
        }
        return normalized;
    }
    dom(value, q, at, table = null, rawRow = null) {
        if (Array.isArray(value)) return value.map((item, index) => this.dom(item, q, at + '[' + index + ']'));
        if (!value || typeof value !== 'object') return this.any(value, at);
        const known = this.tables.get(value.id); if (known) { table = known; rawRow = q.after[table].find((row) => row.id === value.id); this.check(!!rawRow, at, 'DTO owned ID missing from actual after facts'); }
        const result = {};
        for (const [key, item] of Object.entries(value)) {
            const property = table ? this.r.nativeMetadata.find((entry) => entry.tableName === table)?.properties.find((entry) => entry.name === key) : null;
            const column = property?.fieldNames?.length === 1 ? property.fieldNames[0] : null, type = column ? this.schema.get(table)?.get(column)?.udt : null;
            if (isTime(item) && ['timestamp', 'timestamptz'].includes(type) && rawRow) {
                this.check(rawRow[column] !== null && item === toIso(contractInstant(rawRow[column]).us), at + '.' + key, 'Original DTO Date ISO is not exact actual DB projection');
                const state = this.clocks.get(table + ':' + rawRow.id + ':' + column); this.check(!!state, at + '.' + key, 'DTO clock has no source slot'); result[key] = state?.fixed ? item : { clock: state?.site, representation: 'JS-Date-ISO-ms-Z' };
            } else if (key === 'expiresAt' && q.name.endsWith('.login')) {
                const binding = this.a.sessionBindings.find(({ caseId }) => caseId === q.name), row = q.after.auth_session.find(({ id }) => id === binding?.id); this.check(row && item === toIso(contractInstant(row.idle_expires_at).us), at + '.expiresAt', 'Login DTO expiry differs from actual cryptographically bound session'); result[key] = { clock: this.clocks.get('auth_session:' + row?.id + ':idle_expires_at')?.site, representation: 'JS-Date-ISO-ms-Z' };
            } else if (key === 'expiresAt' && q.name.endsWith('.csrf')) {
                const parsed = contractInstant(item), sample = parsed.us - this.authOffsets.idle; this.check(item === toIso(parsed.us) && sample >= contractInstant(q.startedAt).us && sample <= contractInstant(q.httpFinishedAt).us, at + '.expiresAt', 'Anonymous source Date+lifecycle expiry outside HTTP bounds'); result[key] = { clock: q.name + '.anonymous-now-plus-idle', durationUs: String(this.authOffsets.idle) };
            } else if (key === 'token' && q.name.endsWith('.csrf')) result[key] = this.nonce(item, 'anonymous.' + q.name, at + '.token', 43);
            else if (isTime(item)) { this.gap(at + '.' + key, 'Unclassified DTO timestamp lacks exact raw/source linkage'); result[key] = item; }
            else result[key] = this.dom(item, q, at + '.' + key);
        }
        return result;
    }
    analyse() {
        this.sourceSetup(); const first = this.r.requests[0].before.platform_user[0]; this.dbZone = contractInstant(first.created_at).zone;
        // Discover exact configured lifecycle once from a real new login row.
        const login = this.r.requests.find((q) => q.name === 'initiator.login'), binding = this.a.sessionBindings.find(({ caseId }) => caseId === login.name), session = login.after.auth_session.find(({ id }) => id === binding.id), anchor = contractInstant(session.last_seen_at).us;
        this.authOffsets = { idle: contractInstant(session.idle_expires_at).us - anchor, absolute: contractInstant(session.absolute_expires_at).us - anchor };
        const views = [];
        for (const [index, q] of this.r.requests.entries()) {
            this.check(contractInstant(q.startedAt).us <= contractInstant(q.httpFinishedAt).us && contractInstant(q.httpFinishedAt).us <= contractInstant(q.finishedAt).us, q.name + '.bounds', 'Original send/receive/certification order invalid');
            this.prepareRequestClocks(q, index); const authInput=this.prepareAuthInput(q,index),before = this.frame(q, index, 'before'), after = this.frame(q, index, 'after');
            const request = this.any(q.request, q.name + '.request');
            if (q.name === 'initiator.login') {
                const material = 'R2L_' + this.r.runId + '_synthetic_only', value = q.request.body.password;
                this.check(value?.redacted === true && value.bytes === Buffer.byteLength(material) && value.sha256 === sha(material), q.name + '.request.password', 'Fresh synthetic request credential fingerprint differs from original source protocol');
                request.body.password = { ...value, sha256: '$source-fixture-per-run-credential-fingerprint' };
            }
            if (this.requestClockInputs.has(q.name + '.receiptDate')) request.body.receiptDate = { clock: this.requestClockInputs.get(q.name + '.receiptDate').site, representation: 'JS-Date-ISO-ms-Z' };
            const response = { status: q.response.status, contentType: q.response.contentType, body: this.dom(q.response.body, q, q.name + '.response.body') };
            views.push({ name: q.name, method: q.method, path: this.text(q.path, q.name + '.path'), authInput,request, response, before, after });
        }
        this.check(same(this.r.requests.at(-1).after, this.r.finalFacts), 'finalFacts', 'Product state changed after final HTTP');
        this.check(this.a.mutations.every(({ transaction }) => this.usedMutations.has(transaction)), 'preparedMutationCoverage','An original saved direct mutation was not classified at its exact source input site');
        return { authFreshnessPolicy:this.authPolicy,views, lifecycleUs: Object.fromEntries(Object.entries(this.authOffsets).map(([key, value]) => [key, String(value)])) };
    }
}
export function compareCommissionReports(native, rust, nativeEvidence, rustEvidence,{readArchive}={}) {
    const a = new CommissionEvidence(native, nativeEvidence, 'nest',readArchive), b = new CommissionEvidence(rust, rustEvidence, 'rust',readArchive); let left, right;
    try { left = a.analyse(); } catch (error) { a.failures.push({ path: 'nest.analysis', reason: error.message }); }
    try { right = b.analyse(); } catch (error) { b.failures.push({ path: 'rust.analysis', reason: error.message }); }
    const differences = left && right ? strictContractDiff(left, right) : [], failures = [...a.failures, ...b.failures], gaps = [...a.gaps, ...b.gaps];
    const authTiming = { nest: analyseNaturalAdminThrottle(native, nativeEvidence), rust: analyseNaturalAdminThrottle(rust, rustEvidence) };
    const onlyAdmin = differences.every(({ path }) => {
        const match = /^\$\.views\.(\d+)\.(before|after)\.auth_session\.(\d+)\.fields\.(idle_expires_at|last_seen_at|updated_at|row_version)(?:\.clock)?$/.exec(path);
        return match && left.views[Number(match[1])][match[2]].auth_session[Number(match[3])].slot === 'create.initiator.login.auth_session.0' && right.views[Number(match[1])][match[2]].auth_session[Number(match[3])].slot === 'create.initiator.login.auth_session.0';
    });
    return { formatVersion: 1, kind: 'strict-114-record-40-owned-table-commission-comparison', result: failures.length || differences.length ? 'fail' : gaps.length ? 'uncertified' : 'pass',
        coverage: { pairedRecords: left && right ? Math.min(left.views.length, right.views.length) : 0, declaredRecords: 114, allOwnedTables: supportedTables, allRawColumnSetsAndUnchangedFieldsCompared: true, emptyTablesCompared: true, rawTableRowsComparedAsTypedIdentitySets: true, DTOArrayOrderPreserved: true, namespace127OwnedObjectsPerBackendRequired: true, unobserved67TablesCertified: false, independent31Transferred: false },
        checks: a.checks + b.checks, failures, gaps, differences, identities: { nest: a.identityEvidence, rust: b.identityEvidence }, clocks: { nest: a.clockEvidence, rust: b.clockEvidence }, nonces: { nest: a.nonceEvidence, rust: b.nonceEvidence },
        binaryScope: { native: native.nativeFinal?.binaryRawBytesSha256, rust: rust.rustRuntime?.binaryRawBytesSha256,rustBuildAdmission:b.rustBuildAdmission??null },
        naturalAdminTimingAnalysis: { ...authTiming, allCrossDifferencesRestrictedToNaturalAdminSession: onlyAdmin, nonAdminRawAndAllResponseFieldsEqual: onlyAdmin && !failures.length && !gaps.length,
            rawAdminSessionFieldsEqual: differences.length === 0, doesNotOverrideStrictResult: true, classification: onlyAdmin && authTiming.nest.sourceCompatible && authTiming.rust.sourceCompatible ? 'Independent real wall-time inputs reached original Native admin throttle at different request sites; raw versions remain unequal and strict result remains fail' : 'Unresolved/product difference; do not waive' },
        boundary: 'Saved original source/SDK/PG ownership and response/cookie bindings plus actual 114 public facts only; no DB/HTTP/environment/private read by comparator; no blanket time/UUID stripping; any unknown clock/UUID origin remains a gap' };
}
export function analyseNaturalAdminThrottle(report, evidence, throttleSeconds = 60) {
    const binding = evidence.sessionBindings.find(({ caseId }) => caseId === 'initiator.login');
    const timeline = []; let sourceCompatible = true;
    for (const q of report.requests) {
        const before = q.before.auth_session.find(({ id }) => id === binding?.id), after = q.after.auth_session.find(({ id }) => id === binding?.id); if (!before || !after) continue;
        const isL = q.path.startsWith('/api/approval-records/') || q.path === '/api/me/todos', adminUsed = !isL && !q.name.startsWith('finance.') && !q.name.startsWith('vp.');
        const old = contractInstant(before.last_seen_at).us, lower = contractInstant(q.startedAt).us - old, upper = contractInstant(q.httpFinishedAt).us - old, touched = before.last_seen_at !== after.last_seen_at, delta = after.row_version - before.row_version;
        const definiteDue = lower >= BigInt(throttleSeconds) * 1000000n, definiteNotDue = upper < BigInt(throttleSeconds) * 1000000n;
        let compatible = true;
        if (touched) compatible = adminUsed && contractInstant(after.last_seen_at).us - old >= BigInt(throttleSeconds) * 1000000n && [1, 2].includes(delta) && (q.executionBackend ?? 'native') === 'native';
        else if (adminUsed && definiteDue) compatible = false;
        if (adminUsed && definiteNotDue && touched) compatible = false;
        sourceCompatible &&= compatible;
        timeline.push({ name: q.name, actualBackend: q.executionBackend ?? 'native', adminUsed, elapsedLowerUs: String(lower), elapsedUpperUs: String(upper), originalThrottleSeconds: throttleSeconds, definiteDue, definiteNotDue, touched, rawVersionBefore: before.row_version, rawVersionAfter: after.row_version, rawVersionDelta: delta, originalSourceCompatible: compatible });
    }
    return { sourceCompatible, thresholdProvenance: 'Original AuthSessionService floor(elapsedSeconds) >= lifecycle threshold; Root/C current profile source is 60s; no private environment read', naturalTouches: timeline.filter(({ touched }) => touched), fullTimeline: timeline };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const [nativeFile, rustFile, nativeEvidence, rustEvidence, output] = process.argv.slice(2); assert(nativeFile && rustFile && nativeEvidence && rustEvidence && output); assert(!fs.existsSync(output));
    const files = [nativeFile, rustFile, nativeEvidence, rustEvidence], data = files.map((file) => fs.readFileSync(file)), result = compareCommissionReports(...data.map((bytes) => JSON.parse(bytes)));
    result.inputs = files.map((file, index) => ({ file, bytes: data[index].length, sha256: sha(data[index]) })); fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ result: result.result, paired: result.coverage.pairedRecords, failures: failuresCount(result), gaps: result.gaps.length, differences: result.differences.length })); process.exitCode = result.result === 'pass' ? 0 : 1;
}
function failuresCount(result) { return result.failures.length; }
