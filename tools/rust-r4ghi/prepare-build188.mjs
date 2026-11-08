import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', P = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private', sha = value => createHash('sha256').update(value).digest('hex');
const raw = fs.readFileSync(P + '/source13-preparation183/freeze183-receipt.json'); assert.equal(sha(raw), 'fc4c5111193edcad5daab7319b7153affb324916231f6efed4518ef8bcbecc7e'); const frozen = JSON.parse(raw);
const plan = { kind: 'Root-approved-Source13-actual-build180', outputDirectory: '/home/wangzishi/.local/share/poms-r4ghi/private/source13-build180', approval: frozen.approval, sourcePins: frozen.sourcePins, helperH0: frozen.helperH0, G3Certified: false };
assert.equal(sha(fs.readFileSync(R + '/tools/rust-r4ghi/build-source13-180.mjs')), 'd35ef3b022c0e9905121d794781992978079f3fb0490ee7333fdc6450744dbaa');
const file = P + '/source13-preparation183/build-plan188.json', bytes = Buffer.from(JSON.stringify(plan, null, 2) + '\n'); fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ plan: { file: file.replace('//wsl.localhost/Debian', ''), rawBytesSha256: sha(bytes) }, actualBuildExecuted: false }));
