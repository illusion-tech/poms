// Edge model derived from frozen strict114 source 4bf1b725. Separate source epoch.
// No runtime transformation, private read, DB, HTTP or weakened original114 tool.
// Every clock/nonce substitution requires a typed saved origin and validation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { authority } from './catalog-complete.mjs';
import { digest, identities, supportedTables } from './fixture-core.mjs';
import { marker, sourceHead } from './fixture-guard.mjs';
import { contractInstant } from './l-contract-diff.mjs';
import { planForReport, actualUnits, snapshotTables, nativeBinary, rustBinary, assertExecutionPartition, assertNativeSdkOnlyDepartureSnapshots } from './l-commission-edge-plan.mjs';
import { verifyHistoricalBarrierDateBinding } from './l-commission-edge-evidence.mjs';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UUID_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const FINAL_RUST_SHA256 = '5b9ec4424e17e4e9bfd57055e6141e80594526dc437fde497ab95bfc2f464b16';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isTime = (value) => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:/.test(value);
const toIso = (us) => new Date(Number(us / 1000n)).toISOString();
export class EdgeEvidence {
    constructor(report, evidence, backend) {
        this.actual = report; this.plan = planForReport(report); this.r = { ...report, requests: actualUnits(report) }; this.a = evidence; this.backend = backend; this.failures = []; this.gaps = []; this.checks = 0; this.ids = new Map(); this.slots = new Map(); this.tables = new Map(); this.origins = new Map(); this.lastRows = new Map(); this.clocks = new Map(); this.clockFrames = []; this.clockEvidence = []; this.nonces = new Map(); this.nonceEvidence = []; this.identityEvidence = []; this.requestClockInputs = new Map(); this.authInputSlots = new Map(); this.usedMutations = new Set();
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
        const r = this.actual, a = this.a, plan = this.plan;
        this.check(r.backend === this.backend && r.result === 'edges-observed' && r.requests.length === plan.records && new Set(r.requests.map(({ name }) => name)).size === plan.records && r.doubleZero === true, 'actual', 'Actual complete declared edge-record run/double zero missing');
        this.authPolicy = r.authFreshnessPolicy ?? 'natural'; this.check(['natural','fresh-except-named-due'].includes(this.authPolicy), 'authFreshnessPolicy', 'Unknown source input policy');
        this.check(r.phaseHooks.length===1 && r.phaseHooks[0].state==='observed' && r.finishedEdgePhase===plan.phase && r.default114Only===false, 'hookMatrix', 'Only this exact observed edge hook may be compared');
        this.check(r.cleanup.length === 2 && r.cleanup[0].deleted === plan.owned && r.cleanup[1].deleted === 0 && r.cleanup.every((entry) => entry.state === 'cleaned' && ['firstZero','secondZero'].every((key) => entry[key].objects === 0 && entry[key].logicalReferences === 0 && entry[key].tablesScanned === 107)), 'cleanup', 'Exact declared-owned/0 deletes and both full107 zero scans missing');
        this.check(r.resourceCloseout.every((entry) => entry.result === 'pass') && r.pgObserverRestore.observerFootprintRestored === true && same(r.full107Before,r.full107After), 'closeout', 'Native/PG/product full107 restore or resource closeout incomplete');
        const expectedCloseout=['native-witness-final',...(this.backend==='rust' ? ['rust-owner-close'] : []),'pg7-observer-restore','native-owner-close','pg7-owner-connection-close','whole-owned-final-facts','exact-owned-cleanup-double-zero','fixture-connection-close'];
        this.check(same(r.resourceCloseout.map(({ name })=>name).sort(),expectedCloseout.sort()),'closeoutNames','Applicable independent resource closeout names must all occur exactly once');
        const witness=r.nativeFinal.witness;
        this.check(witness?.complete===true && witness.diagnostics.length===0 && witness.openTransactions.length===0 && witness.pendingStartCount===0 && r.nativeFinal.pgCaptureComplete===true,'globalWitness','Original Native global SDK witness or in-process PG capture is incomplete');
        this.check(r.sourceHead === sourceHead && r.marker === marker && r.runtimeInput.sourceCheckpoint === sourceHead, 'source', 'Wrong actual source/namespace');
        this.check(r.nativeFinal.binaryUnchanged && r.nativeFinal.binaryRawBytesSha256 === nativeBinary, 'nativeBinary', 'Original Native binary binding differs');
        if (this.backend === 'rust') this.check(r.rustRuntime?.stopped && r.rustRuntime.binaryUnchanged && r.rustRuntime.binaryRawBytesSha256 === FINAL_RUST_SHA256 && r.buildBinding.expectedBinarySha256===FINAL_RUST_SHA256 && r.rustRuntime.binaryRawBytesSha256 === r.runtimeInput.files.find((item) => item.target === 'artifacts/poms-api-rust')?.rawBytesSha256, 'rustBinary', 'Final5b9e actual Rust binary/owner/source capture not bound');
        this.check(a?.kind === 'public-commission-edge-saved-ownership-and-response-bindings' && a.result === 'pass-saved-evidence-only' && a.backend === r.backend && a.runId === r.runId && a.marker === marker && a.sourceHead === sourceHead && a.scenario === plan.scenario && a.actualReport.canonicalSha256 === sha(JSON.stringify(r)), 'savedEvidence', 'Ownership/response addendum differs from exact actual report');
        const sourceCount=r.runtimeInput.files.filter(item=>!item.target.startsWith('artifacts/') || item.target==='artifacts/commission-phase-hooks.mjs').length;
        this.check(a.capturedSources?.allBytesAndHashesVerified===true && a.capturedSources.actualVerifiedCount===sourceCount && a.capturedSources.filesManifestSha256===r.runtimeInput.filesManifestSha256 && a.capturedSources.privateEnvironmentOrBinaryRead===false,'capturedSources','Saved public source bytes were not completely rebound');
        this.check(a.objects.length === plan.owned && new Set(a.objects.map(({ table, id }) => table + ':' + id)).size === plan.owned, 'objects', 'Expected exact scenario-declared distinct owned objects');
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
        this.check(a.committedCreates.length===plan.generated && new Set(a.committedCreates.map(item=>item.table+':'+item.id)).size===plan.generated,'committedCoverage','Exact scenario-declared distinct actual generated certificates are required');
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
        this.directBirthSites=new Map();this.usedDirectBirths=new Set();
        this.check(same(a.directCreates.map(batch=>({caseId:batch.caseId,rows:batch.rows.length})),[{caseId:'base',rows:50},{caseId:'commission.bootstrap',rows:18},{caseId:'contract.prepared',rows:1}]),'direct.sourceOrder','Original source requires base50/bootstrap18 before HTTP and the one draft contract just before contract.submit.reject');
        for (const batch of a.directCreates) {
            this.check(batch.beforeAbsent && batch.state === 'promoted' && String(BigInt(batch.transaction) % 4294967296n) === batch.xmin, 'direct.' + batch.caseId, 'Recorded direct outer commit/before absence invalid');
            for (const item of batch.rows) { this.check(this.ids.has(item.id) && this.tables.get(item.id) === item.table, 'direct.' + item.id, 'Direct row not bound by exact source plan'); this.direct.set(item.id, { ...item, batch });
                if(batch.caseId==='base'||batch.caseId==='commission.bootstrap')this.directBirthSites.set(item.id,'initiator.csrf');
                else if(batch.caseId==='contract.prepared'){this.check(item.table==='contract'&&item.id===r.additionalPreparedContract.id,'direct.extraContract','Later direct INSERT is not the exact original named draft contract');this.directBirthSites.set(item.id,'contract.submit.reject');}
            }
        }
        this.check(this.direct.size === 69, 'direct.rows', 'Exact base50+prepared18+draft1 expected');
        const proofById = new Map(a.committedCreates.map((item) => [item.table + ':' + item.id, item]));
        for (const [index, request] of this.r.requests.entries()) {
            try { assertExecutionPartition(this.backend,request); }
            catch(error) { this.check(false,request.name+'.backendProofPartition',error.message); }
            this.check(request.certificates.sdkComplete === true, request.name + '.sdk', 'Actual source SDK observer incomplete');
            const full = [];
            for (const [kind, rows] of [['sdk', request.certificates.sdkCreates ?? []], ['pg', request.certificates.pgCommittedCreates ?? []]]) for (const row of rows) {
                const proof = proofById.get(row.table + ':' + row.id); this.check(!!proof, request.name + '.proof', 'Summary ID has no original saved create certificate'); if (!proof) continue;
                const context = proof.proof.createContext, intent = a.intents.find(({ id }) => id === proof.intentId);
                this.check(context.runId === r.runId && context.caseId === request.name && proof.caseId===request.name && intent?.caseId === request.name && intent.table === row.table && intent.beforeObserved && !intent.beforeIds.includes(row.id) && intent.state === 'adopted', request.name + '.beforeIntent', 'Original create context and actual before-intent disagree');
                const allowedIndexes = request.requests ? request.bindings.map(item=>item.index) : [request.sourceIndex];
                this.check((kind==='sdk' ? allowedIndexes.includes(context.index) : context.index===request.sourceIndex) && context.op===(kind==='sdk' ? 'l.producer' : 'l.http'),'context.'+request.name,'Original create context index/op differs from the actual individual or shared HTTP binding');
                if(request.requests && kind==='sdk') this.check(request.requests.some(q=>r.requests.indexOf(q)===context.index && q.response.status===200), request.name+'.sdkWinner', 'Shared SDK birth must retain the actual successful caller context');
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

        }
        this.check([...this.ids].filter(([, slot]) => slot !== 'run').length === a.objects.length, 'bindings', 'Every owned object must have exactly one direct or original SDK/PG source slot');
        const actualSdk=this.r.requests.flatMap(q=>q.certificates.sdkCreates??[]);
        this.check(witness.committed.length===actualSdk.length && witness.committed.every(item=>actualSdk.some(row=>row.table===item.table && row.id===item.id)),'globalSdkCoverage','Original global SDK committed creates are not fully consumed by the actual HTTP summaries');
        for (const object of a.objects) this.check(this.ids.has(object.id) && this.tables.get(object.id) === object.table && object.postcondition.independentlyVisible, 'object.' + object.id, 'Unbound/unproven owned object');
        this.check(a.sessionBindings.length === (plan.scenario.endsWith('-race') ? 5 : plan.scenario.startsWith('late-') ? 4 : 3) && a.sessionBindings.every((item) => item.actualCookieToStoredHashVerified && !item.rawTokenOrCookieExported), 'sessions', 'Actual new-session cryptographic cookie→stored-hash proof missing');
        const finalRows = Object.entries(r.finalFacts).flatMap(([table,rows]) => rows.map((row) => table + ':' + row.id));
        this.check(finalRows.length === a.objects.length && a.objects.every(({ table,id }) => finalRows.includes(table + ':' + id)), 'finalOwnedCoverage', 'Final facts do not cover every actually owned object');
        this.check((r.authInputPreparations?.length ?? 0) === 0, 'authInputPreparations', 'Natural policy cannot contain controlled preparations');
        this.validateSavedBindings();
    }
    validateSavedBindings() {
        const r=this.actual,a=this.a,pg=r.pgObserverRegistration,saved=a.pgSavedEvidence;
        this.check(saved?.restored===true && same(saved.registration,pg) && saved.eventExportSha256===r.pgObserverRestore.eventExportSha256 && saved.exportedEvents===r.pgObserverRestore.exportedEvents,'savedPG','Original restored PG journal/source/registration does not bind this report');
        const observed=new Map();
        for(const item of saved?.cases??[]) {
            const units=this.r.requests.filter(q=>q.name===item.context.caseId);
            this.check(item.state==='drained' && units.length===1 && item.context.runId===r.runId,'savedPG.case','Saved original PG context is missing, undrained or duplicated');
            if(units.length!==1)continue;const q=units[0];
            this.check(item.context.index===q.sourceIndex && item.context.op===(q.executionBackend==='rust'?'l.http':'l.producer'),q.name+'.pgBaseContext','PG shared case index must be the actual base binding, without invented per-caller attribution');
            for(const cert of item.rows) {
                const p=cert.proof,key=cert.table+':'+cert.id,intent=a.intents.find(x=>x.id===cert.intentId);
                this.check(!observed.has(key),'savedPG.'+key,'One PG birth appears in multiple cases');observed.set(key,cert);
                this.check(cert.authorityId===pg.id && p.kind==='pg-after-insert-observed-outer-commit' && p.observerId===pg.observerId && p.functionOid===pg.functionOid && p.sourceAuthority===pg.source.sha256 && p.database===r.database && p.marker===marker && same(p.createContext,item.context),q.name+'.pgOriginalAuthority','Original saved PG proof/context/authority differs');
                this.check(p.outerCommitObserved===true && p.visibleFromIndependentOwnerConnection===true && ['topXidStatus','outerStatus','eventXminStatus'].every(k=>p[k]==='committed') && BigInt(p.topXid8)<=BigInt(p.eventXid8) && BigInt(p.eventXid8)<BigInt(p.observedFullXid8) && BigInt(p.observedFullXid8)-BigInt(p.topXid8)<2147483648n && String(BigInt(p.eventXid8)%4294967296n)===String(p.eventXmin),q.name+'.pgOriginalCommit','Real outer/sub-xid committed visibility proof is incomplete');
                this.check(intent?.caseId===q.name && intent.table===cert.table && intent.beforeObserved && !intent.beforeIds.includes(cert.id) && intent.state==='adopted',q.name+'.pgBeforeIntent','PG certificate has no exact adopted before-absence intent');
                const raw=q.after[cert.table]?.find(row=>row.id===cert.id);
                this.check(raw && identities[cert.table].every(k=>same(raw[k],cert.identity[k])),q.name+'.pgIdentity','PG immutable birth identity differs from actual complete after row');
                if(snapshotTables.includes(cert.table)) {
                    const parents=p.deferredSubjectValidation;
                    this.check(parents && same(parents.projectIds,[raw?.project_id]),q.name+'.snapshotPGParents','Snapshot PG proof lacks the exact proven project parent closure');
                }
            }
        }
        this.nativeSdkOnlySnapshotProvenance=[];
        for(const q of this.r.requests) {
            const claimed=[...(q.certificates.pgShadow??[]),...(q.certificates.pgCommittedCreates??[])];
            const savedCase=saved?.cases?.find(item=>item.context.caseId===q.name);
            this.check(!q.certificates.pgShadowDeclared || !!savedCase,q.name+'.shadowCase','Declared Native PG shadow has no saved drained context');
            this.check((savedCase?.rows.length??0)===claimed.length,q.name+'.pgRows','Saved PG births and declared shadow/ownership summary cardinality differ');
            for(const summary of claimed) {
                const original=observed.get(summary.table+':'+summary.id);
                this.check(original && digest(original.identity)===summary.identitySha256,q.name+'.pgShadowIdentity','PG summary is not the exact original saved certificate identity');
                const sdk=this.a.committedCreates.find(item=>item.table===summary.table && item.id===summary.id);
                if(q.executionBackend==='native')this.check(sdk?.proof.kind==='mikro-orm-afterCreate-outer-commit' && same(sdk.proof.createContext.caseId,q.name),q.name+'.sdkPGSeparation','Native original SDK birth was replaced by a PG proof');
                else this.check(sdk?.proof.kind==='pg-after-insert-observed-outer-commit' && same(sdk.proof,original?.proof),q.name+'.rustPGOriginal','Rust ownership must preserve the original saved PG proof');
            }
            const nativeSnapshots=q.certificates.sdkCreates.filter(item=>snapshotTables.includes(item.table));
            if(nativeSnapshots.length&&q.certificates.pgShadowDeclared===false) {
                try {
                    const declared=assertNativeSdkOnlyDepartureSnapshots(q),births=q.certificates.sdkCreates.map(row=>this.a.committedCreates.find(item=>item.table===row.table&&item.id===row.id));
                    this.check(births.length===3&&births.every(item=>item?.proof.kind==='mikro-orm-afterCreate-outer-commit'&&item.proof.outerTransaction===births[0].proof.outerTransaction),q.name+'.sdkOnlyOriginalOuter','Original departure plus both snapshot births must retain one real original SDK outer commit');
                    this.nativeSdkOnlySnapshotProvenance.push(declared);
                } catch(error) { this.check(false,q.name+'.snapshotShadow',error.message); }
            } else for(const id of nativeSnapshots) this.check(claimed.some(item=>item.table===id.table && item.id===id.id),q.name+'.snapshotShadow','Native actual snapshot lacks its declared independent PG shadow');
        }
        this.check(new Set(a.responseBindings.map(x=>x.name)).size===r.requests.length && a.responseBindings.length===r.requests.length,'responseBindings','Every actual HTTP response needs exactly one original-byte binding');
        for(const q of r.requests) {
            const response=a.responseBindings.find(item=>item.name===q.name);
            this.check(response?.originalPrivateComplete===true && response.parsedPublicBodyEqualsOriginalBytes===true && response.publicBeforeAfterMatchOriginalPrivateRows===true && response.sha256===q.response.wireBodySha256 && response.bytes===q.response.wireBodyBytes && response.status===q.response.status && q.response.parseError===null,q.name+'.rawResponse','Complete DTO/error and whole factual rows do not bind the original saved private response');
            if(q.captureBatch)this.check(q.certificates.state==='complete' && q.certificates.sharedCase===q.captureBatch && q.certificates.perCallerPgEventAttributionClaimed===false,q.name+'.sharedAttribution','Shared-case response lacks complete honest attribution');
        }
        this.check((a.batchBindings?.length??0)===(r.captureBatches?.length??0),'savedBatches','Saved batch cardinality differs');
        for(const q of r.captureBatches??[]) {
            const bound=a.batchBindings?.filter(item=>item.name===q.name)??[];
            this.check(bound.length===1 && ['originalPrivateComplete','sharedBeforeAfterEqualOriginalPrivateRows','actualBindingsEqualOriginal','actualCertificatesEqualOriginal','actualBarrierEqualOriginal'].every(k=>bound[0][k]===true),q.name+'.originalBatch','Shared facts/bindings/barrier were not independently rebound to original private bytes');
            if(bound.length===1) {
                const dates=bound[0].historicalBarrierDates,source=r.runtimeInput.files.filter(item=>item.source==='tools/rust-r2l/l-snapshot-sql-barrier.mjs');
                this.check(dates?.capturedDriverSource?.file==='tools/rust-r2l/l-commission-http-actual.mjs' && dates.capturedDriverSource.rawBytesSha256===this.plan.driver && dates.capturedPgBarrierSource.length===1 && source.length===1 && dates.capturedPgBarrierSource[0].rawBytesSha256===source[0].rawBytesSha256,q.name+'.dateProjectionSource','Historical Date projection is not bound to the exact captured redactor and pg result source');
                try { verifyHistoricalBarrierDateBinding(q.barrier,dates); }
                catch(error) { this.check(false,q.name+'.historicalPgDates',error.message); }
            }
        }
    }
    prepareAuthInput(q) { this.check(q.authInputPreparation==null, q.name+'.authInput', 'Natural edge input must not contain controlled freshness'); return null; }
    bridge(q,index) {
        if(index===0) {
            const all=Object.entries(q.before).flatMap(([table,rows])=>rows.map(row=>({table,row})));
            const initial=[...this.direct.values()].filter(item=>this.directBirthSites.get(item.id)==='initiator.csrf');
            this.check(q.name==='initiator.csrf'&&initial.length===68&&all.length===initial.length&&all.every(item=>this.directBirthSites.get(item.row.id)===q.name&&item.table===this.direct.get(item.row.id)?.table&&same(item.row,this.direct.get(item.row.id)?.row)),q.name+'.initialDirectRows','First captured frame must contain exactly the actual base50+bootstrap18 direct rows; the later draft contract is not born yet');
            for(const item of initial)this.usedDirectBirths.add(item.id);return;
        }
        const predicted=structuredClone(this.r.requests[index-1].after),target=q.before;
        // The original source inserts the additional owned draft only after
        // all six auth HTTPs. Its retained before-absence/COMMIT ledger, exact
        // source case and full captured row define this birth, never a query hit.
        for(const item of this.direct.values())if(this.directBirthSites.get(item.id)===q.name) {
            this.check(q.name==='contract.submit.reject'&&index===6&&!this.usedDirectBirths.has(item.id)&&!predicted[item.table].some(row=>row.id===item.id),q.name+'.directBirth','Source-specific later direct INSERT occurred at a different HTTP site or already existed');
            this.check(same(target[item.table].find(row=>row.id===item.id),item.row),q.name+'.directBirthRow','Later before state differs from exact original direct RETURNING/COMMIT row');
            predicted[item.table].push(structuredClone(item.row));predicted[item.table].sort((a,b)=>a.id.localeCompare(b.id));this.usedDirectBirths.add(item.id);
        }
        this.mutationCursor??=0;this.mutationEvidence??=[];
        while(this.mutationCursor<this.a.mutations.length) {
            const m=this.a.mutations[this.mutationCursor],row=predicted[m.table]?.find(item=>item.id===m.id),noop=same(m.before,m.after);
            if(same(predicted,target) && !noop)break;
            if(!same(row,m.before))break;
            this.check(m.state==='committed' && String(BigInt(m.transaction)%4294967296n)===m.expectedXmin && this.objects.has(m.table+':'+m.id),q.name+'.preparedCommit','Between-HTTP fixture mutation lacks exact owned committed transaction/xmin');
            const allowed=m.reason==='Only this run actual owned session made due to observe original raw-touch plus managed coflush' || m.reason.startsWith('SOURCE-bound G1 edge owned fixture: ');
            this.check(allowed,q.name+'.preparedReason','An undeclared mutation cannot become a source-conditioned input');
            const keys=new Set(Object.keys(m.values));
            this.check(Object.keys(row).every(k=>keys.has(k)||same(m.before[k],m.after[k])),q.name+'.preparedColumns','Fixture preparation changed fields outside its exact SQL values');
            for(const [key,value] of Object.entries(m.values)) {
                const type=this.schema.get(m.table)?.get(key)?.udt,actual=m.after[key];
                const agrees=['timestamp','timestamptz'].includes(type)&&value!==null ? contractInstant(value).us===contractInstant(actual).us : same(value,actual);
                this.check(agrees,q.name+'.preparedValue.'+key,'Actual direct mutation differs from its exact requested input');
            }
            if(m.table==='auth_session')this.check(same(Object.keys(m.values),['last_seen_at']),q.name+'.preparedAuth','Only the original named due last_seen input is allowed');
            const at=predicted[m.table].findIndex(item=>item.id===m.id);predicted[m.table][at]=structuredClone(m.after);
            this.usedMutations.add(m.transaction);this.mutationCursor++;
            this.mutationEvidence.push({ beforeUnit:q.name,table:m.table,id:m.id,transaction:m.transaction,expectedXmin:m.expectedXmin,reason:m.reason,values:m.values,before:m.before,after:m.after,
                noVisibleValueChange:noop,noopCommitBoundaryClaim:noop?'Original journal order and commit proof; no finer HTTP boundary can be inferred from an unchanged row':null });
        }
        this.check(same(predicted,target),q.name+'.betweenFrames','Whole owned before state contains an unexplained creation/update/delete outside exact saved direct preparations');
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
        const sourceCaseLabel=this.text(q.name,at+'.sourceCaseLabel');
        const direct = this.direct.get(row.id), origin = this.origins.get(row.id);
        if (!rowPrevious && direct) {
            this.check(phase === 'before' && same(value, direct.row[column]), at, 'Direct input clock differs from its actual captured INSERT row');
            fixed = direct.original.columns.includes(column); js = !fixed ? false : true;
            site = 'input.' + slot + '.' + column + (fixed ? '.original-literal' : '.SQL-default');
        } else if (!rowPrevious) {
            this.check(phase === 'after' && origin?.caseId === q.name && origin.index === index, at, 'Generated clock has no original creation case'); site = 'create.' + sourceCaseLabel + '.' + slot + '.' + column;
        } else site = (phase === 'before' ? 'prepared.' : 'http.') + sourceCaseLabel + '.' + slot + '.' + column;
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
            this.bridge(q,index);this.prepareRequestClocks(q, index); const authInput=this.prepareAuthInput(q,index),before = this.frame(q, index, 'before'), after = this.frame(q, index, 'after');
            const request = this.any(q.request, q.name + '.request');
            if (q.name === 'initiator.login') {
                const material = 'R2L_' + this.r.runId + '_synthetic_only', value = q.request.body.password;
                this.check(value?.redacted === true && value.bytes === Buffer.byteLength(material) && value.sha256 === sha(material), q.name + '.request.password', 'Fresh synthetic request credential fingerprint differs from original source protocol');
                request.body.password = { ...value, sha256: '$source-fixture-per-run-credential-fingerprint' };
            }
            if (this.requestClockInputs.has(q.name + '.receiptDate')) request.body.receiptDate = { clock: this.requestClockInputs.get(q.name + '.receiptDate').site, representation: 'JS-Date-ISO-ms-Z' };
            const responses=(q.requests??[q]).map(item=>({name:this.text(item.name,item.name+'.name'),method:item.method,path:this.text(item.path,item.name+'.path'),request:this.any(item.request,item.name+'.request'),
                status:item.response.status,contentType:item.response.contentType,body:this.dom(item.response.body,{...q,...item,after:q.after},item.name+'.response.body')}));
            if(q.name==='initiator.login')responses[0].request=request;
            if(this.requestClockInputs.has(q.name+'.receiptDate'))responses[0].request=request;
            // Values above were each normalized at their original raw source
            // once. A typed label deliberately contains the original source PK;
            // rescanning that generated label would invent unknown raw UUIDs.
            views.push({ name: this.text(q.name,q.name+'.name'), method: q.method, path: this.text(q.path, q.name + '.path'), authInput,request, responses, before, after });
        }
        this.check(same(this.r.requests.at(-1).after, this.r.finalFacts), 'finalFacts', 'Product state changed after final HTTP');
        this.check(this.a.mutations.every(({ transaction }) => this.usedMutations.has(transaction)), 'preparedMutationCoverage','An original saved direct mutation was not classified at its exact source input site');
        this.check(this.usedDirectBirths.size===69&&[...this.direct.keys()].every(id=>this.usedDirectBirths.has(id)),'directBirthCoverage','Every original direct row must be present at its exact declared source birth site');
        return { authFreshnessPolicy:this.authPolicy,views, lifecycleUs: Object.fromEntries(Object.entries(this.authOffsets).map(([key, value]) => [key, String(value)])) };
    }
}
