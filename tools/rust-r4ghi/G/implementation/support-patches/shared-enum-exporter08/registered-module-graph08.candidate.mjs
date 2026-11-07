// Candidate additive analyzer for the existing R1B exporter. It writes no Rust.
// Production integration must retain assertSourceGuard before this analyzer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { Script } from 'node:vm';

export const CLOSED_MODULES = Object.freeze([
    'libs/shared/contracts/src/index.ts',
    'libs/shared/contracts/src/lib/shared-contracts.ts',
    'libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated.ts',
]);
const normalize = (text) => text.replace(/\r\n/g, '\n');
const sha = (text) => createHash('sha256').update(text).digest('hex');
const same = (a, b, message) => assert.equal(JSON.stringify(a), JSON.stringify(b), message);
const R0_PATH = 'docs/design/rust-r0-api-operations.json';
const R0_SHA = '3d126e07d5abf2c56f41c35fc25b78a13dbe094450b470e8bb4c950ce8a2986c';
const ZOD_ROOT_FACTORIES = new Set([
    'array', 'boolean', 'discriminatedUnion', 'email', 'enum', 'lazy',
    'literal', 'null', 'number', 'object', 'record', 'strictObject',
    'string', 'union', 'unknown', 'uuid',
]);

function isZMethod(ts, node, method) {
    return ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'z'
        && node.expression.name.text === method;
}
function runtime(root) {
    const require = createRequire(resolve(root, 'package.json'));
    const ts = require('typescript');
    const zod = require('zod');
    const zodVersion = require('zod/package.json').version;
    if (process.versions.node.split('.')[0] !== '24' || ts.version !== '6.0.3' || zodVersion !== '4.6.1') {
        throw new Error('Registered R1B modules require the unchanged Node24/TS6.0.3/Zod4.6.1 runtime');
    }
    return { ts, zod, zodVersion };
}

function inputModule(specifier, from) {
    if (specifier === 'zod') return 'zod';
    if (!specifier.startsWith('.')) throw new Error(`Unregistered module import ${specifier}`);
    const absolute = resolve('/', dirname(from), specifier + (specifier.endsWith('.ts') ? '' : '.ts')).replaceAll('\\', '/');
    // resolve('/') is platform-dependent, so match only exact registered suffixes.
    const matches = CLOSED_MODULES.filter((name) => absolute.endsWith('/' + name));
    if (matches.length !== 1) throw new Error(`Unregistered module edge ${from} -> ${specifier}`);
    return matches[0];
}

function syntax(ts, text, path) {
    const sf = ts.createSourceFile(path, normalize(text), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    if (sf.parseDiagnostics.length) throw new Error(`${path}: invalid TypeScript`);
    const checkZodConstruct = (node) => {
        if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'z') {
            throw new Error(`${path}: unregistered computed Zod member construct`);
        }
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
            && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'z'
            && !ZOD_ROOT_FACTORIES.has(node.expression.name.text)) {
            throw new Error(`${path}: unregistered Zod root factory ${node.expression.name.text}`);
        }
        ts.forEachChild(node, checkZodConstruct);
    };
    checkZodConstruct(sf);
    const statements = [];
    const imports = [];
    const variables = new Map();
    const names = new Set();
    const functions = [];
    const enumCalls = [];
    for (const statement of sf.statements) {
        const position = sf.getLineAndCharacterOfPosition(statement.getStart(sf));
        let kind;
        if (ts.isImportDeclaration(statement)) {
            if (!statement.importClause || !ts.isStringLiteral(statement.moduleSpecifier)) throw new Error(`${path}: side-effect/unknown import`);
            if (statement.moduleSpecifier.text === 'zod') {
                const clause = statement.importClause;
                if (clause.isTypeOnly || clause.name || !ts.isNamedImports(clause.namedBindings)
                    || clause.namedBindings.elements.length !== 1 || clause.namedBindings.elements[0].name.text !== 'z'
                    || clause.namedBindings.elements[0].propertyName || clause.namedBindings.elements[0].isTypeOnly) {
                    throw new Error(`${path}: only the existing exact named Zod import is registered`);
                }
            }
            kind = 'closed-import';
            imports.push({ specifier: statement.moduleSpecifier.text, target: inputModule(statement.moduleSpecifier.text, path), declarationSha256: sha(statement.getText(sf)) });
        } else if (ts.isExportDeclaration(statement)) {
            if (statement.moduleSpecifier && !ts.isStringLiteral(statement.moduleSpecifier)) throw new Error(`${path}: dynamic export`);
            kind = 'registered-export';
            if (statement.moduleSpecifier) imports.push({ specifier: statement.moduleSpecifier.text, target: inputModule(statement.moduleSpecifier.text, path), declarationSha256: sha(statement.getText(sf)) });
        } else if (ts.isVariableStatement(statement)) {
            if (!(statement.declarationList.flags & ts.NodeFlags.Const)) throw new Error(`${path}: mutable top-level declaration`);
            kind = 'pinned-const';
            for (const declaration of statement.declarationList.declarations) {
                if (!ts.isIdentifier(declaration.name) || !declaration.initializer || names.has(declaration.name.text)) throw new Error(`${path}: unknown/duplicate/destructured const`);
                names.add(declaration.name.text); variables.set(declaration.name.text, declaration);
            }
        } else if (ts.isFunctionDeclaration(statement)) {
            if (!statement.name || names.has(statement.name.text)) throw new Error(`${path}: anonymous/duplicate function`);
            names.add(statement.name.text); kind = 'pinned-function';
            functions.push({ name: statement.name.text, declarationSha256: sha(statement.getText(sf)) });
            const visit = (node) => {
                if (isZMethod(ts, node, 'enum')) throw new Error(`${path}: enum hidden in a function body`);
                ts.forEachChild(node, visit);
            };
            visit(statement);
        } else if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
            kind = 'type-only';
        } else throw new Error(`${path}: unregistered top-level construct ${ts.SyntaxKind[statement.kind]}`);
        statements.push({ kind, line: position.line + 1, declarationSha256: sha(statement.getText(sf)) });
    }
    for (const [owner, declaration] of variables) {
        const visit = (node) => {
            if (isZMethod(ts, node, 'enum')) {
                if (node.arguments.length !== 1) throw new Error(`${path}: unknown enum arguments`);
                const position = sf.getLineAndCharacterOfPosition(node.getStart(sf));
                const propertyPath = [];
                for (let parent = node.parent; parent && parent !== declaration; parent = parent.parent) {
                    if (ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) {
                        const call = parent.parent;
                        if (!ts.isCallExpression(call) || !isZMethod(ts, call, 'lazy') || call.arguments[0] !== parent) {
                            throw new Error(`${path}:${owner}: enum hidden in non-constructor callback`);
                        }
                    }
                    if (ts.isPropertyAssignment(parent)) {
                        if (!ts.isIdentifier(parent.name) && !ts.isStringLiteral(parent.name)) throw new Error(`${path}: computed enum property`);
                        propertyPath.unshift(parent.name.text);
                    }
                }
                let base = declaration.initializer;
                while (ts.isAsExpression(base) || ts.isSatisfiesExpression(base) || ts.isParenthesizedExpression(base)) base = base.expression;
                while (ts.isCallExpression(base) && ts.isPropertyAccessExpression(base.expression) && !isZMethod(ts, base, 'enum')) base = base.expression.expression;
                enumCalls.push({ owner, line: position.line + 1, column: position.character + 1, propertyPath, topLevel: base === node, expression: node.arguments[0].getText(sf), declarationSha256: sha(declaration.getText(sf)) });
            }
            ts.forEachChild(node, visit);
        };
        visit(declaration.initializer);
    }
    return { text: normalize(text), sf, statements, imports, functions, enumCalls, variables };
}

// This constructs review metadata only. Do not wire it to --write or derive a
// Git reference from HEAD. An author/reviewer must freeze these identities.
export function proposeRegistry(root) {
    const { ts } = runtime(root);
    return {
        formatVersion: 1,
        reviewStatus: 'candidate-needs-Root-source-reference-and-independent-review',
        closedModules: CLOSED_MODULES.map((path) => {
            const module = syntax(ts, readFileSync(resolve(root, path), 'utf8'), path);
            return { path, normalizedTextSha256: sha(module.text), statements: module.statements, imports: module.imports, functions: module.functions, enumOccurrenceCount: module.enumCalls.length };
        }),
        historicalR0: { path: R0_PATH, normalizedTextSha256: R0_SHA, constants: 455, enumOccurrences: 224, mutable: false },
        limitations: ['No generated wire values in this registry', 'No sourceHead auto-advance or guard bypass', 'No R0 historical replacement/addition remap inferred from equal wire values', 'Not a complete buildManifest or generated.rs refresh'],
    };
}

export function assertModuleText(root, path, text, pin) {
    const { ts } = runtime(root);
    if (!CLOSED_MODULES.includes(path) || pin.path !== path) throw new Error('Unregistered module identity');
    const actual = syntax(ts, text, path);
    assert.equal(sha(actual.text), pin.normalizedTextSha256, `${path}: unreviewed module bytes`);
    same(actual.statements, pin.statements, `${path}: declaration/order drift`);
    same(actual.imports, pin.imports, `${path}: closed import graph drift`);
    same(actual.functions, pin.functions, `${path}: unreviewed helper/function`);
    assert.equal(actual.enumCalls.length, pin.enumOccurrenceCount, `${path}: enum coverage drift`);
    return actual;
}

export function analyzeRegisteredGraph(root, registry, semanticRequests = []) {
    const { ts, zod, zodVersion } = runtime(root);
    same(registry.closedModules.map((module) => module.path), CLOSED_MODULES, 'Closed module order/identity changed');
    const historicalText = normalize(readFileSync(resolve(root, R0_PATH), 'utf8'));
    assert.equal(sha(historicalText), R0_SHA, 'Historical R0 must remain immutable');
    const r0 = JSON.parse(historicalText);
    assert.equal(r0.sharedSsot.constants.length, 455);
    assert.equal(r0.sharedSsot.enumSchemas.length, 224);
    const modules = new Map(registry.closedModules.map((pin) => [pin.path, assertModuleText(root, pin.path, readFileSync(resolve(root, pin.path), 'utf8'), pin)]));
    const cache = new Map(); const active = new Set();
    const load = (path) => {
        if (path === 'zod') return zod;
        if (cache.has(path)) return cache.get(path).exports;
        if (active.has(path) || !modules.has(path)) throw new Error(`Unknown/cyclic module ${path}`);
        active.add(path);
        const module = modules.get(path);
        const topOwners = [...new Set(module.enumCalls.filter((item) => item.topLevel).map((item) => item.owner))];
        const probe = '\nexport const __registeredEnumProbe = [' + module.enumCalls.map((item) => item.expression).join(',') + '];\n'
            + 'export const __registeredTopProbe = {' + topOwners.map((name) => `${name}:${name}.options`).join(',') + '};\n';
        const dataNames = [...module.variables.keys()].filter((name) => !name.endsWith('Schema') && name !== 'frozenSchemas' && name !== 'CommissionSharedEvidencePackageShape');
        const dataProbe = '\nexport const __dataProbe = {' + dataNames.map((name) => name + ':' + name).join(',') + '};\n';
        const schemaNames = [...module.variables.keys()].filter((name) => name.endsWith('Schema'));
        const metaProbe = '\nexport const __metaProbe = {' + schemaNames.map((name) => name + ':' + name + '.meta()?.id').join(',') + '};\n';
        const objectProbe = '\nexport const __schemaObjects = {' + schemaNames.map((name) => name + ':' + name).join(',') + '};\n';
        const compiled = ts.transpileModule(module.text + probe + dataProbe + metaProbe + objectProbe, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true } });
        if (compiled.diagnostics?.length) throw new Error(`${path}: oracle transpilation failed`);
        const exports = {};
        new Script(compiled.outputText, { filename: path }).runInNewContext({ exports, require(specifier) { return load(inputModule(specifier, path)); } }, { timeout: 5000 });
        const values = JSON.parse(JSON.stringify(exports.__registeredEnumProbe));
        assert.equal(values.length, module.enumCalls.length);
        values.forEach((value, index) => {
            if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== 'string') || new Set(value).size !== value.length) throw new Error(`${path}: unknown enum data at occurrence ${index}`);
        });
        const topOptions = JSON.parse(JSON.stringify(exports.__registeredTopProbe));
        module.enumCalls.forEach((item, index) => {
            if (item.topLevel) same(values[index], topOptions[item.owner], `${path}:${item.owner}: actual Zod options drift`);
        });
        const data = JSON.parse(JSON.stringify(exports.__dataProbe));
        const schemaIds = JSON.parse(JSON.stringify(exports.__metaProbe));
        cache.set(path, { exports, values, topOptions, data, schemaIds, schemaObjects: exports.__schemaObjects }); active.delete(path);
        return cache.get(path).exports;
    };
    // Module require must return exports, not the private cached observation.
    const originalLoad = load;
    const entry = originalLoad(CLOSED_MODULES[0]);

    function sourceSchemaId(module,result,item) {
        if(result.schemaIds[item.owner])return result.schemaIds[item.owner];
        const ids=[];
        const visit=(node)=>{
            if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='meta') {
                const argument=node.arguments[0];
                if(argument&&ts.isObjectLiteralExpression(argument))for(const property of argument.properties)if(ts.isPropertyAssignment(property)&&property.name.text==='id'&&ts.isStringLiteralLike(property.initializer))ids.push(property.initializer.text);
            }
            ts.forEachChild(node,visit);
        };
        visit(module.variables.get(item.owner).initializer);
        const unique=[...new Set(ids)];
        if(unique.length>1)throw new Error('Ambiguous schema metadata identity '+item.owner);
        return unique[0]??null;
    }

    const observations = CLOSED_MODULES.map((path) => {
        if (!cache.has(path)) originalLoad(path);
        const module = modules.get(path); const result = cache.get(path);
        return { path, normalizedTextSha256: sha(module.text), functions: module.functions, data: Object.entries(result.data).map(([name,value]) => {
            const declaration=module.variables.get(name);
            const initializer=declaration.initializer;
            const expression=initializer.getText(module.sf);
            const dependencies=[];
            const walk=(node)=>{ if(ts.isIdentifier(node)&&module.variables.has(node.text)&&node!==declaration.name) dependencies.push(node.text); ts.forEachChild(node,walk); };
            walk(initializer);
            const helper=ts.isCallExpression(initializer)?initializer.expression.getText(module.sf):null;
            const position=module.sf.getLineAndCharacterOfPosition(declaration.getStart(module.sf));
            return {name,value,valueSha256:sha(JSON.stringify(value)),declarationSha256:sha(declaration.getText(module.sf)),expression,helper,dependencies:[...new Set(dependencies)],path,line:position.line+1,column:position.character+1};
        }), schemaIds: result.schemaIds, declarations: module.statements.length, actualTopZodEnumsCompared: Object.keys(result.topOptions).length, enumOccurrences: module.enumCalls.map((item, index) => ({ ...item, schemaId: sourceSchemaId(module,result,item), sourceArray: module.variables.has(item.expression) ? item.expression : null, id: path + ':' + item.owner + ':' + item.line + ':' + item.column, values: result.values[index], valuesSha256: sha(JSON.stringify(result.values[index])) })) };
    });

    function schemaLeaves(schema, path, seen = new Set(), depth = 0) {
        if (!schema || depth > 96) return [{type:'unresolved'}];
        const key=schema; if(seen.has(key))return [{type:'cycle'}];
        const next=new Set(seen);next.add(key);
        const def=schema._zod?.def ?? schema._def ?? schema.def;
        if(!def)return [{type:'unresolved'}];
        const type=def.type;
        if(type==='lazy')return schemaLeaves(def.getter(),path,next,depth+1);
        if(['optional','nullable','default','prefault','readonly','catch','branded','nonoptional'].includes(type))return schemaLeaves(def.innerType??def.type,path,next,depth+1);
        if(type==='pipe')return schemaLeaves(def.in,path,next,depth+1);
        if(type==='union')return def.options.flatMap((child)=>schemaLeaves(child,path,next,depth+1));
        if(type==='intersection')return [def.left,def.right].flatMap((child)=>schemaLeaves(child,path,next,depth+1));
        if(type==='array')return schemaLeaves(def.element,path,next,depth+1);
        if(type==='record')return schemaLeaves(def.valueType,path,next,depth+1);
        if(path.length) {
            if(type!=='object')return [{type:'absent',at:type}];
            const shape=typeof def.shape==='function'?def.shape():def.shape;
            return shape?.[path[0]]?schemaLeaves(shape[path[0]],path.slice(1),next,depth+1):[{type:'absent'}];
        }
        const providers=[];
        for(const [module,result] of cache)for(const [name,object] of Object.entries(result.schemaObjects||{}))if(object===schema)providers.push({path:module,owner:name});
        return [{type,values:type==='enum'?schema.options:type==='literal'?[...(schema.values??def.values??[])]:null,providers}];
    }
    const semanticFields=semanticRequests.map((request)=>{
        const owners=[];
        for(const [path,result]of cache)if(result.schemaObjects?.[request.owner])owners.push({path,owner:request.owner,leaves:schemaLeaves(result.schemaObjects[request.owner],request.propertyPath||[])});
        return {...request,owners};
    });

    const stageValues = entry.ProjectStageSchema?.options;
    if (!Array.isArray(stageValues) || stageValues.length !== 11 || !stageValues.includes('conditional-completed') || entry.ProjectStageSchema.safeParse('__poms_r1b_unknown__').success) throw new Error('Current public ProjectStage authority is not the registered eleven-value schema');
    const projectSourceChecks = {
        queryConditionalStage: entry.ProjectListQuerySchema.safeParse({ currentStage: 'conditional-completed' }).success,
        queryUnknownRejected: !entry.ProjectListQuerySchema.safeParse({ currentStage: '__poms_r1b_unknown__' }).success,
        createAssessment: entry.CreateProjectRequestSchema.safeParse({ projectName: 'Project', customerId: '00000000-0000-4000-8000-000000000001', currentStage: 'assessment' }).success,
        createConditionalRejected: !entry.CreateProjectRequestSchema.safeParse({ projectName: 'Project', customerId: '00000000-0000-4000-8000-000000000001', currentStage: 'conditional-completed' }).success,
    };
    if (Object.values(projectSourceChecks).some((passed) => !passed)) throw new Error('Actual TS project query/create stage semantics differ');
    return { evidenceClass: 'closed-module-pure-analysis-only', nodeVersion: process.versions.node, typescript: ts.version, zod: zodVersion, historicalR0: { sha256: R0_SHA, constants: 455, enumOccurrences: 224 }, stageValues, projectSourceChecks, semanticFields, modules: observations, fullLegacyExporterCheck: 'not-run; original source guard and explicit historical remap still required' };
}
