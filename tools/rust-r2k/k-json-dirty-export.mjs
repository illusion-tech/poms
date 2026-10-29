// Actual gamma03 PG observations + mechanical original helper + real SDK JSON type conversion.
// No ORM initialization, DB connection, HTTP, or report mutation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { Script } from 'node:vm';
const root = path.resolve(import.meta.dirname, '../..'), require = createRequire(import.meta.url), ts = require('typescript');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function input(backend) { const at = process.argv.indexOf('--' + backend + '-report'); const file = at >= 0 ? process.argv[at + 1] : path.resolve(root, 'tmp/rust-r2k/k-http-' + backend + '-gamma03.json'); const raw = readFileSync(file), report = JSON.parse(raw); assert.equal(report.backend, backend); assert.equal(report.tag, 'gamma03'); return { report, source: { file: 'tmp/rust-r2k/k-http-' + backend + '-gamma03.json', sha256: hash(raw) } }; }
const nest = input('nest'), rust = input('rust');
function observed(report) {
    const attachment = report.attachments.find(row => row.originalName === `B-${report.runId.slice(0, 8)}.txt`); assert(attachment);
    const request = report.requests.find(row => row.name === 'advanced.multisource.refresh'); assert(request);
    const find = facts => { const rows = facts.project_handover_attachment_selection.filter(row => row.attachment_id === attachment.id && row.handover_id === report.fixture.handoverId); assert.equal(rows.length, 1); return rows[0]; };
    const before = find(request.before), after = find(request.after);
    assert.deepEqual(before.source_refs, after.source_refs, 'Actual B refs changed semantic value unexpectedly');
    const omit = row => Object.fromEntries(Object.entries(row).filter(([key]) => !['updated_at', 'row_version'].includes(key)));
    assert.deepEqual(omit(before), omit(after));
    return { request, before, after, links: request.before.attachment_link.filter(row => row.attachment_id === attachment.id && row.status === 'active').map(row => ({ targetType: row.target_type, targetId: row.target_id, relationType: row.relation_type })) };
}
const n = observed(nest.report), r = observed(rust.report);
assert.equal(n.after.row_version, n.before.row_version + 1); assert.equal(r.after.row_version, r.before.row_version);
const serviceFile = 'apps/poms-api/src/app/features/attachment/attachment.service.ts', raw = readFileSync(path.resolve(root, serviceFile)), source = ts.createSourceFile(serviceFile, raw.toString('utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const frozen = JSON.parse(readFileSync(path.resolve(root, 'docs/design/rust-r2k/k-sources.json'), 'utf8')).sources.find(row => row.file === serviceFile);
assert(frozen && (hash(raw) === frozen.rawBytesSha256 || hash(raw.toString('utf8').replace(/\r\n/g, '\n')) === frozen.normalizedLfSha256));
const type = source.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'AttachmentService'); assert(type);
const methods = ['buildSourceRefs', 'mergeSourceRefs'].map(name => { const method = type.members.find(node => node.name?.getText(source) === name); assert(method); return method.getText(source); });
const compiled = ts.transpileModule(`class OriginalRefs { ${methods.join('\n')} } exports.helpers=new OriginalRefs();`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {}; new Script(compiled).runInNewContext({ exports });
const helpers = exports.helpers;
let assigned = [];
for (const [targetType, targetId, label] of [['project', nest.report.fixture.projectId, '项目附件'], ['project-handover', nest.report.fixture.handoverId, '已纳入移交附件']]) {
    assert(n.links.some(link => link.targetType === targetType && link.targetId === targetId));
    assigned = helpers.mergeSourceRefs(assigned, helpers.buildSourceRefs(n.links, { targetType, targetId, label }));
}
assert.deepEqual(JSON.parse(JSON.stringify(assigned)), n.before.source_refs);
const { JsonType } = require('@mikro-orm/core'), { PostgreSqlPlatform } = require('@mikro-orm/postgresql');
const jsonType = new JsonType(), platform = new PostgreSqlPlatform();
assert.equal(jsonType.ensureComparable({}, {}), true);
const convert = value => jsonType.convertToDatabaseValue(value, platform, { mode: 'serialization' });
function vector(name, beforeRaw, afterRaw) { const old = convert(JSON.parse(beforeRaw)), current = convert(JSON.parse(afterRaw)); return { name, beforeRaw, afterRaw, expectedBefore: old, expectedAfter: current, expectedDirty: old !== current }; }
const beforeRaw = JSON.stringify(n.before.source_refs, null, 2), assignedRaw = JSON.stringify(assigned);
const changed = structuredClone(JSON.parse(assignedRaw)); changed[0].label += ' changed';
const cases = [vector('actual-PG-key-order-to-original-fresh-assignment', beforeRaw, assignedRaw), vector('same-managed-order-syntax-whitespace-only', JSON.stringify(assigned, null, 2), assignedRaw), vector('just-flushed-managed-snapshot-unchanged', assignedRaw, assignedRaw), vector('actual-value-change', assignedRaw, JSON.stringify(changed))];
assert.deepEqual(cases.map(row => row.expectedDirty), [true, false, false, true]);
const sdkRoot = path.dirname(require.resolve('@mikro-orm/core'));
assert.equal(JSON.parse(readFileSync(path.join(sdkRoot, 'package.json'), 'utf8')).version, '7.0.11');
const output = { formatVersion: 1, kind: 'actual-gamma03-derived-K-ordered-JSON-dirty-regression', execution: 'Original source helper + actual locked SDK conversion only; not new DB/runtime execution', sources: [nest.source, rust.source, { file: serviceFile, sha256: hash(raw) }, ...['types/JsonType.js', 'platforms/Platform.js', 'utils/EntityComparator.js'].map(file => ({ package: '@mikro-orm/core@7.0.11', file, sha256: hash(readFileSync(path.join(sdkRoot, file))) }))], compiledHelperSha256: hash(compiled), actual: { case: n.request.name, nativeSelectionId: n.before.id, rustSelectionId: r.before.id, nativeVersions: [n.before.row_version, n.after.row_version], rustVersions: [r.before.row_version, r.after.row_version], semanticPGRefsBeforeAfterEqual: true, nativeUpdateShapes: nest.report.sql.filter(row => row.phase === 'start' && row.context?.caseId === n.request.name && row.statement === 'UPDATE poms.project_handover_attachment_selection').map(row => ({ sequence: row.sequence, sqlShape: row.sqlShape })) }, cases };
assert(output.actual.nativeUpdateShapes.some(row => row.sqlShape.includes('source_refs') && row.sqlShape.includes('case')));
const text = JSON.stringify(output, null, 2) + '\n', target = path.resolve(root, 'tools/rust-r2k/k-json-dirty-golden.json');
if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8').replace(/\r\n/g, '\n'), text); else writeFileSync(target, text);
console.log(JSON.stringify({ mode: process.argv.includes('--check') ? 'check' : 'export', cases: cases.length, nativeVersions: output.actual.nativeVersions, rustVersions: output.actual.rustVersions, source: 'mechanical original helper/real SDK on immutable actual PG inputs; no new PG/HTTP' }));
