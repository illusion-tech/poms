import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { sha, keyOf } from './pure.mjs';

export const objectRoot = (ctx, database) => `${ctx.stateRoot}/objects/${database === 'poms_r4ghi_native' ? 'native' : 'rust'}`;
export function objectPath(ctx, database, key) {
  assert(ctx.databases.includes(database) && typeof key === 'string' && key.length > 0 && !key.includes('\\'));
  assert(!path.isAbsolute(key) && key.split('/').every(p => p && p !== '.' && p !== '..'));
  const root = objectRoot(ctx, database), file = path.resolve(root, key); assert(file.startsWith(root + '/')); return file;
}
export function captureObjects(ctx, database) {
  const root = objectRoot(ctx, database), files = [], directories = [];
  if (!fs.existsSync(root)) return { root, existed: false, files, directories };
  assert.equal(fs.realpathSync(root), root, 'Object root must not be redirected');
  const walk = folder => {
    const stat = fs.lstatSync(folder); assert(stat.isDirectory() && !stat.isSymbolicLink());
    directories.push(path.relative(root, folder));
    for (const item of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(folder, item.name), st = fs.lstatSync(file); assert(!st.isSymbolicLink(), 'Object tree symlink forbidden');
      if (st.isDirectory()) walk(file);
      else { assert(st.isFile() && st.nlink === 1, 'Object must be a regular unlinked file'); const bytes = fs.readFileSync(file); files.push({ key: path.relative(root, file), file, bytes: bytes.length, sha256: sha(bytes) }); }
    }
  };
  walk(root); return { root, existed: true, files: files.sort((a, b) => a.key.localeCompare(b.key)), directories: directories.sort() };
}
export function objectDiff(before, after) {
  const b = new Map(before.files.map(r => [r.key, r])), a = new Map(after.files.map(r => [r.key, r]));
  return { added: [...a.values()].filter(r => !b.has(r.key)), changed: [...a.values()].filter(r => b.has(r.key) && r.sha256 !== b.get(r.key).sha256), missing: [...b.values()].filter(r => !a.has(r.key)) };
}
export function assertObjectsRecorded(ctx, baseline, observed) {
  for (const database of ctx.databases) {
    assert(baseline.objects?.[database] && observed.objects?.[database], 'Fresh business baseline must include object inventories');
    const diff = objectDiff(baseline.objects[database], observed.objects[database]); assert.equal(diff.changed.length + diff.missing.length, 0, 'Original object changed/missing');
    for (const row of diff.added) { const owned = ctx.state.objects?.[keyOf(database, 'object', [row.key])]; assert(database === ctx.database && owned && !owned.deleted && owned.latestSha256 === row.sha256, 'Unknown/unobserved object'); }
    for (const directory of observed.objects[database].directories.filter(d => !baseline.objects[database].directories.includes(d))) {
      assert(database === ctx.database && Object.values(ctx.state.objects ?? {}).some(o => o.database === database && (directory === '' || o.key.startsWith(directory + '/'))), 'Unknown new object directory');
    }
    for (const directory of baseline.objects[database].directories) assert(observed.objects[database].directories.includes(directory), 'Original object directory disappeared');
  }
}
// Pass raw snapshot row reader to avoid a circular module dependency.
export function reconcileObjects(ctx, before, after, attempt, readRows) {
  ctx.state.objects ??= {}; const blockers = [], recorded = [];
  const sessions = readRows(after.databases[ctx.database].tables.attachment_upload_session).map(r => ({ row: r, cell: JSON.parse(r.raw) }));
  const attachments = readRows(after.databases[ctx.database].tables.attachment).map(r => ({ row: r, cell: JSON.parse(r.raw) }));
  for (const database of ctx.databases) {
    const diff = objectDiff(before.objects[database], after.objects[database]);
    if (database !== ctx.database && diff.added.length + diff.changed.length + diff.missing.length) { blockers.push({ kind: 'native-object-drift' }); continue; }
    for (const row of diff.changed) blockers.push({ kind: 'existing-object-overwrite-forbidden', key: row.key });
    for (const row of diff.added) {
      const session = sessions.find(s => s.cell.storage_key === row.key && s.cell.provider_type === 'local' && ctx.state.owned[keyOf(database, 'attachment_upload_session', s.row.key)]);
      const attachment = attachments.find(a => a.cell.storage_key === row.key && a.cell.storage_provider === 'local' && ctx.state.owned[keyOf(database, 'attachment', a.row.key)]);
      let proof = null;
      if (session && attempt.operationId === 'AttachmentUploadSessionController_proxyUploadObject' && attempt.pathParams?.id === session.cell.id && attempt.requestBodySha256 === row.sha256) {
        proof = { kind: 'actual-HTTP-upload-bytes-exact-owned-session-key', sessionId: session.cell.id, actualPayloadSHA: attempt.requestBodySha256 };
      }
      if (!proof && attachment && attempt.operationId === 'AttachmentUploadSessionController_complete') {
        const originalSession = sessions.find(s => s.cell.id === attempt.pathParams?.id && s.cell.completed_attachment_id === attachment.cell.id);
        const oldObject = originalSession && Object.values(ctx.state.objects).find(o => o.database === database && o.sessionId === originalSession.cell.id && o.latestSha256 === row.sha256);
        if (originalSession && oldObject) proof = { kind: 'actual-HTTP-completion-owned-object-transfer', sessionId: originalSession.cell.id, attachmentId: attachment.cell.id, originalKey: oldObject.key, originalSHA: oldObject.latestSha256 };
      }
      if (!proof) { blockers.push({ kind: 'new-object-without-exact-session-or-transfer-proof', key: row.key, sha256: row.sha256 }); continue; }
      const key = keyOf(database, 'object', [row.key]); assert(!ctx.state.objects[key]);
      ctx.state.objects[key] = { database, key: row.key, sessionId: proof.sessionId, firstSha256: row.sha256, latestSha256: row.sha256, bytes: row.bytes, proof: { ...proof, requestId: attempt.requestId, operationId: attempt.operationId, beforeAbsent: true, before: before.manifest, after: after.manifest } };
      recorded.push({ kind: 'object-birth', key: row.key, proofKind: proof.kind });
    }
    for (const row of diff.missing) {
      const key = keyOf(database, 'object', [row.key]), own = ctx.state.objects[key];
      if (!own || own.latestSha256 !== row.sha256 || own.sessionId !== attempt.pathParams?.id || !['AttachmentUploadSessionController_complete', 'AttachmentUploadSessionController_abort'].includes(attempt.operationId)) blockers.push({ kind: 'object-disappearance-without-exact-authority', key: row.key });
      else { own.deleted = true; own.deletionProof = { requestId: attempt.requestId, operationId: attempt.operationId, priorSHA: row.sha256 }; recorded.push({ kind: 'object-transfer-or-session-removal', key: row.key }); }
    }
  }
  ctx.persist(); return { blockers, recorded };
}
