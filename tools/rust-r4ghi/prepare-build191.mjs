import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const P = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private', sha = value => createHash('sha256').update(value).digest('hex'), raw = fs.readFileSync(P + '/source13-preparation189/receipt189.json'); assert.equal(sha(raw), '44f731f79bbfdcc0713f95c5af4393ecb7cb6cb636fada10c28b794dc8ca3992'); const r = JSON.parse(raw);
const plan = { kind: 'Root-approved-Source13-actual-build180', outputDirectory: '/home/wangzishi/.local/share/poms-r4ghi/private/source13-build180-02', approval: r.approval, sourcePins: r.sourcePins, helperH0: r.helperH0, preMintRevision: { file: '/home/wangzishi/.local/share/poms-r4ghi/private/source13-preparation189/receipt189.json', rawBytesSha256: sha(raw) }, G3Certified: false };
const bytes = Buffer.from(JSON.stringify(plan, null, 2) + '\n'), file = P + '/source13-preparation189/build-plan191.json'; fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ plan: { file: file.replace('//wsl.localhost/Debian', ''), rawBytesSha256: sha(bytes) } }));
