// Strict read-only comparison of the two fresh 31-record contract runs.
// Source clock/identity slots are explicit. No general timestamp/UUID deletion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { authority } from './catalog-complete.mjs';
import { marker, sourceHead } from './fixture-guard.mjs';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UUID_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
export const contractFactTables = Object.freeze(['contract', 'approval_record', 'todo_item', 'auth_session', 'audit_log', 'security_event']);
const DATE_FIELDS = Object.freeze({ contract: ['created_at', 'updated_at'], approval_record: ['created_at', 'updated_at', 'submitted_at', 'decided_at', 'closed_at'], todo_item: ['created_at', 'updated_at', 'completed_at'], auth_session: ['created_at', 'updated_at', 'last_seen_at', 'idle_expires_at', 'absolute_expires_at'] });
const DOM_DATES = Object.freeze({ createdAt: 'created_at', updatedAt: 'updated_at', submittedAt: 'submitted_at', decidedAt: 'decided_at', closedAt: 'closed_at', completedAt: 'completed_at' });
const DUE_CASES = new Set(['decision.reject-auth-due', 'decision.approve-auth-due', 'todos.closed-auth-due']);
const CAS_CASES = new Set(['decision.cas-pair', 'decision.cas-record-pair']);
const SAME = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function contractInstant(value) {
    assert(typeof value === 'string');
    const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(Z|[+-]\d\d:\d\d)$/.exec(value); assert(match, 'Invalid timestamp representation');
    const milliseconds = Date.parse(value); assert(Number.isFinite(milliseconds));
    return { us: BigInt(milliseconds) * 1000n + BigInt(((match[2] ?? '').padEnd(6, '0')).slice(3)), zone: match[3], fraction: match[2] ?? '' };
}
function issues() {
    return { failures: [], gaps: [], checks: 0,
        check(value, at, reason) { this.checks++; if (!value) this.failures.push({ path: at, reason }); return !!value; },
        gap(at, reason) { if (!this.gaps.some((entry) => entry.path === at && entry.reason === reason)) this.gaps.push({ path: at, reason }); }
    };
}
export function strictContractDiff(a, b, at = '$', out = []) {
    if (Object.is(a, b)) return out;
    if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
        if (Array.isArray(a) && a.length !== b.length) out.push({ path: at + '.length', nest: a.length, rust: b.length });
        const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
        for (const key of keys) {
            if (!Object.hasOwn(a, key) || !Object.hasOwn(b, key)) out.push({ path: at + '.' + key, nestPresent: Object.hasOwn(a, key), rustPresent: Object.hasOwn(b, key) });
            else strictContractDiff(a[key], b[key], at + '.' + key, out);
        }
    } else out.push({ path: at, nest: a, rust: b });
    return out;
}

class ContractEvidence {
    constructor(report, label, inputSlots) {
        this.r = report; this.label = label; this.e = issues(); this.ids = new Map(); this.slots = new Map(); this.births = new Map(); this.frames = new Map(); this.tokens = new Map(); this.nonces = new Map(); this.clockEvidence = []; this.identityEvidence = []; this.nonceEvidence = [];
        this.columns = new Map(authority.tables.map((table) => [table.name, table.columns.map(({ name }) => name).sort()]));
        this.literal = new Set(['00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000014']);
        const fixedFile = new URL('../../apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts', import.meta.url), fixed = fs.readFileSync(fixedFile, 'utf8');
        for (const id of fixed.match(UUID_TEXT) ?? []) this.literal.add(id);
        this.fixedSource = { file: 'apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts', sha256: sha(fixed) };
        this.inputSlots = inputSlots; this.inputRows = new Map();
        this.concurrentComments = new Map();
    }
    check(value, at, reason) { return this.e.check(value, this.label + '.' + at, reason); }
    bind(id, slot, proof) {
        if (!this.check(UUID.test(id ?? ''), slot, 'Noncanonical UUID binding')) return;
        if (!this.check(!this.literal.has(id), slot, 'Readonly fixed seed identity must not be mapped')) return;
        this.check(!this.ids.has(id) || this.ids.get(id) === slot, slot, 'One UUID bound to different typed slots');
        this.check(!this.slots.has(slot) || this.slots.get(slot) === id, slot, 'Typed slot bound to multiple UUIDs');
        this.ids.set(id, slot); this.slots.set(slot, id); this.identityEvidence.push({ id, slot, proof });
    }
    text(value, at) {
        let output = value;
        const run = this.r.runId;
        const templates = [
            ['r2l_admin_' + run.replaceAll('-', ''), '$fixture.admin.username'], ['r2l_viewer_' + run.replaceAll('-', ''), '$fixture.viewer.username'],
            ['r2l_role_admin_' + run, '$fixture.admin.roleKey'], ['r2l_role_viewer_' + run, '$fixture.viewer.roleKey'],
            ['r2l_org_admin_' + run, '$fixture.admin.orgKey'], ['r2l_org_viewer_' + run, '$fixture.viewer.orgKey'],
            ...Object.entries(this.r.preparedSource?.numberValues ?? {}).map(([key, text]) => [text, '$input.' + key]),
            ['missing-' + run, '$input.missingNumber'], ['poms-r2l-fixture/' + run, '$fixture.userAgent']
        ];
        for (const [from, to] of templates) output = output.replaceAll(from, to);
        // Only the exact known seed projection display-name suffix is run8.
        if (['华南地铁集团 L ' + run.slice(0, 8), 'POMS 首期项目主链路样例 L ' + run.slice(0, 8)].includes(output)) output = output.slice(0, -8) + '$input.run8';
        return output.replace(UUID_TEXT, (id) => {
            if (this.literal.has(id)) return id;
            const slot = this.ids.get(id);
            if (!slot) { this.e.gap(this.label + '.' + at, 'Unregistered UUID reference ' + id); return id; }
            return '$id:' + slot;
        });
    }
    any(value, at) {
        if (typeof value === 'string') return this.text(value, at);
        if (Array.isArray(value)) return value.map((entry, index) => this.any(entry, at + '[' + index + ']'));
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, this.any(child, at + '.' + key)]));
        return value;
    }
    sourceSetup() {
        const r = this.r;
        this.check(r.backend === this.label && r.sourceHead === sourceHead && r.runtimeInput?.sourceCheckpoint === sourceHead && r.runtimeInput.result === 'pass' && r.runtimeInput.privateEnvironmentCopied === false, 'runtimeInput', 'Actual source/runtime input binding differs');
        this.check(r.nativeFinal?.binaryUnchanged === true && r.nativeFinal.binaryRawBytesSha256 === '0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4', 'nativeBinary', 'Original compiled Native source binary changed');
        if (r.backend === 'rust') this.check(r.rustRuntime?.kind === 'actual-Rust-release-full-HTTP-owner' && r.rustRuntime.binaryUnchanged === true && r.rustRuntime.stopped === true && r.runtimeInput.rustBinaryCopied === true && r.runtimeInput.files.some((item) => item.target === 'artifacts/poms-api-rust' && item.rawBytesSha256 === r.rustRuntime.binaryRawBytesSha256), 'rustBinary', 'Actual release owner/binary capture is incomplete');
        this.check(r.kind === 'actual-contract-four-L-operations-with-original-Native-producers' && r.result === 'observed', 'report', 'Not a completed actual contract run');
        this.check(r.doubleZero === true && r.full107Restored === true && r.cleanup?.length === 2 && r.cleanup[1].deleted === 0, 'cleanup', 'Actual double-zero/full catalog restoration missing');
        this.check(SAME(r.fullCatalogBeforeObserver, r.fullCatalogAfterObserver), 'catalog', 'Observer altered the full catalog');
        this.check(r.requests?.length === 31 && new Set(r.requests.map(({ name }) => name)).size === 31, 'requests', 'Expected exactly 31 unique current-scope records');
        this.check(r.nativeFinal?.witness?.complete && r.nativeFinal.witness.diagnostics.length === 0 && r.nativeFinal.witness.openTransactions.length === 0 && r.nativeFinal.witness.pendingStartCount === 0, 'witness', 'Original SDK witness incomplete');
        this.bind(r.runId, 'run', 'Actual isolated run identity'); this.bind(r.base?.actors?.admin, 'actor.admin', 'Named original prepared-base actor'); this.bind(r.base?.actors?.viewer, 'actor.viewer', 'Named original prepared-base actor');
        const prepared = r.preparedSource;
        this.check(prepared?.kind === 'prepared-original-draft-seed-records-not-native-generated' && prepared.businessNumberSequenceTouched === false && prepared.rows?.length === 3, 'prepared', 'Original source projection missing');
        for (const row of prepared?.rows ?? []) {
            const mappings = prepared.primaryKeyMap.filter(({ to }) => to === row.values.id); this.check(mappings.length === 1, 'prepared.' + row.table, 'Fresh PK lacks exact original-source map');
            if (mappings.length) { this.literal.add(mappings[0].from); this.bind(row.values.id, 'input.' + row.table, 'Original DEV source PK slot ' + mappings[0].from); }
        }
        this.check(r.projectId === this.slots.get('input.project') && r.contractId === this.slots.get('input.contract'), 'prepared.targets', 'Declared targets differ from source-mapped PKs');
        const org = prepared?.rows?.find(({ table }) => table === 'project')?.values.owner_org_id; if (org) this.bind(org, 'actor.admin.org', 'Original DEV org substitution');
        if (this.inputSlots) {
            const input = this.inputSlots;
            this.check(input.kind === 'public-source-bound-three-prepared-input-slots' && input.result === 'pass-saved-evidence-only' && input.backend === r.backend && input.runId === r.runId && input.sourceHead === r.sourceHead && input.marker === marker && input.actualReport.canonicalSha256 === sha(JSON.stringify(r)), 'inputSlots.binding', 'Prepared input-slot addendum is not bound to this exact actual report');
            this.check(input.rows?.length === 3 && new Set(input.rows.map(({ table }) => table)).size === 3, 'inputSlots.rows', 'Exactly three named original prepared rows required');
            for (const item of input.rows ?? []) {
                const original = prepared.rows.find(({ table }) => table === item.table);
                this.check(!!original && item.id === original.values.id && item.row.id === original.values.id && item.originalSourcePk === prepared.primaryKeyMap.find(({ to }) => to === item.id)?.from, 'inputSlots.' + item.table, 'Input slot identity/source map differs');
                this.check(item.proof?.beforeAbsent && item.proof.independentlyVisible && (item.proof.commitAcknowledged || item.proof.recoveredByXminAndXactStatus) && String(BigInt(item.proof.transaction) % 4294967296n) === item.proof.xmin, 'inputSlots.' + item.table + '.proof', 'Actual saved direct-INSERT/commit/xmin evidence incomplete');
                this.check(SAME(item.originalInsertColumns, Object.keys(original.values)), 'inputSlots.' + item.table + '.columns', 'Original INSERT projection differs');
                this.inputRows.set(item.table, item.row);
            }
        }
        const events = r.nativeFinal?.witness?.events ?? [], committed = r.nativeFinal?.witness?.committed ?? [], seen = new Set();
        for (const [index, q] of (r.requests ?? []).entries()) {
            const isL = q.path?.startsWith('/api/approval-records/') || q.path === '/api/me/todos' || CAS_CASES.has(q.name);
            this.check(q.executionBackend === (r.backend === 'rust' && isL ? 'rust' : q.responses ? 'nest' : 'native'), q.name + '.backend', 'Wrong actual route backend');
            this.check(q.certificates?.traceComplete === true, q.name + '.certificates', 'Incomplete original create trace');
            if ((q.certificates?.pgCommittedRows ?? []).length) this.e.gap(q.name + '.pgCreates', 'New PG rows need full public original createContext proof; this current contract scope has none');
            const counts = new Map();
            for (const item of q.certificates?.committedRows ?? []) {
                const candidates = committed.filter((entry) => entry.table === item.table && entry.id === item.id); this.check(candidates.length === 1, q.name + '.create', 'No unique actual SDK create'); if (candidates.length !== 1) continue;
                const proof = candidates[0].proof, context = proof.createContext, ordinal = counts.get(item.table) ?? 0; counts.set(item.table, ordinal + 1);
                this.check(proof.kind === 'mikro-orm-afterCreate-outer-commit' && proof.sdkVersion === '7.0.11' && context.runId === r.runId && context.caseId === q.name && context.index === index, q.name + '.createContext', 'Wrong original SDK create context');
                this.check(events.some((event) => event.seq === proof.createEventSeq && event.event === 'afterCreate' && event.table === item.table) && events.some((event) => event.seq === proof.outerCommitEventSeq && event.event === 'afterTransactionCommit' && event.transaction === proof.outerTransaction), q.name + '.outerCommit', 'Missing actual SDK outer commit event');
                const slot = 'create.' + q.name + '.' + item.table + '.' + ordinal; this.bind(item.id, slot, 'Original SDK createContext case/table/ordinal'); this.births.set(item.table + ':' + item.id, { index, caseId: q.name, slot });
                this.check(!seen.has(item.table + ':' + item.id), q.name + '.create', 'Repeated create certificate'); seen.add(item.table + ':' + item.id);
                this.check(!(q.before?.[item.table] ?? []).some((row) => row.id === item.id) && (q.after?.[item.table] ?? []).filter((row) => row.id === item.id).length === 1, q.name + '.create.visibility', 'Created ID preexists or lacks unique post row');
            }
            if (CAS_CASES.has(q.name)) {
                this.check(q.responses?.length === 2 && SAME(q.responses.map(({ status }) => status).sort(), [200, 500]), q.name + '.responses', 'Actual held-row case must have one 200 and one 500');
                this.check(q.barrier?.barrier?.twoRealWaitingUpdates && q.barrier.barrier.allBlockerChainsReachFixture && q.barrier.barrier.waiting?.length === 2 && q.barrier.result === 'observed', q.name + '.barrier', 'Two real waiting UPDATEs not observed');
                this.concurrentComments.set(q.approvalRecordId, { index, name: q.name, literal: '并发真实决策 ' + q.responses.findIndex(({ status }) => status === 200) });
            }
        }
        this.check(committed.length === seen.size, 'witness.creates', 'Unassigned original SDK create omitted from case mapping');
    }
    clockValue(value, { table, row, column, q, index, phase, previous, rowPrevious, site, bounds, js = true, derived = null }) {
        if (value === null) return null;
        const at = q.name + '.' + phase + '.' + table + '.' + row.id + '.' + column;
        let parsed; try { parsed = contractInstant(value); } catch { this.check(false, at, 'Invalid timestamp'); return value; }
        const slot = this.ids.get(row.id), key = table + ':' + row.id + ':' + column;
        if (!slot) { this.e.gap(at, 'Clock row lacks typed identity'); return value; }
        if (previous && (column === 'created_at' || table === 'approval_record' && column === 'submitted_at' || table === 'auth_session' && column === 'absolute_expires_at')) this.check(value === previous.raw, at, 'Immutable original birth/submission/absolute-expiry clock changed');
        if (previous && SAME(value, previous.raw)) return { clock: previous.site, representation: 'pg-json', zone: parsed.zone };
        this.check(parsed.zone === this.dbZone, at, 'Database timestamp timezone spelling changed');
        if (js) this.check(parsed.us % 1000n === 0n, at, 'Original JavaScript Date sampling must retain millisecond precision');
        if (bounds) this.check(parsed.us >= bounds[0] && parsed.us <= bounds[1] + (js ? 0n : 999n), at, 'Clock sample lies outside its exact setup/HTTP/preparation window');
        if (derived) this.check(derived.test(parsed.us), at, derived.reason);
        const ref = site ?? (phase === 'before' ? 'prepared.' + q.name : 'http.' + q.name) + '.' + slot + '.' + column;
        this.tokens.set(key, { raw: value, us: parsed.us, site: ref }); this.clockEvidence.push({ at, samplingSite: ref, actual: value, bounds: bounds?.map(String) ?? null, originalDateMillisecond: js });
        return { clock: ref, representation: 'pg-json', zone: parsed.zone };
    }
    frame(q, index, phase) {
        const facts = q[phase], result = {}, lower = contractInstant(q.startedAt).us, upper = contractInstant(q.responseReceivedAt).us;
        this.check(lower <= upper && upper <= contractInstant(q.finishedAt).us, q.name + '.window', 'Invalid HTTP measurement window');
        this.check(SAME(Object.keys(facts ?? {}).sort(), [...contractFactTables].sort()), q.name + '.' + phase, 'Raw target-table set differs');
        for (const table of contractFactTables) {
            const rows = facts?.[table] ?? []; this.check(Array.isArray(rows), q.name + '.' + table, 'Raw rows must be an array'); const output = [];
            this.check(new Set(rows.map(({ id }) => id)).size === rows.length, q.name + '.' + table, 'Duplicate raw PK');
            for (const row of rows) {
                this.check(SAME(Object.keys(row).sort(), this.columns.get(table)), q.name + '.' + table + '.columns', 'Raw SQL row missing/extra column; unchanged fields may not disappear');
                const slot = this.ids.get(row.id); this.check(!!slot, q.name + '.' + table + '.id', 'Raw row has no source/SDK mapped identity');
                const previousFrame = this.frames.get(table + ':' + row.id), rowOut = {}, born = this.births.get(table + ':' + row.id);
                if (!previousFrame) this.check(table === 'contract' && phase === 'before' && index === 0 || born?.index === index && phase === 'after', q.name + '.' + table + '.birth', 'Row appeared outside its source/SDK creation case');
                for (const [column, value] of Object.entries(row)) {
                    if ((DATE_FIELDS[table] ?? []).includes(column)) {
                        const previous = this.tokens.get(table + ':' + row.id + ':' + column);
                        let bounds = [lower, upper], js = true, site;
                        if (!previousFrame && table === 'contract') { bounds = [contractInstant(this.r.startedAt).us, lower]; js = false; site = 'input.contract.' + column + '.SQL-default-now'; }
                        else if (!previousFrame) site = 'birth.' + born?.slot + '.' + column;
                        else if (phase === 'before' && !SAME(value, previousFrame.row[column])) {
                            const last = this.r.requests[index - 1]; bounds = [contractInstant(last.finishedAt).us, lower];
                            if (table === 'auth_session' && column === 'last_seen_at' && DUE_CASES.has(q.name)) bounds = bounds.map((time) => time - 120000000n);
                            else if (table === 'todo_item' && column === 'completed_at' && q.name === 'decision.cas-record-pair') site = 'prepared.completed-todo.' + slot;
                            else this.e.gap(q.name + '.' + table + '.' + column, 'Unrecorded between-HTTP clock mutation has no named source preparation');
                        }
                        let derived;
                        if (table === 'auth_session' && ['idle_expires_at', 'absolute_expires_at'].includes(column) && value !== null && (!previous || value !== previous.raw)) {
                            const anchor = contractInstant(row.last_seen_at).us, delta = contractInstant(value).us - anchor;
                            if (!previousFrame) { this.authOffsets ??= {}; const kind = column === 'idle_expires_at' ? 'idle' : 'absolute'; this.check(delta > 0n && delta % 1000000n === 0n, q.name + '.auth.' + kind, 'Original lifecycle duration is not positive whole seconds'); if (this.authOffsets[kind] !== undefined) this.check(this.authOffsets[kind] === delta, q.name + '.auth.' + kind, 'Session lifecycle differs within backend'); this.authOffsets[kind] = delta; }
                            const offset = column === 'absolute_expires_at' ? this.authOffsets?.absolute : this.authOffsets?.idle;
                            bounds = null; derived = { test: (time) => column === 'absolute_expires_at' ? time === anchor + offset : time === (anchor + offset < contractInstant(row.absolute_expires_at).us ? anchor + offset : contractInstant(row.absolute_expires_at).us), reason: 'Auth expiry is not original now+lifecycle/min(absolute) derivative' };
                            site = (column === 'absolute_expires_at' ? 'birth.' + born?.slot : 'auth-idle.' + q.name + '.' + slot) + '.' + column;
                        }
                        rowOut[column] = this.clockValue(value, { table, row, column, q, index, phase, previous, rowPrevious: previousFrame?.row, bounds, js, site, derived });
                    } else if (table === 'auth_session' && ['token_hash', 'csrf_token_hash'].includes(column)) rowOut[column] = this.nonce(value, slot + '.' + column, q.name + '.' + phase + '.' + table + '.' + column);
                    else if (column === 'decision_comment' && this.concurrentComments.has(row.id) && row.current_status !== 'pending') {
                        const source = this.concurrentComments.get(row.id);
                        this.check(index >= source.index && value === source.literal, q.name + '.comment', 'Concurrency comment/carry does not match the real winning sender');
                        rowOut[column] = '$declared-source-comment:' + source.name + ':concurrency-winning-sender';
                    } else rowOut[column] = this.any(value, q.name + '.' + table + '.' + column);
                }
                this.frameRelations(table, row, previousFrame?.row, q, phase);
                this.frames.set(table + ':' + row.id, { row, index, phase }); output.push({ slot, fields: rowOut });
            }
            result[table] = output.sort((a, b) => (a.slot ?? '').localeCompare(b.slot ?? ''));
        }
        this.frameViews ??= new Map(); this.frameViews.set(index + ':' + phase, { facts, result }); return result;
    }
    frameRelations(table, row, previous, q, phase) {
        if (table === 'contract') this.check(row.id === this.r.contractId && row.project_id === this.r.projectId, q.name + '.contract.refs', 'Contract identity/project differs from prepared input');
        if (table === 'contract' && !previous) this.check(row.created_at === row.updated_at, q.name + '.contract.input-clock', 'Same original SQL transaction now() default must populate both input clock columns');
        if (['approval_record', 'todo_item'].includes(table)) this.check(row.project_id === this.r.projectId && row.target_object_id === this.r.contractId && row.target_object_type === 'contract', q.name + '.' + table + '.refs', 'Domain row points outside its exact prepared contract/project');
        if (table === 'approval_record' && row.current_status === 'pending') this.check(row.current_approver_user_id === '00000000-0000-4000-8000-000000000008', q.name + '.approver', 'Fixed original approver identity changed');
        if (table === 'auth_session') {
            const birth = this.births.get(table + ':' + row.id), expected = birth?.caseId === 'initiator.login' ? this.r.base.actors.admin : '00000000-0000-4000-8000-000000000008'; this.check(row.user_id === expected, q.name + '.session.user', 'New session not logically bound to its real login actor');
            if (previous && phase === 'after' && row.row_version - previous.row_version === 1 && row.last_seen_at !== previous.last_seen_at) this.check(contractInstant(row.updated_at).us === contractInstant(row.last_seen_at).us, q.name + '.auth.raw-touch', 'Raw touch must reuse exactly the same original now sample');
            if (phase === 'after' && DUE_CASES.has(q.name) && row.last_seen_at !== previous?.last_seen_at) this.check(contractInstant(row.updated_at).us >= contractInstant(row.last_seen_at).us, q.name + '.auth.coflush', 'Managed coflush hook precedes the original auth now');
        }
        const time = (column) => row[column] == null ? null : contractInstant(row[column]).us;
        if (time('created_at') !== null && time('updated_at') !== null) this.check(time('updated_at') >= time('created_at'), q.name + '.' + table + '.clock-order', 'updatedAt precedes original creation sample');
        if (table === 'approval_record') {
            if (time('decided_at') !== null) this.check(time('closed_at') >= time('decided_at') && time('updated_at') >= time('closed_at'), q.name + '.approval.clock-order', 'Original decided→closed→UoW hook sample order violated');
            this.check(time('created_at') >= time('submitted_at'), q.name + '.approval.created', 'onCreate sample precedes explicit submittedAt');
        }
        if (table === 'todo_item' && time('completed_at') !== null && phase === 'after' && row.completed_at !== previous?.completed_at) this.check(time('updated_at') >= time('completed_at'), q.name + '.todo.clock-order', 'UoW updatedAt precedes completedAt');
    }
    nonce(value, slot, at) {
        this.check(value && value.redacted === true && /^[0-9a-f]{64}$/.test(value.sha256 ?? '') && SAME(Object.keys(value).sort(), ['redacted', 'sha256']), at, 'Server hash must remain an opaque, well-formed redacted fingerprint');
        if (this.nonces.has(slot)) this.check(this.nonces.get(slot) === value?.sha256, at, 'Session token/csrf fingerprint changed within one actual logical session');
        else { this.check(![...this.nonces.values()].includes(value?.sha256), at, 'Distinct real sessions/token roles reused nonce fingerprint'); this.nonces.set(slot, value?.sha256); this.nonceEvidence.push({ slot, fingerprint: value?.sha256, reason: 'Independent random per-session issuance; compare logical actor/create context and within-backend stability, never literal cross-run hash equality' }); }
        return { redacted: true, sha256: '$nonce:' + slot };
    }
    decisionClockRelations(q) {
        const beforeById = (table, id) => q.before[table].find((row) => row.id === id);
        for (const approval of q.after.approval_record) {
            const previous = beforeById('approval_record', approval.id);
            if (!approval.decided_at || approval.decided_at === previous?.decided_at) continue;
            const closed = contractInstant(approval.closed_at).us, decided = contractInstant(approval.decided_at).us;
            for (const todo of q.after.todo_item.filter((row) => row.source_id === approval.id)) {
                const before = beforeById('todo_item', todo.id);
                if (todo.completed_at && todo.completed_at !== before?.completed_at) this.check(contractInstant(todo.completed_at).us >= closed, q.name + '.decision-to-todo', 'Original separate completedAt sample precedes closedAt');
            }
            for (const session of q.after.auth_session) {
                const before = beforeById('auth_session', session.id);
                if (session.last_seen_at !== before?.last_seen_at) this.check(contractInstant(session.last_seen_at).us <= decided, q.name + '.auth-to-decision', 'Original authentication now sample follows business decision');
                if (session.updated_at !== before?.updated_at && session.row_version - before.row_version === 2) this.check(contractInstant(session.updated_at).us >= closed, q.name + '.coflush-order', 'Original managed auth hook precedes business assignment');
            }
        }
    }
    dom(value, q, at, frame = 'after', table = null) {
        if (Array.isArray(value)) return value.map((entry, i) => this.dom(entry, q, at + '[' + i + ']', frame, table));
        if (!value || typeof value !== 'object') return this.any(value, at);
        const slot = this.ids.get(value.id), inferred = slot?.includes('.approval_record.') ? 'approval_record' : slot?.includes('.todo_item.') ? 'todo_item' : slot === 'input.contract' ? 'contract' : slot === 'input.project' ? 'project' : table;
        const out = {};
        for (const [key, child] of Object.entries(value)) {
            if (DOM_DATES[key] && inferred && child !== null) {
                const row = q[frame][inferred]?.find((entry) => entry.id === value.id) ?? this.inputRows.get(inferred), field = DOM_DATES[key];
                if (!row && inferred === 'project') this.e.gap(at + '.' + key, 'Project original SQL input slot not in the six-table frames; source-bound saved prepared row addendum required for bidirectional DTO/DB clock proof');
                this.check(!!row && row[field] !== null, at + '.' + key, 'DTO date lacks actual matching raw row/column');
                if (row && row[field] !== null) {
                    const dom = contractInstant(child), raw = contractInstant(row[field]); this.check(child === new Date(Number(raw.us / 1000n)).toISOString() && dom.zone === 'Z' && dom.fraction.length === 3 && dom.us === raw.us / 1000n * 1000n, at + '.' + key, 'DTO date changed zone/precision or differs from original raw-row JS Date projection');
                    const ref = this.tokens.get(inferred + ':' + row.id + ':' + field);
                    if (!ref && inferred === 'project') {
                        this.check(raw.zone === this.dbZone && raw.us >= contractInstant(this.r.startedAt).us && raw.us <= contractInstant(this.r.requests[0].startedAt).us + 999n, at + '.' + key, 'Saved project input clock outside actual setup bounds/DB timezone');
                        this.check(row.created_at === row.updated_at, at + '.' + key, 'Original project SQL now() input defaults differ');
                    }
                    out[key] = { clock: ref?.site ?? 'input.' + inferred + '.' + field + '.recorded-direct-INSERT', representation: 'JS-Date-ISO-ms-Z', zone: dom.zone };
                } else out[key] = child;
            } else if (key === 'expiresAt' && q.name.endsWith('.login')) {
                const born = q.certificates.committedRows.find(({ table }) => table === 'auth_session'), row = q.after.auth_session.find(({ id }) => id === born?.id);
                this.check(!!row && child === new Date(Number(contractInstant(row.idle_expires_at).us / 1000n)).toISOString(), at + '.expiresAt', 'Login expiry does not match actual new session idle expiry');
                out[key] = { clock: this.tokens.get('auth_session:' + row?.id + ':idle_expires_at')?.site, representation: 'JS-Date-ISO-ms-Z' };
            } else if (key === 'expiresAt' && q.name.endsWith('.csrf')) {
                const parsed = contractInstant(child), sample = parsed.us - this.authOffsets.idle; this.check(child === new Date(Number(parsed.us / 1000n)).toISOString() && sample >= contractInstant(q.startedAt).us && sample <= contractInstant(q.responseReceivedAt).us, at + '.expiresAt', 'Anonymous CSRF expiry lacks original now+lifecycle sampling window');
                out[key] = { clock: 'anonymous-csrf.' + q.name + '.now-plus-idle', durationUs: String(this.authOffsets.idle), representation: 'JS-Date-ISO-ms-Z' };
            } else if (key === 'token' && q.name.endsWith('.csrf')) {
                this.check(child?.redacted === true && child.bytes === 43 && /^[0-9a-f]{64}$/.test(child.sha256 ?? ''), at + '.token', 'Anonymous CSRF token fingerprint/byte size invalid');
                this.anonymousNonces ??= new Map(); this.check(![...this.anonymousNonces.values()].includes(child.sha256), at + '.token', 'Different actual anonymous clients reused CSRF nonce fingerprint'); this.anonymousNonces.set(q.name, child.sha256);
                out[key] = { ...child, sha256: '$nonce:anonymous-csrf.' + q.name };
            } else out[key] = this.dom(child, q, at + '.' + key, frame, null);
        }
        return out;
    }
    analyse() {
        this.sourceSetup();
        const initial = this.r.requests[0]?.before?.contract?.[0]; this.dbZone = contractInstant(initial.created_at).zone;
        // Lifecycle durations are exact observed source derivatives, not dropped
        // timestamps. Discover once before chronological DTO validation.
        const firstLogin = this.r.requests.find((q) => q.name === 'initiator.login'), firstSession = firstLogin.after.auth_session.find((row) => row.id === firstLogin.certificates.committedRows.find(({ table }) => table === 'auth_session').id);
        this.authOffsets = { idle: contractInstant(firstSession.idle_expires_at).us - contractInstant(firstSession.last_seen_at).us, absolute: contractInstant(firstSession.absolute_expires_at).us - contractInstant(firstSession.last_seen_at).us };
        const frames = this.r.requests.map((q, index) => { const value = { name: q.name, method: q.method ?? 'POST', path: this.text(q.path ?? '/api/approval-records/' + q.approvalRecordId + ':approve', q.name + '.path'), before: this.frame(q, index, 'before'), after: this.frame(q, index, 'after') }; this.decisionClockRelations(q); return value; });
        for (const [index, q] of this.r.requests.entries()) {
            const responses = q.response ? [q.response] : [...q.responses].sort((a, b) => a.status - b.status);
            // Re-select the clock token for this exact after frame; no later
            // mutation may rewrite an earlier DTO's source clock slot.
            this.tokensForLatest = this.tokens;
            const historic = this.frameViews.get(index + ':after');
            const originalTokens = this.tokens; this.tokens = new Map();
            for (const [table, rows] of Object.entries(historic.result)) for (const entry of rows) {
                const id = this.slots.get(entry.slot); for (const [column, value] of Object.entries(entry.fields)) if (value && typeof value === 'object' && Object.hasOwn(value, 'clock')) this.tokens.set(table + ':' + id + ':' + column, { site: value.clock });
            }
            frames[index].responses = responses.map((response, i) => ({ status: response.status, contentType: response.contentType, body: this.dom(response.body, q, q.name + '.response[' + i + '].body') })); this.tokens = originalTokens;
        }
        const inputRows = [];
        for (const [table, row] of this.inputRows) {
            this.check(SAME(Object.keys(row).sort(), this.columns.get(table)), 'inputSlots.' + table + '.allColumns', 'Recorded INSERT row lost default/unchanged columns');
            this.check(row.created_at === row.updated_at, 'inputSlots.' + table + '.clock-equality', 'Same recorded SQL default-now input transaction produced different initial clocks');
            const fields = this.any(row, 'inputSlots.' + table);
            for (const column of ['created_at', 'updated_at']) {
                const time = contractInstant(row[column]); this.check(time.zone === this.dbZone && time.us >= contractInstant(this.r.startedAt).us && time.us <= contractInstant(this.r.requests[0].startedAt).us + 999n, 'inputSlots.' + table + '.' + column, 'Recorded input SQL default lies outside setup sampling window');
                fields[column] = { clock: 'input.' + table + '.' + column + '.recorded-direct-INSERT', representation: 'pg-json', zone: time.zone };
            }
            if (table === 'contract') this.check(SAME(row, this.r.requests[0].before.contract[0]), 'inputSlots.contract.before', 'Captured contract INSERT row is not the actual first pre-HTTP raw row');
            inputRows.push({ table, fields });
        }
        const finalExpected = this.r.requests.at(-1).after; this.check(SAME(finalExpected, this.r.finalFacts), 'finalFacts', 'Final raw product facts changed after the last HTTP without declared preparation');
        return { frames, sourceRows: this.any(this.r.preparedSource.rows, 'prepared.rows'), recordedInputRows: inputRows.sort((a, b) => a.table.localeCompare(b.table)), durations: Object.fromEntries(Object.entries(this.authOffsets).map(([key, value]) => [key, String(value)])) };
    }
}

export function compareContractReports(nest, rust, { inputSlotsNest, inputSlotsRust } = {}) {
    const left = new ContractEvidence(nest, 'nest', inputSlotsNest), right = new ContractEvidence(rust, 'rust', inputSlotsRust); let a, b;
    try { a = left.analyse(); } catch (error) { left.e.failures.push({ path: 'nest.analysis', reason: error.message }); }
    try { b = right.analyse(); } catch (error) { right.e.failures.push({ path: 'rust.analysis', reason: error.message }); }
    const differences = a && b ? strictContractDiff(a, b) : [];
    const failures = [...left.e.failures, ...right.e.failures], gaps = [...left.e.gaps, ...right.e.gaps];
    return { formatVersion: 1, kind: 'strict-actual-contract-31-record-comparison', result: failures.length || differences.length ? 'fail' : gaps.length ? 'uncertified' : 'pass',
        coverage: { pairedRecords: a && b ? Math.min(a.frames.length, b.frames.length) : 0, declaredRecords: 31, realHttpResponsesPerBackend: 33, tables: contractFactTables, nonemptyRawColumns: 67, unchangedColumnsRetained: true, auditAndSecurityEmptySetsCompared: true, savedPreparedInputSlotRows: { nest: left.inputRows.size, rust: right.inputRows.size }, rawBase50AndCustomerProject2PerFrameCompared: false, full107ProductRowEqualityClaimed: false, legacy54IgnoredCountedAsPassed: false },
        failures, gaps, differences, checks: left.e.checks + right.e.checks, identities: { nest: left.identityEvidence, rust: right.identityEvidence }, clocks: { nest: left.clockEvidence, rust: right.clockEvidence }, nonceChecks: { nest: left.nonceEvidence, rust: right.nonceEvidence },
        declaredExceptions: ['Fresh exact original DEV PK and original SDK case/table/ordinal identities only; fixed seed identities remain literal', 'Clock samples mapped only after source-site, representation, precision, per-HTTP/setup bounds and raw/DTO linking checks; carried clocks keep their original slot', 'Independent session token/csrf and anonymous CSRF nonce fingerprints require stable logical new-session binding; raw cookie rehash is unavailable in these older public reports', 'Only the two original concurrent sender comment literals correlate to the actual 200 winner; response pair is status-labelled, all product DTO arrays keep order'],
        sourceSamplingSites: ['Original DEV direct INSERT SQL defaults', 'ApprovalService submittedAt/decidedAt/closedAt/completedAt new Date and entity onCreate/onUpdate', 'AuthSessionService create/resolve now, exact lifecycle derivatives, AuthSessionRepository raw touch and managed coflush hook', 'Harness named due(session) now-120000 and prepared completed todo'],
        capturedSamplingSources: Object.fromEntries([['nest', nest], ['rust', rust]].map(([backend, report]) => [backend, ['apps/poms-api/src/app/features/approval/approval.service.ts', 'apps/poms-api/src/app/features/approval/approval-record.entity.ts', 'apps/poms-api/src/app/features/approval/todo-item.entity.ts', 'apps/poms-api/src/app/core/auth/auth-session.service.ts', 'apps/poms-api/src/app/core/auth/auth-session.repository.ts', 'apps/poms-api/src/app/core/auth/auth-session.entity.ts', 'tools/rust-r2l/l-contract-http-actual.mjs'].map((file) => ({ file, captured: report.runtimeInput?.files?.find((entry) => entry.source === file) ?? null }))])),
        actualBinaries: { native: nest.nativeFinal?.binaryRawBytesSha256, rust: rust.rustRuntime?.binaryRawBytesSha256 }, noDatabaseHttpEnvironmentOrPrivateAccess: true };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const [nativeFile, rustFile, output, slotsNative, slotsRust] = process.argv.slice(2); assert(nativeFile && rustFile && output); assert(!fs.existsSync(output));
    const sourceA = fs.readFileSync(nativeFile), sourceB = fs.readFileSync(rustFile), result = compareContractReports(JSON.parse(sourceA), JSON.parse(sourceB), { inputSlotsNest: slotsNative ? JSON.parse(fs.readFileSync(slotsNative)) : undefined, inputSlotsRust: slotsRust ? JSON.parse(fs.readFileSync(slotsRust)) : undefined });
    result.inputs = [{ file: nativeFile, bytes: sourceA.length, sha256: sha(sourceA) }, { file: rustFile, bytes: sourceB.length, sha256: sha(sourceB) }];
    result.inputSlotEvidenceFiles = [slotsNative, slotsRust].filter(Boolean).map((file) => { const bytes = fs.readFileSync(file); return { file, bytes: bytes.length, sha256: sha(bytes) }; });
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ result: result.result, records: result.coverage.pairedRecords, failures: result.failures.length, gaps: result.gaps.length, differences: result.differences.length })); process.exitCode = result.result === 'pass' ? 0 : 1;
}
