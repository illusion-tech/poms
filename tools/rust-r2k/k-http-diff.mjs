// Read-only, evidence-gated comparison. No PG client, fixture writes or report mutation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const MARKER = '6790e07a-a012-4f1c-b597-fde1750fc135';
const JSON_TIMES = new Set(['created_at', 'updated_at', 'uploaded_at', 'completed_at', 'aborted_at', 'deleted_at', 'linked_at', 'unlinked_at', 'occurred_at', 'confirmed_at', 'frozen_at', 'effective_at', 'expires_at', 'downloaded_at', 'score_updated_at']);
const NAME_FIELDS = new Set(['originalName', 'displayName', 'fileName', 'original_name', 'display_name', 'file_name']);
const sha = value => createHash('sha256').update(value).digest('hex');
const equal = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch { return false; } };
const copy = value => JSON.parse(JSON.stringify(value));
const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const lower = value => String(value).toLowerCase();
const rowKey = (table, id) => table + ':' + lower(id);
const weakEtag = bytes => `W/"${bytes.length.toString(16)}-${createHash('sha1').update(bytes).digest('base64').substring(0, 27)}"`;
const contractBytes = fs.readFileSync(new URL('./k-openapi.json', import.meta.url)), contract = JSON.parse(contractBytes);
const catalogBytes = fs.readFileSync(new URL('./reference-authority.json', import.meta.url)), catalogAuthority = JSON.parse(catalogBytes);
const columnAuthority = new Map(catalogAuthority.tables.map(table => [table.name, new Map(table.columns.map(column => [column.name, column]))]));
const kRoute = route => /^\/api\/(?:project-handovers\/[^/]+\/attachment-(?:checklist(?::refresh)?|download-packages)|attachment-download-packages\/[^/]+(?:\/download)?)\/?(?:\?|$)/i.test(route);
const downloadRoute = route => /^\/api\/attachment-download-packages\/[^/]+\/download\/?(?:\?|$)/i.test(route);
function instant(value) {
    assert(typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value), 'Expected ISO timestamp');
    const millis = Date.parse(value); assert(Number.isFinite(millis));
    const fraction = value.match(/\.(\d+)/)?.[1] ?? '';
    return BigInt(millis) * 1000000n + BigInt((fraction.slice(3) + '000000').slice(0, 6));
}
function inWindow(value, bounds) { const n = instant(value); return n >= instant(bounds.lower) && n <= instant(bounds.upper) + 999999n; }
function caseName(report, value) {
    const matched = /^([ABCR])-([0-9a-f]{8})\.(create|put|complete)$/.exec(value);
    if (!matched) return value;
    assert.equal(matched[2], report.runId.slice(0, 8)); return `upload.${matched[1]}.${matched[3]}`;
}
function diff(a, b, at = '$', out = []) {
    if (Object.is(a, b)) return out;
    if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
        if (Array.isArray(a) && a.length !== b.length) out.push({ path: at + '.length', nest: a.length, rust: b.length });
        for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[key], b[key], at + (Array.isArray(a) ? `[${key}]` : '.' + key), out);
    } else out.push({ path: at, nest: a, rust: b });
    return out;
}

class Evidence {
    constructor(report, ownership, options = {}) {
        this.r = report; this.a = ownership; this.options = options;
        this.failures = []; this.uncertified = []; this.classifications = []; this.checks = 0;
        this.ids = new Map(); this.aliases = new Map(); this.literalIds = new Set(); this.origins = new Map(); this.tokens = new Map(); this.firstRows = new Map(); this.latestRows = new Map(); this.births = new Map(); this.objects = new Map(); this.aliasEvidence = [];
    }
    check(condition, at, reason) { this.checks++; if (!condition) this.failures.push({ path: at, reason }); return condition; }
    gap(at, reason) { if (!this.uncertified.some(row => row.path === at && row.reason === reason)) this.uncertified.push({ path: at, reason }); }
    bind(id, alias, proof) {
        if (!this.check(isUuid(id), alias, 'Binding is not a UUID')) return;
        id = lower(id); if (this.literalIds.has(id)) return;
        if (this.ids.has(id)) return;
        if (!this.check(!this.aliases.has(alias) || this.aliases.get(alias) === id, alias, 'Ambiguous natural identity; no ordinal/UUID guess is allowed')) return;
        this.ids.set(id, alias); this.aliases.set(alias, id); this.aliasEvidence.push({ id, alias, proof });
    }
    text(value, key = '', at = '') {
        let output = value.replace(UUID, actual => {
            const id = lower(actual); if (this.literalIds.has(id)) return actual;
            const alias = this.ids.get(id);
            if (!alias) { this.gap(at, 'Unknown UUID ' + actual); return actual; }
            const upper = actual === actual.toUpperCase() && /[a-f]/i.test(actual) ? ':upper' : actual !== id ? ':mixed-' + [...actual].map(c => /[A-F]/.test(c) ? 'U' : /[a-f]/.test(c) ? 'l' : c === '-' ? '-' : 'n').join('') : '';
            return '$' + alias + upper;
        });
        // Root's declared upload labels contain only the run prefix, not content.
        // This substitution is confined to names; checksums and bytes never alias.
        if (NAME_FIELDS.has(key)) output = output.replaceAll(this.r.runId.slice(0, 8), '$run-prefix');
        return output;
    }
    any(value, key = '', at = '') {
        if (typeof value === 'string') return this.text(value, key, at);
        if (Array.isArray(value)) return value.map((v, i) => this.any(v, key, `${at}[${i}]`));
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.any(v, k, at + '.' + k)]));
        return value;
    }
    allFrames() { return this.r.requests.flatMap((q, index) => [{ q, index, phase: 'before', facts: q.before }, { q, index, phase: 'after', facts: q.after }]); }
    shape(value, schema, at) {
        if (schema?.$ref) schema = contract.components.schemas[schema.$ref.slice('#/components/schemas/'.length)];
        if (value == null || !schema) return;
        if (schema.enum) this.check(schema.enum.includes(value), at, 'K enum value is outside the frozen schema');
        if (schema.type === 'object') this.check(typeof value === 'object' && !Array.isArray(value), at, 'K object shape has the wrong type');
        if (schema.type === 'array') this.check(Array.isArray(value), at, 'K array shape has the wrong type');
        if (Array.isArray(value)) { if (schema.items) value.forEach((item, index) => this.shape(item, schema.items, `${at}[${index}]`)); return; }
        if (typeof value === 'object') {
            if (!schema.properties) { this.gap(at, 'Object has no frozen K schema shape'); return; }
            for (const key of Object.keys(value)) if (!Object.hasOwn(schema.properties, key)) this.gap(at + '.' + key, 'Unknown K response field');
            for (const key of schema.required ?? []) this.check(Object.hasOwn(value, key), at + '.' + key, 'Required K response field missing');
            for (const [key, child] of Object.entries(value)) if (schema.properties[key]) this.shape(child, schema.properties[key], at + '.' + key);
        }
    }
    setup() {
        const r = this.r, a = this.a;
        this.check(r.result === 'observed' && r.doubleZero === true && r.full107CatalogRestored === true, '$report', 'Actual run/cleanup/full catalog evidence incomplete');
        this.check(r.kind === 'K-real-HTTP-PG-storage-and-original-R4-producer', '$report.kind', 'Not an actual Root K report');
        for (const q of r.requests.filter(q => kRoute(q.route))) this.check(q.runtime === (r.backend === 'nest' ? 'originalNative' : 'actualRustRelease'), q.name + '.runtime', 'K route was not executed by the claimed actual backend');
        for (const frame of this.allFrames()) for (const [table, rows] of Object.entries(frame.facts)) {
            const columns = columnAuthority.get(table); if (!columns) { this.gap(frame.q.name + '.' + table, 'Unknown PG facts table'); continue; }
            for (const row of rows) for (const [key, value] of Object.entries(row)) {
                const column = columns.get(key); if (!column) this.gap(frame.q.name + '.' + table + '.' + key, 'Unknown PG column');
                else if (['timestamp', 'timestamptz'].includes(column.udt) && typeof value === 'string' && !JSON_TIMES.has(key) && instant(value) >= instant(r.at)) this.gap(frame.q.name + '.' + table + '.' + key, 'Datetime column has no declared clock policy');
            }
        }
        this.check(equal(r.fullCatalogBeforeObserver, r.fullCatalogAfterObserver), '$catalog', '107-table catalog differs after observer');
        this.check(r.cleanup?.length >= 2 && r.cleanup.at(-1).deleted === 0 && r.cleanup.at(-1).base?.matched === 0 && r.cleanup.at(-1).base?.changed === 0, '$cleanup', 'Second cleanup is not zero');
        if (!a) { this.gap('$ownership', 'Public ownership addendum is required'); return; }
        this.check(a.result === 'pass' && a.backend === r.backend && a.runId === r.runId && a.privateOrCredentialsCopied === false && a.dmlStatements === 0, '$ownership', 'Wrong public ownership evidence');
        this.check(a.sourceHead === r.sourceHead, '$ownership.source', 'Addendum and actual report source checkpoints differ');
        if (this.options.reportSha256) this.check(a.actual.rawBytesSha256 === this.options.reportSha256, '$ownership.actual', 'Public addendum is bound to different actual report bytes');
        else this.gap('$ownership.actual', 'Raw report-byte hash is required to bind the public addendum');
        this.check(a.registeredRowsStillZero.every(row => row.rows === 0), '$ownership.zero', 'Registered rows reappeared');
        if (r.referenceSafety) this.check(r.referenceSafety.result === 'pass' && r.referenceSafety.full107CatalogRestored === true && r.referenceSafety.ownedRowsUnchanged === true, '$referenceSafety', 'Actual reference-safety negatives were not restored');
        const committed = new Set(a.actualOriginalXidsStillCommitted.filter(row => row.status === 'committed').map(row => row.transaction));
        for (const borrowed of a.borrowedSeedReferences) {
            this.check(equal(borrowed.before, borrowed.after) && sha(JSON.stringify(borrowed.before)) === borrowed.beforeJsonSha256 && borrowed.beforeJsonSha256 === borrowed.afterJsonSha256 && borrowed.neverOwnedOrLogical === true, '$borrowed.' + borrowed.name, 'Readonly seed row changed or was owned');
            this.check(!a.logicalIds.includes(borrowed.id) && !a.objects.some(row => row.id === borrowed.id), '$borrowed.' + borrowed.name, 'Borrowed definition was added to ownership/logical IDs');
            for (const value of JSON.stringify(borrowed.before).match(UUID) ?? []) this.literalIds.add(lower(value));
        }
        for (const object of a.objects) this.objects.set(rowKey(object.table, object.id), object);
        for (const frame of this.allFrames()) for (const [table, rows] of Object.entries(frame.facts)) for (const row of rows) {
            this.check(this.objects.has(rowKey(table, row.id)), frame.q.name + '.' + table + '.' + row.id, 'Actual facts row is not registered owned data; readonly seeds are not product ownership');
            if (!this.firstRows.has(rowKey(table, row.id))) this.firstRows.set(rowKey(table, row.id), { row, ...frame });
        }
        this.bind(r.runId, 'run', 'Root run identity');
        const named = (object, prefix) => { for (const [key, value] of Object.entries(object ?? {})) if (isUuid(value)) this.bind(value, prefix + key, 'Root named fixture/binding'); };
        named(r.fixture, 'fixture.main.'); named(r.advanced?.bindings, 'binding.'); named(r.advanced?.freshFixture, 'fixture.fresh.');
        for (const [index, prepared] of [r.prepared, r.advanced?.freshPrepared].entries()) {
            if (!prepared) continue;
            this.check(prepared.receipt.commitAcknowledged === true && prepared.plan.unmappedOriginalSeedUuids.length === 0, '$recipe.' + index, 'Prepared source receipt incomplete');
            for (const mapping of prepared.plan.allowedMappings) this.bind(mapping.to, `recipe.${index}.${mapping.name}`, 'Explicit original-source mapping');
        }
        // Register K sessions before producer-only sessions, since Native shares one.
        const sessions = r.requests.filter(q => kRoute(q.route)).flatMap(q => [q.sessionBefore, q.sessionAfter]).filter(Boolean);
        for (const session of sessions) { const actor = this.ids.get(lower(session.user_id)); if (!actor) this.gap('$session', 'Unknown session actor'); else this.bind(session.id, 'auth.' + actor, 'Actual K session observation for owned actor'); }
        for (const q of r.requests.filter(q => q.name.startsWith('r4.'))) for (const session of [q.sessionBefore, q.sessionAfter].filter(Boolean)) this.bind(session.id, 'producer-auth.' + this.ids.get(lower(session.user_id)), 'Separate original Native producer session');
        for (const [index, plan] of a.preparedPlans.entries()) {
            this.check(plan.beforeAbsent === true && plan.state === 'promoted' && committed.has(plan.transaction) && String(BigInt(plan.transaction) % 4294967296n) === plan.expectedXmin, '$prepared.' + index, 'Prepared transaction was not proven committed');
            for (const row of plan.captured) this.births.set(rowKey(row.table, row.id), { kind: 'setup', label: 'setup.prepared.' + index, bounds: plan.setupWindow, identity: row.identity });
        }
        for (const item of a.directCreates) {
            this.check(item.beforeAbsent === true && item.state === 'promoted' && committed.has(item.transaction) && String(BigInt(item.transaction) % 4294967296n) === item.expectedXmin, '$direct.' + item.id, 'Direct setup INSERT not proven committed');
            const first = this.firstRows.get(rowKey(item.table, item.id));
            if (first) this.births.set(rowKey(item.table, item.id), { kind: 'setup', label: 'setup.direct.' + item.table + '.' + first.q.name, bounds: { lower: first.index ? r.requests[first.index - 1].finishedAt : r.at, upper: first.q.startedAt }, identity: item.identity });
        }
        for (const item of a.committedCreates) {
            const p = item.proof, q = r.requests[p.createContext?.index];
            if (!q || q.name !== p.createContext.caseId) continue; // Explicit instrumentation-only cases are outside K HTTP.
            this.check(p.createContext.runId === r.runId, '$proof.' + item.id, 'Wrong create context');
            if (p.kind === 'pg-after-insert-observed-outer-commit') {
                const authority = a.pgObserverAuthorities.find(row => row.observerId === p.observerId);
                this.check(authority && p.marker === MARKER && p.database === 'poms_r2k_' + r.backend && p.sourceAuthority === authority.sourceAuthority && p.functionOid === authority.functionOid && p.outerStatus === 'committed' && p.eventXminStatus === 'committed' && p.visibleFromIndependentOwnerConnection === true, '$proof.' + item.id, 'PG outer-commit certificate invalid');
                this.check(q.pgProofs.some(proof => proof.table === item.table && proof.id === item.id && equal(proof.proof, p)), '$proof.' + item.id, 'Per-case PG certificate missing');
            } else this.check(p.kind === 'mikro-orm-afterCreate-outer-commit' && p.sdkVersion === '7.0.11' && p.createEventSeq < p.outerCommitEventSeq && p.releases.every(seq => seq > p.createEventSeq && seq < p.outerCommitEventSeq) && q.runtime === 'originalNative', '$proof.' + item.id, 'SDK outer-commit certificate invalid');
            this.check(!q.before[item.table]?.some(row => row.id === item.id) && q.after[item.table]?.some(row => row.id === item.id), '$proof.' + item.id, 'Certificate does not match a real newly inserted after row');
            this.births.set(rowKey(item.table, item.id), { kind: 'runtime', label: caseName(r, q.name), bounds: { lower: q.startedAt, upper: q.finishedAt }, q, index: p.createContext.index, proof: p });
        }
        for (const [index, q] of r.requests.entries()) for (const item of q.pgProofs) {
            const p = item.proof, authority = a.pgObserverAuthorities.find(row => row.observerId === p.observerId);
            this.check(p.kind === 'pg-after-insert-observed-outer-commit' && authority && p.sourceAuthority === authority.sourceAuthority && p.functionOid === authority.functionOid && p.marker === MARKER && p.database === 'poms_r2k_' + r.backend && p.outerStatus === 'committed' && p.eventXminStatus === 'committed' && p.visibleFromIndependentOwnerConnection === true && p.createContext.runId === r.runId && p.createContext.caseId === q.name && p.createContext.index === index, '$pgProof.' + item.id, 'Per-case independent PG certificate/source/context invalid');
            this.check(a.committedCreates.some(row => row.table === item.table && row.id === item.id) && q.after[item.table]?.some(row => row.id === item.id) && !q.before[item.table]?.some(row => row.id === item.id), '$pgProof.' + item.id, 'PG certificate is not the actual committed new row');
        }
        const needed = [...this.objects.values()].filter(object => this.firstRows.has(rowKey(object.table, object.id)));
        for (let pass = 0; pass < 8; pass++) for (const object of needed) {
            if (this.ids.has(lower(object.id))) continue;
            const first = this.firstRows.get(rowKey(object.table, object.id)), row = first.row, birth = this.births.get(rowKey(object.table, object.id));
            const id = value => value == null ? 'null' : this.ids.get(lower(value));
            let natural;
            switch (object.table) {
                case 'attachment_upload_session': if (birth && id(row.created_by)) natural = [birth.label, row.operation_type, id(row.created_by), this.text(row.original_name, 'original_name')]; break;
                case 'attachment': if (birth && id(row.uploaded_by)) natural = [birth.label, row.version_no, id(row.uploaded_by)]; break;
                case 'attachment_link': if (id(row.attachment_id) && id(row.target_id)) natural = [id(row.attachment_id), row.target_type, id(row.target_id), row.relation_type]; break;
                case 'project_handover_attachment_selection': if (id(row.handover_id) && id(row.version_group_id)) natural = [id(row.handover_id), id(row.version_group_id)]; break;
                case 'attachment_download_package': if (birth && id(row.handover_id) && id(row.created_by)) natural = [birth.label, id(row.handover_id), id(row.created_by)]; break;
                case 'attachment_download_package_item': if (id(row.package_id) && id(row.attachment_id)) natural = [id(row.package_id), id(row.attachment_id), row.status]; break;
                case 'audit_log': if (birth && id(row.target_id)) natural = [birth.label, row.event_type, id(row.target_id), id(row.operator_id)]; break;
                case 'project_receipt_judgment_freeze': if (birth && id(row.project_id) && id(row.source_id)) natural = [birth.label, id(row.project_id), row.source_type, id(row.source_id)]; break;
            }
            if (natural && !natural.includes(undefined)) this.bind(object.id, object.table + ':' + sha(JSON.stringify(natural)).slice(0, 20), { kind: 'committed-row-natural-identity', natural, create: birth?.label });
        }
        for (const object of needed) {
            this.check(this.births.has(rowKey(object.table, object.id)), '$birth.' + object.table + '.' + object.id, 'No actual setup/runtime birth proof');
            if (!this.ids.has(lower(object.id))) this.gap('$alias.' + object.table, 'No unambiguous registered natural identity for ' + object.id);
            const identityRows = object.identities ?? [object.identity];
            for (const frame of this.allFrames()) for (const row of frame.facts[object.table] ?? []) if (row.id === object.id) this.check(identityRows.some(identity => Object.entries(identity).every(([key, value]) => equal(row[key] ?? null, value))), '$identity.' + object.id, 'Actual PG row does not match its registered identity');
        }
        this.prepareTimes(); this.validateProducer(); this.validateWireAndSessions(); this.validateFiles();
    }
    timeKey(table, row, field, value) { return `${rowKey(table, row.id)}|${field}|${instant(value)}`; }
    prepareTimes() {
        for (const frame of this.allFrames()) {
            const q = frame.q, bounds = { lower: q.startedAt, upper: q.finishedAt };
            if (frame.phase === 'after') for (const [table, rows] of Object.entries(frame.facts)) for (const row of rows) {
                const old = q.before[table]?.find(old => old.id === row.id); if (!old) continue;
                if (old.created_at != null) this.check(instant(old.created_at) === instant(row.created_at), `${q.name}.${table}.created_at`, 'Created timestamp changed during an API call');
                if (typeof old.row_version === 'number') {
                    const delta = row.row_version - old.row_version;
                    this.check(Number.isInteger(delta) && delta >= 0, `${q.name}.${table}.row_version`, 'Version decreased');
                    if (delta > 0 && row.updated_at != null) this.check(inWindow(row.updated_at, bounds), `${q.name}.${table}.updated_at`, 'Advanced version lacks a fresh per-call updated_at');
                    const changes = Object.keys(row).filter(key => !['id', 'created_at', 'updated_at', 'row_version'].includes(key) && !equal(row[key], old[key]));
                    if (changes.length) this.check(delta > 0, `${q.name}.${table}.row_version`, 'Business fields changed without version advancement');
                }
            }
            for (const [table, rows] of Object.entries(frame.facts)) for (const row of rows) {
                const key = rowKey(table, row.id), previous = this.latestRows.get(key), birth = this.births.get(key), alias = this.ids.get(lower(row.id));
                for (const [field, value] of Object.entries(row)) {
                    if (!JSON_TIMES.has(field) || value == null || typeof value !== 'string') continue;
                    const tkey = this.timeKey(table, row, field, value); if (this.tokens.has(tkey)) continue;
                    if (table === 'attachment_download_package' && field === 'expires_at' && !value.startsWith('2020-')) {
                        this.check(instant(value) - instant(row.created_at) === 86400000000000n, `${q.name}.${key}.expires_at`, 'Package TTL is not exactly 24 hours');
                        this.tokens.set(tkey, `$clock:${alias}.created_at+24h`); continue;
                    }
                    if (table === 'attachment_upload_session' && field === 'expires_at') {
                        this.check(instant(value) - instant(row.created_at) === 3600000000000n, `${q.name}.${key}.expires_at`, 'Upload-session TTL changed');
                        this.tokens.set(tkey, `$clock:${alias}.created_at+1h`); continue;
                    }
                    let origin;
                    if (birth && inWindow(value, birth.bounds)) origin = birth.label;
                    else if (frame.phase === 'after' && inWindow(value, bounds)) origin = caseName(this.r, q.name);
                    else if (frame.phase === 'before' && inWindow(value, { lower: frame.index ? this.r.requests[frame.index - 1].finishedAt : this.r.at, upper: q.startedAt })) origin = 'fixture-before.' + caseName(this.r, q.name);
                    if (!origin && table === 'attachment') {
                        const session = [...this.latestRows.values()].find(s => s._table === 'attachment_upload_session' && s.storage_key === row.storage_key && s.provider_type === row.storage_provider && (s.storage_bucket ?? null) === (row.storage_bucket ?? null));
                        if (session && session.uploaded_at && instant(session.uploaded_at) === instant(value)) origin = this.tokens.get(this.timeKey('attachment_upload_session', session, 'uploaded_at', session.uploaded_at));
                    }
                    if (!origin && table === 'attachment_link') {
                        const attachment = this.latestRows.get(rowKey('attachment', row.attachment_id));
                        if (attachment?.uploaded_at && instant(attachment.uploaded_at) === instant(value)) origin = this.tokens.get(this.timeKey('attachment', attachment, 'uploaded_at', attachment.uploaded_at));
                    }
                    if (origin) this.tokens.set(tkey, origin.startsWith('$clock:') ? origin : `$clock:${alias}.${field}@${origin}`);
                    else if (instant(value) < instant(this.r.at)) this.tokens.set(tkey, value); // Exact historical/business literal stays visible.
                    else { this.gap(`${q.name}.${key}.${field}`, 'Timestamp has no bounded birth/change/inheritance evidence'); this.tokens.set(tkey, value); }
                    if (previous && field === 'created_at' && previous.created_at && instant(previous.created_at) !== instant(value)) this.check(false, `${q.name}.${key}.created_at`, 'Immutable created_at changed between observations');
                }
                this.latestRows.set(key, { ...row, _table: table });
            }
        }
    }
    time(table, row, field, value) { if (value == null) return value; const token = this.tokens.get(this.timeKey(table, row, field, value)); if (token === undefined) { this.gap(table + '.' + field, 'Unregistered time origin'); return value; } return token; }
    facts(facts) {
        return Object.fromEntries(Object.entries(facts).map(([table, rows]) => [table, rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, JSON_TIMES.has(key) && typeof value === 'string' && value != null ? this.time(table, row, key, value) : this.any(value, key, table + '.' + key)]))).sort((a, b) => String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0)]));
    }
    validateProducer() {
        for (const q of this.r.requests.filter(q => q.name.startsWith('r4.'))) this.check(q.runtime === 'originalNative', q.name, 'R4 observation is not an original Native producer');
        const detail = this.r.requests.find(q => q.name === 'r4.detail'), confirm = this.r.requests.find(q => q.name === 'r4.confirm');
        if (!detail || !confirm) { this.gap('$producer', 'R4 producer pair missing'); return; }
        const d = detail.response.body, handover = detail.after.project_handover.find(row => row.id === d.handoverId), snapshot = detail.after.approval_summary_snapshot.find(row => row.id === d.summarySnapshotId);
        this.check(handover && snapshot && handover.project_id === d.projectId && handover.status === d.handoverStatus && handover.row_version === d.rowVersion && snapshot.target_id === handover.id && snapshot.projection_level === d.projectionLevel && snapshot.export_policy === d.exportPolicy, 'r4.detail', 'Native detail does not match its actual handover/snapshot');
        const participants = detail.after.confirmation_participant.filter(row => row.confirmation_record_id === d.participantConfirmationSummary.confirmationRecordId), wire = d.participantConfirmationSummary.participants;
        const progress = d.participantConfirmationSummary, record = detail.after.confirmation_record.find(row => row.id === progress.confirmationRecordId);
        this.check(record && record.target_id === handover.id && record.status === progress.status && record.row_version === progress.rowVersion && progress.requiredCount === participants.length && progress.confirmedCount === participants.filter(row => row.participant_status === 'confirmed').length && progress.pendingCount === participants.filter(row => row.participant_status === 'pending').length && progress.closedCount === participants.filter(row => row.participant_status === 'closed').length, 'r4.detail.progress', 'Native confirmation progress does not match its real record/participants');
        this.check(inWindow(d.generatedAt, { lower: detail.startedAt, upper: detail.finishedAt }) && new Date(Date.parse(d.generatedAt)).toISOString() === d.generatedAt, 'r4.detail.generatedAt', 'Native detail generation time is not canonical/bounded');
        this.check(wire.length === participants.length, 'r4.detail.participants', 'Participant count differs from PG');
        const ordered = wire.map(item => participants.find(row => row.participant_id === item.participantId && row.participant_role_key === item.participantRoleKey));
        this.check(ordered.every(Boolean), 'r4.detail.participants', 'Unknown participant in detail');
        if (ordered.every(Boolean)) {
            wire.forEach((item, index) => { const row = ordered[index]; this.check(item.participantDisplayName === row.participant_display_name && item.participantStatus === row.participant_status && item.confirmedComment === row.confirmed_comment && (item.confirmedAt == null ? row.confirmed_at == null : item.confirmedAt === new Date(Date.parse(row.confirmed_at)).toISOString()), 'r4.detail.participant.' + index, 'Native participant fields differ from the actual PG row'); });
            for (let index = 1; index < ordered.length; index++) this.check(instant(ordered[index - 1].created_at) <= instant(ordered[index].created_at), 'r4.detail.participants', 'created_at-only order violated');
            if (ordered.length > 1 && ordered.every(row => instant(row.created_at) === instant(ordered[0].created_at))) this.classifications.push({ kind: 'accepted-db-specific-difference', scope: 'original-Native-only R4 detail', reason: 'Participant order has an exact same created_at bucket; no Rust R4 equality is claimed', createdAt: ordered[0].created_at, ids: ordered.map(row => row.id) });
        }
        const c = confirm.response.body, h = confirm.after.project_handover.find(row => row.id === c.targetId), frozen = confirm.after.project_receipt_judgment_freeze.find(row => row.id === c.receiptJudgmentFreezeId);
        this.check(h && frozen && h.status === 'confirmed' && c.businessStatusAfter === h.status && c.summarySnapshotId === h.summary_snapshot_id && c.contractSummarySnapshotId === h.contract_summary_snapshot_id && c.effectiveHandoverBaselineSnapshotId === h.effective_handover_baseline_snapshot_id && frozen.source_id === h.id && frozen.project_id === h.project_id && frozen.source_handover_summary_snapshot_id === h.summary_snapshot_id && frozen.is_current === true, 'r4.confirm', 'Native confirm/freeze chain does not match committed PG');
        this.check(confirm.after.confirmation_record.some(row => row.id === c.confirmationRecordId && row.target_id === h.id && row.status === 'confirmed') && frozen.source_type === 'project-handover' && frozen.source_handover_id === h.id && inWindow(h.confirmed_at, { lower: confirm.startedAt, upper: confirm.finishedAt }) && inWindow(frozen.frozen_at, { lower: confirm.startedAt, upper: confirm.finishedAt }), 'r4.confirm.linkage', 'Native confirmation/freeze/clock linkage incomplete');
    }
    validateWireAndSessions() {
        const sessions = new Map(); this.sessionPreconditions = new Map(); this.sessionBases = new Map(); this.sessionFirstCases = new Map(); this.sessionBirthAnchors = new Map();
        for (const [index, q] of this.r.requests.entries()) {
            const response = q.response, at = q.name;
            if (typeof response.rawJsonText === 'string' && q.method !== 'HEAD') {
                const bytes = Buffer.from(response.rawJsonText);
                this.check(bytes.length === response.bodyBytesLength && sha(bytes) === response.bodyRawBytesSha256 && equal(JSON.parse(response.rawJsonText), response.body), at + '.rawJson', 'Raw JSON/hash/body is inconsistent');
                this.check(response.contentLength === null || Number(response.contentLength) === bytes.length, at + '.contentLength', 'Content-Length does not describe actual raw JSON');
                if (kRoute(q.route) && response.status === 200) this.check(response.rawJsonText === JSON.stringify(response.body), at + '.compactJSON', 'K response is not exact Node compact JSON.stringify');
                if (response.binaryHeaders.etag !== null) this.check(response.binaryHeaders.etag === weakEtag(bytes), at + '.etag', 'Weak ETag does not hash actual raw bytes');
            }
            if (q.method === 'HEAD') this.check(response.bodyBytesLength === 0, at + '.HEAD', 'HEAD emitted bytes');
            if (q.method === 'HEAD') this.check(response.bodyRawBytesSha256 === sha(Buffer.alloc(0)), at + '.HEAD.hash', 'HEAD raw digest is not the actual empty body');
            if (downloadRoute(q.route)) {
                const rawId = decodeURIComponent(q.route.split('/')[3]), old = q.before.attachment_download_package.find(row => lower(row.id) === lower(rawId)), current = q.after.attachment_download_package.find(row => lower(row.id) === lower(rawId));
                const newAudits = q.after.audit_log.filter(row => !q.before.audit_log.some(old => old.id === row.id));
                if (response.status === 200 && old && current) {
                    this.check(current.download_count === old.download_count + 1 && current.row_version === old.row_version + 1 && inWindow(current.downloaded_at, { lower: q.startedAt, upper: q.finishedAt }), at + '.download.effect', 'Successful GET/HEAD lacks its exact counter/version/date effect');
                    this.check(newAudits.some(row => row.event_type === 'attachment.batch_package_downloaded' && lower(row.target_id) === lower(old.id) && row.result === 'success' && row.metadata.downloadCount === current.download_count), at + '.download.audit', 'Successful GET/HEAD audit does not match actual counter');
                    this.check(response.contentType === 'application/zip' && response.binaryHeaders['cache-control'] === 'private, no-store' && response.binaryHeaders['content-disposition'] === `attachment; filename*=UTF-8''${encodeURIComponent(old.file_name ?? old.id + '.zip')}` && response.binaryHeaders['accept-ranges'] === null && response.binaryHeaders['content-range'] === null && response.binaryHeaders.etag === null, at + '.download.headers', 'Success binary headers differ from original StreamableFile');
                } else if (response.status === 409 && old && current) {
                    if (old.status === 'ready' && Date.parse(old.expires_at) <= Date.parse(q.startedAt)) this.check(current.status === 'expired' && current.row_version === old.row_version + 1 && current.download_count === old.download_count && newAudits.some(row => row.event_type === 'attachment.batch_package_expired' && row.result === 'rejected'), at + '.expiry.effect', 'Lazy expiry/audit/counter transition is incomplete');
                    else this.check(equal(old, current) && !newAudits.length, at + '.not-ready.effect', 'Terminal/not-ready download unexpectedly mutated package/audit');
                }
            }
            const before = q.sessionBefore, after = q.sessionAfter;
            if (before === null || after === null) { this.check(before === after, at + '.session', 'Session observation disappeared'); continue; }
            this.check(!('token_hash' in before) && !('csrf_token_hash' in before), at + '.session', 'Session hash leakage');
            const immutable = ['id', 'status', 'user_id', 'created_at', 'created_ip', 'created_user_agent', 'absolute_expires_at', 'revoked_at', 'revoked_reason'];
            for (const field of immutable) this.check(equal(before[field], after[field]), at + '.session.' + field, 'Immutable session state changed');
            const delta = after.row_version - before.row_version;
            this.check([0, 1, 2].includes(delta), at + '.session.version', 'Unexpected guard/coflush version delta');
            if (delta === 0) this.check(equal(before, after), at + '.session', 'Session changed without version');
            else {
                this.check(inWindow(after.last_seen_at, { lower: q.startedAt, upper: q.finishedAt }) && inWindow(after.updated_at, { lower: q.startedAt, upper: q.finishedAt }), at + '.session.clock', 'Session touch not inside this case');
                this.check(instant(after.updated_at) >= instant(after.last_seen_at), at + '.session.clock', 'Managed auth update predates guard touch');
                const idle = instant(after.last_seen_at) + 900000000000n, absolute = instant(after.absolute_expires_at);
                this.check(instant(after.idle_expires_at) === (idle < absolute ? idle : absolute), at + '.session.idleTTL', 'Idle TTL is not the actual touch+15m cap');
            }
            const previous = sessions.get(before.id);
            let precondition = 'actual-login';
            if (previous) {
                for (const field of immutable) this.check(equal(previous[field], before[field]), at + '.session.history.' + field, 'Immutable session history changed');
                if (equal(previous, before)) precondition = 'continued';
                else {
                    precondition = 'explicit-root-session-due';
                    this.check(before.row_version === previous.row_version + 1 && instant(before.updated_at) - instant(before.last_seen_at) === 61000000000n && before.idle_expires_at === previous.idle_expires_at && before.last_ip === previous.last_ip && inWindow(before.updated_at, { lower: index ? this.r.requests[index - 1].finishedAt : this.r.at, upper: q.startedAt }), at + '.session.setup', 'Mutable pre-session changed without the exact Root session-due fixture shape');
                }
            } else {
                const window = { lower: index ? this.r.requests[index - 1].finishedAt : this.r.at, upper: q.startedAt };
                this.check(inWindow(before.created_at, window), at + '.session.birth', 'Session creation lacks its exact initial setup interval');
                this.check(before.row_version === 1 || before.row_version === 2 && instant(before.updated_at) - instant(before.last_seen_at) === 61000000000n && inWindow(before.updated_at, window), at + '.session.initial', 'Unexpected unobserved initial session version/state');
                // Original auth-session.service:62-76 takes its issued `now`
                // before repository.create; entity.ts:60 independently samples
                // onCreate. Thus absolute-created can legitimately be 8h-1ms.
                const issued = new Date(Date.parse(before.absolute_expires_at) - 28800000).toISOString();
                this.check(inWindow(issued, window) && instant(before.created_at) >= instant(issued), at + '.session.absoluteAnchor', 'Service-issued expiry anchor is not in the exact login/setup interval');
                if (before.row_version === 1) this.check(instant(before.last_seen_at) === instant(issued), at + '.session.issued', 'Initial last_seen and absolute expiry do not share original service now');
                this.sessionBirthAnchors.set(before.id, { issuedAt: issued, createdAt: before.created_at, bounds: window, authority: ['auth-session.service.ts:62-76', 'auth-session.entity.ts:60'], scope: 'Source-bounded creation precondition, not a new Auth API certification' });
            }
            this.sessionPreconditions.set(q.name, precondition);
            if (kRoute(q.route) && !this.sessionBases.has(before.id)) { this.sessionBases.set(before.id, before.row_version); this.sessionFirstCases.set(before.id, q.name); }
            sessions.set(before.id, after);
        }
    }
    body(q) {
        const body = q.response.body;
        if (!body || q.response.status !== 200) return this.any(body, '', q.name + '.body');
        if (q.response.contentType.includes('application/json')) this.shape(body, contract.components.schemas[q.route.includes('/attachment-checklist') ? 'ProjectHandoverAttachmentChecklistView' : 'AttachmentDownloadPackageSummary'], q.name + '.body');
        const output = this.any(body, '', q.name + '.body');
        if (body.generatedAt !== undefined) { this.check(inWindow(body.generatedAt, { lower: q.startedAt, upper: q.finishedAt }) && body.generatedAt === new Date(Date.parse(body.generatedAt)).toISOString(), q.name + '.generatedAt', 'View time outside this case or not canonical ISO'); output.generatedAt = '$clock:view@' + caseName(this.r, q.name); }
        if (Array.isArray(body.items)) output.items = body.items.map((item, index) => {
            const normalized = this.any(item, '', `${q.name}.items[${index}]`);
            if (item.selectionId) {
                const row = q.after.project_handover_attachment_selection.find(row => row.id === item.selectionId);
                this.check(row && row.row_version === item.rowVersion && new Date(Date.parse(row.updated_at)).toISOString() === item.updatedAt, `${q.name}.items[${index}]`, 'Selection version/canonical ISO timestamp does not match actual PG');
                if (row) {
                    for (const [wire, field] of [['attachmentId', 'attachment_id'], ['versionGroupId', 'version_group_id'], ['displayName', 'display_name'], ['securityLevel', 'security_level'], ['category', 'category'], ['status', 'status'], ['sourceRefs', 'source_refs']]) this.check(equal(item[wire], row[field] ?? null), `${q.name}.items[${index}].${wire}`, 'Selection wire differs from PG');
                    normalized.updatedAt = this.time('project_handover_attachment_selection', row, 'updated_at', row.updated_at);
                }
            } else this.check(item.rowVersion === null && item.updatedAt === null, q.name + '.candidate', 'Unpersisted candidate has a version');
            return normalized;
        });
        if (body.id && body.manifestSummary) {
            const row = q.after.attachment_download_package.find(row => row.id === body.id);
            this.check(!!row, q.name + '.package', 'Summary has no actual PG row');
            if (row) {
                for (const [wire, field] of [['handoverId', 'handover_id'], ['projectId', 'project_id'], ['status', 'status'], ['manifestSummary', 'manifest_summary'], ['fileName', 'file_name'], ['downloadCount', 'download_count'], ['failedReason', 'failed_reason']]) this.check(equal(body[wire], row[field] ?? null), q.name + '.package.' + wire, 'Package wire differs from PG');
                for (const [wire, field] of [['createdAt', 'created_at'], ['expiresAt', 'expires_at'], ['downloadedAt', 'downloaded_at']]) {
                    this.check(body[wire] === null ? row[field] === null : body[wire] === new Date(Date.parse(row[field])).toISOString(), q.name + '.package.' + wire, 'Wire time is not the actual PG canonical ISO millisecond value');
                    output[wire] = this.time('attachment_download_package', row, field, row[field]);
                }
                const items = q.after.attachment_download_package_item.filter(item => item.package_id === row.id), included = items.filter(item => item.status === 'included'), excluded = items.filter(item => item.status === 'excluded');
                this.check(included.length === body.manifestSummary.includedCount && excluded.length === body.manifestSummary.excludedCount, q.name + '.package.items', 'Manifest counts disagree with actual items');
                included.sort((a, b) => Number(a.file_name.match(/^\d+/)?.[0]) - Number(b.file_name.match(/^\d+/)?.[0]));
                this.check(equal(included.map(item => item.attachment_id), body.manifestSummary.includedAttachmentIds), q.name + '.package.items', 'Manifest included array changed its real archive-entry order');
            }
        }
        return output;
    }
    session(q) {
        const before = q.sessionBefore, after = q.sessionAfter; if (!before) return null;
        const baseline = this.sessionBases.get(before.id);
        return { id: this.text(before.id), userId: this.text(before.user_id), status: before.status, lastIpBefore: before.last_ip, lastIpAfter: after.last_ip, createdIp: before.created_ip, createdUserAgent: this.text(before.created_user_agent), revokedAt: before.revoked_at, revokedReason: before.revoked_reason, versionDelta: after.row_version - before.row_version, relativeVersionBefore: before.row_version - baseline, relativeVersionAfter: after.row_version - baseline, precondition: this.sessionFirstCases.get(before.id) === q.name ? 'first-K-context-after-independently-validated-setup' : this.sessionPreconditions.get(q.name), changedFields: Object.keys(before).filter(key => !equal(before[key], after[key])).sort(), absoluteServiceTimeoutPolicyMillis: 28800000 };
    }
    file(reference) {
        if (!this.options.projectRoot) { this.gap('$files', 'Project root required for actual preserved artifact bytes'); return null; }
        const file = path.resolve(this.options.projectRoot, reference), root = path.resolve(this.options.projectRoot) + path.sep;
        const task = path.resolve(this.options.projectRoot, 'tmp/rust-r2k') + path.sep;
        if (!this.check(file.startsWith(root) && file.startsWith(task) && reference.startsWith('tmp/rust-r2k/'), '$files.' + reference, 'Artifact escapes the retained new task')) return null;
        try { const stat = fs.lstatSync(file), realTask = fs.realpathSync(path.resolve(this.options.projectRoot, 'tmp/rust-r2k')) + path.sep;
            if (!this.check(stat.isFile() && !stat.isSymbolicLink() && realTask.startsWith(fs.realpathSync(this.options.projectRoot) + path.sep) && fs.realpathSync(file).startsWith(realTask), '$files.' + reference, 'Artifact is not a regular file inside the retained task')) return null;
            return fs.readFileSync(file); }
        catch { this.gap('$files.' + reference, 'Preserved actual artifact unavailable'); return null; }
    }
    validateFiles() {
        for (const file of this.r.files.filter(file => file.existed)) {
            const bytes = this.file(file.snapshot); if (!bytes) continue;
            this.check(bytes.length === file.bytes && sha(bytes) === file.rawBytesSha256, '$files.' + file.snapshot, 'Actual snapshot byte/hash mismatch');
            const attachment = this.r.finalFactsBeforeCleanup.attachment.find(row => row.storage_key === file.key);
            if (attachment) this.check(sha(bytes) === attachment.checksum_sha256 && bytes.length === attachment.size_bytes, '$files.' + attachment.id, 'Snapshot disagrees with actual PG attachment checksum/size');
        }
        const download = this.file(this.r.download.file); if (download) this.check(download.length === this.r.download.bytes && sha(download) === this.r.download.rawBytesSha256, '$download', 'Recorded ZIP byte/hash mismatch');
        for (const q of this.r.requests.filter(q => downloadRoute(q.route) && q.method === 'GET' && q.response.status === 200)) {
            const reference = q.name === 'k.package.download' ? this.r.download : q.name === 'advanced.version.unicode-download' ? this.r.advanced.versionArchive : null;
            if (!reference) { this.gap(q.name + '.artifact', 'No named actual binary artifact binding'); continue; }
            const bytes = this.file(reference.file); if (bytes) this.check(sha(bytes) === reference.rawBytesSha256 && sha(bytes) === q.response.bodyRawBytesSha256 && bytes.length === q.response.bodyBytesLength, q.name + '.artifact', 'Actual response bytes/hash do not equal its named retained ZIP artifact');
        }
    }
    projection(q) {
        const response = q.response, headers = copy(response.binaryHeaders);
        const guardBeforeController = downloadRoute(q.route) && response.status === 403 && response.body?.code === 'permission_denied' && headers['cache-control'] === null && q.pgProofs.length === 0;
        const binary = downloadRoute(q.route) && !guardBeforeController;
        if (guardBeforeController) this.classifications.push({ kind: 'existing-baseline-drift', authority: ['R2B2364', 'R2C2715'], path: q.name + '.etag', reason: 'Permission guard rejected before binary controller/header decorator; ordinary shared JSON validator policy, not a binary/HEAD exception' });
        if (!binary && headers.etag != null) { this.classifications.push({ kind: 'existing-baseline-drift', authority: ['R2B2364', 'R2C2715'], path: q.name + '.etag', reason: 'Shared ordinary JSON weak-ETag presence policy; raw validator independently verified' }); headers.etag = '$ordinary-json-validator'; }
        if (binary && headers.etag != null && q.method !== 'HEAD' && response.rawJsonText) headers.etag = '$binary-error-validator:' + weakEtag(Buffer.from(JSON.stringify(this.any(response.body, '', q.name + '.etagBody'))));
        if (binary && headers.etag != null && q.method === 'HEAD') {
            const pkg = q.before.attachment_download_package.find(row => q.route.includes(row.id));
            const template = this.r.requests.find(row => downloadRoute(row.route) && row.method === 'GET' && row.response.status === 409 && row.response.rawJsonText);
            if (pkg?.status !== 'ready' && response.status === 409 && template) {
                const id = decodeURIComponent(q.route.split('/')[3]), error = Object.fromEntries(Object.entries(template.response.body).map(([key, value]) => [key, key === 'message' ? `Attachment download package ${id} is not ready` : value]));
                const raw = Buffer.from(JSON.stringify(error)); this.check(Number(response.contentLength) === raw.length && headers.etag === weakEtag(raw), q.name + '.HEAD.error', 'HEAD error length/ETag fails source not-ready template and actual GET Conflict body layout');
                headers.etag = '$binary-error-validator:' + weakEtag(Buffer.from(JSON.stringify(this.any(error, '', q.name + '.HEAD.error'))));
            } else this.gap(q.name + '.HEAD.etag', 'No exact GET/source body witness for the HEAD validator');
        }
        if (headers['content-disposition']) headers['content-disposition'] = this.text(headers['content-disposition'], 'fileName', q.name);
        const output = { name: caseName(this.r, q.name), method: q.method, route: this.text(q.route, 'route', q.name), status: response.status, contentType: response.contentType, contentLength: response.contentLength, headers, body: response.contentType.includes('application/json') ? this.body(q) : { bytes: response.bodyBytesLength }, before: this.facts(q.before), after: this.facts(q.after), session: this.session(q) };
        // Binary archive semantic bytes require the separate strict ZIP evidence;
        // never normalize a raw digest into an invented equal value.
        if (binary && q.method === 'GET' && response.status === 200) this.gap(q.name + '.ZIP', 'ZIP entry/manifest structural comparison is delegated; this tool validates its preserved raw hash but does not certify archive equality');
        return output;
    }
}

function exactSelectionTieBuckets(nest, rust, n, r, np, rp, classifications) {
    // GET persisted checklist uses only updated_at DESC,created_at DESC. Refresh
    // uses the source candidate order, and every other product array stays raw.
    if (nest.method !== 'GET' || !/\/attachment-checklist\/?$/.test(nest.route) || !Array.isArray(nest.response.body?.items) || !Array.isArray(rust.response.body?.items)) return;
    const buckets = (request, evidence, output) => {
        const result = [];
        for (let index = 0; index < request.response.body.items.length; index++) {
            const item = request.response.body.items[index]; if (!item.selectionId) return null;
            const row = request.after.project_handover_attachment_selection.find(row => row.id === item.selectionId); if (!row) return null;
            const key = `${instant(row.updated_at)}:${instant(row.created_at)}`, id = evidence.ids.get(lower(row.id)); if (!id) return null;
            const last = result.at(-1); if (last?.key === key) last.values.push({ id, value: output.items[index] }); else result.push({ key, values: [{ id, value: output.items[index] }] });
        }
        return result;
    };
    const nb = buckets(nest, n, np.body), rb = buckets(rust, r, rp.body); if (!nb || !rb || nb.length !== rb.length) return;
    let offset = 0;
    for (let index = 0; index < nb.length; index++) {
        const left = nb[index], right = rb[index], ids = values => values.map(row => row.id).sort();
        if (left.values.length !== right.values.length || !equal(ids(left.values), ids(right.values))) return;
        if (left.values.length > 1 && !equal(left.values.map(row => row.id), right.values.map(row => row.id))) {
            classifications.push({ kind: 'accepted-db-specific-difference', path: nest.name + '.body.items', reason: 'Same registered members in an exact two-key timestamp tie bucket in each actual backend; only this bucket order is projected', nestExactKey: left.key, rustExactKey: right.key, registeredMembers: ids(left.values) });
            const order = values => values.toSorted((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(row => row.value);
            np.body.items.splice(offset, left.values.length, ...order(left.values)); rp.body.items.splice(offset, right.values.length, ...order(right.values));
        }
        offset += left.values.length;
    }
}

export function compareReports(nest, rust, options = {}) {
    assert.equal(nest.backend, 'nest'); assert.equal(rust.backend, 'rust'); assert.equal(nest.tag, rust.tag); assert.equal(nest.sourceHead, rust.sourceHead);
    if (!options.nestOwnership || !options.rustOwnership) return { formatVersion: 1, kind: 'strict-evidence-gated-K-HTTP-PG-comparison', result: 'uncertified', scope: 'No identity/time projection was attempted without both public ownership addenda', failures: [], cases: [], uncertified: [{ path: '$ownership', reason: 'Both exact run-bound public ownership addenda are required' }], syntheticOnly: false };
    const n = new Evidence(nest, options.nestOwnership, { projectRoot: options.nestProjectRoot, reportSha256: options.nestReportSha256 }), r = new Evidence(rust, options.rustOwnership, { projectRoot: options.rustProjectRoot, reportSha256: options.rustReportSha256 });
    n.setup(); r.setup();
    const nq = nest.requests.filter(q => kRoute(q.route)), rq = rust.requests.filter(q => kRoute(q.route));
    const cases = [], unmatched = [], pairClassifications = [];
    for (const q of nq) {
        const name = caseName(nest, q.name), other = rq.find(candidate => caseName(rust, candidate.name) === name);
        if (!other) { unmatched.push(name); continue; }
        const np = n.projection(q), rp = r.projection(other);
        exactSelectionTieBuckets(q, other, n, r, np, rp, pairClassifications);
        // Ordinary JSON ETag absence is the declared shared policy, never a
        // blanket binary/HEAD exception. Both present validators were checked.
        const ordinaryGuard = q.response.status === 403 && q.response.body?.code === 'permission_denied' && np.headers['cache-control'] === null && rp.headers['cache-control'] === null;
        if ((!downloadRoute(q.route) || ordinaryGuard) && (np.headers.etag === null || rp.headers.etag === null)) { np.headers.etag = null; rp.headers.etag = null; }
        const differences = diff(np, rp);
        cases.push({ name, result: differences.length ? 'observed-difference' : 'equal-projection', differences });
    }
    if (rq.length !== nq.length) unmatched.push('K operation count differs');
    const failures = [...n.failures.map(row => ({ backend: 'nest', ...row })), ...r.failures.map(row => ({ backend: 'rust', ...row }))], uncertified = [...n.uncertified.map(row => ({ backend: 'nest', ...row })), ...r.uncertified.map(row => ({ backend: 'rust', ...row }))];
    return { formatVersion: 1, kind: 'strict-evidence-gated-K-HTTP-PG-comparison', result: failures.length || cases.some(row => row.differences.length) || unmatched.length ? 'observed-difference' : uncertified.length ? 'uncertified' : 'pass', scope: 'Only K public routes compare; R4 detail/confirm are independently checked original Native producers, not Rust R4 delivery. PG facts sort only by evidence-registered aliases; product arrays preserve order except an explicitly evidenced exact matching selection timestamp tie bucket.', checks: { nest: n.checks, rust: r.checks }, coverage: { allRequests: [nest.requests.length, rust.requests.length], KRequests: [nq.length, rq.length], exactR4NativeProducerChecks: true, zipEqualityCertified: false }, unmatched, failures, uncertified, sessionCreationEvidence: { nest: [...n.sessionBirthAnchors.values()], rust: [...r.sessionBirthAnchors.values()] }, classifications: [...n.classifications, ...r.classifications, ...pairClassifications], aliases: { nest: n.aliasEvidence, rust: r.aliasEvidence }, cases, syntheticOnly: false };
}

function selfTest() {
    const e = new Evidence({ runId: 'a0000000-0000-4000-8000-000000000001', at: '2026-01-01T00:00:00.000Z', requests: [] }, null);
    const changed = (a, b) => assert(diff(e.any(a), e.any(b)).length > 0);
    changed({ rowVersion: 2 }, { rowVersion: 3 }); changed({ items: ['a', 'b'] }, { items: ['b', 'a'] });
    changed({ manifest: { includedAttachmentIds: ['a', 'b'] } }, { manifest: { includedAttachmentIds: ['b', 'a'] } });
    changed({ sourceRefs: [{ sourceId: 'a' }, { sourceId: 'b' }] }, { sourceRefs: [{ sourceId: 'b' }, { sourceId: 'a' }] });
    assert(!inWindow('2020-01-01T00:00:00.000Z', { lower: '2026-01-01T00:00:00.000Z', upper: '2026-01-01T00:00:01.000Z' }));
    assert.throws(() => instant('invalid'));
    e.any({ id: 'b0000000-0000-4000-8000-000000000001' }); assert(e.uncertified.length > 0);
    const id = 'a0000000-0000-4000-8000-000000000002', before = { id, row_version: 2, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' };
    e.r.requests = [{ name: 'synthetic.old-updated-at', startedAt: '2026-01-01T00:00:10.000Z', finishedAt: '2026-01-01T00:00:11.000Z', before: { project_handover_attachment_selection: [before] }, after: { project_handover_attachment_selection: [{ ...before, row_version: 3 }] } }];
    e.bind(id, 'synthetic.row', 'synthetic-only'); e.births.set(rowKey('project_handover_attachment_selection', id), { label: 'synthetic-setup', bounds: { lower: e.r.at, upper: '2026-01-01T00:00:01.000Z' } }); e.prepareTimes();
    assert(e.failures.some(row => row.reason.includes('fresh per-call updated_at')));
    return { kind: 'synthetic-only-comparator-counterexamples', result: 'pass', cases: 8, PGOrHTTPExecuted: false, actualEvidenceCertified: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    if (process.argv.includes('--self-test')) console.log(JSON.stringify(selfTest()));
    else {
        const files = process.argv.slice(2); assert(files.length === 2 || files.length === 4, 'Usage: node k-http-diff.mjs nest-report rust-report [nest-public-ownership rust-public-ownership]');
        const read = file => { const bytes = fs.readFileSync(file); return { value: JSON.parse(bytes), proof: { file, bytes: bytes.length, sha256: sha(bytes) } }; };
        const n = read(files[0]), r = read(files[1]); const nfile = files[2] ?? files[0].replace(/\.json$/, '-ownership-addendum.json'), rfile = files[3] ?? files[1].replace(/\.json$/, '-ownership-addendum.json');
        const na = fs.existsSync(nfile) ? read(nfile) : null, ra = fs.existsSync(rfile) ? read(rfile) : null;
        try {
            const result = compareReports(n.value, r.value, { nestOwnership: na?.value, rustOwnership: ra?.value, nestProjectRoot: path.resolve(path.dirname(files[0]), '../..'), rustProjectRoot: path.resolve(path.dirname(files[1]), '../..'), nestReportSha256: n.proof.sha256, rustReportSha256: r.proof.sha256 });
            console.log(JSON.stringify({ ...result, inputs: [n.proof, r.proof, na?.proof, ra?.proof].filter(Boolean), comparatorSourceSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))) }, null, 2));
            if (result.result !== 'pass') process.exitCode = 1;
        } catch (error) { console.log(JSON.stringify({ kind: 'strict-K-comparator-tool-failure', result: 'tool-failed', failure: { name: error.name, message: error.message }, inputs: [n.proof, r.proof, na?.proof, ra?.proof].filter(Boolean) }, null, 2)); process.exitCode = 2; }
    }
}
