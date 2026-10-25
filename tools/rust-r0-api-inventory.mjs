import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

// Offline, read-only source analysis; --write changes only the named JSON artifact.
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// This is the reviewed source baseline, not the later commit containing artifacts.
// Advance deliberately when freezing a new inventory; --check survives a docs commit.
const baselineHead = '033aedd028fc25ea990450a7854fc92c567cfb8a';
const outputPath = 'docs/design/rust-r0-api-operations.json';
const specPath = 'libs/shared/api-spec/openapi.json';
const sharedPath = 'libs/shared/contracts/src/lib/shared-contracts.ts';
const canonicalPath = 'docs/design/api-route-canonical-inventory.md';
// Product sources remain pinned to baselineHead. R0F reviews the canonical
// document separately, so a docs-only change cannot silently advance code input.
const canonicalReviewedSha256 = 'c9b781ea1797ef9c9c804d1ce27bc62a8d10ecd231d999141305aff0c8915af7';
const canonicalReview = { slice: 'RUST-R0F', issue: 59, priorDeliveryCommit: '08daaf45b12307bc4d53e01e509f23d265532de6' };
const sourceScope = [
    '.gitattributes',
    ':(glob)apps/poms-api/src/**/*.ts',
    ':(glob)apps/poms-api-e2e/src/**/*spec.ts',
    ':(glob)apps/poms-api-e2e/src/**/*test.ts',
    ':(glob)libs/api/contracts/src/**/*.ts',
    ':(glob)libs/shared/contracts/src/**/*.ts',
    ':(glob)libs/vendor/nestjs-zod/src/**/*.ts',
    ':(glob)tools/openapi/**/*.ps1',
    ':(glob)tools/openapi/**/*.json',
    'apps/poms-api/project.json',
    'libs/shared/api-client/project.json',
    specPath
];
const changedInputs = execFileSync('git', ['diff', '--name-only', '--no-ext-diff', baselineHead, '--', ...sourceScope], { cwd: root, encoding: 'utf8' }).trim();
const untrackedInputs = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...sourceScope], { cwd: root, encoding: 'utf8' }).trim();
if (changedInputs || untrackedInputs) {
    throw new Error(`R0 API inputs differ from reviewed reference ${baselineHead}; review changes and deliberately advance baselineHead before freezing a new inventory.\n${[changedInputs, untrackedInputs].filter(Boolean).join('\n')}`);
}
const hash = (value) => createHash('sha256').update(value).digest('hex');
const normalizeText = (text) => text.replace(/\r\n/g, '\n');
const read = (path) => normalizeText(readFileSync(resolve(root, path), 'utf8'));
if (hash(read(canonicalPath)) !== canonicalReviewedSha256) {
    throw new Error(`Canonical inventory differs from its reviewed R0F normalized-text fingerprint; review the document and explicitly update canonicalReviewedSha256 before write/check.`);
}
const walk = (path) =>
    readdirSync(resolve(root, path), { withFileTypes: true })
        .flatMap((entry) => (entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]))
        .sort();
const parse = (path) => ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const source = (node, file) => ({ path: file.fileName, line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1 });
const decs = (node) =>
    (ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : []).map((d) => {
        const e = d.expression;
        return { name: ts.isCallExpression(e) ? e.expression.getText() : e.getText(), args: ts.isCallExpression(e) ? [...e.arguments] : [], text: d.getText() };
    });
const unwrap = (node) => {
    while (node && (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node) || ts.isTypeAssertionExpression(node))) node = node.expression;
    return node;
};
const literal = (node) => {
    node = unwrap(node);
    if (!node) return '';
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
    return null;
};
const routePath = (path) => {
    const normalized = path
        .replace(/(^|\/):([A-Za-z_][A-Za-z0-9_]*)/g, '$1{$2}')
        .replaceAll('\\:', ':')
        .replace(/\/+/g, '/')
        .replace(/\/$/, '');
    return normalized || '/';
};
const withPrefix = (path) => routePath(`/api/${path}`);
const shape = (path) => routePath(path).replace(/\{[^}]+\}/g, '{}');
const key = (method, path) => `${method.toUpperCase()} ${shape(path)}`;
const refs = (node) => {
    const result = new Set();
    const visit = (x) => {
        if (Array.isArray(x)) x.forEach(visit);
        else if (x && typeof x === 'object') {
            if (typeof x.$ref === 'string') result.add(x.$ref);
            Object.values(x).forEach(visit);
        }
    };
    visit(node);
    return [...result].sort();
};
const phase = (module, controller, method) => {
    if (module === 'auth' && ['listEnabledLoginProviders', 'authorizeExternalLogin', 'handleExternalLoginCallback', 'createExternalLoginSession', 'getProfile', 'updateProfile'].includes(method)) {
        return { primary: 'R2', dependencies: ['R1: session/CSRF/account-read foundation'], basis: 'R2 complete external identity/self-profile delivery; rust-r1-foundation-baseline.md §4' };
    }
    if (['app', 'auth', 'health', 'persistence', 'secret', 'sensitive-field-projection'].includes(module)) return { primary: 'R1', dependencies: [], basis: 'backend-rust-migration-plan.md §6; auth uses only minimal account/permission reads in R1' };
    if (module === 'commission') return { primary: 'R5', dependencies: ['R2: approval framework', 'R4: contract/cost/payment facts'], basis: 'backend-rust-migration-plan.md §6' };
    if (module === 'project') {
        const lifecycle = /Acceptance|Completion|Archive/.test(`${controller}.${method}`);
        const aggregate = /getById|getWorkspaceGuidance|getTimeline|^list$/.test(method);
        return {
            primary: lifecycle ? 'R4' : 'R3',
            dependencies: aggregate ? ['R4/R5: execution/commission projections must become complete before final acceptance'] : ['R2: approval framework'],
            basis: lifecycle ? 'execution acceptance/completion/archive: plan §6 R4' : 'project master and pre-sign workspace: plan §6 R3'
        };
    }
    if (['customer', 'lead', 'sales-follow-up', 'sales-intelligence', 'business-discussion'].includes(module)) return { primary: 'R3', dependencies: ['R2: platform/approval/attachment foundations'], basis: 'backend-rust-migration-plan.md §6' };
    if (['contract', 'contract-finance', 'contract-readiness', 'project-handover', 'project-cost'].includes(module))
        return { primary: 'R4', dependencies: ['R3: project/customer facts', 'R2: approval framework'], basis: 'backend-rust-migration-plan.md §6' };
    return {
        primary: 'R2',
        dependencies: module === 'approval' || module === 'approval-summary' ? ['R3/R4/R5: domain-specific handlers registered with their owning phase'] : ['R1: compatibility foundation'],
        basis: 'backend-rust-migration-plan.md §6'
    };
};
const allSourcePaths = walk('apps/poms-api/src').filter((p) => p.endsWith('.ts'));
const appPaths = allSourcePaths.filter((p) => p.startsWith('apps/poms-api/src/app/'));
const testPaths = [...allSourcePaths.filter((p) => p.endsWith('.spec.ts')), ...walk('apps/poms-api-e2e/src').filter((p) => /(?:spec|test)\.ts$/.test(p))].sort();
const contractPaths = [...walk('libs/api/contracts/src'), ...walk('libs/shared/contracts/src')].filter((p) => p.endsWith('.ts')).sort();
const compatibilityPaths = [...walk('libs/vendor/nestjs-zod/src').filter((p) => p.endsWith('.ts')), ...walk('tools/openapi').filter((p) => /\.(ps1|json)$/.test(p)), 'apps/poms-api/project.json', 'libs/shared/api-client/project.json'];
const files = new Map([...new Set([...allSourcePaths, ...contractPaths, ...testPaths])].map((p) => [p, parse(p)]));
const modules = [];
const controllers = [];
const dtoDefinitions = new Map();
const contractDefinitions = new Map();
for (const [path, file] of files) {
    for (const statement of file.statements) {
        if (ts.isVariableStatement(statement) && contractPaths.includes(path)) for (const d of statement.declarationList.declarations) contractDefinitions.set(d.name.getText(), source(d, file));
        if (!ts.isClassDeclaration(statement) || !statement.name) continue;
        const decorators = decs(statement);
        const moduleDecorator = decorators.find((d) => d.name === 'Module');
        if (moduleDecorator) {
            const properties = moduleDecorator.args[0]?.properties ?? [];
            const fields = Object.fromEntries(properties.filter(ts.isPropertyAssignment).map((p) => [p.name.getText(), ts.isArrayLiteralExpression(p.initializer) ? p.initializer.elements.map((e) => e.getText()) : []]));
            modules.push({ name: statement.name.text, ...source(statement, file), imports: fields.imports ?? [], controllers: fields.controllers ?? [], providers: fields.providers ?? [] });
        }
        if (contractPaths.includes(path) || statement.name.text.endsWith('Dto')) {
            const factory = statement.heritageClauses?.flatMap((h) => h.types).find((t) => ts.isCallExpression(t.expression) && t.expression.expression.getText() === 'createZodDto')?.expression;
            const schemaArgument = factory?.arguments[0];
            const schemaReferenceNames = new Set();
            const visitSchemaReferences = (node) => {
                if (ts.isIdentifier(node) && node.text.endsWith('Schema')) schemaReferenceNames.add(node.text);
                ts.forEachChild(node, visitSchemaReferences);
            };
            if (schemaArgument) visitSchemaReferences(schemaArgument);
            dtoDefinitions.set(statement.name.text, {
                ...source(statement, file),
                schema: schemaArgument?.getText() ?? null,
                schemaKind: !schemaArgument ? 'swagger-decorated-class-no-zod-schema' : ts.isIdentifier(schemaArgument) ? 'named-zod-schema' : 'inline-zod-expression',
                schemaExpressionSource: schemaArgument ? source(schemaArgument, file) : null,
                schemaReferenceNames: [...schemaReferenceNames].sort()
            });
        }
        const controllerDecorator = decorators.find((d) => d.name === 'Controller');
        if (!controllerDecorator) continue;
        const prefix = literal(controllerDecorator.args[0]);
        if (typeof prefix !== 'string') throw new Error(`Unsupported controller prefix ${path}:${statement.name.text}`);
        const module = path.match(/\/app\/(?:core|features)\/([^/]+)/)?.[1] ?? 'app';
        const record = { name: statement.name.text, ...source(statement, file), module, prefix, decorators: decorators.map((d) => d.text), operations: [] };
        for (const member of statement.members) {
            if (!ts.isMethodDeclaration(member)) continue;
            const methodDecorators = decs(member);
            const routes = methodDecorators.filter((d) => ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Head', 'Options', 'All'].includes(d.name));
            if (!routes.length) continue;
            const bodyCalls = new Set();
            const visit = (node) => {
                if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText().startsWith('this.')) bodyCalls.add(node.expression.getText());
                ts.forEachChild(node, visit);
            };
            if (member.body) visit(member.body);
            for (const r of routes) {
                const paths = literal(r.args[0]);
                if (paths === null || r.name === 'All') throw new Error(`Unsupported route ${path}:${member.name.getText()}`);
                for (const suffix of Array.isArray(paths) ? paths : [paths]) {
                    const lookup = (name) => methodDecorators.find((d) => d.name === name) ?? decorators.find((d) => d.name === name);
                    const publicRoute = Boolean(lookup('Public'));
                    const all = lookup('HasPermissions')?.args.map((a) => literal(a) ?? a.getText()) ?? [];
                    const any = lookup('HasAnyPermissions')?.args.map((a) => literal(a) ?? a.getText()) ?? [];
                    const responseDtoNames = methodDecorators.filter((d) => /Response$/.test(d.name)).flatMap((d) => d.args.flatMap((a) => [...a.getText().matchAll(/\btype:\s*([A-Za-z_]\w*Dto)\b/g)].map((m) => m[1])));
                    record.operations.push({
                        controller: record.name,
                        controllerMethod: member.name.getText(),
                        ...source(member, file),
                        pathSource: path,
                        module,
                        httpMethod: r.name.toUpperCase(),
                        path: withPrefix(`${prefix}/${suffix}`),
                        rawControllerPrefix: prefix,
                        rawMethodPath: suffix,
                        authorization: {
                            mode: publicRoute ? 'public' : all.length || any.length ? 'permission' : lookup('Authenticated') ? 'authenticated' : 'undeclared-default-deny',
                            all,
                            any,
                            csrf: ['Post', 'Put', 'Patch', 'Delete'].includes(r.name) ? (publicRoute ? 'double-submit-header-cookie' : 'double-submit-and-session-bound-token') : 'safe-method-no-CSRF-check',
                            evidence: [...decorators, ...methodDecorators].filter((d) => ['Public', 'Authenticated', 'HasPermissions', 'HasAnyPermissions', 'ApiCookieAuth', 'ApiSecurity'].includes(d.name)).map((d) => d.text)
                        },
                        inputDtos: member.parameters.map((p) => ({ parameter: p.name.getText(), type: p.type?.getText() ?? null, decorators: decs(p).map((d) => d.text) })),
                        responseDtos: [...new Set(responseDtoNames)],
                        returnType: member.type?.getText() ?? null,
                        serviceCallClues: [...bodyCalls].sort(),
                        migration: phase(module, record.name, member.name.getText())
                    });
                }
            }
        }
        controllers.push(record);
    }
}
const moduleMap = new Map(modules.map((m) => [m.name, m]));
const reachable = new Set();
const visitModule = (name) => {
    if (reachable.has(name) || !moduleMap.has(name)) return;
    reachable.add(name);
    moduleMap.get(name).imports.forEach(visitModule);
};
visitModule('AppModule');
const routes = controllers.flatMap((c) =>
    c.operations.map((r) => ({ ...r, registeredModules: modules.filter((m) => m.controllers.includes(c.name)).map((m) => ({ name: m.name, path: m.path, line: m.line, reachableFromAppModule: reachable.has(m.name) })) }))
);
const routeMap = new Map();
for (const r of routes) {
    const k = key(r.httpMethod, r.path);
    if (routeMap.has(k)) throw new Error(`Duplicate controller route shape: ${k}`);
    routeMap.set(k, r);
}
const routeCells = (cell) => [...cell.matchAll(/`(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([^`]+)`/g)].map((m) => ({ method: m[1], path: routePath(m[2].replace(/^\/api(?=\/|$)/, '')) }));
const canonicalRows = read(canonicalPath)
    .split(/\r?\n/)
    .flatMap((line, i) => {
        const cells = line
            .split('|')
            .slice(1, -1)
            .map((s) => s.trim());
        if (cells.length < 10) return [];
        const canonical = routeCells(cells[2] ?? '');
        const recordedImplemented = routeCells(cells[3]);
        const recordedStatus = cells[9].replaceAll('`', '');
        const canonicalDecisionPending = recordedStatus === 'canonical-decision-pending';
        if (!canonical.length && !canonicalDecisionPending) return [];
        if (canonicalDecisionPending && (canonical.length || !recordedImplemented.length)) {
            throw new Error(`Pending canonical decision must have implemented routes and no invented canonical path: ${canonicalPath}:${i + 1}`);
        }
        return [
            {
                source: { path: canonicalPath, line: i + 1 },
                domain: cells[0].replaceAll('`', ''),
                capability: cells[1].replaceAll('`', ''),
                canonical,
                recordedImplemented,
                recordedDesign: routeCells(cells[4]),
                authority: cells[5],
                recordedDriftType: cells[6].replaceAll('`', ''),
                action: cells[7],
                batch: cells[8].replaceAll('`', ''),
                recordedStatus,
                canonicalDecisionPending
            }
        ];
    });
const findCanonical = (method, path) =>
    canonicalRows
        .filter((row) => [...row.canonical, ...row.recordedImplemented].some((r) => key(r.method, withPrefix(r.path)) === key(method, path)))
        .map((row) => ({
            ...row,
            comparison: row.canonicalDecisionPending ? 'canonical-decision-pending' : row.canonical.some((r) => key(r.method, withPrefix(r.path)) === key(method, path)) ? 'canonical-shape-matches' : 'existing-baseline-drift',
            exactParameterNames: row.canonicalDecisionPending ? null : row.canonical.some((r) => r.method === method.toUpperCase() && withPrefix(r.path) === path),
            driftClassification: row.canonicalDecisionPending ? 'design-change-required' : row.canonical.some((r) => r.method === method.toUpperCase() && withPrefix(r.path) === path) ? null : 'existing-baseline-drift'
        }));
const httpCallClues = [];
for (const path of testPaths.filter((p) => p.startsWith('apps/poms-api-e2e/'))) {
    const file = files.get(path);
    const visit = (node) => {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && /^(get|post|put|patch|delete|head|options)$/.test(node.expression.name.text)) {
            const a = node.arguments[0];
            const route = a && ts.isTemplateExpression(a) ? a.head.text + a.templateSpans.map((s) => '{}' + s.literal.text).join('') : a && ts.isStringLiteralLike(a) ? a.text : null;
            if (route?.startsWith('/'))
                httpCallClues.push({
                    ...source(node, file),
                    method: node.expression.name.text.toUpperCase(),
                    routePattern: routePath(route.split('?')[0].replace(/^\/api(?=\/|$)/, '')),
                    evidenceKind: 'static-http-call-pattern; not executed coverage'
                });
        }
        ts.forEachChild(node, visit);
    };
    visit(file);
}
const testClues = (r) => {
    const paired = r.pathSource.replace(/\.ts$/, '.spec.ts');
    const unit = files.get(paired);
    const calls = [];
    if (unit) {
        const visit = (n) => {
            if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === r.controllerMethod)
                calls.push({ ...source(n, unit), expression: n.expression.getText(), evidenceKind: 'paired-test-method-reference; receiver/expectation not certified' });
            ts.forEachChild(n, visit);
        };
        visit(unit);
    }
    const pattern = new RegExp(
        '^' +
            shape(r.path.replace(/^\/api(?=\/|$)/, ''))
                .replace(/[.*+?^$()|[\]\\]/g, '\\$&')
                .replaceAll('{}', '[^/]+') +
            '$'
    );
    const e2e = httpCallClues.filter((c) => c.method === r.httpMethod && pattern.test(c.routePattern));
    return {
        pairedControllerTest: unit ? paired : null,
        unitMethodReferences: calls,
        e2eRouteReferences: e2e,
        status: calls.length || e2e.length ? 'static-clue-found-not-executed' : 'no-direct-static-clue-found',
        limitation: 'Not line/branch coverage. Dynamic helpers, indirect calls, fixtures and nested service behavior may be missed; all candidates require assertions and backend-parametric execution in the owning phase.'
    };
};
const spec = JSON.parse(read(specPath));
const operations = [];
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
for (const [path, item] of Object.entries(spec.paths))
    for (const [method, operation] of Object.entries(item)) {
        if (!methods.has(method)) continue;
        const r = routeMap.get(key(method, path));
        const inputDtoNames = r?.inputDtos.flatMap((p) => p.type?.match(/\b\w+Dto\b/g) ?? []) ?? [];
        const dtoNames = [...new Set([...inputDtoNames, ...(r?.responseDtos ?? [])])].sort();
        const dtoSources = dtoNames.map((name) => {
            const { schemaReferenceNames = [], ...definition } = dtoDefinitions.get(name) ?? { path: null, line: null, schema: null, schemaKind: 'unresolved-dto', schemaExpressionSource: null };
            return {
                name,
                ...definition,
                schemaSource: definition.schemaKind === 'named-zod-schema' ? (contractDefinitions.get(definition.schema) ?? null) : definition.schemaKind === 'inline-zod-expression' ? definition.schemaExpressionSource : null,
                schemaReferences: schemaReferenceNames.map((name) => ({ name, ...(contractDefinitions.get(name) ?? { path: null, line: null }) })),
                limitation:
                    definition.schemaKind === 'swagger-decorated-class-no-zod-schema'
                        ? 'Class source and Swagger property decorators are recorded; no createZodDto schema exists. Runtime Zod validation/serialization cannot be inferred from the Swagger class.'
                        : null
            };
        });
        operations.push({
            method: method.toUpperCase(),
            path,
            operationId: operation.operationId ?? null,
            tags: operation.tags ?? [],
            summary: operation.summary ?? null,
            controller: r?.controller ?? null,
            controllerMethod: r?.controllerMethod ?? null,
            source: r ? { path: r.pathSource ?? r.path, line: r.line } : null,
            module: r?.module ?? null,
            migration: r?.migration ?? null,
            implementedPath: r?.path ?? null,
            registration: r?.registeredModules ?? [],
            mappingStatus: !r ? 'unresolved-controller' : operation.operationId !== `${r.controller}_${r.controllerMethod}` ? 'operation-id-differs-review-required' : 'exact-route-and-operation-id',
            authorization: r?.authorization ?? null,
            openApiSecurity: operation.security ?? [],
            contract: {
                parameters: operation.parameters ?? [],
                requestBody: operation.requestBody ?? null,
                responseStatusCodes: Object.keys(operation.responses ?? {}),
                schemaRefs: refs(operation),
                inputParameters: r?.inputDtos ?? [],
                returnType: r?.returnType ?? null,
                dtoSources
            },
            serviceCallClues: r?.serviceCallClues ?? [],
            canonicalInventory: findCanonical(method, path),
            tests: r ? testClues({ ...r, pathSource: r.pathSource ?? r.path }) : null
        });
    }
for (const o of operations) {
    o.canonicalInventoryStatus = !o.canonicalInventory.length
        ? 'missing-authoritative-inventory-row'
        : o.canonicalInventory.some((r) => r.canonicalDecisionPending)
          ? 'canonical-decision-pending'
          : o.canonicalInventory.some((r) => r.comparison !== 'canonical-shape-matches')
            ? 'implemented-path-difference'
            : o.canonicalInventory.some((r) => !r.exactParameterNames)
              ? 'parameter-name-difference'
              : 'canonical-match';
    o.driftClassification = o.canonicalInventoryStatus === 'canonical-match' ? null : o.canonicalInventoryStatus === 'canonical-decision-pending' ? 'design-change-required' : 'existing-baseline-drift';
}
operations.sort((a, b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`, 'en'));
const sharedFile = files.get(sharedPath);
const constNodes = new Map();
for (const s of sharedFile.statements) if (ts.isVariableStatement(s)) for (const d of s.declarationList.declarations) constNodes.set(d.name.getText(), d);
const values = new Map();
const evaluate = (node, stack = new Set()) => {
    node = unwrap(node);
    if (!node) return undefined;
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isIdentifier(node) && constNodes.has(node.text) && !stack.has(node.text)) {
        if (values.has(node.text)) return values.get(node.text);
        const value = evaluate(constNodes.get(node.text).initializer, new Set([...stack, node.text]));
        values.set(node.text, value);
        return value;
    }
    if (ts.isArrayLiteralExpression(node)) {
        const v = node.elements.map((e) => (ts.isSpreadElement(e) ? evaluate(e.expression, stack) : evaluate(e, stack)));
        return v.some((e) => e === undefined) ? undefined : v.flat();
    }
    if (ts.isObjectLiteralExpression(node)) {
        const entries = node.properties.map((p) => (ts.isPropertyAssignment(p) ? [literal(p.name) ?? p.name.getText(), evaluate(p.initializer, stack)] : [null, undefined]));
        return entries.some(([k, v]) => k === null || v === undefined) ? undefined : Object.fromEntries(entries);
    }
    if (ts.isPropertyAccessExpression(node)) return evaluate(node.expression, stack)?.[node.name.text];
    if (ts.isCallExpression(node)) {
        const name = node.expression.getText();
        const a = evaluate(node.arguments[0], stack);
        if (['defineEnumDefinitions', 'defineSeverityEnumDefinitions'].includes(name)) return a;
        if (['enumObjectValues', 'Object.values'].includes(name) && a && !Array.isArray(a)) return Object.values(a);
        if (name === 'enumDefinitionValues' && Array.isArray(a)) return a.map((x) => x.value);
        if (name === 'enumDefinitionValueObject' && Array.isArray(a)) return Object.fromEntries(a.map((x) => [x.key, x.value]));
    }
    return undefined;
};
const sharedConstants = [];
for (const [name, node] of constNodes) {
    const value = evaluate(node.initializer);
    const stringArray = Array.isArray(value) && value.length > 0 && value.every((x) => typeof x === 'string');
    const valueObject = /Value$/.test(name) && value && !Array.isArray(value) && typeof value === 'object' && Object.values(value).every((x) => typeof x === 'string');
    const definitionArray = /_DEFINITIONS$/.test(name) && Array.isArray(value) && value.every((x) => typeof x?.value === 'string');
    if (stringArray || valueObject || definitionArray)
        sharedConstants.push({ name, ...source(node, sharedFile), kind: stringArray ? 'string-array' : valueObject ? 'wire-value-object' : 'enum-definitions', value, sha256: hash(JSON.stringify(value)) });
}
const sharedEnumSchemas = [];
for (const [name, node] of constNodes) {
    if (!name.endsWith('Schema')) continue;
    const enumCalls = [];
    let schemaId;
    const visit = (n) => {
        if (ts.isCallExpression(n) && n.expression.getText() === 'z.enum') enumCalls.push(n);
        if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'meta') schemaId = n.arguments[0]?.properties?.find((p) => p.name?.getText() === 'id')?.initializer?.text;
        ts.forEachChild(n, visit);
    };
    visit(node.initializer);
    let base = unwrap(node.initializer);
    while (ts.isCallExpression(base) && ts.isPropertyAccessExpression(base.expression) && base.expression.getText() !== 'z.enum') base = unwrap(base.expression.expression);
    for (const enumCall of enumCalls) {
        const enumArg = enumCall.arguments[0];
        const value = evaluate(enumArg);
        const enumValues = Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : null;
        const topLevelEnum = base === enumCall;
        const openApiValues = topLevelEnum && schemaId ? (spec.components?.schemas?.[schemaId]?.enum ?? null) : null;
        sharedEnumSchemas.push({
            name,
            schemaId: schemaId ?? null,
            ...source(enumCall, sharedFile),
            topLevelEnum,
            expression: enumArg.getText(),
            values: enumValues,
            openApiValues,
            comparison: !enumValues
                ? 'unresolved-static-expression'
                : !topLevelEnum
                  ? 'nested-enum-frozen-from-ts'
                  : !openApiValues
                    ? 'not-a-top-level-openapi-enum'
                    : JSON.stringify(enumValues) === JSON.stringify(openApiValues)
                      ? 'exact-values-and-order'
                      : 'existing-baseline-drift'
        });
    }
}
const operationKeySet = new Set(operations.map((o) => key(o.method, o.path)));
const controllerOnlyRoutes = routes.filter((r) => !operationKeySet.has(key(r.httpMethod, r.path))).map((r) => ({ ...r, source: { path: controllers.find((c) => c.name === r.controller).path, line: r.line } }));
const aggregate = (list, value) => Object.fromEntries([...new Set(list.map(value))].sort().map((k) => [k, list.filter((x) => value(x) === k).length]));
const canonicalComparisons = canonicalRows.map((row) => {
    const actual = operations.filter((o) => [...row.canonical, ...row.recordedImplemented].some((r) => key(r.method, withPrefix(r.path)) === key(o.method, o.path)));
    return {
        ...row,
        matchedOperationIds: actual.map((o) => o.operationId),
        comparison: !actual.length
            ? 'no-current-operation-matched'
            : row.canonicalDecisionPending
              ? 'canonical-decision-pending'
              : actual.some((o) => !row.canonical.some((r) => key(r.method, withPrefix(r.path)) === key(o.method, o.path)))
                ? 'existing-baseline-drift'
                : 'canonical-shape-matches'
    };
});
const artifact = {
    formatVersion: 3,
    baseline: {
        head: baselineHead,
        headMeaning:
            'Reviewed product source reference; write/check refuses changed or untracked inputs in sourceReferenceScope. Canonical governance text is independently frozen by canonicalInventory.reviewedTextSha256. UTF-8 text uses CRLF-to-LF-only normalization.',
        textNormalization: {
            encoding: 'utf8',
            lineEndings: 'CRLF-to-LF',
            rule: "text.replace(/\\r\\n/g, '\\n')",
            preserves: 'BOM, bare CR, Unicode, other whitespace and escape sequences',
            hashes: 'sha256 of normalized UTF-8 text; not raw working-tree bytes'
        },
        sourceReferenceScope: sourceScope,
        generator: 'tools/rust-r0-api-inventory.mjs',
        generatorSha256: hash(read(fileURLToPath(import.meta.url))),
        typescriptVersion: ts.version,
        evidence: 'offline static source inventory; no runtime, database, performance, Fast-mode or executed-test claim',
        openApi: { path: specPath, sha256: hash(read(specPath)), version: spec.openapi, paths: Object.keys(spec.paths).length, operations: operations.length, schemas: Object.keys(spec.components?.schemas ?? {}).length },
        canonicalInventory: {
            path: canonicalPath,
            sha256: hash(read(canonicalPath)),
            reviewedTextSha256: canonicalReviewedSha256,
            review: canonicalReview,
            rows: canonicalRows.length,
            approvedCanonicalRows: canonicalRows.filter((r) => !r.canonicalDecisionPending).length
        },
        sharedContracts: { path: sharedPath, sha256: hash(read(sharedPath)) },
        operationSetSha256: hash(operations.map((o) => `${o.method} ${o.path} ${o.operationId}`).join('\n'))
    },
    summary: {
        operations: operations.length,
        controllerFiles: controllers.reduce((s, c) => s.add(c.path), new Set()).size,
        controllerClasses: controllers.length,
        implementedControllerOperations: routes.length,
        mappedOperations: operations.filter((o) => o.mappingStatus === 'exact-route-and-operation-id').length,
        controllerOnlyRoutes: controllerOnlyRoutes.length,
        byModule: aggregate(operations, (o) => o.module),
        byMigrationPhase: aggregate(operations, (o) => o.migration?.primary),
        byAuthorization: aggregate(operations, (o) => o.authorization?.mode),
        staticTestClues: aggregate(operations, (o) => o.tests?.status),
        dtoSchemaKinds: aggregate(
            operations.flatMap((o) => o.contract.dtoSources),
            (d) => d.schemaKind
        ),
        directE2eRouteClues: operations.filter((o) => o.tests?.e2eRouteReferences.length).length,
        canonicalComparisons: aggregate(canonicalComparisons, (r) => r.comparison),
        canonicalOperationStatus: aggregate(operations, (o) => o.canonicalInventoryStatus),
        operationsWithoutInventoryRow: operations.filter((o) => !o.canonicalInventory.length).length,
        operationsAwaitingCanonicalDecision: operations.filter((o) => o.canonicalInventoryStatus === 'canonical-decision-pending').length,
        enumConstants: sharedConstants.length,
        sharedEnumSchemas: sharedEnumSchemas.length,
        sharedEnumComparisons: aggregate(sharedEnumSchemas, (r) => r.comparison),
        testFilesScanned: testPaths.length
    },
    operations,
    controllerOnlyRoutes,
    canonicalComparisons,
    modules: modules.map((m) => ({
        ...m,
        reachableFromAppModule: reachable.has(m.name),
        migration: phase(m.path.match(/\/app\/(?:core|features)\/([^/]+)/)?.[1] ?? 'app', '', ''),
        implementationSourceFiles: appPaths.filter((p) => dirname(p) === dirname(m.path) && !p.endsWith('.spec.ts')),
        unitTestFiles: testPaths.filter((p) => dirname(p) === dirname(m.path))
    })),
    sharedSsot: {
        authority: sharedPath,
        transitionRule:
            'Existing TS shared-contracts remains sole authority through migration; R1 emits a neutral value manifest and generated Rust enums/permission definitions from this source, then checks JSON values/order and Serde round trips. Do not hand-maintain two authoritative lists.',
        constants: sharedConstants,
        enumSchemas: sharedEnumSchemas
    },
    nonOpenApiEvidence: {
        entrypointFiles: allSourcePaths.filter((p) => /\/(?:seeders|config)\/|\/(?:main|openapi)\.ts$/.test(p)),
        coreFeatureSourceFiles: appPaths.filter((p) => !p.endsWith('.spec.ts')),
        lifecycleOrTimerClues: allSourcePaths.flatMap((p) =>
            read(p)
                .split(/\r?\n/)
                .flatMap((line, i) =>
                    /@Cron|@Interval|@Timeout|\bsetInterval\(|\bsetTimeout\(|\bonModuleInit\b|\bonApplicationBootstrap\b|\bonModuleDestroy\b|\bonApplicationShutdown\b/.test(line) ? [{ path: p, line: i + 1, text: line.trim() }] : []
                )
        ),
        limitations: [
            'No claim that OpenAPI covers process lifecycle, seeders/bootstrap, direct services, external provider protocols, object-storage signed URL transactions, approvals behind generic routes or deployment/single-active-task ownership.',
            'No static schedule decorator/timer match does not prove absence of externally invoked or provider-managed background work.',
            'Service-call and test references are clues, not a complete call graph or proof of runtime coverage.'
        ]
    },
    sourceManifest: [...new Set([...appPaths, ...contractPaths, ...compatibilityPaths, ...testPaths, ...allSourcePaths.filter((p) => /\/(?:seeders|config)\/|\/(?:main|openapi)\.ts$/.test(p)), canonicalPath, specPath])]
        .sort()
        .map((path) => ({ path, sha256: hash(read(path)) }))
};
const unresolved = operations.filter((o) => o.mappingStatus !== 'exact-route-and-operation-id' || !o.registration.some((r) => r.reachableFromAppModule));
if (unresolved.length) throw new Error(`Unresolved route/controller/registration mappings: ${JSON.stringify(unresolved.map((o) => ({ id: o.operationId, status: o.mappingStatus, registration: o.registration })))}`);
if (new Set(operations.map((o) => o.operationId)).size !== operations.length) throw new Error('Duplicate OpenAPI operationId.');
if (operations.some((o) => o.path !== o.implementedPath)) throw new Error('OpenAPI and source parameter names differ.');
if (operations.some((o) => o.contract.dtoSources.some((d) => !d.path || (d.schemaKind !== 'swagger-decorated-class-no-zod-schema' && !d.schemaSource) || d.schemaReferences.some((r) => !r.path))))
    throw new Error('DTO or referenced Zod schema source is unresolved.');
if (sharedEnumSchemas.some((s) => !s.values)) throw new Error('Unresolved shared enum expression; extend the static evaluator before freezing the manifest.');
const permissionKeys = sharedConstants.find((c) => c.name === 'PERMISSION_KEYS')?.value;
if (!permissionKeys || operations.some((o) => [...o.authorization.all, ...o.authorization.any].some((p) => !permissionKeys.includes(p)))) throw new Error('Controller permission is absent from PERMISSION_KEYS SSOT.');
const serialized = JSON.stringify(artifact, null, 2) + '\n';
if (process.argv.includes('--write')) {
    writeFileSync(resolve(root, outputPath), serialized, 'utf8');
} else if (process.argv.includes('--check')) {
    if (read(outputPath) !== serialized) throw new Error(`${outputPath} differs from current source; review changes and regenerate with --write.`);
} else {
    throw new Error('Specify --write or --check. No application or database is started.');
}
console.log(JSON.stringify({ mode: process.argv.includes('--write') ? 'write' : 'check', output: outputPath, sha256: hash(serialized), baseline: artifact.baseline, summary: artifact.summary }, null, 2));
