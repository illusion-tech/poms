// Root reuses previously measured business cases through new, explicit adapters.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pin } from './source-guard.mjs';
import { createE1Resolver } from './e1-resolver01.mjs';
import { E1_INPUTS } from './e1-registry01.mjs';
const resolver = createE1Resolver({ repositoryRoot: process.cwd() }), records = [];
const from = 'docs/design/archive/slices/rust-r3hijk/evidence/foundation-business-regression01.mjs', to = 'tmp/rust-r3m/foundation-business-regression01.mjs';
let library = fs.readFileSync(from, 'utf8');
const fixtures = [E1_INPUTS.fixtureA, E1_INPUTS.fixtureB].map(p => resolver.read(p));
for (const r of fixtures) { const oldImport = '../../' + r.logical.file; assert(library.includes(oldImport)); library = library.replaceAll(oldImport, '../../' + r.canonical.file); }
assert(!fs.existsSync(to)); fs.writeFileSync(to, library, { flag: 'wx' }); records.push({ canonicalOriginal: pin(from), currentDerived: pin(to), importFixtures: fixtures.map(r => ({ logical: r.logical, canonical: r.canonical })) });
const dFrom = 'docs/design/archive/slices/rust-r3hijk/originals/d-input/native-fixture-draft01.mjs', dTo = 'tmp/rust-r3m/d-input/native-fixture-draft01.mjs';
fs.mkdirSync('tmp/rust-r3m/d-input'); fs.copyFileSync(dFrom, dTo, fs.constants.COPYFILE_EXCL); records.push({ canonicalOriginal: pin(dFrom), currentExactCopy: pin(dTo) });
for (const [oldName, newName] of [['foundation-business02.mjs', 'foundation-regression01.mjs'], ['acceptance-chain06.mjs', 'integration-chain01.mjs'], ['business-core02.mjs', 'lead-business-core01.mjs']]) {
  const source = 'tools/rust-r3hijk/' + oldName, target = 'tools/rust-r3m/' + newName;
  let text = fs.readFileSync(source, 'utf8');
  // Preserve canonical historical references, while all active adapters move to
  // the fresh namespace and current G1 authority.
  const historicalRefs = [...new Set([...text.matchAll(/'((?:docs\/design\/rust-r3hijk)[^']+)'/g)].map(m => m[1]))];
  for (let i = 0; i < historicalRefs.length; i++) {
    const old = historicalRefs[i];
    if (old.endsWith('/business-policy-authority01.json')) text = text.replaceAll(old, 'docs/design/rust-r3m/g1-gate-authority01.json').replaceAll('policyApprovedForBoundedCorrection', 'G2Authorized');
    else { const archive = old.startsWith('docs/design/rust-r3hijk/') ? old.replace('docs/design/rust-r3hijk/', 'docs/design/archive/slices/rust-r3hijk/') : old.replace('docs/design/', 'docs/design/archive/slices/'); assert(fs.existsSync(archive), archive); text = text.replaceAll(old, '@@HISTORICAL_' + i + '@@'); historicalRefs[i] = archive; }
  }
  text = text.replaceAll('r3hijk', 'r3m').replaceAll('R3HIJK', 'R3CO').replaceAll('HIJK', 'R3CO').replaceAll('hijk_', 'r3m_').replaceAll('hijk-', 'r3m-');
  text = text.replaceAll(oldName, newName).replaceAll('./acceptance-context01.mjs', './acceptance-context03.mjs');
  for (let i = 0; i < historicalRefs.length; i++) text = text.replaceAll('@@HISTORICAL_' + i + '@@', historicalRefs[i]);
  text = text.replaceAll("ctx.concurrentOnRow('lead_score_override',pending.id,requests)", "ctx.concurrentOnRow('lead',lead.id,requests)");
  if (oldName.startsWith('foundation')) {
    text = text.replace('let completed=false,error=null;', `for(const p of ${JSON.stringify(fixtures.map(r => r.canonical.file))})ctx.addSource(p);let completed=false,error=null;`);
  }
  assert(!fs.existsSync(target)); fs.writeFileSync(target, text, { flag: 'wx' }); records.push({ originalRecipe: pin(source), currentDerived: pin(target), actualOriginalCountsNotRecounted: true });
}
fs.writeFileSync('tmp/rust-r3m/root/stage-runner-derivation01.json', JSON.stringify({ kind: 'R3-current-source-stage-runner-derivation', records, inputsArePureCaseDefinitions: true, oldAliasesReadByNewAdapters: false, oldPrivateRead: false, actualExecutionPerformed: false, leadBarrierChange: 'Approval serialization now uses Lead before override, so replacement race holds actual Lead row for both requests' }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ records: records.length, businessRunners: 3, oldRecipesModified: false, oldAliasPayloadDependency: false }));
