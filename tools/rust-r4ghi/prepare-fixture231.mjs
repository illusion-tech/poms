// Proposal only: correct two synthetic test inputs for strict119 dependencies.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), pack = R + '/tools/rust-r4ghi/helper-fixture231';
const sha = v => createHash('sha256').update(v).digest('hex');
const write = (file, raw) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, raw, { flag: 'wx' }); return { file: path.relative(R, file).split(path.sep).join('/'), rawBytesSha256: sha(raw) }; };
const replace = (s, a, b) => { assert.equal(s.split(a).length, 2, 'One exact before image'); return s.replace(a, b); };
const products = [], files = [], bases = [];
for (const name of ['schema-comparison108.test.mjs', 'tax13.test.mjs']) {
  const file = 'tools/rust-r4ghi/business/' + name, before = fs.readFileSync(R + '/' + file); let text = before.toString();
  if (name.startsWith('schema-')) {
    text = replace(text, "    const process = { namespace: 'poms-r4ghi', root: '/home/wangzishi/projects/poms-rust-r4ghi', port: 31441, binarySha256: sha('synthetic-process') },", `    // The synthetic schema3 consumer also declares the complete actual code
    // directory it is exercising. This is a unit fixture, not a live119 grant.
    const helperDirectory = path.join(F136.root, 'tools/rust-r4ghi/business');
    const completeHelpers = fs.readdirSync(helperDirectory).filter(name => /\\.(mjs|json)$/.test(name)).sort().map(name => ({ file: 'tools/rust-r4ghi/business/' + name, sha256: sha(fs.readFileSync(path.join(helperDirectory, name))) }));
    c13.helperPins = f.pin('business/new13/main/complete-helpers.json', completeHelpers); f.ctx.helperPins = completeHelpers;
    const process = { namespace: 'poms-r4ghi', root: '/home/wangzishi/projects/poms-rust-r4ghi', port: 31441, binarySha256: sha('synthetic-process') },`);
  } else {
    const start = text.indexOf("test('runtime complete helper graph includes the unchanged template and equals the admitted graph',");
    const end = text.indexOf("test('filling the business template", start); assert(start >= 0 && end > start);
    text = text.slice(0, start) + `test('runtime complete helper graph includes the unchanged template and equals the admitted graph',()=>privateBindingFixture13(f=>{
 const win=path.join(f.dir,'explicit-synthetic-win'),folder=path.join(win,'tools/rust-r4ghi/business');fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'tax13-bindings.json'),JSON.stringify(f.template),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'tax13-provenance.mjs'),'// Explicit non-executable unit fixture leaf.\\nexport const syntheticUnitFixture = true;\\n',{flag:'wx'});
 const helpers=fs.readdirSync(folder).filter(name=>/\\.(mjs|json)$/.test(name)).sort().map(name=>({file:'tools/rust-r4ghi/business/'+name,sha256:sha(fs.readFileSync(path.join(folder,name)))}));
 const manifest=structuredClone(f.manifest);manifest.current.helperSources=helpers;manifest.current.helperCount=helpers.length;
 const loaded=loadApprovedTax13Bindings(f.save('complete-graph-private-binding.json',manifest),f.priv),helperPin=f.save('admitted-helpers.json',helpers),ctx={win,state:{},helperPins:helpers},registry={consumer:{helperPins:helperPin}};
 assertCompleteTax13HelperGraph(ctx,loaded.manifest,registry);
 const missing=structuredClone(loaded.manifest);missing.current.helperSources=missing.current.helperSources.filter(p=>!p.file.endsWith('tax13-bindings.json'));assert.throws(()=>assertCompleteTax13HelperGraph(ctx,missing,registry));
 const changed=structuredClone(helpers);changed[1].sha256='0'.repeat(64);const bad={consumer:{helperPins:f.save('changed-admitted-helpers.json',changed)}};assert.throws(()=>assertCompleteTax13HelperGraph(ctx,loaded.manifest,bad));
 fs.writeFileSync(path.join(folder,'unexpected.json'),'{}',{flag:'wx'});assert.throws(()=>assertCompleteTax13HelperGraph(ctx,loaded.manifest,registry),'An undeclared real helper leaf cannot be omitted');
}));
` + text.slice(end);
  }
  const bytes = Buffer.from(text), candidate = 'proposed/' + file;
  bases.push(write(pack + '/base/' + file, before)); files.push(write(pack + '/' + candidate, bytes));
  products.push({ file, beforeSHA256: sha(before), afterSHA256: sha(bytes), candidate });
}
const manifest = { kind: 'Root-proposed-two-synthetic-fixture-input-correction231', products, files, bases,
  diagnosis: { file: 'tools/rust-r4ghi/independent/review05/helper-fixture-review127/diagnosis127.json', rawBytesSha256: '58134b4f07c34a51c66b7e60d6b57e8f7cad500d7b4493287c6dc0be62908a7c' },
  runtimeHelpersChanged: false, source416Changed: false, RootApplied: false, current119Modified: false,
  intendedApplication: 'Only after an independently reviewed explicit no-domain-consumption withdrawal, then a new complete helper graph and119/B2',
  original227FailureRetained: true, G3Certified: false, G4Certified: false };
console.log(JSON.stringify({ proposal: write(pack + '/manifest231.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n')), testFiles: products.length, RootApplied: false }));
