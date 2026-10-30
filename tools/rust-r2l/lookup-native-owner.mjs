// Root-only runtime entry. Importing this file starts nothing and reads no env.
// One original application/binary per process; each run owns loopback 9700.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { AsyncLocalStorage } from 'node:async_hooks';
import { LOOKUP_BINARIES } from './lookup-source-equivalence.mjs';
import { identities, rowIdentity, sameIdentity } from './fixture-core.mjs';
const sha = (value) => createHash('sha256').update(value).digest('hex');
let started = false;
export function lookupNativeEnvironment(backend, { managed, regularPrivate, privateRoot, filesystem = fs }) {
    assert(['nest', 'rust'].includes(backend));
    const original = managed(backend).childEnv;
    if (backend === 'nest') return { env: original, proof: { backend, port: 9700, derived: false } };
    assert.equal(backend, 'rust');
    // The explicit dotenv file wins over process.env. Derive only a new
    // task-private Native port file; retain the real Rust runtime file intact.
    const source = privateRoot + '/rust.env', raw = regularPrivate(source);
    assert.equal((raw.match(/^PORT=/gm) ?? []).length, 1, 'Exactly one original PORT line required');
    assert.equal((raw.match(/^PORT=9701$/gm) ?? []).length, 1);
    const derived = raw.replace(/^PORT=9701$/m, 'PORT=9700'), file = privateRoot + '/native-rust-port9700.env';
    if (filesystem.existsSync(file)) assert(regularPrivate(file) === derived, 'Existing Native-only environment differs from the one-line port derivation');
    else filesystem.writeFileSync(file, derived, { flag: 'wx', mode: 0o600 });
    assert(regularPrivate(file) === derived, 'Derived Native-only environment failed exact byte verification');
    assert(regularPrivate(source) === raw, 'Original Rust environment changed during the Native-only port derivation');
    return { env: { ...original, PORT: '9700', POMS_ENV_FILE: file }, proof: { backend, port: 9700, derived: true, sourceFile: source, sourceSha256: sha(raw), derivedFile: file, derivedSha256: sha(derived), onlyPortLineChanged: true, sourceUnchanged: true, contentsExported: false } };
}
export async function startLookupNative({ variant, backend, tag, contexts, onCommitted }) {
    assert(!started, 'Legacy/current must run in separate Node processes'); started = true;
    assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert(['legacy', 'current'].includes(variant));
    assert(['nest', 'rust'].includes(backend)); assert(/^[a-z0-9-]{1,30}$/.test(tag));
    assert.equal(sha(fs.readFileSync(process.execPath)), 'bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12');
    const require = createRequire(import.meta.url), { managed, regularPrivate, privateRoot } = await import('./database-client.mjs');
    const { createNativeWriteWitness } = await import('./k-native-write-witness.mjs');
    const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
    const { installQueryCapture } = require('./l-query-witness.cjs');
    const { NestFactory, ModulesContainer } = require('@nestjs/core');
    const { MikroORM } = require('@mikro-orm/core');
    const binary = path.resolve(variant === 'legacy' ? 'dist/reference-s2/apps/poms-api/main.js' : 'dist/apps/poms-api/main.js');
    const bytes = fs.readFileSync(binary); assert.equal(sha(bytes), LOOKUP_BINARIES[variant]);
    const storage = new AsyncLocalStorage(), sql = [], witness = createNativeWriteWitness({ onCommitted, context: () => storage.getStore() ?? {} });
    const capture = installQueryCapture(Client, { shouldCapture: () => storage.getStore() !== undefined, append: (entry) => sql.push({ ...entry, context: storage.getStore() ?? null }) });
    const oldCreate = NestFactory.create, oldEnvironment = { ...process.env };
    let app, orm, closed = false, resolveReady, rejectReady;
    const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    const timeout = setTimeout(() => rejectReady(new Error('Original lookup Native listen deadline')), 90000); timeout.unref();
    NestFactory.create = async function (...args) {
        app = await oldCreate.apply(this, args); orm = app.get(MikroORM);
        orm.em.getEventManager().registerSubscriber(witness.subscriber); witness.assertConfiguration(orm);
        app.use((request, _response, next) => { const context = contexts.get(request.headers['x-correlation-id']); if (context) storage.run(context, next); else next(); });
        app.getHttpServer().once('listening', resolveReady).once('error', rejectReady); return app;
    };
    const close = async () => {
        if (closed) return; closed = true;
        try { if (app) await app.close(); await witness.drain(); }
        finally { capture.uninstall(); NestFactory.create = oldCreate; clearTimeout(timeout); for (const key of Object.keys(process.env)) if (!Object.hasOwn(oldEnvironment, key)) delete process.env[key]; Object.assign(process.env, oldEnvironment); }
    };
    try {
        const environment = lookupNativeEnvironment(backend, { managed, regularPrivate, privateRoot });
        Object.assign(process.env, environment.env);
        await import(pathToFileURL(binary).href); await ready; clearTimeout(timeout); NestFactory.create = oldCreate;
        assert.equal(app.getHttpServer().address().port, 9700);
        const metadata = [...orm.getMetadata().getAll().values()].map((meta) => ({
            className: meta.className, tableName: meta.tableName, schema: meta.schema ?? orm.config.get('schema'),
            properties: Object.values(meta.properties).map((property) => ({ name: property.name, fieldNames: property.fieldNames, nullable: property.nullable,
                columnTypes: property.columnTypes, type: property.type, runtimeType: property.runtimeType, default: property.default, defaultRaw: property.defaultRaw,
                version: property.version, customTypeClass: property.customType?.constructor?.name,
                onCreateSourceSha256: typeof property.onCreate === 'function' ? sha(property.onCreate.toString()) : null,
                onUpdateSourceSha256: typeof property.onUpdate === 'function' ? sha(property.onUpdate.toString()) : null }))
        }));
        const modules = [...app.get(ModulesContainer).values()];
        const routes = modules.flatMap((module) => [...module.controllers.values()].flatMap((wrapper) => {
            const controller = wrapper.metatype; if (!controller || !/^(?:Project|Contract)(?:Lookup)?Controller$/.test(controller.name)) return [];
            return Object.getOwnPropertyNames(controller.prototype).filter((key) => key !== 'constructor' && typeof controller.prototype[key] === 'function').map((method) => ({
                controller: controller.name, controllerPath: Reflect.getMetadata('path', controller), method,
                methodPath: Reflect.getMetadata('path', controller.prototype[method]), requestMethod: Reflect.getMetadata('method', controller.prototype[method]),
                swaggerOperationId: Reflect.getMetadata('swagger/apiOperation', controller.prototype[method])?.operationId ?? null
            }));
        }));
        const instances = [...new Set(modules.flatMap((module) => [...module.providers.values()]).filter((wrapper) => wrapper.metatype?.name === 'SensitiveFieldProjectionService').map((wrapper) => wrapper.instance).filter(Boolean))];
        assert.equal(instances.length, 1, 'Original DI projection service must be unambiguous'); const projection = instances[0];
        const readOriginalScalarFacts = async (table, id, fields, ownedObject) => {
            const allowed = { contract: ['signed_amount'], contract_term_snapshot: ['amount_tax_inclusive', 'amount_tax_exclusive', 'tax_rate', 'down_payment_rate', 'retention_rate', 'payment_terms'] };
            assert(allowed[table] && Array.isArray(fields) && fields.every((field) => allowed[table].includes(field)));
            assert(/^[0-9a-f-]{36}$/.test(id));
            assert(ownedObject?.table === table && ownedObject.id === id && ownedObject.identity?.id === id && ownedObject.creationProof && ownedObject.postcondition?.independentlyVisible, 'Scalar read requires the exact already-owned fixture object');
            const meta = [...orm.getMetadata().getAll().values()].find((entry) => entry.tableName === table); assert(meta?.class);
            const fork = orm.em.fork({ clear: true }), entity = await fork.findOne(meta.class, { id }); assert(entity);
            const actualIdentity = Object.fromEntries(['id', ...identities[table]].map((field) => {
                const property = Object.values(meta.properties).find((entry) => entry.fieldNames?.includes(field)); assert(property);
                return [field, entity[property.name] ?? null];
            }));
            assert(sameIdentity(table, actualIdentity, ownedObject.identity), 'Original ORM scalar read identity differs from its owned row');
            const values = Object.fromEntries(fields.map((field) => {
                const property = Object.values(meta.properties).find((entry) => entry.fieldNames?.includes(field)); assert(property);
                return [field, entity[property.name] ?? null];
            }));
            return { kind: 'independent-original-ORM-read-of-owned-scalar-facts', table, id, identity: rowIdentity(table, actualIdentity), values, className: meta.className, noDTOConstructed: true };
        };
        const probeNullProjection = async ({ context, user, requestContext }) => storage.run(context, async () => {
            const common = { fieldPackageKey: 'contract-finance', user, targetType: 'contract', targetId: context.contractId, requestContext };
            const single = await projection.projectStringField({ ...common, rawValue: null });
            const fieldNames = ['amountTaxInclusiveProjection', 'amountTaxExclusiveProjection', 'taxRateProjection', 'downPaymentRateProjection', 'retentionRateProjection', 'paymentTermsProjection'];
            const batch = await projection.projectStringFields({ ...common, fields: fieldNames.map((key) => ({ key, rawValue: null })) });
            return { kind: 'finite-real-DI-service-null-input-only', HTTPInvoked: false, signedAmountNullInserted: false, serviceClass: projection.constructor.name, single, batch };
        });
        return { origin: 'http://127.0.0.1:9700', metadata, routes, sql, witness, probeNullProjection, readOriginalScalarFacts, close, isListening: () => app.getHttpServer().listening === true,
            report: () => ({ variant, backend, tag, processId: process.pid, node: process.version, nodeExecutableSha256: sha(fs.readFileSync(process.execPath)),
                binary, binaryBytes: bytes.length, binaryRawBytesSha256: sha(bytes), binaryUnchanged: sha(fs.readFileSync(binary)) === sha(bytes), listenerAddress: app.getHttpServer().address(),
                nativeEnvironment: environment.proof, originalNativeApplication: true, hooksObserveOriginalSdkAndPgOnly: true, pgCaptureComplete: !capture.isIncomplete(), witness: witness.snapshot(), sdk: witness.sourceReport() }) };
    } catch (error) { await close(); throw error; }
}
