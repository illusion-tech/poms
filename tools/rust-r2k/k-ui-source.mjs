// Mechanical K-section projection. Product UI/store and HTTP responses are never
// replaced. The only business-context seam is the Root-supplied handover ID.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url), ts = require('typescript');
const { parseTemplate } = await import(pathToFileURL(require.resolve('@angular/compiler')).href);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const S2 = 'ee0f4847cae292fe5cee1d1eec065b7194607683';
const ORIGINAL = 'apps/poms-admin/src/app/features/project/project-contract-handover.ts';
const THEME = 'apps/poms-admin/src/app.config.ts';
const DIRECTORY = 'tools/rust-r2k/k-ui-host';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const utf8 = (text) => Buffer.from(text, 'utf8');
const read = (file) => fs.readFileSync(path.join(ROOT, file));
const identity = (file) => { const bytes = read(file); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes), normalizedLfSha256: sha(utf8(bytes.toString('utf8').replace(/\r\n/g, '\n'))) }; };
const mode = process.argv[2]; assert(['--write', '--check'].includes(mode) && process.argv.length === 3);
assert.equal(ts.version, '6.0.3');
execFileSync('git', ['merge-base', '--is-ancestor', S2, 'HEAD'], { cwd: ROOT });

function original(file) {
    const bytes = read(file), text = bytes.toString('utf8');
    const reference = execFileSync('git', ['show', `${S2}:${file}`], { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(text.replace(/\r\n/g, '\n'), reference.toString('utf8').replace(/\r\n/g, '\n'), `Original UI source drift: ${file}`);
    return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
}
function location(node, source) {
    const start = node.getStart(source), end = node.end, text = source.text.slice(start, end);
    return { file: source.fileName, startOffset: start, endOffset: end,
        firstLine: source.getLineAndCharacterOfPosition(start).line + 1, lastLine: source.getLineAndCharacterOfPosition(end).line + 1,
        rawTextSha256: sha(utf8(text)), normalizedLfSha256: sha(utf8(text.replace(/\r\n/g, '\n'))) };
}
function importsFor(source, target, select = () => true) {
    return source.statements.filter(ts.isImportDeclaration).filter(select).map((node) => {
        const original = node.getText(source), specifier = node.moduleSpecifier.text;
        if (!specifier.startsWith('.')) return { text: original, source: location(node, source) };
        const actual = path.posix.normalize(path.posix.join(path.posix.dirname(source.fileName), specifier));
        let rewritten = path.posix.relative(path.posix.dirname(target), actual); if (!rewritten.startsWith('.')) rewritten = './' + rewritten;
        const quote = source.text[node.moduleSpecifier.getStart(source)];
        return { text: original.replace(`${quote}${specifier}${quote}`, `${quote}${rewritten}${quote}`), source: location(node, source), moduleLocationOnly: { from: specifier, to: rewritten } };
    });
}

const source = original(ORIGINAL), component = source.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === 'ProjectContractHandover');
assert(component);
const decorator = ts.getDecorators(component).find((node) => ts.isCallExpression(node.expression) && node.expression.expression.getText(source) === 'Component');
const metadata = decorator.expression.arguments[0];
const property = (name) => metadata.properties.find((node) => node.name?.getText(source) === name)?.initializer;
const templateNode = property('template'); assert(ts.isNoSubstitutionTemplateLiteral(templateNode));
const templateText = templateNode.getText(source).slice(1, -1), parsed = parseTemplate(templateText, ORIGINAL, { preserveWhitespaces: true });
assert.equal(parsed.errors, null);
const sections = [], visited = new Set();
function visitTemplate(value) {
    if (!value || typeof value !== 'object' || visited.has(value)) return; visited.add(value);
    if (value.name === 'section-card' && value.sourceSpan) {
        const text = templateText.slice(value.sourceSpan.start.offset, value.sourceSpan.end.offset);
        if (text.includes('<ng-template #title>附件移交清单</ng-template>')) sections.push({ text, start: value.sourceSpan.start.offset, end: value.sourceSpan.end.offset });
    }
    for (const child of Object.values(value)) {
        if (Array.isArray(child)) child.forEach(visitTemplate); else if (child && typeof child === 'object') visitTemplate(child);
    }
}
parsed.nodes.forEach(visitTemplate); assert.equal(sections.length, 1);
const section = sections[0], replacements = [];
assert(section.text.startsWith('<section-card>') && section.text.endsWith('</section-card>'));
assert(!section.text.includes('`') && !section.text.includes('\\'));
function locatorSeam(text, baseOffset, from) {
    const token = from === 'template' ? 'handover()?.handoverId' : 'this.handover()?.handoverId';
    const replacement = from === 'template' ? 'handoverId()' : 'this.handoverId()';
    let at = 0; while ((at = text.indexOf(token, at)) >= 0) {
        replacements.push({ file: ORIGINAL, startOffset: baseOffset + at, endOffset: baseOffset + at + token.length,
            before: token, after: replacement, reason: 'Only the actual Root-owned ID locator; no handover/summary DTO is fabricated' }); at += token.length;
    }
    return text.replaceAll(token, replacement);
}
const originalMembers = new Map(component.members.filter((node) => node.name).map((node) => [node.name.getText(source), node]));
const memberNames = [
    '#workspaceStore', 'handoverAttachmentChecklist', 'handoverAttachmentDownloadPackage', 'loadingHandoverAttachments',
    'refreshingHandoverAttachments', 'creatingHandoverAttachmentPackage', 'downloadingHandoverAttachmentPackage', 'handoverAttachmentError',
    'selectedHandoverAttachmentSelectionIds', 'selectedHandoverAttachmentCount',
    'refreshHandoverAttachmentChecklist', 'createHandoverAttachmentDownloadPackage', 'downloadHandoverAttachmentPackage', 'loadHandoverAttachmentChecklist',
    'handoverAttachmentItems', 'handoverAttachmentCountItems', 'canSelectHandoverAttachment', 'isHandoverAttachmentSelected', 'toggleHandoverAttachmentSelection',
    'handoverAttachmentStatusLabel', 'handoverAttachmentStatusSeverity', 'downloadPackageStatusLabel', 'downloadPackageStatusSeverity',
    'canDownloadHandoverAttachmentPackage', 'handoverAttachmentSourceText', 'formatDateTime', 'syncSelectedHandoverAttachments', 'handoverAttachmentSourceTypeLabel'
];
const members = memberNames.map((name) => { const node = originalMembers.get(name); assert(node, `Missing original K member ${name}`); return { name, node }; });
for (const { node } of members) {
    const check = (n) => {
        if (ts.isPropertyAccessExpression(n) && n.expression.kind === ts.SyntaxKind.ThisKeyword) {
            const name = n.name.getText(source); assert(name === 'handover' || memberNames.includes(name), `Non-K member dependency: ${name}`);
        }
        ts.forEachChild(n, check);
    }; check(node);
}
const constantNames = ['ATTACHMENT_CHECKLIST_STATUS_LABELS', 'ATTACHMENT_CHECKLIST_STATUS_SEVERITIES', 'DOWNLOAD_PACKAGE_STATUS_LABELS', 'DOWNLOAD_PACKAGE_STATUS_SEVERITIES'];
const constants = constantNames.map((name) => {
    const node = source.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((declaration) => declaration.name.getText(source) === name));
    assert(node, `Missing original K constant ${name}`); return { name, node };
});
const imports = importsFor(source, `${DIRECTORY}/original-k-section.ts`);
const html = locatorSeam(section.text, templateNode.getStart(source) + 1 + section.start, 'template');
const body = members.map(({ node }) => locatorSeam(node.getText(source), node.getStart(source), 'class')).join('\n\n');
assert.equal(replacements.length, 4, 'Exactly the template and three original K locator reads are replaced');
const importsExpression = property('imports'), selectedImports = ['ButtonModule', 'SectionCard', 'TableModule', 'TagModule', 'WorkspaceFactGrid', 'WorkspaceFeedback', 'WorkspaceLoading'];
assert(ts.isArrayLiteralExpression(importsExpression));
for (const name of selectedImports) assert(importsExpression.elements.some((node) => node.getText(source) === name));
const loadWorkspace = originalMembers.get('loadContractHandoverWorkspace');
const originalTry = loadWorkspace.body.statements.find(ts.isTryStatement); assert(originalTry?.catchClause);
const catchText = originalTry.catchClause.block.getText(source);
const kCode = '// Mechanical original K section. See source-map.json; not a full R4 page.\n'
    + "import { input } from '@angular/core';\n" + imports.map((item) => item.text).join('\n') + '\n\n'
    + constants.map(({ node }) => node.getText(source)).join('\n\n')
    + `\n\n@Component({ selector: 'app-k-original-section', standalone: true, imports: [${selectedImports.join(', ')}], changeDetection: ${property('changeDetection').getText(source)}, template: \`${html}\` })\n`
    + 'export class KOriginalSection implements OnInit {\n    readonly handoverId = input(\'\');\n\n' + body
    + `\n\n    ngOnInit(): void { void this.loadHandoverAttachmentChecklist().catch(() => ${catchText}); }\n}\n`;

const themeSource = original(THEME), themeNames = ['MyPreset', 'POMS_PRIMENG_TRANSLATION_ZH_CN'];
const themeDeclarations = themeNames.map((name) => {
    const node = themeSource.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((declaration) => declaration.name.getText(themeSource) === name));
    assert(node); return { name, node };
});
const themeImports = importsFor(themeSource, `${DIRECTORY}/original-theme.ts`, (node) => ['@primeuix/themes/aura', '@primeuix/themes', 'primeng/api'].includes(node.moduleSpecifier.text));
const themeCode = '// Original private theme declarations, mechanically exported only in this tool host.\n'
    + themeImports.map((item) => item.text).join('\n') + '\n\n'
    + themeDeclarations.map(({ node }) => (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ? '' : 'export ') + node.getText(themeSource)).join('\n\n') + '\n';
const compile = (text) => {
    const output = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true }, reportDiagnostics: true });
    assert(!(output.diagnostics ?? []).some((item) => item.category === ts.DiagnosticCategory.Error)); return sha(utf8(output.outputText));
};
const sourceMap = {
    formatVersion: 1, kind: 'original-K-section-mechanical-host-input', sourceCheckpoint: S2,
    scope: 'Only the original K section, methods, store, HttpClient and CSRF. No fabricated R4 response or full-page success.',
    sources: [identity(ORIGINAL), identity(THEME), identity('libs/admin/data-access/src/lib/project/project-workspace.store.ts'),
        identity('libs/shared/api-client/api/attachment-handover.service.ts'), identity('libs/shared/api-client/api/auth.service.ts'),
        identity('libs/admin/data-access/src/lib/poms-api/provide-poms-api-client.ts'), identity('libs/admin/data-access/src/lib/poms-api/poms-csrf.interceptor.ts')],
    template: { source: location(templateNode, source), startOffset: templateNode.getStart(source) + 1 + section.start,
        endOffset: templateNode.getStart(source) + 1 + section.end, originalSha256: sha(utf8(section.text)), projectedSha256: sha(utf8(html)) },
    constants: constants.map(({ name, node }) => ({ name, ...location(node, source) })),
    members: members.map(({ name, node }) => ({ name, kind: ts.isMethodDeclaration(node) ? 'method' : 'field', ...location(node, source) })),
    importMappings: imports, locatorSeams: replacements,
    lifecycleSeam: { originalOuterCatch: location(originalTry.catchClause.block, source),
        behavior: 'Call original K loader directly; preserve original outer catch selection reset. Skip R4 workspace reads.' },
    theme: { declarations: themeDeclarations.map(({ name, node }) => ({ name, ...location(node, themeSource) })), imports: themeImports },
    outputs: [
        { file: `${DIRECTORY}/original-k-section.ts`, rawBytesSha256: sha(utf8(kCode)), normalizedLfSha256: sha(utf8(kCode.replace(/\r\n/g, '\n'))), typeScriptProjectionCompiledSha256: compile(kCode) },
        { file: `${DIRECTORY}/original-theme.ts`, rawBytesSha256: sha(utf8(themeCode)), normalizedLfSha256: sha(utf8(themeCode.replace(/\r\n/g, '\n'))), typeScriptProjectionCompiledSha256: compile(themeCode) }
    ],
    projectionTranspileIsAngularBuild: false, actualBrowserOrApiRun: false
};
const outputs = [[`${DIRECTORY}/original-k-section.ts`, kCode], [`${DIRECTORY}/original-theme.ts`, themeCode], [`${DIRECTORY}/source-map.json`, JSON.stringify(sourceMap, null, 2) + '\n']];
for (const [file, text] of outputs) {
    const absolute = path.join(ROOT, file);
    if (mode === '--check') assert.equal(fs.readFileSync(absolute, 'utf8'), text, `Mechanical projection changed: ${file}`);
    else { fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, text, { flag: 'wx' }); }
}
console.log(JSON.stringify({ result: 'source-projection-only-pass', mode, members: members.length, methods: members.filter((item) => ts.isMethodDeclaration(item.node)).length,
    originalFields: members.filter((item) => !ts.isMethodDeclaration(item.node)).length, constants: constants.length, locatorSeams: replacements.length,
    outputs: outputs.map(([file]) => identity(file)), angularBuildPerformed: false }));
