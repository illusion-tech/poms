// Observation only. No SQL, entity mutation, flush, clear or transaction call.
// Event arguments/order follow the locked MikroORM 7.0.11 SDK, not inferred
// EntityManager nesting. Root alone decides ownership/adoption from proofs.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const tables = new Set(["acceptance_record","accounting_tax_treatment_snapshot","approval_record","approval_summary_field_projection","approval_summary_package_definition","approval_summary_snapshot","attachment","attachment_download_package","attachment_download_package_item","attachment_link","attachment_storage_provider_config","attachment_upload_session","audit_log","auth_session","business_discussion_comment","business_discussion_thread","business_number_sequence","change_package_baseline","commercial_baseline_diff_item","commercial_baseline_diff_result","commercial_baseline_review_record","commercial_release_baseline","commission_adjustment","commission_calculation","commission_departure_exception_decision","commission_final_settlement_snapshot","commission_freeze_change_request","commission_freeze_dispute_record","commission_gate_review_record","commission_payout","commission_role_assignment","commission_rule_explanation_snapshot","commission_rule_version","competitor_intelligence_record","confirmation_participant","confirmation_record","contract","contract_amendment","contract_handover_rebaseline_record","contract_readiness_package","contract_readiness_package_item","contract_term_snapshot","cost_stage_attribution_snapshot","customer","customer_alias","customer_contact","data_maturity_evaluation_result","dictionary_item","expense_record","external_department_mapping","external_identity","external_login_ticket","external_org_source","handover_baseline_impact_item","identity_provider_config","identity_provider_oauth_grant","internal_cost_rate_version","invoice_record","lead","lead_owner_assignment_record","lead_score_override","lead_score_snapshot","local_credential","operating_baseline_package","operating_restatement_record","operating_signal_evaluation_result","operating_signal_gate_binding","operating_signal_review_record","opportunity_stakeholder","org_sync_diff_item","org_sync_run","org_unit","payable_record","payment_record","period_closing_snapshot","platform_user","poms_migrations","project","project_actual_cost_record","project_archive_record","project_bid_commercial_material_item","project_bid_commercial_process","project_bid_commercial_timeline_item","project_completion_record","project_handover","project_handover_attachment_selection","project_operating_snapshot","project_owner_reassignment_record","project_pricing_margin_condition_item","project_pricing_margin_review","project_receipt_judgment_freeze","project_technical_cost_item","project_technical_cost_package","project_technical_risk_item","project_technical_scope_item","receipt_record","role","role_permission_assignment","sales_discovery_record","sales_follow_up_record","security_event","shared_cost_allocation_basis","shared_cost_allocation_result","system_setting","todo_item","user_org_membership","user_role_assignment"]);
const isObject = (value) => value !== null && (typeof value === 'object' || typeof value === 'function');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function sdkSourceReport() {
    const core = dirname(require.resolve('@mikro-orm/core'));
    const pgRequire = createRequire(require.resolve('@mikro-orm/postgresql'));
    const sql = dirname(pgRequire.resolve('@mikro-orm/sql'));
    const packageFiles = [
        ['@mikro-orm/core', join(core, 'package.json')],
        ['@mikro-orm/sql', join(sql, 'package.json')]
    ];
    const packages = packageFiles.map(([name, file]) => ({ name, version: JSON.parse(readFileSync(file, 'utf8')).version }));
    if (packages.some((item) => item.version !== '7.0.11')) throw new Error('Write witness requires the locked MikroORM 7.0.11 SDK');
    const paths = [
        ['@mikro-orm/core/events/EventSubscriber.d.ts', join(core, 'events/EventSubscriber.d.ts')],
        ['@mikro-orm/core/events/TransactionEventBroadcaster.js', join(core, 'events/TransactionEventBroadcaster.js')],
        ['@mikro-orm/core/events/TransactionEventBroadcaster.d.ts', join(core, 'events/TransactionEventBroadcaster.d.ts')],
        ['@mikro-orm/core/events/EventManager.js', join(core, 'events/EventManager.js')],
        ['@mikro-orm/core/unit-of-work/UnitOfWork.js', join(core, 'unit-of-work/UnitOfWork.js')],
        ['@mikro-orm/core/unit-of-work/ChangeSet.js', join(core, 'unit-of-work/ChangeSet.js')],
        ['@mikro-orm/core/utils/TransactionManager.js', join(core, 'utils/TransactionManager.js')],
        ['@mikro-orm/core/EntityManager.js', join(core, 'EntityManager.js')],
        ['@mikro-orm/sql/AbstractSqlConnection.js', join(sql, 'AbstractSqlConnection.js')]
    ];
    return {
        packages,
        files: paths.map(([file, absolutePath]) => {
            const bytes = readFileSync(absolutePath);
            return { file, absolutePath, rawBytesSha256: sha(bytes), lfSha256: sha(bytes.toString('utf8').replaceAll('\r\n', '\n')) };
        }),
        limits: [
            'Only original UoW afterCreate plus observed transaction lifecycle is certified.',
            'Raw SQL, nativeInsert/upsert, unobserved transactions and nontransactional writes are not ownership proofs.',
            'A savepoint release is not an outer commit; rolled-back frames never publish their pending creates.',
            'Root must correlate committed IDs with prior fixture intent and logical identity; this tool never adopts rows.'
        ]
    };
}

export function createNativeWriteWitness({ onCommitted, context = () => ({}), maxEvents = 20000 } = {}) {
    if (typeof onCommitted !== 'function') throw new TypeError('Root onCommitted journal callback is required');
    if (!Number.isInteger(maxEvents) || maxEvents < 32 || maxEvents > 100000) throw new TypeError('Write witness event bound rejected');
    const byTransaction = new WeakMap();
    const pendingStarts = new Map();
    const emIds = new WeakMap();
    const frames = new Map();
    const events = [], diagnostics = [], committed = [], deliveries = new Set();
    let sequence = 0, nextFrame = 0, nextEm = 0, overflow = false;

    function problem(code, details = {}) {
        if (diagnostics.length < 1000) diagnostics.push({ code, ...details });
    }
    function emRef(em) {
        if (!isObject(em)) throw new Error('Transaction event has no EntityManager');
        if (!emIds.has(em)) emIds.set(em, `em${++nextEm}`);
        return emIds.get(em);
    }
    function currentContext() {
        const value = context();
        if (!value || typeof value !== 'object' || typeof value.then === 'function') throw new Error('Witness context must be synchronous metadata');
        const result = {};
        for (const key of ['runId', 'caseId', 'index', 'op']) {
            if (Object.hasOwn(value, key)) result[key] = value[key];
        }
        return JSON.parse(JSON.stringify(result));
    }
    function record(event, args, extra = {}) {
        const seq = ++sequence;
        if (events.length < maxEvents) events.push({ seq, event, em: emRef(args.em), ...extra });
        else if (!overflow) { overflow = true; problem('event-bound-exceeded'); }
        return seq;
    }
    function lookup(transaction, event) {
        const frame = isObject(transaction) ? byTransaction.get(transaction) : undefined;
        if (!frame) problem('unobserved-transaction', { event });
        return frame;
    }
    function beforeStart(args) {
        const parent = args.transaction === undefined ? null : lookup(args.transaction, 'beforeTransactionStart');
        const start = {
            seq: record('beforeTransactionStart', args, { parent: parent?.id ?? null }),
            parent, valid: args.transaction === undefined || !!parent
        };
        if (parent && !['active', 'committing'].includes(parent.phase)) {
            start.valid = false; problem('nested-start-under-closed-parent', { parent: parent.id });
        }
        const queue = pendingStarts.get(args.em) ?? [];
        queue.push(start); pendingStarts.set(args.em, queue);
    }
    function afterStart(args) {
        const queue = pendingStarts.get(args.em);
        const start = queue?.shift();
        if (queue?.length === 0) pendingStarts.delete(args.em);
        if (!isObject(args.transaction)) { problem('after-start-without-transaction'); return; }
        if (byTransaction.has(args.transaction)) { problem('transaction-object-reused'); return; }
        const savepoint = 'savepointName' in args.transaction;
        const savepointName = savepoint ? args.transaction.savepointName : null;
        let valid = !!start?.valid;
        if (!start) problem('after-start-without-before-start');
        if (savepoint !== !!start?.parent || (savepoint && !/^trx[1-9][0-9]*$/.test(savepointName))) {
            valid = false; problem('savepoint-parent-mismatch');
        }
        const frame = { id: `tx${++nextFrame}`, parent: start?.parent ?? null, valid, phase: 'active', pending: [], children: new Set(), startSeq: start?.seq ?? null, savepointName };
        frame.afterStartSeq = record('afterTransactionStart', args, { transaction: frame.id, parent: frame.parent?.id ?? null, savepointName });
        byTransaction.set(args.transaction, frame); frames.set(frame.id, frame);
        frame.parent?.children.add(frame);
    }
    function afterCreate(args) {
        const meta = args.meta;
        if (!meta || meta.schema !== 'poms' || !tables.has(meta.tableName)) return;
        const seq = record('afterCreate', args, { table: meta.tableName });
        const transaction = args.em.getTransactionContext();
        const frame = lookup(transaction, 'afterCreate');
        if (!frame) { problem('create-without-observed-transaction', { table: meta.tableName, seq }); return; }
        if (!['active', 'committing'].includes(frame.phase)) { frame.valid = false; problem('create-in-closed-frame', { transaction: frame.id }); return; }
        if (!args.entity || typeof args.entity.id !== 'string' || !uuid.test(args.entity.id) ||
            meta.primaryKeys?.length !== 1 || meta.primaryKeys[0] !== 'id' || args.changeSet?.type !== 'create') {
            frame.valid = false; problem('after-create-identity-or-change-set-mismatch', { table: meta.tableName, seq }); return;
        }
        const row = {
            table: meta.tableName, id: args.entity.id.toLowerCase(),
            proof: { kind: 'mikro-orm-afterCreate-outer-commit', sdkVersion: '7.0.11', createEventSeq: seq,
                createTransaction: frame.id, createContext: currentContext(), releases: [] }
        };
        frame.pending.push(row);
    }
    function beforeEnd(event, args, phase) {
        const frame = lookup(args.transaction, event);
        const seq = record(event, args, { transaction: frame?.id ?? null });
        if (!frame) return;
        const allowed = phase === 'committing' ? ['active'] : ['active', 'committing', 'rolling-back'];
        if (!allowed.includes(frame.phase)) {
            frame.valid = false; problem('end-of-closed-frame', { event, transaction: frame.id });
        }
        frame.phase = phase;
        frame.beforeEndSeq = seq;
        frame.beforeEndEvent = event;
    }
    async function afterCommit(args) {
        const frame = lookup(args.transaction, 'afterTransactionCommit');
        const seq = record('afterTransactionCommit', args, { transaction: frame?.id ?? null });
        if (!frame) return;
        if (frame.beforeEndEvent !== 'beforeTransactionCommit' || frame.phase !== 'committing') {
            frame.valid = false; problem('commit-without-before-commit', { transaction: frame.id });
        }
        if ([...frame.children].some((child) => !['released', 'rolled-back'].includes(child.phase))) {
            frame.valid = false; problem('commit-with-unclosed-child', { transaction: frame.id });
        }
        if (frame.parent) {
            frame.phase = 'released';
            if (!frame.valid || !['active', 'committing'].includes(frame.parent.phase)) frame.parent.valid = false;
            for (const row of frame.pending) {
                row.proof.releases.push({ transaction: frame.id, savepointName: frame.savepointName, beforeEventSeq: frame.beforeEndSeq, afterEventSeq: seq });
                frame.parent.pending.push(row);
            }
            frame.pending = [];
            return;
        }
        frame.phase = 'committed';
        if (!frame.valid || overflow) { problem('uncertified-outer-commit', { transaction: frame.id, creates: frame.pending.length }); frame.pending = []; return; }
        const rows = frame.pending.map((row) => ({ ...row, proof: { ...row.proof,
            outerTransaction: frame.id, outerBeforeCommitEventSeq: frame.beforeEndSeq,
            outerCommitEventSeq: seq, commitContext: currentContext() } }));
        frame.pending = [];
        committed.push(...rows);
        if (rows.length) {
            const frozen = JSON.parse(JSON.stringify(rows));
            const delivery = Promise.resolve().then(() => onCommitted(frozen)).catch((error) => {
                problem('root-commit-journal-callback-failed', { transaction: frame.id, errorName: error?.name ?? 'Error' });
            });
            deliveries.add(delivery);
            try { await delivery; } finally { deliveries.delete(delivery); }
        }
    }
    function afterRollback(args) {
        const frame = lookup(args.transaction, 'afterTransactionRollback');
        record('afterTransactionRollback', args, { transaction: frame?.id ?? null });
        if (!frame) return;
        if (frame.beforeEndEvent !== 'beforeTransactionRollback' || frame.phase !== 'rolling-back') {
            frame.valid = false; problem('rollback-without-before-rollback', { transaction: frame.id });
        }
        const discard = (current) => {
            current.pending = []; current.phase = 'rolled-back';
            for (const child of current.children) if (child.phase !== 'committed') discard(child);
        };
        discard(frame);
    }
    // Observation failure must never throw into MikroORM or cause a different
    // commit/rollback path. Root checks assertComplete/drain after the operation.
    const guarded = (event, handler) => async (args) => {
        try { await handler(args); }
        catch (error) { problem('observer-failed', { event, errorName: error?.name ?? 'Error' }); }
    };
    const subscriber = {
        beforeTransactionStart: guarded('beforeTransactionStart', beforeStart),
        afterTransactionStart: guarded('afterTransactionStart', afterStart),
        afterCreate: guarded('afterCreate', afterCreate),
        beforeTransactionCommit: guarded('beforeTransactionCommit', (args) => beforeEnd('beforeTransactionCommit', args, 'committing')),
        afterTransactionCommit: guarded('afterTransactionCommit', afterCommit),
        beforeTransactionRollback: guarded('beforeTransactionRollback', (args) => beforeEnd('beforeTransactionRollback', args, 'rolling-back')),
        afterTransactionRollback: guarded('afterTransactionRollback', afterRollback)
    };
    function snapshot() {
        const open = [...frames.values()].filter((frame) => ['active', 'committing', 'rolling-back'].includes(frame.phase));
        return JSON.parse(JSON.stringify({
            kind: 'mikro-orm-L-original-create-outer-commit-witness',
            complete: diagnostics.length === 0 && open.length === 0 && pendingStarts.size === 0,
            diagnostics, events, committed,
            openTransactions: open.map((frame) => ({ transaction: frame.id, parent: frame.parent?.id ?? null, phase: frame.phase, pendingCreates: frame.pending.length })),
            pendingStartCount: [...pendingStarts.values()].reduce((sum, queue) => sum + queue.length, 0)
        }));
    }
    return {
        subscriber, snapshot, sourceReport: sdkSourceReport,
        configurationReport(orm) {
            return {
                implicitTransactions: orm.config.get('implicitTransactions'),
                subscriberRegistered: orm.em.getEventManager().getSubscribers().has(subscriber),
                globalTransactionActive: orm.em.isInTransaction()
            };
        },
        assertConfiguration(orm) {
            const result = this.configurationReport(orm);
            if (result.implicitTransactions !== true || !result.subscriberRegistered || result.globalTransactionActive) {
                const error = new Error('Native write witness configuration is not supported before case execution');
                error.witnessConfiguration = result;
                throw error;
            }
            return result;
        },
        async drain() { await Promise.all([...deliveries]); return snapshot(); },
        assertComplete() { const result = snapshot(); if (!result.complete) { const error = new Error('Native create/commit witness is incomplete'); error.witness = result; throw error; } return result; }
    };
}
