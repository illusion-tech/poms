// SOURCE only until Root/C invokes: reads only this new fixture's saved private
// ownership journal, exports three noncredential prepared rows, opens no DB.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { marker, sourceHead, databaseFor } from './fixture-guard.mjs';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function exportContractInputSlots(reportFile, output) {
    assert.equal(process.platform, 'linux'); assert(!fs.existsSync(output)); const bytes = fs.readFileSync(reportFile), report = JSON.parse(bytes);
    assert(report.result === 'observed' && report.doubleZero && report.full107Restored); assert(['nest', 'rust'].includes(report.backend)); assert(/^[0-9a-f-]{36}$/.test(report.runId));
    const privateFile = '/home/wangzishi/.local/share/poms-r2l/private/l-runs/' + report.backend + '-' + report.runId + '.json';
    const stat = fs.lstatSync(privateFile); assert(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0);
    const raw = fs.readFileSync(privateFile), journal = JSON.parse(raw);
    assert(journal.namespace === 'poms-r2l' && journal.runId === report.runId && journal.backend === report.backend && journal.marker === marker && journal.sourceHead === sourceHead && journal.database === databaseFor(report.backend)); assert.equal(journal.state, 'cleaned');
    const rows = report.preparedSource.rows.map((input) => {
        assert(['customer', 'project', 'contract'].includes(input.table));
        const candidates = journal.directCreates.flatMap((intent) => intent.captured.filter((item) => item.table === input.table && item.id === input.values.id).map((item) => ({ intent, item })));
        assert.equal(candidates.length, 1); const { intent, item } = candidates[0];
        const owned = journal.objects.find((object) => object.table === input.table && object.id === input.values.id); assert(owned?.creationProof.kind === 'direct-committed-insert' && owned.postcondition.independentlyVisible);
        assert(intent.beforeAbsent && intent.state === 'promoted' && (owned.creationProof.commitAcknowledged || owned.creationProof.recoveredByXminAndXactStatus));
        assert.equal(String(BigInt(intent.transaction) % 4294967296n), intent.expectedXmin); assert.equal(owned.creationProof.transaction, intent.transaction); assert.equal(owned.creationProof.xmin, intent.expectedXmin);
        return { table: input.table, id: item.id, row: item.row, identity: item.identity, originalSourcePk: report.preparedSource.primaryKeyMap.find(({ to }) => to === item.id)?.from,
            originalInsertColumns: Object.keys(input.values), proof: { kind: owned.creationProof.kind, beforeAbsent: intent.beforeAbsent, transaction: intent.transaction, xmin: intent.expectedXmin, commitAcknowledged: owned.creationProof.commitAcknowledged, recoveredByXminAndXactStatus: owned.creationProof.recoveredByXminAndXactStatus, independentlyVisible: true } };
    });
    assert.equal(rows.length, 3); assert.equal(new Set(rows.map(({ table }) => table)).size, 3);
    const result = { formatVersion: 1, kind: 'public-source-bound-three-prepared-input-slots', result: 'pass-saved-evidence-only', backend: report.backend, runId: report.runId, sourceHead, marker,
        actualReport: { file: reportFile, bytes: bytes.length, sha256: sha(bytes), canonicalSha256: sha(JSON.stringify(report)) }, rows,
        privateSource: { file: privateFile, bytes: raw.length, sha256: sha(raw), credentialOrBorrowedPrincipalRowsExported: false, rawPrivateCopied: false },
        boundary: 'Three fresh prepared customer/project/contract recorded INSERT RETURNING rows and actual saved commit proofs only; no new DB read, new commit or all-owned-row certification' };
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const [report, output] = process.argv.slice(2); assert(report && output); const result = exportContractInputSlots(report, output); console.log(JSON.stringify({ result: result.result, backend: result.backend, rows: result.rows.length, output }));
}
