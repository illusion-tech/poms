// Inactive SOURCE recipe. No ORM, database, HTTP or whole seeder is invoked.
// Recording an original object/method is prepared state, not a Native producer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url), ts = require('typescript');
const sha = value => createHash('sha256').update(value).digest('hex');
const ROOT = 'apps/poms-api/src/';
const files = Object.freeze({
    repository: [ROOT + 'app/features/sales-follow-up/sales-follow-up.repository.ts', 'bbf595691256c1363be3120a7bfbf31ffce536c4e126d07b0558a6dc56ccf664'],
    service: [ROOT + 'app/features/sales-follow-up/sales-follow-up.service.ts', 'f62d1f512bcafac142ba8fafc8e8df4019b8309f87895aa6b9922dabad29ca96'],
    followup: [ROOT + 'app/features/sales-follow-up/sales-follow-up-record.entity.ts', 'f027ca0bf5d53c09530c5cc4841631d06bd2ef932d899a3251828383b554fe6c'],
    lead: [ROOT + 'app/features/lead/lead.entity.ts', '7c020fc6e5ae3374819d797c7f02061bd693109b83f667ad230391635182d3ef'],
    todo: [ROOT + 'app/features/approval/todo-item.entity.ts', '74e9796a6c21333118eb4be277fa5ec40d087acbddc6c55f4ab6da580bdbc66c'],
    approval: [ROOT + 'app/features/approval/approval.service.ts', 'd64a8d8cefadc282a1a69933ad428e077e0eb2b3cc83853b81288136999a557d'],
    trial: [ROOT + 'seeders/business-trial.seeder.ts', '05348951462417e1058b1228c36f2ad39a9ef14002b09c44475b29edb6a5a5a9'],
    sql: [ROOT + 'seeders/seed-utils.ts', 'a7a582fa25b7e149d919ae6fa84767281cc092ddfb798fe8fe3d4def7528d869'],
    enums: ['libs/shared/contracts/src/lib/shared-contracts.ts', 'fbf31addc344ce395fe917141c208fce27e84270850c4df4cd842279ffa67097'],
});
const uuid = value => { assert(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)); return value.toLowerCase(); };
const copy = value => JSON.parse(JSON.stringify(value));

export const todoFactsCandidate = Object.freeze({
    enabled: false, fixtureEpoch40Modified: false, observer7Modified: false,
    requiredTables: ['lead', 'sales_follow_up_record'],
    identities: { lead: ['lead_no', 'customer_id', 'created_by'], sales_follow_up_record: ['customer_id', 'lead_id', 'project_id', 'created_by'] },
    sourceConstructor: 'Actual SalesFollowUpService create object, then actual repository reminder methods in recording-only fresh-stream state.',
    preparedRows: 7, preparedNotNativeGenerated: true,
    scopeDelta: 'Explicit proven customer/lead anchors for project_id=null sales rows. Followup/target/customer identity and source ownership must match the declared anchor; no inferred project or arbitrary table allowance.',
    referenceDelta: 'Todo source_type=sales-follow-up-record must resolve to its exact owned followup; target/project/assignee admission uses its original nullable target shape. Do not treat it as an approval parent.',
    primaryProof: 'Root direct before-PK-absence, INSERT RETURNING identity/xmin, actual outer COMMIT ACK and independent visibility, one ordered row at a time; no forward-reference waiver needed.',
    pg7Boundary: 'Keep PG7 frozen. Do not open a PG capture case while preparing non-approval Todo rows. Later GET creates no business rows; new tables are never admitted by PG7.',
    seedBoundary: 'Borrow dictionary code customer-visit readonly if desired; never insert/update/adopt dictionary or seed principals. All row UUID references are fresh owned actors/org/customer/project or the individually declared readonly assignee.',
    acceptance: 'Only actual L GET consumption, six fact projections, statuses/actions, missing nullable due, UTC+8 text, full DTO/raw-row equality; no Sales/Lead domain certification.',
});

function load(key) {
    const [file, expected] = files[key], raw = fs.readFileSync(file), text = raw.toString('utf8');
    assert.equal(sha(text.replace(/\r\n/g, '\n')), expected, 'Original source changed: ' + file);
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    assert.equal(ast.parseDiagnostics.length, 0); return { file, text, ast, rawBytesSha256: sha(raw), normalizedLfSha256: expected };
}
function nodes(root, predicate) {
    const found = []; const visit = node => { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }; visit(root); return found;
}
function record(source, node, name) {
    const text = node.getText(source.ast), start = node.getStart(source.ast);
    return { file: source.file, name, firstLine: source.ast.getLineAndCharacterOfPosition(start).line + 1,
        lastLine: source.ast.getLineAndCharacterOfPosition(node.end).line + 1, originalText: text, originalTextSha256: sha(text) };
}
function declarations(source, wanted) {
    const symbols = new Map();
    for (const node of source.ast.statements) {
        if (ts.isFunctionDeclaration(node) && node.name) symbols.set(node.name.text, { node, kind: 'function' });
        if (ts.isVariableStatement(node)) for (const declaration of node.declarationList.declarations)
            if (ts.isIdentifier(declaration.name)) symbols.set(declaration.name.text, { node: declaration, kind: 'constant' });
    }
    const selected = new Set(), pending = [...wanted];
    while (pending.length) {
        const name = pending.shift(); if (selected.has(name)) continue;
        const entry = symbols.get(name); assert(entry, 'Missing source declaration ' + name); selected.add(name);
        for (const id of nodes(entry.node, ts.isIdentifier)) if (symbols.has(id.text) && id.text !== name) pending.push(id.text);
    }
    return [...selected].map(name => ({ name, ...symbols.get(name) })).sort((a, b) => a.node.pos - b.node.pos).map(entry => ({
        ...record(source, entry.node, entry.name), code: entry.kind === 'constant' ? 'const ' + entry.node.getText(source.ast) + ';' : entry.node.getText(source.ast).replace(/^export\s+/, ''),
    }));
}
function compile(program, sandbox) {
    assert.equal(ts.version, '6.0.3');
    const result = ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
    const errors = (result.diagnostics ?? []).filter(item => item.category === ts.DiagnosticCategory.Error);
    assert.equal(errors.length, 0, errors.map(item => `${item.code}: ${ts.flattenDiagnosticMessageText(item.messageText, '\n')}`).join('\n'));
    return { value: new vm.Script(result.outputText, { filename: 'l-original-todo-prepared-projection.js' }).runInContext(
        vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } }), { timeout: 1000 }), compiledSha256: sha(result.outputText) };
}
function columnMap(source, schemaName) {
    const definition = nodes(source.ast, node => ts.isVariableDeclaration(node) && node.name.getText(source.ast) === schemaName); assert.equal(definition.length, 1);
    const initializer = definition[0].initializer; assert(ts.isCallExpression(initializer));
    const entity = initializer.arguments[0]; assert(ts.isObjectLiteralExpression(entity));
    const properties = entity.properties.filter(node => ts.isPropertyAssignment(node) && node.name.getText(source.ast) === 'properties'); assert.equal(properties.length, 1);
    assert(ts.isObjectLiteralExpression(properties[0].initializer));
    return Object.fromEntries(properties[0].initializer.properties.map(property => {
        assert(ts.isPropertyAssignment(property)); const name = property.name.getText(source.ast);
        const calls = nodes(property.initializer, node => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'fieldName');
        assert(calls.length <= 1); const value = calls[0]?.arguments[0]; assert(!value || ts.isStringLiteralLike(value)); return [name, value?.text ?? name];
    }));
}
function sqlFirstRow(sql) {
    const header = /^\s*insert\s+into\s+"poms"\."lead"\s*\(([^)]+)\)\s*values\s*\(/i.exec(sql); assert(header);
    const columns = [...header[1].matchAll(/"([a-z_]+)"/g)].map(match => match[1]);
    const values = []; let token = '', quoted = false, ended = false;
    for (let index = header[0].length; index < sql.length; index++) {
        const char = sql[index];
        if (char === "'") {
            token += char;
            if (quoted && sql[index + 1] === "'") { token += sql[++index]; continue; }
            quoted = !quoted; continue;
        }
        if (!quoted && (char === ',' || char === ')')) {
            const literal = token.trim().replace(/::(?:date|timestamptz)$/i, '');
            values.push(literal === 'null' ? null : /^'.*'$/s.test(literal) ? literal.slice(1, -1).replaceAll("''", "'") : /^-?\d+(?:\.\d+)?$/.test(literal) ? Number(literal) : assert.fail('Unreviewed source SQL value'));
            token = ''; if (char === ')') { ended = true; break; } continue;
        }
        token += char;
    }
    assert(ended && !quoted); assert.equal(values.length, columns.length); return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
}

// An exact original mapper oracle for Root's complete DTO comparison. It is
// separate from actual SQL/hydration evidence and adds no response serializer.
export function originalTodoProjection() {
    const shared = load('enums'), approval = load('approval'), entity = load('todo');
    const names = ['TodoSourceTypeValue', 'TodoTypeValue', 'TodoStatusValue'];
    const enums = declarations(shared, names), functions = declarations(approval, ['mapTodoItemToSummary']);
    const result = compile(enums.map(item => item.code).join('\n') + '\n' + functions.map(item => item.code).join('\n') + '\nmapTodoItemToSummary;', {});
    const map = columnMap(entity, 'TodoItemSchema');
    const schema = nodes(entity.ast, node => ts.isVariableDeclaration(node) && node.name.getText(entity.ast) === 'TodoItemSchema')[0];
    const properties = schema.initializer.arguments[0].properties.find(node => ts.isPropertyAssignment(node) && node.name.getText(entity.ast) === 'properties').initializer.properties;
    const dates = new Set(properties.filter(property => nodes(property.initializer, node => ts.isCallExpression(node)
        && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'datetime').length).map(property => property.name.getText(entity.ast)));
    return { source: { file: approval.file, rawBytesSha256: approval.rawBytesSha256, normalizedLfSha256: approval.normalizedLfSha256 },
        extraction: [...enums, ...functions], compiledSha256: result.compiledSha256,
        hydrateTodo(row) { return Object.fromEntries(Object.entries(map).map(([property, column]) => [property,
            row[column] == null ? row[column] : dates.has(property) ? new Date(row[column]) : row[column]])); },
        project(todo, { approvalRecord, contract, payout, adjustment, project, lead, customer } = {}) {
            return copy(result.value(todo, approvalRecord, contract, payout, adjustment, project, lead, customer));
        },
        actualDatabaseOrOrmHydrationCertified: false,
    };
}

export async function buildPreparedTodoFacts({ runId, actorId, orgId, customer, project, ids, preparedAt = '2026-05-01T00:00:00.123Z',
    dueDates = ['2026-05-06T02:00:00.000Z', '2026-05-07T01:30:00.000Z', '2026-05-08T03:15:00.000Z'],
    followUpType = 'phone', leadSourceCode = 'customer-visit', assigneeId = actorId }) {
    for (const value of [runId, actorId, orgId, customer.id, project.id, assigneeId, ids.lead, ...ids.followups, ...ids.todos]) uuid(value);
    assert.equal(ids.followups.length, 3); assert.equal(ids.todos.length, 3); assert.equal(dueDates.length, 3);
    assert.equal(new Set([ids.lead, ...ids.followups, ...ids.todos]).size, 7);
    assert.equal(project.customer_id, customer.id); assert(customer.display_name && project.project_name);
    const loaded = Object.fromEntries(Object.keys(files).map(key => [key, load(key)])), extraction = [];
    const sharedNames = ['SalesFollowUpRecordStatusValue', 'SalesFollowUpOutcomeValue', 'TodoSourceTypeValue', 'TodoTypeValue',
        'TodoStatusValue', 'TodoPriorityValue', 'BusinessDomainValue', 'TargetObjectTypeValue'];
    const shared = declarations(loaded.enums, sharedNames); extraction.push(...shared);
    const repoClass = nodes(loaded.repository.ast, node => ts.isClassDeclaration(node) && node.name?.text === 'SalesFollowUpRepository')[0]; assert(repoClass);
    const methodNames = ['syncReminderTodoForActiveRecord', 'resolveReminderTarget', 'buildReminderSummary'];
    const methods = methodNames.map(name => { const found = repoClass.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(loaded.repository.ast) === name); assert(found); return record(loaded.repository, found, name); }); extraction.push(...methods);
    const topConsts = loaded.repository.ast.statements.filter(ts.isVariableStatement).flatMap(node => node.declarationList.declarations).map(node => record(loaded.repository, node, node.name.getText(loaded.repository.ast)));
    extraction.push(...topConsts);
    const createMethod = nodes(loaded.service.ast, node => ts.isMethodDeclaration(node) && node.name.getText(loaded.service.ast) === 'createSalesFollowUpRecord')[0]; assert(createMethod);
    const constructor = nodes(createMethod, node => ts.isCallExpression(node) && node.expression.getText(loaded.service.ast) === 'this.salesFollowUpRepository.create'); assert.equal(constructor.length, 1);
    const originalObject = constructor[0].arguments[0]; assert(ts.isObjectLiteralExpression(originalObject)); extraction.push(record(loaded.service, originalObject, 'createSalesFollowUpRecord.original-create-object'));
    const enumProgram = shared.map(item => item.code).join('\n');
    const seedHelpers = declarations(loaded.sql, ['sqlValue', 'sqlText', 'sqlUuid', 'sqlDate', 'sqlTimestamp']); extraction.push(...seedHelpers);
    const leadSql = nodes(loaded.trial.ast, node => (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /insert\s+into[\s\S]*?\."lead"\s*\(/i.test(node.getText(loaded.trial.ast)));
    assert.equal(leadSql.length, 1); extraction.push(record(loaded.trial, leadSql[0], 'seedTrialDemoData.original-lead-INSERT-template'));
    const actors = { platformAdminId: actorId, salesOwnerId: actorId, salesOrgId: orgId, customerVisitSourceCode: leadSourceCode, bidNoticeSourceCode: leadSourceCode };
    const seed = compile(seedHelpers.map(item => item.code).join('\n') + '\n(' + leadSql[0].getText(loaded.trial.ast) + ');',
        { schema: 'poms', actors, customerIdByNo: new Map([['TRIAL-CUST-2026-0001', customer.id], ['TRIAL-CUST-2026-0002', customer.id]]) });
    const originalLead = sqlFirstRow(seed.value), leadRow = { ...originalLead, id: ids.lead, lead_no: 'L-TODO-LD-' + runId,
        lead_name: originalLead.lead_name + ' L ' + runId, customer_name: customer.display_name };
    const start = new Date(preparedAt); assert(Number.isFinite(start.getTime()));
    class PreparedDate extends Date { constructor(...args) { super(...(args.length ? args : [preparedAt])); } static now() { return start.getTime(); } }
    let nextFollowup;
    const projected = compile(enumProgram + '\n' + topConsts.map(item => 'const ' + item.originalText + ';').join('\n')
        + '\nclass OriginalReminderProjection {\n' + methods.map(item => item.originalText).join('\n') + '\n}\n'
        + '({ values: {' + sharedNames.join(',') + '}, reminder: new OriginalReminderProjection(), makeRecord(input,operator,customer,lead,project,owner) { return '
        + originalObject.getText(loaded.service.ast) + '; } });',
        { Date: PreparedDate, TodoItem: Object.freeze({ sourceOnlyNominalTarget: true }), randomUUID: () => nextFollowup });
    const maps = { lead: columnMap(loaded.lead, 'LeadSchema'), sales_follow_up_record: columnMap(loaded.followup, 'SalesFollowUpRecordSchema'), todo_item: columnMap(loaded.todo, 'TodoItemSchema') };
    const databaseRow = (table, value) => Object.fromEntries(Object.entries(value).map(([property, item]) => {
        const column = maps[table][property]; assert(column, 'Unmapped original scalar ' + property);
        return [column, Object.prototype.toString.call(item) === '[object Date]' ? item.toISOString() : item];
    }));
    const rows = [{ table: 'lead', values: leadRow, source: 'original business-trial first Lead INSERT projection, with explicit fresh ID/number/actor/customer substitutions' }];
    const reminders = [];
    for (const [index, target] of ['project', 'lead', 'customer'].entries()) {
        nextFollowup = ids.followups[index];
        const input = { followUpType, occurredAt: preparedAt, summary: index === 1 ? '  ' : index === 2 ? '源'.repeat(170) : '  SOURCE prepared follow-up  ',
            detail: null, outcome: projected.value.values.SalesFollowUpOutcomeValue.Other, nextFollowUpAt: dueDates[index], ownerUserId: assigneeId, ownerOrgId: orgId };
        const lead = target === 'lead' ? { id: ids.lead, leadName: leadRow.lead_name } : null;
        const projectValue = target === 'project' ? { id: project.id, projectName: project.project_name } : null;
        const customerValue = { id: customer.id, displayName: customer.display_name };
        const followup = projected.value.makeRecord(input, { id: actorId }, customerValue, lead, projectValue, { ownerUserId: assigneeId, ownerOrgId: orgId });
        followup.createdAt = new PreparedDate(); followup.updatedAt = new PreparedDate();
        let todo;
        const recording = { async find() { return []; }, async findOne() { return null; },
            create(_entity, values) { assert.equal(todo, undefined); todo = { id: ids.todos[index], ...values, createdAt: new PreparedDate(start.getTime() + index + 1), updatedAt: new PreparedDate() }; return todo; },
            persist(value) { assert.equal(value, todo); } };
        await projected.value.reminder.syncReminderTodoForActiveRecord(recording, followup, { customer: customerValue, lead, project: projectValue });
        assert(todo, 'This original fresh-stream projection requires nextFollowUpAt'); assert.equal(todo.targetObjectType, target);
        assert.equal(todo.projectId, target === 'project' ? project.id : null);
        rows.push({ table: 'sales_follow_up_record', values: databaseRow('sales_follow_up_record', followup), source: 'original service create object, prepared only' });
        rows.push({ table: 'todo_item', values: databaseRow('todo_item', todo), source: 'original repository method, fresh-stream recording only' });
        reminders.push({ target, followupId: followup.id, todoId: todo.id, projectId: todo.projectId, dueAt: todo.dueAt.toISOString() });
    }
    assert.equal(rows.length, 7);
    const known = new Set([actorId, orgId, assigneeId, customer.id, project.id, ids.lead, ...ids.followups, ...ids.todos].map(uuid));
    for (const row of rows) for (const value of Object.values(row.values)) if (typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)) assert(known.has(uuid(value)), 'Original source UUID was not remapped');
    return { formatVersion: 1, kind: 'inactive-prepared-original-sales-todo-fact-projection', candidate: todoFactsCandidate,
        sources: Object.values(loaded).map(({ ast, text, ...receipt }) => receipt), extraction, compiler: 'typescript@' + ts.version,
        compiledSha256: { leadTemplate: seed.compiledSha256, originalReminderProjection: projected.compiledSha256 }, columnMappings: maps,
        substitutions: { originalLeadId: originalLead.id, actualLeadId: ids.lead, originalLeadNo: originalLead.lead_no, actualLeadNo: leadRow.lead_no,
            actors, customerId: customer.id, projectId: project.id, preparedAt, orderingTimesExplicitPreparedFacts: true },
        rows: copy(rows), reminders, databaseOrOrmInvoked: false, HTTPExecuted: false, ownershipAdmitted: false, NativeProducerCertified: false };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url && process.argv.includes('--check')) {
    const id = number => '11111111-1111-4111-8111-' + String(number).padStart(12, '0');
    const plan = await buildPreparedTodoFacts({ runId: id(1), actorId: id(2), orgId: id(3), customer: { id: id(4), display_name: 'SOURCE customer' },
        project: { id: id(5), customer_id: id(4), project_name: 'SOURCE project' }, ids: { lead: id(6), followups: [id(7), id(8), id(9)], todos: [id(10), id(11), id(12)] } });
    assert.equal(plan.rows.length, 7); assert.equal(plan.reminders[1].projectId, null); assert.equal(plan.reminders[2].projectId, null);
    assert.equal(plan.rows.find(row => row.table === 'todo_item' && row.values.target_object_type === 'lead').values.summary, null);
    assert.equal(plan.rows.find(row => row.table === 'todo_item' && row.values.target_object_type === 'customer').values.summary.length, 160);
    const oracle = originalTodoProjection(), firstTodo = plan.rows.find(row => row.table === 'todo_item').values;
    const projected = oracle.project(oracle.hydrateTodo(firstTodo), { project: { projectName: 'SOURCE project' } });
    assert.equal(projected.targetTitle, 'SOURCE project'); assert.equal(projected.currentNodeName, '下次跟进：2026-05-06 10:00'); assert.deepEqual(projected.allowedActions, []);
    console.log(JSON.stringify({ kind: 'pure-original-todo-prepared-source-check', rows: 7, addedTables: 2,
        ORMInitialized: false, SQLExecuted: false, HTTPExecuted: false, NativeProducerCertified: false, fixtureActivated: false }));
}
