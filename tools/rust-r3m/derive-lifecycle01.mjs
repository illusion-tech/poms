import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pin } from './source-guard.mjs';
const records = [];
for (const [fromName, toName] of [['cohort-terminal02.mjs', 'cohort-terminal01.mjs'], ['sync-public.mjs', 'sync-public01.mjs']]) {
  const source = 'tools/rust-r3hijk/' + fromName, target = 'tools/rust-r3m/' + toName;
  let s = fs.readFileSync(source, 'utf8').replaceAll('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', '@@WIN@@');
  s = s.replaceAll('r3hijk', 'r3m').replaceAll('R3HIJK', 'R3CO').replaceAll('hijk_', 'r3m_').replaceAll('hijk-', 'r3m-');
  s = s.replaceAll('@@WIN@@', '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms').replaceAll(fromName, toName);
  for (const [oldPort, newPort] of [['22433', '23433'], ['12400', '13400'], ['12410', '13410'], ['12500', '13500'], ['12600', '13600']]) s = s.replaceAll(oldPort, newPort);
  if (fromName.startsWith('cohort')) {
    s = s.replace('const [mode,backend,attempt]=process.argv.slice(2);', 'const [mode,backend,attempt,cohortFile]=process.argv.slice(2);');
    const old = "assert.equal(backend,'rust');const runId=JSON.parse(fs.readFileSync('tmp/rust-r3m/root/uuid-cohort01.json')).runId;";
    assert(s.includes(old));
    s = s.replace(old, "assert(/^tmp\\/rust-r3m\\/root\\/[a-z0-9-]+\\.json$/.test(cohortFile));const cohort=JSON.parse(fs.readFileSync(cohortFile));assert.equal(cohort.backend,backend);const runId=cohort.runId;");
    s = s.replace("assert.equal(identity.marker,'3e225e17-88de-4880-92ea-4dad45646963');", "assert.equal(identity.marker,cohort.marker);assert.equal(identity.base,'5041275d7ad82af4becbb4462e7213ffe465bc7a');");
  } else {
    // Only immutable originals are synchronized; the mutable current pointer is
    // represented by each uniquely named candidate capsule in the same tree.
    s = s.replace('for(const file of walk(prefix)){', "for(const file of walk(prefix)){if(file==='tmp/rust-r3m/root/current-candidate.json')continue;");
  }
  assert(!fs.existsSync(target)); fs.writeFileSync(target, s, { flag: 'wx' });
  records.push({ original: pin(source), derived: pin(target) });
}
fs.writeFileSync('tmp/rust-r3m/root/lifecycle-derivation01.json', JSON.stringify({ kind: 'R3-new-namespace-lifecycle-derivation', records, previousPrivateRead: false, actualExecutionPerformed: false }, null, 2) + '\n', { flag: 'wx' });
