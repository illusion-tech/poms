// Shared, I/O-free JSONL protocol for the real Native/Rust service probes.
// This module performs admission/reference handling only. It is not a service,
// provider, ORM or database oracle and never substitutes product results.

export const PROTOCOL_VERSION = 1;
export const MAX_LINE_BYTES = 1024 * 1024;
export const MAX_STEPS = 128;

export const OPERATIONS = Object.freeze({
    'tx.begin': { native: true, description: 'Begin the case caller-owned outer transaction.' },
    'tx.commit': { native: true, description: 'Commit only the case caller-owned outer transaction.' },
    'tx.rollback': { native: true, description: 'Roll back only the case caller-owned outer transaction.' },
    'session.flush': { native: true, description: 'Flush this case EntityManager/common state.' },
    'session.clear': { native: true, description: 'Clear this case identity/managed state, not its connection or transaction.' },
    'managed.assign': { native: true, description: 'Probe-only assignment to an owned seven-table managed entity; no flush, no id/prototype/unknown/unmapped property.' },
    'summary.create': { native: true, description: 'Original createSummarySnapshot(input).' },
    'summary.definition.find': { native: true, description: 'Original findActiveByScenarioAndPackage(scenario,package).' },
    'summary.definition.create': { native: true, description: 'Original repository create(input), retaining a managed entity binding.' },
    'summary.definition.save': { native: true, description: 'Original repository save(entity), returns undefined.' },
    'summary.snapshot.findById': { native: true, description: 'Original snapshot repository findById(id).' },
    'summary.snapshot.findActiveByTarget': { native: true, description: 'Original snapshot repository findActiveByTarget(type,id,scenario,projection).' },
    'summary.snapshot.findByTarget': { native: true, description: 'Original snapshot repository findByTarget(type,id).' },
    'summary.snapshot.create': { native: true, description: 'Original repository create(input), retaining a managed entity binding.' },
    'summary.snapshot.save': { native: true, description: 'Original repository save(entity), returns undefined.' },
    'summary.projection.findBySnapshot': { native: true, description: 'Original projection repository findBySummarySnapshotId(id).' },
    'summary.projection.create': { native: true, description: 'Original repository create(input), retaining a managed entity binding.' },
    'summary.projection.saveAll': { native: true, description: 'Original repository saveAll(entities); empty array does not flush.' },
    'confirmation.create': { native: true, description: 'Original createConfirmationRecord(actorId,input).' },
    'confirmation.confirm': { native: true, description: 'Original confirmParticipant(id,actorId,input), omitted input becomes {}.' },
    'confirmation.close': { native: true, description: 'Original closeConfirmationRecord(id,actorId,input).' },
    'confirmation.progress': { native: true, description: 'Original findConfirmationProgressById(id).' },
    'confirmation.latest': { native: true, description: 'Original findLatestConfirmationProgressByTarget(type,id,optionalType).' },
    'approval.get': { native: true, description: 'Common ApprovalRecord ORM row only; no domain summary/enrichment claim.' },
    'approval.latest': { native: true, description: 'Common latest ApprovalRecord ORM row with original target/order clauses.' },
    'approval.openTodos': { native: true, description: 'Common open/processing Todo ORM rows with original assignee/order clauses; no domain enrichment.' },
    'approval.project': { native: true, description: 'Pure original common projection with explicit supplied facts.' },
    'todo.project': { native: true, description: 'Pure original common projection with explicit supplied facts.' },
    'approval.resolve': { native: 'unsupported-only', description: 'Paired Native only original unsupported combinations/validation negatives. Rust-only explicit owned-witness callback is separately labelled.' }
});

const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const binding = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const caseName = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/;
const allowedEnvelope = new Set(['version', 'runId', 'caseId', 'steps']);
const allowedStep = new Set(['op', 'input', 'as', 'onError']);

export class ProbeRejected extends Error {
    constructor(message) {
        super(message);
        this.name = 'ProbeRejected';
    }
}

function object(value, context) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new ProbeRejected(`${context} must be an object`);
    }
    return value;
}

function keysWithin(value, allowed, context) {
    for (const key of Object.keys(value)) {
        if (!allowed.has(key)) throw new ProbeRejected(`${context} has an unknown key`);
    }
}

function inspectTree(value, depth = 0, budget = { count: 0 }) {
    if (depth > 32 || ++budget.count > 20000) throw new ProbeRejected('Probe value exceeds bounded shape');
    if (value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        for (const item of value) inspectTree(item, depth + 1, budget);
        return;
    }
    const keys = Object.keys(value);
    if (keys.some((key) => forbidden.has(key))) throw new ProbeRejected('Probe value has a forbidden key');
    if (Object.hasOwn(value, '$ref')) {
        if (keys.length !== 1 || typeof value.$ref !== 'string') throw new ProbeRejected('Invalid reference marker');
        referenceParts(value.$ref);
        return;
    }
    if (Object.hasOwn(value, '$date')) {
        if (keys.length !== 1 || typeof value.$date !== 'string') throw new ProbeRejected('Invalid Date marker');
        return;
    }
    for (const child of Object.values(value)) inspectTree(child, depth + 1, budget);
}

function referenceParts(reference) {
    const parts = reference.split('.');
    if (!binding.test(parts[0]) || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part) || forbidden.has(part)) || parts.length > 16) {
        throw new ProbeRejected('Invalid reference path');
    }
    return parts;
}

export function parseCaseLine(line) {
    if (typeof line !== 'string' || Buffer.byteLength(line, 'utf8') > MAX_LINE_BYTES) {
        throw new ProbeRejected('Probe line exceeds bound');
    }
    let value;
    try {
        value = JSON.parse(line);
    } catch {
        throw new ProbeRejected('Probe line must be JSON');
    }
    object(value, 'Case');
    keysWithin(value, allowedEnvelope, 'Case');
    if (value.version !== PROTOCOL_VERSION || typeof value.runId !== 'string' || !uuid.test(value.runId) ||
        typeof value.caseId !== 'string' || !caseName.test(value.caseId)) {
        throw new ProbeRejected('Probe case identity/version rejected');
    }
    if (!Array.isArray(value.steps) || value.steps.length === 0 || value.steps.length > MAX_STEPS) {
        throw new ProbeRejected('Probe steps exceed bound');
    }
    const names = new Set();
    for (const step of value.steps) {
        object(step, 'Step');
        keysWithin(step, allowedStep, 'Step');
        if (typeof step.op !== 'string' || !Object.hasOwn(OPERATIONS, step.op)) throw new ProbeRejected('Unknown probe operation');
        if (Object.hasOwn(step, 'as')) {
            if (typeof step.as !== 'string' || !binding.test(step.as) || forbidden.has(step.as) || names.has(step.as)) {
                throw new ProbeRejected('Probe binding rejected or repeated');
            }
            names.add(step.as);
        }
        if (Object.hasOwn(step, 'onError') && step.onError !== 'stop' && step.onError !== 'continue') {
            throw new ProbeRejected('Probe onError rejected');
        }
        inspectTree(step.input);
    }
    return value;
}

/// Resolve immediately before a step. A top-level $ref returns the actual
/// previously bound entity object, preserving Native identity and later flush
/// hydration. Never clone or JSON-roundtrip a live EntityManager binding.
export function resolveInput(value, bindings, dateFactory = (iso) => new Date(iso)) {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((item) => resolveInput(item, bindings, dateFactory));
    if (Object.hasOwn(value, '$ref')) {
        const [name, ...parts] = referenceParts(value.$ref);
        if (!bindings.has(name)) throw new ProbeRejected('Probe reference is not yet bound');
        let resolved = bindings.get(name);
        for (const part of parts) {
            if (resolved === null || (typeof resolved !== 'object' && typeof resolved !== 'function') || !Object.hasOwn(resolved, part)) {
                throw new ProbeRejected('Probe reference property is absent');
            }
            resolved = resolved[part];
        }
        return resolved;
    }
    if (Object.hasOwn(value, '$date')) return dateFactory(value.$date);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveInput(item, bindings, dateFactory)]));
}

/// Freeze the observation now, while leaving any `as` binding live. Undefined
/// is explicit; null is a defined result. JSON preserves raw JS code units.
export function resultObservation(value) {
    return value === undefined ? { defined: false } : { defined: true, value: JSON.parse(JSON.stringify(value)) };
}

export function isOriginallyUnsupported(approvalType, targetObjectType) {
    return !((approvalType === 'contract-review' && targetObjectType === 'contract') ||
        (approvalType === 'commission-payout-approval' && targetObjectType === 'commission-payout') ||
        (approvalType === 'commission-adjustment-approval' && targetObjectType === 'commission-adjustment'));
}

export function admitPairedApproval(callback, record) {
    if (callback?.kind !== 'unsupported' || (record !== null && !isOriginallyUnsupported(record.approvalType, record.targetObjectType))) {
        throw new ProbeRejected('Paired approval requires an original unsupported combination');
    }
}

export function errorObservation(error) {
    const status = typeof error?.getStatus === 'function' ? error.getStatus() : null;
    const sqlstate = typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : undefined;
    return {
        kind: status === null ? (sqlstate ? 'database' : 'error') : 'http',
        status,
        message: error instanceof Error ? error.message : String(error),
        ...(sqlstate ? { sqlstate } : {})
    };
}
