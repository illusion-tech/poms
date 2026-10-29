// Source-derived SQL planning only. This module has no database/ORM connection,
// global seeder entry, definition upsert or cleanup entry point.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = 'apps/poms-api/src/seeders/database.seeder.ts';
const SOURCE_LF_SHA256 = 'c2450781dab397c75c15f70a81bcc258967a18ee467df9befdcbe96b1ccd5fcd';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUIDS = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const ROOT_FUNCTIONS = ['seedProjectHandoverE2EFixture', 'seedProjectHandoverPreparedState', 'makeHandoverE2EFixture'];
const EXPECTED_FUNCTIONS = [
    ...ROOT_FUNCTIONS, 'sqlValue', 'sqlUuid', 'sqlTimestamp', 'sqlDate', 'sqlText',
    'hasPreparedHandoverFixture', 'hasProcessingRebaselineFixture', 'handoverParticipantId',
    'seedProcessingRebaseline', 'seedOperatingSignalEvidenceState', 'makeOperatingSignalE2EFixture'
].sort();
const ORG_LITERAL = '10000000-0000-4000-8000-000000000001';
const ALLOWED_TABLES = new Set([
    'project', 'contract', 'contract_term_snapshot', 'receipt_record', 'payment_record',
    'commercial_release_baseline', 'commercial_baseline_diff_result', 'contract_readiness_package',
    'approval_summary_snapshot', 'project_handover', 'confirmation_record', 'confirmation_participant',
    'project_receipt_judgment_freeze'
]);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const utf8 = (text) => Buffer.from(text, 'utf8');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export class PreparedPlanError extends Error {
    constructor(message, report) {
        super(message);
        this.name = 'PreparedPlanError';
        this.report = report;
    }
}

function uuid(value, label) {
    assert(typeof value === 'string' && UUID.test(value), `Expected explicit UUID: ${label}`);
    return value;
}

function loadOriginalSource() {
    assert.equal(ts.version, '6.0.3', 'Use the existing reviewed TypeScript 6.0.3 compiler');
    const file = path.join(ROOT, SOURCE);
    assert(fs.lstatSync(file).isFile() && !fs.lstatSync(file).isSymbolicLink());
    assert(fs.realpathSync(file).startsWith(fs.realpathSync(ROOT) + path.sep));
    const raw = fs.readFileSync(file), text = raw.toString('utf8'), lf = text.replace(/\r\n/g, '\n');
    assert.equal(sha(utf8(lf)), SOURCE_LF_SHA256, 'Original seeder source changed; review a new source epoch');
    const source = ts.createSourceFile(SOURCE, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    assert.equal(source.parseDiagnostics.length, 0, 'Original seeder must parse without diagnostics');
    const symbols = new Map();
    for (const node of source.statements) {
        if (ts.isFunctionDeclaration(node) && node.name) symbols.set(node.name.text, { kind: 'function', node });
        if (ts.isVariableStatement(node)) {
            assert(node.declarationList.flags & ts.NodeFlags.Const, 'Top-level source declarations must remain const');
            for (const declaration of node.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name)) symbols.set(declaration.name.text, { kind: 'constant', node: declaration });
            }
        }
    }
    const selected = new Set(), pending = [...ROOT_FUNCTIONS];
    while (pending.length) {
        const name = pending.shift();
        if (selected.has(name)) continue;
        const symbol = symbols.get(name);
        assert(symbol, `Missing original dependency: ${name}`);
        selected.add(name);
        const visit = (node) => {
            if (ts.isIdentifier(node) && symbols.has(node.text) && node.text !== name) pending.push(node.text);
            ts.forEachChild(node, visit);
        };
        visit(symbol.node);
    }
    const declarations = [...selected].map((name) => ({ name, ...symbols.get(name) })).sort((a, b) => a.node.pos - b.node.pos);
    assert.deepEqual(declarations.filter((d) => d.kind === 'function').map((d) => d.name).sort(), EXPECTED_FUNCTIONS);
    assert.equal(declarations.filter((d) => d.kind === 'constant').length, 9);
    const metadata = declarations.map(({ name, kind, node }) => {
        const start = node.getStart(source), originalText = text.slice(start, node.end);
        return {
            name, kind, firstLine: source.getLineAndCharacterOfPosition(start).line + 1,
            lastLine: source.getLineAndCharacterOfPosition(node.end).line + 1,
            bytes: utf8(originalText).length, rawTextSha256: sha(utf8(originalText)),
            normalizedLfSha256: sha(utf8(originalText.replace(/\r\n/g, '\n'))), originalText
        };
    });
    const functionNames = metadata.filter((d) => d.kind === 'function').map((d) => d.name);
    const constantNames = metadata.filter((d) => d.kind === 'constant').map((d) => d.name);
    const projectedSource = metadata.map((d) => d.kind === 'constant' ? `const ${d.originalText};` : d.originalText).join('\n\n')
        + `\n;({ functions: {${functionNames.join(',')}}, constants: {${constantNames.join(',')}} });\n`;
    const compiled = ts.transpileModule(projectedSource, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, removeComments: false, newLine: ts.NewLineKind.LineFeed },
        reportDiagnostics: true, fileName: 'r4-prepared-extracted.ts'
    });
    const errors = (compiled.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
    assert.equal(errors.length, 0, errors.map((d) => `${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`).join('\n'));
    const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
    const original = new vm.Script(compiled.outputText, { filename: 'r4-prepared-original-source.js' }).runInContext(context, { timeout: 1000 });
    const interfaces = Object.fromEntries(['HandoverE2EFixture', 'HandoverE2EFixtureOptions'].map((name) => {
        const node = source.statements.find((n) => ts.isInterfaceDeclaration(n) && n.name.text === name);
        assert(node, `Missing original interface ${name}`);
        return [name, node.members.map((m) => m.name.getText(source))];
    }));
    const sourceUuids = new Set(), uuidPrefixes = new Set();
    const collectIds = (node) => {
        if (ts.isStringLiteralLike(node) && UUID.test(node.text)) sourceUuids.add(node.text.toLowerCase());
        if (ts.isTemplateExpression(node) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]*$/i.test(node.head.text)) {
            uuidPrefixes.add(node.head.text.toLowerCase());
        }
        ts.forEachChild(node, collectIds);
    };
    collectIds(source);
    return {
        original, interfaces,
        sourceIdentity: { file: SOURCE, bytes: raw.length, rawBytesSha256: sha(raw), normalizedLfSha256: sha(utf8(lf)) },
        extraction: { mode: 'AST dependency closure; original bodies and constant initializers unchanged', declarations: metadata,
            projectedTypeScript: projectedSource, projectedSha256: sha(utf8(projectedSource)),
            compiler: `typescript@${ts.version}`, compilerOptions: { target: 'ES2022', module: 'CommonJS', newLine: 'LF' },
            compiledJavaScript: compiled.outputText, compiledSha256: sha(utf8(compiled.outputText)) },
        isOriginalUuid: (id) => sourceUuids.has(id.toLowerCase()) || [...uuidPrefixes].some((prefix) => id.toLowerCase().startsWith(prefix))
    };
}

function tokenize(sql) {
    const tokens = [];
    for (let i = 0; i < sql.length;) {
        if (/\s/.test(sql[i])) { i++; continue; }
        const start = i, quote = sql[i];
        if (quote === "'" || quote === '"') {
            i++; let value = '', closed = false;
            while (i < sql.length) {
                if (sql[i] === quote) {
                    if (sql[i + 1] === quote) { value += quote; i += 2; continue; }
                    i++; closed = true; break;
                }
                value += sql[i++];
            }
            assert(closed, 'Unclosed original SQL literal');
            tokens.push({ kind: quote === "'" ? 'string' : 'identifier', value, start, end: i });
        } else {
            const word = /^[A-Za-z_][A-Za-z_0-9]*|^\d+/.exec(sql.slice(i));
            const value = word?.[0] ?? sql[i];
            i += value.length; tokens.push({ kind: word ? 'word' : 'symbol', value, start, end: i });
        }
    }
    return tokens;
}

// This parser recognizes only the original recipe's literal INSERT/one UPDATE
// shapes. It annotates values; it does not synthesize or execute SQL.
function parseStatement(sql) {
    const tokens = tokenize(sql);
    const is = (index, value) => tokens[index]?.value.toUpperCase() === value;
    const kind = tokens[0]?.value.toUpperCase();
    const base = kind === 'INSERT' && is(1, 'INTO') ? 2 : kind === 'UPDATE' ? 1 : -1;
    assert(base >= 0 && tokens[base]?.value === 'poms' && tokens[base + 1]?.value === '.');
    const table = tokens[base + 2]?.value;
    assert(ALLOWED_TABLES.has(table), `Statement outside original admitted recipe: ${table}`);
    const annotated = [], columns = [];
    if (kind === 'INSERT') {
        let i = base + 3; assert.equal(tokens[i++]?.value, '(');
        while (tokens[i]?.value !== ')') {
            assert.equal(tokens[i]?.kind, 'identifier'); columns.push(tokens[i++].value);
            if (tokens[i]?.value === ',') i++; else assert.equal(tokens[i]?.value, ')');
        }
        i++; assert(is(i++, 'VALUES'));
        let rowIndex = 0;
        do {
            assert.equal(tokens[i++]?.value, '(');
            for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
                let depth = 0; const expression = [];
                while (i < tokens.length) {
                    const token = tokens[i];
                    if (depth === 0 && [',', ')'].includes(token.value)) break;
                    if (token.value === '(') depth++;
                    if (token.value === ')') depth--;
                    expression.push(token); i++;
                }
                assert(expression.length > 0 && depth === 0);
                for (const token of expression) annotated.push({ ...token, column: columns[columnIndex], rowIndex });
                if (columnIndex < columns.length - 1) assert.equal(tokens[i++]?.value, ',');
            }
            assert.equal(tokens[i++]?.value, ')'); rowIndex++;
            if (tokens[i]?.value !== ',') break;
            i++;
        } while (true);
        if (tokens[i]?.value === ';') i++;
        assert.equal(i, tokens.length, 'Unexpected trailing SQL in original INSERT');
        return { kind, table, columns, rows: rowIndex, annotated };
    }
    assert.equal(table, 'commercial_release_baseline');
    assert(is(base + 3, 'SET'));
    for (let i = base + 4; i < tokens.length; i++) {
        if (tokens[i].kind === 'identifier' && tokens[i + 1]?.value === '=') {
            const column = tokens[i].value; columns.push(column);
            if (tokens[i + 2]) annotated.push({ ...tokens[i + 2], column, rowIndex: null });
        }
    }
    assert.deepEqual(columns, ['latest_diff_result_id', 'id']);
    assert.equal(tokens.filter((t) => t.value === ';').length, 1);
    assert.equal(tokens.at(-1)?.value, ';');
    return { kind, table, columns, rows: null, annotated };
}

function constantMappings(engine, input, fixture) {
    const c = engine.original.constants;
    return [
        { name: 'E2E_ACTOR_ID', from: c.E2E_ACTOR_ID, to: input.actorId.adminId,
            columns: ['owner_user_id', 'created_by', 'updated_by', 'effective_by', 'participant_id', 'confirmed_by', 'frozen_by'] },
        { name: 'E2E_VIEWER_ID', from: c.E2E_VIEWER_ID, to: input.actorId.viewerId, columns: ['participant_id'] },
        { name: 'original owner-org literal', from: ORG_LITERAL, to: input.orgId, columns: ['owner_org_id'] },
        { name: 'CONTRACT_HANDOVER_SUMMARY_PACKAGE_ID', from: c.CONTRACT_HANDOVER_SUMMARY_PACKAGE_ID,
            to: input.borrowedDefinitions.contractSummaryPackageId, columns: ['summary_package_id'] },
        { name: 'PROJECT_HANDOVER_SUMMARY_PACKAGE_ID', from: c.PROJECT_HANDOVER_SUMMARY_PACKAGE_ID,
            to: input.borrowedDefinitions.projectHandoverSummaryPackageId, columns: ['summary_package_id'] },
        { name: 'original handoverParticipantId(fixture,1)', from: engine.original.functions.handoverParticipantId(fixture, 1),
            to: input.participantRowIds.executionOwner, columns: ['id'], table: 'confirmation_participant' },
        { name: 'original handoverParticipantId(fixture,2)', from: engine.original.functions.handoverParticipantId(fixture, 2),
            to: input.participantRowIds.salesOwner, columns: ['id'], table: 'confirmation_participant' }
    ];
}

export async function buildPreparedPlan(input) {
    assert(input && typeof input === 'object');
    const { fixture: supplied, actorId, orgId, borrowedDefinitions, participantRowIds } = input;
    assert(supplied && typeof supplied === 'object' && !Array.isArray(supplied));
    assert(actorId && borrowedDefinitions && participantRowIds, 'Explicit actor, participant and borrowed-reference mappings required');
    uuid(actorId.adminId, 'actorId.adminId'); uuid(actorId.viewerId, 'actorId.viewerId');
    assert.notEqual(actorId.adminId.toLowerCase(), actorId.viewerId.toLowerCase());
    uuid(orgId, 'orgId'); uuid(borrowedDefinitions.contractSummaryPackageId, 'borrowedDefinitions.contractSummaryPackageId');
    uuid(borrowedDefinitions.projectHandoverSummaryPackageId, 'borrowedDefinitions.projectHandoverSummaryPackageId');
    assert.notEqual(borrowedDefinitions.contractSummaryPackageId.toLowerCase(), borrowedDefinitions.projectHandoverSummaryPackageId.toLowerCase());
    uuid(participantRowIds.executionOwner, 'participantRowIds.executionOwner'); uuid(participantRowIds.salesOwner, 'participantRowIds.salesOwner');
    assert.notEqual(participantRowIds.executionOwner.toLowerCase(), participantRowIds.salesOwner.toLowerCase());
    const engine = loadOriginalSource(), original = engine.original;
    assert(Object.keys(supplied).every((key) => engine.interfaces.HandoverE2EFixture.includes(key)), 'Unknown original fixture field');
    assert(typeof supplied.key === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(supplied.key));
    assert.notEqual(supplied.key, original.constants.COMMISSION_MAIN_E2E_FIXTURE.key, 'Operating-signal branch is outside this prepared-state plan');
    assert(!supplied.processingRebaselineRecordId && !supplied.amendmentId, 'Processing-rebaseline branch is retained as source only');
    const options = Object.fromEntries(engine.interfaces.HandoverE2EFixtureOptions.filter((key) => supplied[key] !== undefined).map((key) => [key, supplied[key]]));
    const fixture = { ...original.functions.makeHandoverE2EFixture(2, supplied.key, true, false, options), ...supplied };
    const requiredIds = ['projectId', 'contractId', 'contractSnapshotId', 'baselineId', 'diffResultId', 'readinessPackageId',
        'receivablePlanVersionId', 'contractSummarySnapshotId', 'handoverSummarySnapshotId', 'handoverId', 'confirmationRecordId'];
    for (const key of requiredIds) uuid(supplied[key], `fixture.${key}`);
    for (const key of ['projectNo', 'projectName', 'contractNo']) assert(typeof supplied[key] === 'string' && supplied[key].length > 0, `Explicit fixture.${key} required`);
    for (const [trigger, id] of [['confirmedReceiptAmount', 'receiptRecordId'], ['confirmedPaymentAmountExcludingTax', 'paymentRecordId'], ['receiptJudgmentMode', 'receiptJudgmentFreezeId']]) {
        if (fixture[trigger]) uuid(supplied[id], `fixture.${id}`);
    }
    const rawStatements = [];
    const recordingConnection = Object.freeze({ execute: async (sql) => { assert.equal(typeof sql, 'string'); rawStatements.push(sql); return []; } });
    await original.functions.seedProjectHandoverE2EFixture(recordingConnection, 'poms', fixture);
    const mappings = constantMappings(engine, input, fixture), uses = new Map(mappings.map((m) => [m.name, 0]));
    const unmappedOriginalSeedUuids = [];
    const statements = rawStatements.map((rawSql, index) => {
        const parsed = parseStatement(rawSql), replacements = [];
        for (const token of parsed.annotated.filter((t) => t.kind === 'string')) {
            const mapping = mappings.find((m) => token.value === m.from && m.columns.includes(token.column) && (!m.table || m.table === parsed.table));
            if (mapping) {
                uses.set(mapping.name, uses.get(mapping.name) + 1);
                replacements.push({ start: token.start, end: token.end, name: mapping.name, from: mapping.from, to: mapping.to, column: token.column, rowIndex: token.rowIndex });
            }
        }
        let sql = rawSql;
        for (const change of [...replacements].sort((a, b) => b.start - a.start)) sql = sql.slice(0, change.start) + `'${change.to}'` + sql.slice(change.end);
        const mapped = parseStatement(sql);
        assert.deepEqual([mapped.kind, mapped.table, mapped.columns, mapped.rows], [parsed.kind, parsed.table, parsed.columns, parsed.rows]);
        const uuidRefs = mapped.annotated.filter((t) => t.kind === 'string').flatMap((token) => [...token.value.matchAll(UUIDS)].map((m) => ({
            uuid: m[0], column: token.column, rowIndex: token.rowIndex,
            borrowedDefinition: token.column === 'summary_package_id' && Object.values(borrowedDefinitions).some((id) => id.toLowerCase() === m[0].toLowerCase())
        })));
        for (const ref of uuidRefs) if (engine.isOriginalUuid(ref.uuid) && !ref.borrowedDefinition) unmappedOriginalSeedUuids.push({ statement: index + 1, table: parsed.table, ...ref });
        return { ordinal: index + 1, kind: parsed.kind, schema: 'poms', table: parsed.table, columns: parsed.columns,
            rows: parsed.rows, rawSql, rawSqlSha256: sha(utf8(rawSql)), sql, sqlSha256: sha(utf8(sql)), uuidRefs, replacements };
    });
    const report = {
        formatVersion: 1, kind: 'originalSeeder-prepared-state-pure-source-plan',
        result: unmappedOriginalSeedUuids.length ? 'fail-unmapped-original-uuid' : 'pure-plan',
        source: engine.sourceIdentity, extraction: engine.extraction,
        recipe: { entry: 'seedProjectHandoverE2EFixture', originalTemplate: 'makeHandoverE2EFixture(2,key,true,false,originalOptions)',
            fixture, observedStatementTables: [...new Set(statements.map((s) => s.table))],
            conditionalSourceRetained: ['seedProcessingRebaseline', 'seedOperatingSignalEvidenceState'],
            conditionalSourceExecuted: [], optionalReceiptFreezePlanned: !!fixture.receiptJudgmentFreezeId },
        allowedMappings: mappings.map((m) => ({ ...m, occurrences: uses.get(m.name) })),
        borrowedSeedReferences: { ...borrowedDefinitions, mode: 'caller-prevalidated-readonly; excluded from ownership and cleanup' },
        statements, unmappedOriginalSeedUuids,
        boundary: { recordingExecuteCalls: statements.length, actualSqlExecutions: 0, databaseOrOrmImported: false,
            definitionInsertOrUpsert: false, globalSeederOrCleanupCalled: false, receivablePlanTableSynthesized: false,
            ownershipOrCommitCertified: false, producerBusinessSuccessCertified: false,
            actualDmlNativeConfirmIdentityClosureAndCleanupOwner: 'Root' }
    };
    if (unmappedOriginalSeedUuids.length) throw new PreparedPlanError('Original seed UUID remains after the explicit mapping allowlist', report);
    return report;
}
