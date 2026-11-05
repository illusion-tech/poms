// Complete the transitive array/view aliases in the already generated frozen adapter.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const ts = createRequire(import.meta.url)('typescript');
const manifest = JSON.parse(fs.readFileSync('docs/design/rust-r4def/joint-g1-06/manifest06.json'));
const old = JSON.parse(fs.readFileSync(manifest.sources.find(p => p.file === 'libs/shared/api-spec/openapi.json').original));
const deltas = JSON.parse(fs.readFileSync('docs/design/rust-r4def/joint-g1-06/schema-authority06.json')).schemas;
const names = new Set(Object.entries(deltas).filter(([, d]) => d.before !== null).map(([n]) => n));
function depends(v) { return v && typeof v === 'object' && ((v.$ref && names.has(v.$ref.split('/').at(-1))) || Object.values(v).some(depends)); }
let again = true; while (again) { again = false; for (const [n, s] of Object.entries(old.components.schemas)) if (!names.has(n) && depends(s)) { names.add(n); again = true; } }
const core = 'apps/poms-api/src/app/core/rust-r4def-frozen-native-reference.ts'; const changed = [];
function scan(dir) { for (const ent of fs.readdirSync(dir, { withFileTypes: true })) { const file = `${dir}/${ent.name}`; if (ent.isDirectory()) scan(file); else if (file.endsWith('.ts') && !file.endsWith('.spec.ts') && file !== core) update(file); } }
function update(file) {
    let text = fs.readFileSync(file, 'utf8'); if (!text.includes('@poms/shared-contracts')) return;
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true), edits = [], imports = [];
    for (const imp of ast.statements) if (ts.isImportDeclaration(imp) && imp.moduleSpecifier.text === '@poms/shared-contracts' && imp.importClause?.namedBindings && ts.isNamedImports(imp.importClause.namedBindings)) {
        const moved = imp.importClause.namedBindings.elements.filter(s => names.has(s.propertyName?.text ?? s.name.text)); if (!moved.length) continue;
        imports.push(...moved.map(s => s.getText(ast).replace(/^type\s+/, '')));
        const keep = imp.importClause.namedBindings.elements.filter(s => !moved.includes(s));
        edits.push({ start: imp.getStart(ast), end: imp.end, text: keep.length ? `import ${imp.importClause.isTypeOnly ? 'type ' : ''}{${keep.map(s => s.getText(ast)).join(', ')}} from '@poms/shared-contracts';` : '' });
    }
    if (!edits.length) return;
    for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
    let relative = path.relative(path.dirname(file), core).replaceAll('\\', '/').replace(/\.ts$/, ''); if (!relative.startsWith('.')) relative = './' + relative;
    fs.writeFileSync(file, `import type {${imports.join(', ')}} from ${JSON.stringify(relative)};\n` + text); changed.push(file);
}
scan('apps/poms-api/src/app'); console.log(JSON.stringify({ transitiveTypes: names.size, changed }));
