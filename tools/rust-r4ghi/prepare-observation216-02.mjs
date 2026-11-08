// Preserve the failed pre-DB216, then prepare a distinct reviewed successor.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = value => createHash('sha256').update(value).digest('hex'), file = R + '/tools/rust-r4ghi/capture-tool119-216.mjs', raw = fs.readFileSync(file);
const pack = R + '/tools/rust-r4ghi/checkpoints/tool119-observe216'; fs.mkdirSync(pack, { recursive: true });
fs.writeFileSync(pack + '/capture-tool119-216.original.mjs', raw, { flag: 'wx' });
let code = raw.toString(); assert(code.includes('sha(ownedFile(api.binary))'));
code = code.replace("O = D + '/tool119-observe216'", "O = D + '/tool119-observe216-02'")
  .replace("assert.equal(sha(ownedFile(api.binary)), api.binarySha256);", "const binaryStat = fs.lstatSync(api.binary); assert(binaryStat.isFile() && !binaryStat.isSymbolicLink()); assert.equal(fs.realpathSync(api.binary), path.resolve(api.binary)); assert.equal(sha(fs.readFileSync(api.binary)), api.binarySha256); // Cargo legitimately retains two hard links; source pins still require nlink1.")
  .replace("  let partial = null; if (fs.existsSync(O)) partial = write(O + '/partial216.json',", "  if (!fs.existsSync(O)) fs.mkdirSync(O, { mode: 0o700 });\n  const partial = write(O + '/partial216-02.json',")
  .replaceAll('observation216', 'observation216-02').replaceAll('receipt216.json', 'receipt216-02.json');
const target = R + '/tools/rust-r4ghi/capture-tool119-216-02.mjs'; fs.writeFileSync(target, code, { flag: 'wx' });
const p = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
assert(!fs.existsSync(p + '/business/g2-business13/main01/tool119-observe216')); assert(!fs.existsSync(p + '/business/g2-business13/main01/driver.lock'));
const reconciliation = { kind: 'Root-FS-reconciliation-of-pre-DB-tool119-observation216-stop', originalScript: { file: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/capture-tool119-216.mjs', rawBytesSha256: sha(raw) },
  observedStdout: '{"completed":false,"partial":null,"noBlindRetry":true}\n', observedExitCode: 1, toolSessionId: 37070,
  actualOriginalStackWasNotSaved: true, diagnosis: 'API binary has two legitimate Cargo hard links; strict ownedFile nlink1 rejects before output directory and before DB-client setup',
  laterFSStat: { nlink: 2, binary: '/home/wangzishi/.cache/poms-r4ghi-target-ROOT/debug/poms-api-rust' },
  originalOutputDirectoryAbsent: true, originalDriverLockAbsent: true, fullSnapshotCaptured: false, SQLOrHTTPExecuted: false, G3Certified: false,
  distinctSuccessor: { file: 'tools/rust-r4ghi/capture-tool119-216-02.mjs', rawBytesSha256: sha(Buffer.from(code)) } };
const out = p + '/source13-tool119-h0-215/failure216-reconciliation.json'; fs.writeFileSync(out, JSON.stringify(reconciliation, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ originalScriptSHA256: sha(raw), successorSHA256: sha(Buffer.from(code)), reconciliationSHA256: sha(fs.readFileSync(out)), previousFailureRetained: true, SQLOrHTTPExecuted: false }));
