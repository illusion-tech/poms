// Real Angular 22 parser only. No generated-client, typecheck, browser or build claim.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
const compilerPath = process.argv[2] ?? 'E:/projects/poms/node_modules/@angular/compiler/fesm2022/compiler.mjs';
const { parseTemplate } = await import(pathToFileURL(compilerPath).href);
const file = resolve('apps/poms-admin/src/app/features/project/project-operating-authoring.ts');
const source = await readFile(file, 'utf8');
const start = source.indexOf('template: `') + 'template: `'.length;
if (start < 'template: `'.length) throw new Error('Missing inline Angular template');
const end = source.indexOf('`', start);
const parsed = parseTemplate(source.slice(start, end), file, { preserveWhitespaces: false });
const errors = (parsed.errors ?? []).map((error) => error.toString());
const compilerPackage = JSON.parse(await readFile(resolve(dirname(dirname(compilerPath)), 'package.json'), 'utf8'));
const evidence = { kind: 'angular-template-parser-only', file, sourceSha256: createHash('sha256').update(source).digest('hex'), compilerPath, compilerVersion: compilerPackage.version, errors, passed: errors.length === 0, typechecked: false, built: false, browserVerified: false };
await writeFile(resolve('tools/rust-r4ghi/G/implementation/ui-parser01.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence));
if (errors.length) process.exitCode = 1;
