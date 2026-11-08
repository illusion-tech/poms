import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', L = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private', sha = value => createHash('sha256').update(value).digest('hex');
const pin = relative => ({ file: L + '/' + relative, rawBytesSha256: sha(fs.readFileSync(R + '/' + relative)) });
const tools = { migrationWrapper: 'run-m98-168.mjs', migrationAfterCapture: 'capture-m98-after164.mjs', source13Constructor: 'construct-source13-bindings.mjs', source13BuildRunner: 'build-source13-180.mjs', apiRuntimeWrapper: 'start-api136-182.mjs', apiRuntimeLauncher: 'api-runtime01.mjs', postM98FrozenNegative: 'probe-m98-frozen-external.mjs', source13Freezer: 'freeze-source13-183.mjs' };
const independent = ['source13-constructor-review107/review107-03.json', 'source-build-review109/review109A-181.json', 'source-build-review109/review109B-02.json', 'labor-masking-review110/review110-03.json', 'api-start-review111/review111.json', 'freeze-source13-review112/review112.json', 'frozen-external-review108/review108-02.json', 'm98-wrapper-review105/review105.json', 'm98-after-adapter-review104/review104-02.json'];
const input = { kind: 'Root-reviewed-final-Source13-freeze-input183', historicalAutomaticSelectionApproved: false, G3Certified: false,
  staging177: pin('docs/design/rust-r4ghi/source13-staging177.json'), dependencyCorrection181: pin('docs/design/rust-r4ghi/source-dependencies181-corrective.json'),
  finalHToolManifests: [pin('tools/rust-r4ghi/H/implementation/support-patches/policy-source13-46/manifest46.json'), pin('docs/design/rust-r4ghi/labor184-final-union.json')],
  supportingTools: { ...Object.fromEntries(Object.entries(tools).map(([key, file]) => [key, pin('tools/rust-r4ghi/' + file)])), trustedSummaryExampleSource: pin('apps/poms-api-rust/examples/r4ghi_summary_producer08.rs') },
  independentReviews: independent.map(file => pin('tools/rust-r4ghi/independent/review05/' + file)) };
assert.equal(input.supportingTools.source13BuildRunner.rawBytesSha256, 'd35ef3b022c0e9905121d794781992978079f3fb0490ee7333fdc6450744dbaa'); assert.equal(input.supportingTools.postM98FrozenNegative.rawBytesSha256, 'f340e65e2ee59d184c5711587d24c79e4f5ca43fabd0f356a4485ce542cad37a');
const raw = Buffer.from(JSON.stringify(input, null, 2) + '\n'), file = P + '/source13-freeze-input187.json'; fs.writeFileSync(file, raw, { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ input: { file: file.replace('//wsl.localhost/Debian', ''), rawBytesSha256: sha(raw) }, M98Executed: false, Source13StateMinted: false }));
