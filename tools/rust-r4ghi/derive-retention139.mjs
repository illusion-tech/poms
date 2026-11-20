import fs from 'node:fs';
import assert from 'node:assert/strict';
let code = fs.readFileSync('tools/rust-r4ghi/retain-epoch11-before-noop70.mjs', 'utf8');
const replacements = [['g2-business11', 'g2-business12'], ['epoch11-before-noop70', 'epoch12-before-source13-139'],
  ['06d80fa6e766c2704664dc1828ccbedadd6bb5fba2798e3e5b42cc02a759274e', '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa'],
  ['69377', '108720'], ['c73fcaa6cc9063e9a6b7dc481a51f9f52d4ed3f9855c55201d1ab46f0695bee4', 'de8eaaf6ce15a2054380e25f3151c21611cf0bf760230c7336745d80850d9cff'],
  ['api134.binary', 'api135.binary'], ["'stop', '134'", "'stop', '135'"], ['retention70', 'retention139'], ['retained70', 'retained139'],
  ['state-at-retention70', 'state-at-retention139'], ['source11', 'source12'], ['index70', 'index139'], ['final11-source58', 'final12-source140'],
  ['retained-source11-before-noop70.json', 'retained-source12-before-source13-139.json'], ['API134Stopped', 'API135Stopped']];
for (const [from, to] of replacements) { if (code.includes(from)) code = code.replaceAll(from, to); }
const anchor = "  assert.equal(sha(JSON.stringify(ctx.pins)), '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa');";
assert(code.includes(anchor));
code = code.replace(anchor, anchor + `
  const eoId = ctx.state.fixtures.uiFixtureViews23.eo.pause.result.projectId;
  assert(ctx.state.fixtures.uiFixtureViews23.eo.UICommandObserved && ctx.state.fixtures.uiFixtureViews23.own.UICommandObserved);
  assert(ctx.state.fixtures.uiFormFixtureViews18['role-create'].UICommandObserved && ctx.state.fixtures.uiFormFixtureViews18['gh-capture'].UICommandObserved);
  assert(ctx.state.uiExpense18Receipts?.[eoId] && ctx.state.uiLifecycle18Receipts?.[eoId], 'Finish the authorized real forms before advancing product/schema');
  const native = JSON.parse(fs.readFileSync(ctx.private + '/native-reference92/source12-native01/state.json')); assert.equal(native.phase, 'cleaned-conserved-by-92-02');
`);
assert(code.includes("'stop', '135'") && code.includes('epoch12-before-source13-139'));
fs.writeFileSync('tools/rust-r4ghi/retain-epoch12-before-source13-139.mjs', code, { flag: 'wx' });
let packet = fs.readFileSync('tools/rust-r4ghi/package-retained-candidate58.mjs', 'utf8');
for (const [from, to] of [['g2-business11', 'g2-business12'], ['405', '406'], ['final11-source58', 'final12-source140'], ['final11', 'final12'], ['69377', '108720'],
  ['06d80fa6e766c2704664dc1828ccbedadd6bb5fba2798e3e5b42cc02a759274e', '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa'],
  ['002348-candidate-source-binding11.json', '004534-candidate-source-binding12.json'], ['910ffeefb2d9b0322b53476034104fbc58aeb520e8de159790458eebbbc440fc', 'b5c86c8882657aac1e1affc153510a728bc304943265e51a230b6be19a0429b7'],
  ['c73fcaa6cc9063e9a6b7dc481a51f9f52d4ed3f9855c55201d1ab46f0695bee4', 'de8eaaf6ce15a2054380e25f3151c21611cf0bf760230c7336745d80850d9cff']]) packet = packet.replaceAll(from, to);
fs.writeFileSync('tools/rust-r4ghi/package-retained-candidate140.mjs', packet, { flag: 'wx' });
console.log(JSON.stringify({ derived: ['retain-epoch12-before-source13-139.mjs', 'package-retained-candidate140.mjs'], executed: false, API135Stopped: false }));
