// Mechanical real-service adapter. Root owns connection admission, fixtures,
// execution, query capture and cleanup. Importing this file evaluates neither
// original product modules nor ORM; ORM initialization is explicit.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import {
    PROTOCOL_VERSION, ProbeRejected, admitPairedApproval, errorObservation,
    parseCaseLine, resolveInput, resultObservation
} from './l-protocol.mjs';

const require = createRequire(import.meta.url);
const { createNativeLoader } = require('./l-native-loader.cjs');
const allowedTables = new Set([
    'approval_record', 'todo_item', 'confirmation_record', 'confirmation_participant',
    'approval_summary_package_definition', 'approval_summary_snapshot', 'approval_summary_field_projection'
]);

function admitConnection(connection) {
    if (!connection || connection.host !== '127.0.0.1' || Number(connection.port) !== 17432 ||
        (connection.dbName ?? connection.database) !== 'poms_r2l1_nest' || connection.user !== 'poms_r2l1_app' ||
        (connection.schema ?? 'poms') !== 'poms' || typeof connection.password !== 'string' || !connection.password ||
        Object.hasOwn(connection, 'clientUrl') || Object.hasOwn(connection, 'connectionString') ||
        (connection.dbName && connection.database && connection.dbName !== connection.database)) {
        throw new ProbeRejected('Native adapter requires the already-admitted new L1 Nest connection');
    }
}

export async function createNativeAdapter({
    connection, orm: suppliedOrm, root,
    guardCase, guardInput, guardManagedEntity, approvalIdentity,
    onStepStart, onStepEnd, onCaseEnd, onLoaded,
    poolMax = 4, subscribers = []
}) {
    admitConnection(connection);
    if (typeof guardCase !== 'function' || typeof guardInput !== 'function') throw new ProbeRejected('Root fixture guards are required');
    if (!Number.isInteger(poolMax) || poolMax < 1 || poolMax > 8) throw new ProbeRejected('Native adapter pool bound rejected');
    if (!Array.isArray(subscribers)) throw new ProbeRejected('Root subscribers must be an array');
    const loader = createNativeLoader({ root });
    let orm;
    try {
        const source = loader.load();
        const { MikroORM } = require('@mikro-orm/postgresql');
        const { EntityRepository, QueryOrder, RequestContext, wrap } = require('@mikro-orm/core');
        const schemas = [
            source.ApprovalRecordSchema, source.TodoItemSchema,
            source.ConfirmationRecordSchema, source.ConfirmationParticipantSchema,
            source.ApprovalSummaryPackageDefinitionSchema, source.ApprovalSummarySnapshotSchema,
            source.ApprovalSummaryFieldProjectionSchema
        ];
        if (schemas.some((schema) => !schema)) throw new Error('An original seven-table Schema export is missing');
        orm = suppliedOrm ?? await MikroORM.init({
            host: connection.host, port: Number(connection.port),
            dbName: connection.dbName ?? connection.database, user: connection.user, password: connection.password,
            schema: 'poms', entities: schemas, ensureDatabase: false,
            allowGlobalContext: false, debug: false, pool: { min: 0, max: poolMax }, subscribers
        });
        if (suppliedOrm) for (const subscriber of subscribers) orm.em.getEventManager().registerSubscriber(subscriber);
        const metadata = [...orm.getMetadata().getAll().values()];
        if (metadata.length !== 7 || metadata.some((meta) => meta.schema !== 'poms' || !allowedTables.has(meta.tableName))) {
            throw new Error('Native adapter metadata is not exactly the seven original common tables');
        }
        const metadataReport = () => metadata.map((meta) => ({
            className: meta.className, schema: meta.schema, tableName: meta.tableName,
            properties: Object.values(meta.properties).map((property) => ({
                name: property.name, fieldNames: property.fieldNames, kind: property.kind,
                type: property.type, columnTypes: property.columnTypes,
                primary: property.primary ?? false, nullable: property.nullable ?? false,
                mapToPk: property.mapToPk ?? false, version: property.version ?? false,
                default: property.default, defaultRaw: property.defaultRaw
            }))
        }));
        await onLoaded?.({ source: loader.report(), metadata: metadataReport(), orm });

        async function runCase(lineOrObject) {
            const request = parseCaseLine(typeof lineOrObject === 'string' ? lineOrObject : JSON.stringify(lineOrObject));
            const caseContext = await guardCase(request);
            if (caseContext === false) throw new ProbeRejected('Root case admission rejected');
            const report = { version: PROTOCOL_VERSION, runId: request.runId, caseId: request.caseId, execution: 'observed', steps: [] };
            try {
                return await RequestContext.create(orm.em, async () => {
                const em = RequestContext.getEntityManager();
                if (!em) throw new Error('Native case RequestContext was not created');
                const bindings = new Map();
                let tracked = new WeakSet();
                const loadedApprovals = new Map();
                let outerActive = false;
                let infrastructureFailure;
                const repository = (entity) => new EntityRepository(em, entity);
                const definitionRepository = new source.ApprovalSummaryPackageDefinitionRepository(repository(source.ApprovalSummaryPackageDefinition));
                const snapshotRepository = new source.ApprovalSummarySnapshotRepository(repository(source.ApprovalSummarySnapshot));
                const projectionRepository = new source.ApprovalSummaryFieldProjectionRepository(repository(source.ApprovalSummaryFieldProjection));
                const summary = new source.ApprovalSummaryService(definitionRepository, snapshotRepository, projectionRepository);
                const confirmation = new source.ConfirmationService(repository(source.ConfirmationRecord), repository(source.ConfirmationParticipant), repository(source.TodoItem));
                // These are genuine original EntityRepository instances. The
                // six domain repositories are never queried by the admitted
                // unsupported/validation-only path; no domain metadata or
                // handwritten stand-in is registered.
                const approval = new source.ApprovalService(
                    repository(source.ApprovalRecord), repository(source.TodoItem), repository(source.Contract),
                    repository(source.CommissionPayout), repository(source.CommissionAdjustment), repository(source.Project),
                    repository(source.Lead), repository(source.Customer)
                );
                function track(value, seen = new WeakSet()) {
                    if (value === null || typeof value !== 'object' || seen.has(value)) return;
                    seen.add(value);
                    const meta = orm.getMetadata().find(value.constructor);
                    if (meta && allowedTables.has(meta.tableName)) {
                        tracked.add(value);
                        if (meta.tableName === 'approval_record' && value.id !== undefined) loadedApprovals.set(String(value.id), value);
                        return;
                    }
                    for (const child of Object.values(value)) track(child, seen);
                }
                async function assign(input, context) {
                    const { entity, changes } = input;
                    const meta = entity && typeof entity === 'object' ? orm.getMetadata().find(entity.constructor) : undefined;
                    if (!meta || !allowedTables.has(meta.tableName) || !tracked.has(entity) || !wrap(entity, true).__em ||
                        changes === null || typeof changes !== 'object' || Array.isArray(changes)) {
                        throw new ProbeRejected('managed.assign requires a currently tracked common entity');
                    }
                    if (typeof guardManagedEntity !== 'function') throw new ProbeRejected('Root managed-entity ownership guard is required');
                    if (await guardManagedEntity({ ...context, input, entity, metadata: meta }) === false) {
                        throw new ProbeRejected('Root managed-entity ownership admission rejected');
                    }
                    for (const key of Object.keys(changes)) {
                        const property = Object.hasOwn(meta.properties, key) ? meta.properties[key] : undefined;
                        if (!property || property.primary || key === 'id' || ['__proto__', 'constructor', 'prototype'].includes(key) ||
                            property.persist === false || (property.kind !== 'scalar' && !property.mapToPk)) {
                            throw new ProbeRejected('managed.assign rejects identity, unknown or unmapped properties');
                        }
                    }
                    Object.assign(entity, changes);
                    return entity;
                }
                async function dispatch(op, input, context) {
                    switch (op) {
                        case 'tx.begin':
                            if (outerActive || em.isInTransaction()) throw new ProbeRejected('Case outer transaction is already active');
                            await em.begin(); outerActive = true; return undefined;
                        case 'tx.commit':
                            if (!outerActive) throw new ProbeRejected('Case outer transaction is absent');
                            await em.commit(); outerActive = false; return undefined;
                        case 'tx.rollback':
                            if (!outerActive) throw new ProbeRejected('Case outer transaction is absent');
                            await em.rollback(); outerActive = false; return undefined;
                        case 'session.flush': return em.flush();
                        case 'session.clear': em.clear(); tracked = new WeakSet(); return undefined;
                        case 'managed.assign': return assign(input, context);
                        case 'summary.create': return summary.createSummarySnapshot(input);
                        case 'summary.definition.find': return definitionRepository.findActiveByScenarioAndPackage(input.approvalScenarioKey, input.summaryPackageKey);
                        case 'summary.definition.create': return definitionRepository.create(input);
                        case 'summary.definition.save': return definitionRepository.save(input.entity);
                        case 'summary.snapshot.findById': return snapshotRepository.findById(input.id);
                        case 'summary.snapshot.findActiveByTarget': return snapshotRepository.findActiveByTarget(input.targetType, input.targetId, input.approvalScenarioKey, input.projectionLevel);
                        case 'summary.snapshot.findByTarget': return snapshotRepository.findByTarget(input.targetType, input.targetId);
                        case 'summary.snapshot.create': return snapshotRepository.create(input);
                        case 'summary.snapshot.save': return snapshotRepository.save(input.entity);
                        case 'summary.projection.findBySnapshot': return projectionRepository.findBySummarySnapshotId(input.id);
                        case 'summary.projection.create': return projectionRepository.create(input);
                        case 'summary.projection.saveAll': return projectionRepository.saveAll(input.entities);
                        case 'confirmation.create': return confirmation.createConfirmationRecord(input.actorId, input.input);
                        case 'confirmation.confirm': return confirmation.confirmParticipant(input.id, input.actorId, input.input);
                        case 'confirmation.close': return confirmation.closeConfirmationRecord(input.id, input.actorId, input.input);
                        case 'confirmation.progress': return confirmation.findConfirmationProgressById(input.id);
                        case 'confirmation.latest': return confirmation.findLatestConfirmationProgressByTarget(input.targetType, input.targetId, input.confirmationType);
                        case 'approval.get': {
                            const row = await em.findOne(source.ApprovalRecord, { id: input.id });
                            loadedApprovals.set(String(input.id), row); return row;
                        }
                        case 'approval.latest': return em.findOne(source.ApprovalRecord,
                            { targetObjectType: input.targetType, targetObjectId: input.targetId },
                            { orderBy: { submittedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } });
                        case 'approval.openTodos': return em.find(source.TodoItem,
                            { assigneeUserId: input.actorId, status: { $in: ['open', 'processing'] } },
                            { orderBy: { createdAt: QueryOrder.ASC } });
                        case 'approval.project': {
                            const facts = input.facts ?? {};
                            return source.__l1ProbeMappings.mapApprovalRecordToSummary(input.record, facts.contract ?? null, facts.payout ?? null, facts.adjustment ?? null);
                        }
                        case 'todo.project': {
                            const facts = input.facts ?? {};
                            return source.__l1ProbeMappings.mapTodoItemToSummary(input.todo, input.record,
                                facts.contract, facts.payout, facts.adjustment,
                                facts.projectName === undefined ? undefined : { projectName: facts.projectName },
                                facts.leadName === undefined ? undefined : { leadName: facts.leadName },
                                facts.customerDisplayName === undefined ? undefined : { displayName: facts.customerDisplayName });
                        }
                        case 'approval.resolve': {
                            const identity = loadedApprovals.has(String(input.id)) ? loadedApprovals.get(String(input.id)) :
                                typeof approvalIdentity === 'function' ? await approvalIdentity({ ...context, id: input.id }) : undefined;
                            if (identity === undefined) throw new ProbeRejected('Approval identity must come from Root fixture or a previously loaded row');
                            admitPairedApproval(input.callback, identity);
                            if (input.decision === 'approved') return approval.approveRecord(input.id, input.actorId, input.input);
                            if (input.decision === 'rejected') return approval.rejectRecord(input.id, input.actorId, input.input);
                            throw new ProbeRejected('Approval probe decision rejected');
                        }
                        default: throw new ProbeRejected('Unknown probe operation');
                    }
                }
                try {
                    for (const [index, step] of request.steps.entries()) {
                        const context = { request, step, index, caseContext, em, bindings };
                        await onStepStart?.(context);
                        const input = resolveInput(step.input, bindings);
                        if (await guardInput({ ...context, input }) === false) throw new ProbeRejected('Root input admission rejected');
                        let observation, value, productError, failed = false;
                        try {
                            value = await dispatch(step.op, input, context);
                        } catch (error) {
                            // This setter and its guards are probe machinery,
                            // never an original service/product exception.
                            if (step.op === 'managed.assign' || error instanceof ProbeRejected) throw error;
                            failed = true;
                            productError = error;
                            observation = { index, op: step.op, ok: false, error: errorObservation(error) };
                        }
                        if (!failed) {
                            track(value);
                            observation = { index, op: step.op, ok: true, ...resultObservation(value) };
                            if (Object.hasOwn(step, 'as')) bindings.set(step.as, value);
                        }
                        report.steps.push(observation);
                        await onStepEnd?.({ ...context, input, value, error: productError, observation });
                        if (!observation.ok && step.onError !== 'continue') break;
                    }
                } catch (error) {
                    infrastructureFailure = error;
                    report.execution = error instanceof ProbeRejected ? 'probe-rejected' : 'probe-failed';
                    report.probeError = { name: error.name, message: error.message };
                } finally {
                    try {
                        if (outerActive && em.isInTransaction()) {
                            await em.rollback();
                            report.finallyRolledBackCallerTransaction = true;
                        }
                    } catch (error) {
                        report.execution = 'probe-failed';
                        report.cleanupError = { name: error.name, message: error.message };
                    }
                    await onCaseEnd?.({ request, caseContext, em, report, infrastructureFailure });
                }
                return report;
                });
            } catch (error) {
                if (error !== null && typeof error === 'object') error.nativeAdapterObservation = report;
                throw error;
            }
        }
        return {
            runCase,
            sourceReport: () => loader.report(),
            metadataReport,
            close: async () => {
                let restored;
                try { if (!suppliedOrm) await orm.close(true); }
                finally { restored = loader.restore(); }
                return restored;
            }
        };
    } catch (error) {
        if (error !== null && typeof error === 'object') error.nativeAdapterSource = loader.report();
        try { if (orm && !suppliedOrm) await orm.close(true); }
        finally { loader.restore(); }
        throw error;
    }
}

export function compileOnlyCheck({ root } = {}) {
    const loader = createNativeLoader({ root });
    return { kind: 'native-adapter-pure-compile-check', originalModulesEvaluated: false, ormInitialized: false, pgConnected: false, files: loader.compilePlan() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv.includes('--check')) {
    const result = compileOnlyCheck();
    process.stdout.write(`${JSON.stringify({ kind: result.kind, result: 'Pass', files: result.files.length, originalModulesEvaluated: false, ormInitialized: false, pgConnected: false })}\n`);
}
