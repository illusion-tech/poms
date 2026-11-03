// Root derives a fresh namespace. Old executed recipes remain byte-identical.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pin } from './source-guard.mjs';
const gate = JSON.parse(fs.readFileSync('docs/design/rust-r3m/g1-gate-authority01.json'));
assert(gate.G1Certified && gate.G2Authorized);
const records = [];
for (const name of ['environment.mjs', 'runtime.mjs', 'wire-client.mjs', 'fixture-actor03.mjs', 'ui-server01.mjs']) {
  const source = 'tools/rust-r3hijk/' + name, target = 'tools/rust-r3m/' + name;
  assert(!fs.existsSync(target));
  let text = fs.readFileSync(source, 'utf8');
  const windowsRoot = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
  text = text.replaceAll(windowsRoot, '@@WINDOWS_ROOT@@').replaceAll('E:/projects/worktrees/poms-r3hijk-next28/poms', '@@WINDOWS_NATIVE_ROOT@@');
  text = text.replaceAll('r3hijk', 'r3m').replaceAll('R3HIJK', 'R3CO').replaceAll('HIJK', 'R3CO').replaceAll('hijk_', 'r3m_').replaceAll('hijk-', 'r3m-');
  text = text.replaceAll('7f970c992291c61477eb9bd83a48cec19a769d88', gate.base);
  for (const [oldPort, newPort] of [['22433', '23433'], ['12400', '13400'], ['12410', '13410'], ['12500', '13500'], ['12600', '13600']]) text = text.replaceAll(oldPort, newPort);
  text = text.replaceAll('@@WINDOWS_ROOT@@', windowsRoot).replaceAll('@@WINDOWS_NATIVE_ROOT@@', 'E:/projects/worktrees/poms-r3hijk-next28/poms');
  if (name === 'environment.mjs') {
    const lines = text.split('\n'), index = lines.findIndex(l => l.startsWith('function nativeSources()'));
    assert(index >= 0);
    lines[index] = 'function nativeSources(){return guardNative();}';
    text = "import {guardNative} from './source-guard.mjs';\n" + lines.join('\n');
  }
  assert(!text.includes('/.local/share/poms-r3hijk/private'));
  fs.writeFileSync(target, text, { flag: 'wx' });
  records.push({ original: pin(source), derived: pin(target), changes: 'new owned namespace/base/ports; existing Windows source checkout retained; environment source admission delegates to new G1 guard' });
}
fs.writeFileSync('tmp/rust-r3m/root/environment-derivation01.json', JSON.stringify({ kind: 'R3-closeout-environment-source-derivation', records, historicalRecipesChanged: false, actualExecutionPerformed: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ derived: records.length, oldRecipesChanged: false, G2Authorized: true }));
