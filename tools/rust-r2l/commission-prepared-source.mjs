// SOURCE planning only. Original seeder function bodies/constant initializers
// are extracted unchanged into an isolated VM. Only recording execute is called;
// no global DatabaseSeeder, ORM, PG, definition upsert or cleanup runs here.
// Reference: tools/rust-r2k/r4-prepared-source.mjs SOURCE, not its old evidence.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const require = createRequire(import.meta.url), ts = require('typescript');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = 'apps/poms-api/src/seeders/database.seeder.ts';
const SOURCE_LF_SHA256 = 'c2450781dab397c75c15f70a81bcc258967a18ee467df9befdcbe96b1ccd5fcd';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUIDS = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const ROOT_FUNCTIONS = ['seedProjectHandoverE2EFixture', 'seedProjectHandoverPreparedState', 'makeHandoverE2EFixture'];
const EXPECTED_FUNCTIONS = [...ROOT_FUNCTIONS, 'sqlValue', 'sqlUuid', 'sqlTimestamp', 'sqlDate', 'sqlText', 'hasPreparedHandoverFixture', 'hasProcessingRebaselineFixture', 'handoverParticipantId', 'seedProcessingRebaseline', 'seedOperatingSignalEvidenceState', 'makeOperatingSignalE2EFixture'].sort();
const SELECTED = Object.freeze(['project','contract','contract_term_snapshot','receipt_record','payment_record','approval_summary_snapshot','project_handover','confirmation_record','confirmation_participant','project_receipt_judgment_freeze','operating_baseline_package','project_operating_snapshot','data_maturity_evaluation_result','operating_signal_evaluation_result','operating_signal_gate_binding']);
const EXCLUDED = Object.freeze(['commercial_release_baseline','commercial_baseline_diff_result','contract_readiness_package','change_package_baseline']);
const RESERVED_ACTORS = ['00000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000014'];
const sha = value => createHash('sha256').update(value).digest('hex');
const utf8 = text => Buffer.from(text, 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const uuid = (value, label) => { assert(typeof value === 'string' && UUID.test(value), 'Explicit canonical UUID required: '+label); return value.toLowerCase(); };

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
        reportDiagnostics: true, fileName: 'l-commission-prepared-extracted.ts'
    });
    const errors = (compiled.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
    assert.equal(errors.length, 0, errors.map((d) => `${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`).join('\n'));
    const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
    const original = new vm.Script(compiled.outputText, { filename: 'l-commission-prepared-original-source.js' }).runInContext(context, { timeout: 1000 });
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


// Parse only the literal INSERT / original commercial UPDATE shapes emitted by
// the selected original functions. No expression is evaluated as SQL or JS.
function parsedStatement(sql) {
    const tokens = tokenize(sql), upper = i => tokens[i]?.value.toUpperCase();
    const kind = upper(0), base = kind === 'INSERT' && upper(1) === 'INTO' ? 2 : kind === 'UPDATE' ? 1 : -1;
    assert(base >= 0 && tokens[base]?.value === 'poms' && tokens[base+1]?.value === '.');
    const table = tokens[base+2]?.value;
    assert([...SELECTED,...EXCLUDED].includes(table), 'Unreviewed original table '+table);
    if (kind === 'UPDATE') {
        assert.equal(table,'commercial_release_baseline');
        assert.deepEqual(tokens.filter(t => t.kind === 'identifier').map(t => t.value), ['poms','commercial_release_baseline','latest_diff_result_id','id']);
        assert.equal(upper(base+3),'SET');
        return {kind,table,columns:[],rows:[],rawSql:sql};
    }
    let at=base+3; assert.equal(tokens[at++]?.value,'(');
    const columns=[];
    while(tokens[at]?.value!==')') {
        assert.equal(tokens[at]?.kind,'identifier'); columns.push(tokens[at++].value);
        if(tokens[at]?.value===',')at++;else assert.equal(tokens[at]?.value,')');
    }
    assert.equal(new Set(columns).size,columns.length); at++; assert.equal(upper(at++),'VALUES');
    const rows=[];
    while(true) {
        assert.equal(tokens[at++]?.value,'('); const values={};
        for(const [index,column] of columns.entries()) {
            const expression=[]; let depth=0;
            while(at<tokens.length) {
                const token=tokens[at]; if(depth===0&&[',',')'].includes(token.value))break;
                if(token.value==='(')depth++;if(token.value===')')depth--;
                expression.push(token);at++;
            }
            assert(expression.length>0&&depth===0);
            values[column]=literalValue(expression,table,column);
            if(index<columns.length-1)assert.equal(tokens[at++]?.value,',');
        }
        assert.equal(tokens[at++]?.value,')'); rows.push(values);
        if(tokens[at]?.value!==',')break;at++;
    }
    if(tokens[at]?.value===';')at++;assert.equal(at,tokens.length,'Unexpected SQL suffix');
    return {kind,table,columns,rows,rawSql:sql};
}
function literalValue(expression,table,column) {
    const [first,...suffix]=expression;
    let cast=null;
    if(suffix.length) {
        assert.equal(suffix.length,3);assert.equal(suffix[0].value,':');assert.equal(suffix[1].value,':');
        cast=suffix[2].value.toLowerCase();assert(['date','timestamptz','jsonb','uuid'].includes(cast));
    }
    let value;
    if(first.kind==='string')value=first.value;
    else if(first.value.toLowerCase()==='null')value=null;
    else if(first.value.toLowerCase()==='true')value=true;
    else if(first.value.toLowerCase()==='false')value=false;
    else {assert(first.kind==='word'&&/^\d+$/.test(first.value),`Nonliteral ${table}.${column}`);value=Number(first.value);assert(Number.isSafeInteger(value));}
    if(cast==='jsonb'){assert.equal(typeof value,'string');value=JSON.parse(value);}
    return value;
}
function refs(value,path=[],out=[]) {
    if(typeof value==='string')for(const match of value.matchAll(UUIDS))out.push({uuid:match[0].toLowerCase(),path:[...path]});
    else if(Array.isArray(value))value.forEach((entry,index)=>refs(entry,[...path,index],out));
    else if(value&&typeof value==='object')for(const [key,entry]of Object.entries(value)){refs(key,[...path,'<key>'],out);refs(entry,[...path,key],out);}
    return out;
}
async function recordedOriginal() {
    const engine=loadOriginalSource(), original=engine.original;
    const fixture=original.constants.COMMISSION_MAIN_E2E_FIXTURE;
    assert.equal(fixture.key,'commission-main');
    assert.equal(fixture.key,original.constants.COMMISSION_MAIN_E2E_FIXTURE.key);
    assert.equal(fixture.handoverStatus,'confirmed');
    const raw=[];
    const recorder=Object.freeze({execute:async(sql)=>{assert.equal(typeof sql,'string');raw.push(sql);return[];}});
    await original.functions.seedProjectHandoverE2EFixture(recorder,'poms',fixture);
    const parsed=raw.map((sql,index)=>({...parsedStatement(sql),ordinal:index+1,rawSqlSha256:sha(utf8(sql))}));
    const selected=parsed.filter(statement=>SELECTED.includes(statement.table));
    assert(selected.every(statement=>statement.kind==='INSERT'));
    assert.deepEqual([...new Set(selected.map(s=>s.table))].sort(),[...SELECTED].sort());
    assert.equal(selected.length,16);assert.equal(selected.reduce((n,s)=>n+s.rows.length,0),18);
    assert(selected.some(s=>s.table==='operating_signal_gate_binding'),'Original commission-main operating branch did not execute');
    const c=original.constants;
    const definitions={contractSummaryPackageId:uuid(c.CONTRACT_HANDOVER_SUMMARY_PACKAGE_ID,'original contract definition'),projectHandoverSummaryPackageId:uuid(c.PROJECT_HANDOVER_SUMMARY_PACKAGE_ID,'original handover definition'),operatingSignalSummaryPackageId:uuid(c.OPERATING_SIGNAL_SUMMARY_PACKAGE_ID,'original operating definition')};
    const allRefs=selected.flatMap(statement=>statement.rows.flatMap((row,rowIndex)=>refs(row).map(ref=>({...ref,table:statement.table,ordinal:statement.ordinal,rowIndex}))));
    const borrowed=new Set(Object.values(definitions));
    const required=[...new Set(allRefs.filter(ref=>!borrowed.has(ref.uuid)).map(ref=>ref.uuid))].sort();
    assert.equal(allRefs.filter(ref=>borrowed.has(ref.uuid)&&ref.path[0]!=='summary_package_id').length,0,'Definition UUID used outside the original readonly FK');
    return{engine,fixture,parsed,selected,definitions,required,allRefs};
}
export async function inspectCommissionPreparedSource() {
    const recorded=await recordedOriginal();
    return{
        kind:'commission-prepared-source-inspection',result:'source-only',source:recorded.engine.sourceIdentity,
        extraction:recorded.engine.extraction,originalFixture:copy(recorded.fixture),
        requiredUuidMappings:recorded.required.map(from=>({from,occurrences:recorded.allRefs.filter(ref=>ref.uuid===from)})),
        readonlyBorrowedDefinitions:recorded.definitions,
        requiredTextMappings:{projectNo:recorded.fixture.projectNo,projectName:recorded.fixture.projectName,contractNo:recorded.fixture.contractNo},
        selectedTables:[...SELECTED],selectedStatements:16,selectedRows:18,
        excludedStatements:recorded.parsed.filter(s=>!SELECTED.includes(s.table)).map(s=>({ordinal:s.ordinal,table:s.table,kind:s.kind,rawSql:s.rawSql,rawSqlSha256:s.rawSqlSha256,execute:false})),
        boundary:{SQLExecuted:false,ORMOrPGImported:false,globalSeederCalled:false,definitionUpserted:false,ownershipCertified:false,NativeProducerSuccessCertified:false,prepared:true},
    };
}
export async function buildCommissionPreparedRows(input) {
    assert(input&&typeof input==='object'&&input.uuidMappings&&input.names);
    const recorded=await recordedOriginal(), borrowed=new Set(Object.values(recorded.definitions));
    const mappings=new Map();
    for(const [rawFrom,rawTo]of Object.entries(input.uuidMappings)) {
        const from=uuid(rawFrom,'mapping source'),to=uuid(rawTo,'mapping destination');
        assert(!mappings.has(from));assert(!borrowed.has(from),'Readonly definition cannot be remapped');
        assert.notEqual(from,to,'Source UUID was not replaced');
        assert(!recorded.engine.isOriginalUuid(to)&&!RESERVED_ACTORS.includes(to)&&!borrowed.has(to),'Source/reserved ID cannot become fresh prepared identity');
        mappings.set(from,to);
    }
    assert.deepEqual([...mappings.keys()].sort(),recorded.required,'Explicit UUID map must cover all and only selected original PK/FK/text/JSON references');
    assert.equal(new Set(mappings.values()).size,mappings.size,'Different original identities cannot collapse into one new UUID');
    const textMappings=[];
    for(const key of ['projectNo','projectName','contractNo']) {
        const value=input.names[key];assert(typeof value==='string'&&value.length>0);assert.notEqual(value,recorded.fixture[key]);
        textMappings.push({field:key,from:recorded.fixture[key],to:value});
    }
    const extraLogical=(input.logicalIds??[]).map(value=>uuid(value,'explicit logical ID in a fresh name'));
    assert.equal(new Set(extraLogical).size,extraLogical.length);
    for(const value of extraLogical)assert(!recorded.engine.isOriginalUuid(value)&&!RESERVED_ACTORS.includes(value)&&!borrowed.has(value));
    const freshValues=new Set(mappings.values());
    const nameLogical=[...new Set(textMappings.flatMap(mapping=>refs(mapping.to).map(ref=>ref.uuid)).filter(value=>!freshValues.has(value)&&!borrowed.has(value)))].sort();
    assert.deepEqual([...extraLogical].sort(),nameLogical,'Fresh name UUIDs require an exact explicit logical-ID declaration; Root still decides case admission');
    const allowedFresh=new Set([...freshValues,...extraLogical]);
    const counts=new Map(recorded.required.map(key=>[key,0]));
    const mapText=text=>{
        let mapped=text.replace(UUIDS,original=>{
            const key=original.toLowerCase();if(borrowed.has(key))return original;
            assert(mappings.has(key),'Unexpected original UUID in selected string/JSON');counts.set(key,counts.get(key)+1);return mappings.get(key);
        });
        for(const mapping of textMappings)mapped=mapped.replaceAll(mapping.from,mapping.to);
        return mapped;
    };
    const mapValue=value=>{
        if(typeof value==='string')return mapText(value);
        if(Array.isArray(value))return value.map(mapValue);
        if(value&&typeof value==='object'){
            const entries=Object.entries(value).map(([key,item])=>[mapText(key),mapValue(item)]);
            assert.equal(new Set(entries.map(([key])=>key)).size,entries.length,'Mapped JSON key collision');return Object.fromEntries(entries);
        }
        return value;
    };
    const rows=recorded.selected.flatMap(statement=>statement.rows.map((originalValues,rowIndex)=>({
        table:statement.table,values:mapValue(originalValues),
        source:{file:SOURCE,statementOrdinal:statement.ordinal,rowIndex,columns:[...statement.columns],rawSqlSha256:statement.rawSqlSha256},
        provenance:'prepared-original-seeder-source-not-Native-generated',
    })));
    assert.equal(rows.length,18);
    const rowIds=rows.map(row=>uuid(row.values.id,'prepared row PK'));assert.equal(new Set(rowIds).size,rowIds.length);
    for(const row of rows)for(const ref of refs(row.values))assert(borrowed.has(ref.uuid)||allowedFresh.has(ref.uuid),'Unmapped/foreign UUID survived prepared projection');
    for(const [key,count]of counts)assert(count>0,'Unused explicit UUID mapping: '+key);
    assert.equal(rows.find(row=>row.table==='contract').values.status,'active');
    assert.equal(rows.find(row=>row.table==='project_handover').values.status,'confirmed');
    assert.equal(rows.find(row=>row.table==='confirmation_record').values.confirmed_count,2);
    assert.equal(rows.find(row=>row.table==='operating_signal_gate_binding').values.gate_stage_type,'final');
    return{
        formatVersion:1,kind:'commission-prepared-original-source-typed-rows',result:'source-plan-not-executed',
        source:recorded.engine.sourceIdentity,extraction:recorded.engine.extraction,
        originalEntry:{function:'seedProjectHandoverE2EFixture',fixture:'COMMISSION_MAIN_E2E_FIXTURE',originalKeyUnchanged:'commission-main',operatingBranchRecorded:true,functionBodiesChanged:false},
        selectedTables:[...SELECTED],rows,
        mappings:[...mappings].map(([from,to])=>({from,to,occurrences:counts.get(from)})),textMappings,explicitLogicalIds:extraLogical,
        readonlyBorrowedDefinitions:recorded.definitions,
        excludedStatements:recorded.parsed.filter(s=>!SELECTED.includes(s.table)).map(s=>({ordinal:s.ordinal,table:s.table,kind:s.kind,rawSql:s.rawSql,rawSqlSha256:s.rawSqlSha256,execute:false})),
        boundary:{recordedExecuteCalls:recorded.parsed.length,actualSQLExecutions:0,ORMOrPGImported:false,globalSeederOrCleanupCalled:false,definitionInsertOrUpsert:false,prepared:true,NativeProducerSuccessCertified:false,ownershipOrCommitCertified:false,requiresReviewedPreparedBatch:true,actualDMLAndBeforeAbsenceAndCommitAndReadonlyDefinitionHashesOwner:'Root/B'},
    };
}
