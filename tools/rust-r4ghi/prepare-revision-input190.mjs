import fs from 'node:fs';
import { createHash } from 'node:crypto';
const P = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private', sha = value => createHash('sha256').update(value).digest('hex');
const input = { kind: 'Root-approved-unexecuted-Source13-build-revision189', G3Certified: false,
  drift113: { file: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/independent/review05/build-input-corrective-review113/drift113.json', rawBytesSha256: '7b1d28630a21c34f39e35fe3ea38694ff8b226b3b82f531f0c4f0b494ec0daf0' },
  independentApproval: { file: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/independent/review05/refreeze189-review114/review114-02.json', rawBytesSha256: 'bcfa3be54beacaaa24a5bc4caf1854d71f3f252474548d7b2d2485f92e89299f' },
  newDriver: { file: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/build-source13-180-02.mjs', rawBytesSha256: '68a1aca0d656bb1daf827ee139d6f9e31e9c1692008f70b5c03efe2e06fb6bf8' } };
const raw = Buffer.from(JSON.stringify(input, null, 2) + '\n'), file = P + '/refreeze-input190.json'; fs.writeFileSync(file, raw, { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ input: { file: file.replace('//wsl.localhost/Debian', ''), rawBytesSha256: sha(raw) } }));
