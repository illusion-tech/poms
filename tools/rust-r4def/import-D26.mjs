import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r4d-handover/poms', file = 'tools/rust-r4def/D/D-delivery01.json';
const raw = fs.readFileSync(root + '/' + file), hash = b => createHash('sha256').update(b).digest('hex');
assert.equal(hash(raw), '8947aec79083c235427c38ed013d746e2bb64c8eacf657950609a0f37495594a');
const m = JSON.parse(raw); assert.equal(m.sourceFiles.length, 18);
const allow = p => p.startsWith('apps/poms-api-rust/src/project_handover/') || p.startsWith('apps/poms-api-rust/src/contracts/') || p.startsWith('apps/poms-api-rust/src/contract_readiness/') || p === 'apps/poms-api-rust/src/approval/domain.rs' || p.startsWith('apps/poms-admin/src/app/features/project/project-handover-') || p === 'apps/poms-admin/src/app/features/project/project-contract-handover.ts' || p === 'apps/poms-admin/src/app/features/project/project-contract-handover.spec.ts';
for (const p of [...m.sourceFiles, ...m.toolArtifacts]) {
    const name = p.path; assert(allow(name) || name.startsWith('tools/rust-r4def/D/'), name); const from = root + '/' + name; assert(fs.lstatSync(from).isFile());
    const bytes = fs.readFileSync(from); assert.equal(bytes.length, p.bytes); assert.equal(hash(bytes), p.rawBytesSha256); fs.mkdirSync(path.dirname(name), { recursive: true });
    if (name.startsWith('tools/')) assert(!fs.existsSync(name), 'Never overwrite author evidence');
    fs.writeFileSync(name, bytes); assert.equal(hash(fs.readFileSync(name)), p.rawBytesSha256);
}
fs.writeFileSync(file, raw, { flag: 'wx' });
console.log(JSON.stringify({ DProductAndUI: m.sourceFiles.length, tools: m.toolArtifacts.length, RootOwnedScaffoldingImported: false }));
