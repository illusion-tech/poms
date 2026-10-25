/** Offline R0 evidence extraction. Never imports application code or connects to PostgreSQL. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reviewedSourceHead = '033aedd028fc25ea990450a7854fc92c567cfb8a';
const sourceScope = ['apps/poms-api/src', 'apps/poms-api/project.json', 'deploy/scripts/lib/migration-gate.ts'];
const changedInputs = execFileSync('git', ['diff', '--name-only', '--no-ext-diff', reviewedSourceHead, '--', ...sourceScope], { cwd: root, encoding: 'utf8' }).trim();
const untrackedInputs = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...sourceScope], { cwd: root, encoding: 'utf8' }).trim();
if (changedInputs || untrackedInputs) {
    throw new Error(`R0 source scope differs from reviewed reference ${reviewedSourceHead}; review the new source and deliberately update reviewedSourceHead before regenerating.\n${[changedInputs, untrackedInputs].filter(Boolean).join('\n')}`);
}
const outputPath = path.join(root, 'docs/design/rust-r0-database-inventory.json');
const normalizeText = (text) => text.replace(/\r\n/g, '\n');
const readText = (file) => normalizeText(fs.readFileSync(file, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const rel = (p) => path.relative(root, p).replaceAll('\\', '/');
const walk = (dir) =>
    fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
        .sort();
const files = walk(path.join(root, 'apps/poms-api/src'));
const source = new Map(files.filter((p) => p.endsWith('.ts')).map((p) => [rel(p), readText(p)]));
const parsed = new Map([...source].map(([p, text]) => [p, ts.createSourceFile(p, text, ts.ScriptTarget.Latest, true)]));
const line = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
const visit = (n, fn) => {
    fn(n);
    ts.forEachChild(n, (c) => visit(c, fn));
};
const name = (n) => n?.getText().replace(/^['"]|['"]$/g, '') ?? '';
const objectProp = (n, key) => (n && ts.isObjectLiteralExpression(n) ? n.properties.find((p) => ts.isPropertyAssignment(p) && name(p.name) === key)?.initializer : undefined);
const literal = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : undefined);
const textOf = (n) => n?.getText() ?? '';
const argumentSummary = (n) => {
    const value = textOf(n);
    if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
        const sf = n.getSourceFile();
        return `<callback ${line(sf, n)}-${sf.getLineAndCharacterOfPosition(n.end).line + 1}; sha256=${sha(value)}>`;
    }
    return value.length > 800 ? `${value.slice(0, 800)} <truncated; sha256=${sha(value)}>` : value;
};
const referencesName = (n, names) => {
    let found = false;
    visit(n, (c) => {
        if (ts.isIdentifier(c) && names.includes(c.text)) found = true;
    });
    return found;
};
const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
const domain = (p) => p.match(/\/features\/([^/]+)/)?.[1] ?? p.match(/\/core\/([^/]+)/)?.[1] ?? (p.includes('/seeders/') ? 'seeders' : 'infrastructure');
const owner = (d) =>
    ['identity-provider', 'external-org-sync'].includes(d)
        ? 'external-integration'
        : ['auth', 'runtime-audit', 'platform', 'system-setting', 'dictionary', 'business-number', 'approval', 'approval-summary', 'attachment', 'persistence'].includes(d)
          ? 'platform'
          : 'business';
const stage = (d) => (['auth', 'persistence'].includes(d) ? 'R1' : owner(d) !== 'business' ? 'R2' : ['project-cost', 'project-handover', 'contract', 'contract-readiness', 'contract-finance'].includes(d) ? 'R4' : d === 'commission' ? 'R5' : 'R3');

const entities = [];
for (const [file, sf] of parsed) {
    if (!file.endsWith('.entity.ts')) continue;
    visit(sf, (n) => {
        if (!ts.isCallExpression(n) || textOf(n.expression) !== 'defineEntity') return;
        const obj = n.arguments[0];
        const table = literal(objectProp(obj, 'tableName'));
        if (!table) throw new Error(`Unparsed entity table: ${file}:${line(sf, n)}`);
        const properties = objectProp(obj, 'properties');
        if (!properties || !ts.isObjectLiteralExpression(properties)) throw new Error(`Unparsed properties: ${file}:${line(sf, n)}`);
        const fields = properties.properties.filter(ts.isPropertyAssignment).map((p) => {
            const expression = textOf(p.initializer);
            const property = name(p.name);
            const chain = new Map();
            let type = 'UNPARSED';
            visit(p.initializer, (n) => {
                if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) return;
                const callName = name(n.expression.name);
                if (!chain.has(callName)) chain.set(callName, n.arguments);
                if (textOf(n.expression.expression) === 'p') type = callName;
            });
            const method = (s) =>
                chain
                    .get(s)
                    ?.map((a) => literal(a) ?? textOf(a))
                    .join(', ');
            const field = method('fieldName') ?? snake(property);
            const precision = method('precision') ? Number(method('precision')) : null;
            const scale = method('scale') ? Number(method('scale')) : null;
            const columnType = method('columnType') ?? (type === 'decimal' ? `numeric(${precision},${scale})` : null);
            return {
                property,
                column: field,
                type,
                columnType,
                line: line(sf, p),
                nullable: /\.nullable\(/.test(expression),
                primary: /\.primary\(/.test(expression),
                optimisticVersion: /\.version\(/.test(expression),
                precision,
                scale,
                dateMode: method('mode') ?? null,
                relationTarget: type === 'manyToOne' || type === 'oneToOne' ? method(type) : null,
                mapToPk: /\.mapToPk\(/.test(expression),
                onCreate: /\.onCreate\(/.test(expression),
                onUpdate: /\.onUpdate\(/.test(expression),
                defaultRaw: method('defaultRaw') ?? null,
                expression
            };
        });
        const d = domain(file);
        const plannedStage = ['acceptance_record', 'project_completion_record', 'project_archive_record', 'project_handover_attachment_selection'].includes(table) ? 'R4' : stage(d);
        entities.push({
            entity: literal(objectProp(obj, 'name')),
            schema: literal(objectProp(obj, 'schema')),
            table,
            file,
            line: line(sf, n),
            domain: d,
            ownership: owner(d),
            plannedStage,
            fields,
            indexesSource: textOf(objectProp(obj, 'indexes')),
            uniquesSource: textOf(objectProp(obj, 'uniques')),
            checksSource: textOf(objectProp(obj, 'checks'))
        });
    });
}

const tableOwners = new Map(entities.map((e) => [e.table, e]));
const historicalTables = new Set([...source].filter(([p]) => p.includes('/migrations/')).flatMap(([, s]) => [...s.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?["']?poms["']?\s*\.\s*["']([a-z][a-z0-9_]*)["']/gi)].map((m) => m[1])));
const schemaRefs = (s) => [...new Set([...s.matchAll(/["']?poms["']?\s*\.\s*["']([a-z][a-z0-9_]*)["']/gi)].map((m) => m[1]))].sort();
const tableRefs = (s) => schemaRefs(s).filter((t) => historicalTables.has(t) || tableOwners.has(t));
const migrations = [];
for (const [file, sf] of parsed) {
    if (!/^apps\/poms-api\/src\/migrations\/Migration.*\.ts$/.test(file)) continue;
    const statements = [];
    const methodCalls = new Map();
    visit(sf, (n) => {
        if (!ts.isMethodDeclaration(n) || !n.body) return;
        const calls = [];
        visit(n.body, (c) => {
            if (ts.isCallExpression(c) && /^this\.[\w]+$/.test(textOf(c.expression))) calls.push(textOf(c.expression).slice(5));
        });
        methodCalls.set(name(n.name), calls);
    });
    const reachableFrom = (start) => {
        const result = new Set([start]);
        const queue = [start];
        while (queue.length)
            for (const next of methodCalls.get(queue.shift()) ?? [])
                if (!result.has(next)) {
                    result.add(next);
                    queue.push(next);
                }
        return result;
    };
    const upMethods = reachableFrom('up');
    const downMethods = reachableFrom('down');
    visit(sf, (n) => {
        if (!ts.isCallExpression(n) || !textOf(n.expression).endsWith('.addSql')) return;
        let parent = n.parent;
        while (parent && !ts.isMethodDeclaration(parent)) parent = parent.parent;
        const expr = n.arguments[0];
        const sql = literal(expr) ?? textOf(expr);
        const tables = tableRefs(sql);
        const kinds = [];
        if (/\b(create|alter|drop|comment|grant|revoke)\s+(?:unique\s+)?(?:schema|table|index|extension|constraint|type|sequence|column|on|select|usage)/i.test(sql) || /\bdo\s+\$\$[\s\S]*\b(?:alter|create|comment)\b/i.test(sql)) kinds.push('DDL');
        if (/\b(?:update|delete\s+from|insert\s+into)\s+(?:["']?poms["']?\s*\.|["'])/i.test(sql)) kinds.push('data-backfill-or-seed');
        const seed = /\binsert\s+into\s+["']?poms["']?\s*\.\s*["'](?:dictionary_item|lead_source|system_setting|business_number_sequence|role|role_permission_assignment)["']/i.test(sql);
        if (seed) kinds.push('seed-bootstrap');
        if (/raise\s+exception|\bassert\b/i.test(sql)) kinds.push('precondition-validation');
        if (!kinds.length) kinds.push('manual-review');
        const declaredMethod = parent ? name(parent.name) : 'unknown';
        const directions = [upMethods.has(declaredMethod) ? 'up' : null, downMethods.has(declaredMethod) ? 'down' : null].filter(Boolean);
        statements.push({
            declaredMethod,
            directions,
            direction: directions.join('-and-') || 'unreachable',
            line: line(sf, n),
            kinds,
            tables,
            schemaQualifiedObjects: schemaRefs(sql),
            interpolated: !!expr && !ts.isStringLiteral(expr) && !ts.isNoSubstitutionTemplateLiteral(expr),
            sql,
            sha256: sha(sql)
        });
    });
    const up = statements.filter((s) => s.directions.includes('up'));
    const tables = [...new Set(up.flatMap((s) => s.tables))].sort();
    migrations.push({
        file,
        sha256: sha(source.get(file)),
        upKinds: [...new Set(up.flatMap((s) => s.kinds))].sort(),
        tables,
        domains: [...new Set(tables.map((t) => tableOwners.get(t)?.domain ?? 'unmapped'))].sort(),
        ownership: [...new Set(tables.map((t) => tableOwners.get(t)?.ownership ?? 'unmapped'))].sort(),
        statements
    });
}
for (const e of entities) {
    e.migrations = migrations.filter((m) => m.tables.includes(e.table)).map((m) => m.file);
    e.creationEvidence = migrations.flatMap((m) =>
        m.statements.filter((s) => s.directions.includes('up') && new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?["']?poms["']?\\s*\\.\\s*["']${e.table}["']`, 'i').test(s.sql)).map((s) => ({ file: m.file, line: s.line }))
    );
}

const methods = [];
const transactions = [];
const persistenceSites = [];
const concurrencySites = [];
const numericSites = [];
const resolveImport = (file, spec) => {
    if (!spec?.startsWith('.')) return null;
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
    return parsed.has(`${base}.ts`) ? `${base}.ts` : parsed.has(`${base}/index.ts`) ? `${base}/index.ts` : null;
};
for (const [file, sf] of parsed) {
    if (!file.includes('/app/') || /\.spec\.ts$/.test(file) || file.endsWith('.entity.ts')) continue;
    const imports = new Map();
    for (const n of sf.statements.filter(ts.isImportDeclaration)) {
        const target = resolveImport(file, literal(n.moduleSpecifier));
        const bindings = n.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) for (const e of bindings.elements) imports.set(e.name.text, { file: target, symbol: e.propertyName?.text ?? e.name.text });
    }
    visit(sf, (cls) => {
        if (!ts.isClassDeclaration(cls)) return;
        const clsName = name(cls.name);
        const dependencies = new Map();
        for (const member of cls.members) {
            if (ts.isConstructorDeclaration(member))
                for (const p of member.parameters) {
                    const typ = p.type && ts.isTypeReferenceNode(p.type) ? textOf(p.type.typeName) : textOf(p.type);
                    const imp = imports.get(typ);
                    const generic = p.type && ts.isTypeReferenceNode(p.type) ? p.type.typeArguments?.map(textOf) : [];
                    dependencies.set(name(p.name), { type: typ, entityArguments: generic, ...(imp ?? {}) });
                }
        }
        for (const member of cls.members) {
            const body = ts.isMethodDeclaration(member)
                ? member.body
                : ts.isPropertyDeclaration(member) && member.initializer && (ts.isArrowFunction(member.initializer) || ts.isFunctionExpression(member.initializer))
                  ? member.initializer.body
                  : null;
            if (!body) continue;
            const methodName = name(member.name);
            const id = `${file}#${clsName}.${methodName}`;
            const calls = [];
            const dbCalls = [];
            visit(body, (n) => {
                if (!ts.isCallExpression(n)) return;
                const expression = textOf(n.expression);
                const match = expression.match(/^this\.([\w#]+)\.([\w#]+)$/);
                const self = expression.match(/^this\.([\w#]+)$/);
                if (match) {
                    const dep = dependencies.get(match[1]);
                    calls.push({
                        line: line(sf, n),
                        expression,
                        targetFile: dep?.file ?? null,
                        targetClass: dep?.symbol ?? dep?.type ?? null,
                        targetMethod: match[2],
                        arguments: n.arguments.map(argumentSummary),
                        dependencyEntities: dep?.entityArguments ?? [],
                        domain: dep?.file ? domain(dep.file) : null
                    });
                } else if (self) calls.push({ line: line(sf, n), expression, targetFile: file, targetClass: clsName, targetMethod: self[1], arguments: n.arguments.map(argumentSummary), domain: domain(file) });
                else if (ts.isIdentifier(n.expression) && imports.get(expression)?.file) {
                    const imp = imports.get(expression);
                    calls.push({ line: line(sf, n), expression, targetFile: imp.file, targetClass: '__function', targetMethod: imp.symbol, arguments: n.arguments.map(argumentSummary), domain: domain(imp.file) });
                }
                if (/\.(?:flush|persist|persistAndFlush|nativeUpdate|nativeInsert|nativeDelete|upsert|upsertMany|remove|removeAndFlush|execute|lock|transactional|begin|commit|rollback)$/.test(expression)) {
                    const site = { file, line: line(sf, n), methodId: id, expression, arguments: n.arguments.map(argumentSummary) };
                    persistenceSites.push(site);
                    dbCalls.push({ line: site.line, expression });
                }
                if (!expression.endsWith('.transactional')) return;
                const callback = n.arguments.find((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a));
                const callbackText = callback ? textOf(callback) : '';
                const callbackParams = callback ? callback.parameters.map((p) => name(p.name)) : [];
                const entityUses = [...new Set(entities.filter((e) => new RegExp(`\\b${e.entity}\\b`).test(callbackText)).map((e) => e.entity))].sort();
                const childCalls = [];
                if (callback)
                    visit(callback, (c) => {
                        if (ts.isCallExpression(c) && /^this\./.test(textOf(c.expression)))
                            childCalls.push({ line: line(sf, c), expression: textOf(c.expression), arguments: c.arguments.map(argumentSummary), passesTransactionParameter: c.arguments.some((a) => referencesName(a, callbackParams)) });
                    });
                transactions.push({
                    id: `${file}:${line(sf, n)}`,
                    file,
                    line: line(sf, n),
                    endLine: sf.getLineAndCharacterOfPosition(n.end).line + 1,
                    methodId: id,
                    expression,
                    callbackParams,
                    callbackKind: callback ? 'inline' : 'reference',
                    entityUses,
                    domains: [...new Set(entityUses.map((e) => entities.find((x) => x.entity === e)?.domain))].sort(),
                    childCalls,
                    callbackReference: callback ? null : n.arguments.map(textOf)
                });
            });
            methods.push({
                id,
                file,
                class: clsName,
                method: methodName,
                line: line(sf, member),
                endLine: sf.getLineAndCharacterOfPosition(member.end).line + 1,
                domain: domain(file),
                calls,
                dbCalls,
                acceptsEntityManager: /(?:EntityManager|WriteChainContext|WriteChainEntityManager)/.test(member.parameters?.map(textOf).join(',') ?? '')
            });
        }
    });
    for (const statement of sf.statements) {
        const functions =
            ts.isFunctionDeclaration(statement) && statement.body
                ? [{ node: statement, fnName: name(statement.name), body: statement.body, parameters: statement.parameters }]
                : ts.isVariableStatement(statement)
                  ? statement.declarationList.declarations
                        .filter((d) => d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)))
                        .map((d) => ({ node: d, fnName: name(d.name), body: d.initializer.body, parameters: d.initializer.parameters }))
                  : [];
        for (const f of functions) {
            const id = `${file}#__function.${f.fnName}`;
            const calls = [];
            const dbCalls = [];
            visit(f.body, (n) => {
                if (!ts.isCallExpression(n)) return;
                const expression = textOf(n.expression);
                if (ts.isIdentifier(n.expression)) {
                    const imp = imports.get(expression);
                    const targetFile = imp?.file ?? file;
                    calls.push({ line: line(sf, n), expression, targetFile, targetClass: '__function', targetMethod: imp?.symbol ?? expression, arguments: n.arguments.map(argumentSummary), domain: domain(targetFile) });
                }
                if (/\.(?:flush|persist|persistAndFlush|nativeUpdate|nativeInsert|nativeDelete|upsert|upsertMany|remove|removeAndFlush|execute|lock|transactional|begin|commit|rollback)$/.test(expression)) {
                    const site = { file, line: line(sf, n), methodId: id, expression, arguments: n.arguments.map(argumentSummary) };
                    persistenceSites.push(site);
                    dbCalls.push({ line: site.line, expression });
                }
            });
            methods.push({
                id,
                file,
                class: '__function',
                method: f.fnName,
                line: line(sf, f.node),
                endLine: sf.getLineAndCharacterOfPosition(f.node.end).line + 1,
                domain: domain(file),
                calls,
                dbCalls,
                acceptsEntityManager: /(?:EntityManager|WriteChainContext|WriteChainEntityManager)/.test(f.parameters.map(textOf).join(','))
            });
        }
    }
    source
        .get(file)
        .split(/\r?\n/)
        .forEach((s, i) => {
            if (/LockMode|PESSIMISTIC|OPTIMISTIC|OptimisticLockError|UniqueConstraintViolationException|rowVersion\s*!==|rowVersion\s*===|expectedRowVersion|FOR UPDATE|for update|on conflict|nativeUpdate|advisory|isCurrent\s*=\s*false/.test(s))
                concurrencySites.push({ file, line: i + 1, source: s.trim() });
            if (['contract-finance', 'project-cost', 'commission', 'project', 'contract', 'contract-readiness'].includes(domain(file)) && /Math\.(?:round|floor|ceil|trunc)|toFixed\(|Number\.EPSILON|parseFloat\(|\bNumber\(/.test(s))
                numericSites.push({ file, line: i + 1, source: s.trim() });
        });
}
const methodMap = new Map(methods.map((m) => [m.id, m]));
const transactionMethods = new Set(transactions.map((t) => t.methodId));
for (const t of transactions) {
    const seen = new Set([t.methodId]);
    const queue = [{ id: t.methodId, path: [t.methodId] }];
    const nested = [];
    while (queue.length) {
        const item = queue.shift();
        if (item.path.length > 5) continue;
        const m = methodMap.get(item.id);
        for (const c of m?.calls ?? []) {
            const target = `${c.targetFile}#${c.targetClass}.${c.targetMethod}`;
            if (seen.has(target) || !methodMap.has(target)) continue;
            seen.add(target);
            const next = [...item.path, target];
            if (transactionMethods.has(target)) nested.push({ methodId: target, path: next, edgeLine: c.line, explicitTransactionArgument: c.arguments.some((a) => /^(?:em|tx|context|writeChainContext)$/.test(a)) });
            queue.push({ id: target, path: next });
        }
    }
    t.reachableTransactionMethods = nested;
    const m = methodMap.get(t.methodId);
    t.directCrossDomainCalls = (m?.calls ?? []).filter((c) => c.line >= t.line && c.line <= t.endLine && c.domain && c.domain !== domain(t.file));
}
const seeders = [...source]
    .filter(([p]) => p.includes('/seeders/'))
    .map(([file, s]) => ({
        file,
        sha256: sha(s),
        tables: [...new Set([...s.matchAll(/["'](?:\$\{schema\}|poms)["']\s*\.\s*["']([a-z][a-z0-9_]*)["']/gi)].map((m) => m[1]))].sort(),
        entityNames: entities
            .filter((e) => new RegExp(`\\b${e.entity}\\b`).test(s))
            .map((e) => e.entity)
            .sort(),
        references: s
            .split(/\r?\n/)
            .map((s, i) => ({ line: i + 1, source: s.trim() }))
            .filter((x) => /export class|async run|transaction|\.call\(|DatabaseSeeder|Bootstrap|Trial|delete|truncate|POMS_|process\.env|sync.*Dictionary|synchronize|seed/i.test(x.source))
    }));
const evidenceFiles = [
    ...new Set([
        ...entities.map((e) => e.file),
        ...migrations.map((m) => m.file),
        ...methods.filter((m) => m.dbCalls.length || m.file.includes('/date/')).map((m) => m.file),
        ...seeders.map((s) => s.file),
        'apps/poms-api/src/app/core/persistence/persistence.config.ts',
        'apps/poms-api/src/config/environment.schema.ts',
        'apps/poms-api/project.json',
        'deploy/scripts/lib/migration-gate.ts'
    ])
]
    .sort()
    .filter((p) => fs.existsSync(path.join(root, p)));
const fileHashes = evidenceFiles.map((file) => {
    const text = readText(path.join(root, file));
    return { file, sha256: sha(text), normalizedUtf8Bytes: Buffer.byteLength(text, 'utf8') };
});
const allFields = entities.flatMap((e) => e.fields.map((f) => ({ entity: e.entity, table: e.table, file: e.file, ...f })));
if (allFields.some((f) => f.type === 'UNPARSED')) throw new Error('Entity field type was not parsed');
if (entities.some((e) => !e.creationEvidence.length)) throw new Error('Entity has no CREATE TABLE evidence');
if (new Set(entities.map((e) => `${e.schema}.${e.table}`)).size !== entities.length) throw new Error('Duplicate mapped table');
if (migrations.some((m) => m.statements.some((s) => !s.directions.length))) throw new Error('Migration addSql site is not reachable from up/down');
const count = (arr, getter) => Object.fromEntries([...new Set(arr.map(getter))].sort().map((v) => [v, arr.filter((x) => getter(x) === v).length]));
const inventory = {
    formatVersion: 2,
    baseline: {
        textNormalization: {
            encoding: 'utf8',
            lineEndings: 'CRLF-to-LF',
            rule: "text.replace(/\\r\\n/g, '\\n')",
            preserves: 'BOM, bare CR, Unicode, other whitespace and escape sequences',
            hashes: 'sha256 of normalized UTF-8 text; not raw working-tree bytes'
        },
        head: reviewedSourceHead,
        headMeaning:
            'Reviewed source reference, pinned independently of later documentation-only commits. Manifest hashes UTF-8 source text after CRLF-to-LF-only normalization; write/check refuses changed or untracked files in the reviewed API-source/project/migration-gate scope.',
        extractor: 'tools/rust-r0-database-inventory.mjs',
        extractorSha256: sha(readText(new URL(import.meta.url))),
        databaseConnected: false,
        sourceImportsExecuted: false,
        limitations: [
            'TypeScript AST and source text evidence only; PostgreSQL schema, migration-history rows, installed extensions, collation, timezone, deployed PostgreSQL version and MikroORM emitted SQL are not verified.',
            'SQL template interpolations are retained as source, not evaluated; classifications are lexical flags and seed-bootstrap is a subset of data-backfill-or-seed.',
            'Static call graph follows constructor-injected imports and direct this calls, with maximum five methods; dynamic approval handlers, interface dispatch, callbacks and ambient MikroORM request context need manual/DB integration verification.',
            'Field default column names use snake_case fallback; DB DDL remains authoritative.'
        ]
    },
    counts: {
        entityFiles: new Set(entities.map((e) => e.file)).size,
        entityDefinitions: entities.length,
        physicalTableNames: new Set(entities.map((e) => `${e.schema}.${e.table}`)).size,
        migrationFiles: migrations.length,
        migrationUpAddSqlSites: migrations.flatMap((m) => m.statements.filter((s) => s.directions.includes('up'))).length,
        fields: allFields.length,
        byFieldType: count(allFields, (f) => f.type),
        byOwnership: count(entities, (e) => e.ownership),
        byDomain: count(entities, (e) => e.domain),
        transactionCallSites: transactions.length,
        transactionContainingMethods: transactionMethods.size,
        methodsInStaticGraph: methods.length,
        persistenceCallSites: persistenceSites.length
    },
    digest: {
        algorithm: 'sha256',
        fileManifestSha256: sha(JSON.stringify(fileHashes)),
        note: 'Manifest hashes normalized UTF-8 source text: CRLF -> LF only; BOM, bare CR and Unicode are preserved. Source HEAD is recorded separately. The manifest excludes generated JSON and Markdown to avoid circular hashes.'
    },
    entities: entities.sort((a, b) => `${a.schema}.${a.table}`.localeCompare(`${b.schema}.${b.table}`, 'en')),
    dataTypeMatrix: {
        numericFields: allFields.filter((f) => f.columnType?.includes('numeric')).map(({ entity, table, property, column, type, columnType, file, line }) => ({ entity, table, property, column, type, columnType, file, line })),
        dateFields: allFields.filter((f) => f.type === 'date').map(({ entity, table, property, column, file, line }) => ({ entity, table, property, column, file, line })),
        optimisticVersionTables: entities.filter((e) => e.fields.some((f) => f.optimisticVersion)).map((e) => e.table),
        versionChains: entities
            .filter((e) => e.fields.some((f) => /^(?:version|isCurrent|supersedes|recalculatedFrom|reversedFrom|voidedFrom)/.test(f.property)))
            .map((e) => ({
                table: e.table,
                fields: e.fields.filter((f) => /^(?:version|isCurrent|supersedes|recalculatedFrom|reversedFrom|voidedFrom)/.test(f.property)).map((f) => ({ column: f.column, type: f.type, nullable: f.nullable, line: f.line })),
                file: e.file,
                uniqueSource: e.uniquesSource
            })),
        externalAndSourceIdentifiers: allFields
            .filter((f) => /(?:external|source|providerSubject|providerUser|openId|unionId|storageKey|recordNo|projectNo|contractNo|customerNo|leadNo)/i.test(f.property))
            .map(({ entity, table, property, column, type, relationTarget, nullable, file, line }) => ({ entity, table, property, column, type, relationTarget, nullable, file, line }))
    },
    migrations,
    transactions,
    serviceMethodGraph: methods.filter((m) => m.calls.length || m.dbCalls.length),
    persistenceSites,
    concurrencySites,
    numericSites,
    seeders,
    fileHashes
};
const rendered = JSON.stringify(inventory, null, 2) + '\n';
if (process.argv.includes('--check')) {
    if (!fs.existsSync(outputPath) || readText(outputPath) !== normalizeText(rendered)) {
        process.stderr.write('R0 database inventory differs. Re-run node tools/rust-r0-database-inventory.mjs\n');
        process.exitCode = 1;
    } else process.stdout.write(`R0 database inventory verified: ${sha(rendered)}\n`);
} else {
    fs.writeFileSync(outputPath, rendered, 'utf8');
    process.stdout.write(`${JSON.stringify({ ...inventory.counts, manifestSha256: inventory.digest.fileManifestSha256, outputSha256: sha(rendered) })}\n`);
}
