// Root/C SOURCE-only exporter. Reads only this batch's saved new private
// evidence; opens no DB/HTTP and exports no raw password/token/cookie material.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { marker, sourceHead, databaseFor } from './fixture-guard.mjs';
const PRIVATE = '/home/wangzishi/.local/share/poms-r2l/private';
const sha = (value) => createHash('sha256').update(value).digest('hex');
function redacted(value) {
    if (Array.isArray(value)) return value.map(redacted);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /^(?:token|csrfToken|sessionToken|accessToken|refreshToken|password|passwordHash|password_hash|token_hash|csrf_token_hash|setCookie)$/i.test(key) && item !== null
        ? { redacted: true, bytes: Buffer.byteLength(typeof item === 'string' ? item : JSON.stringify(item)), sha256: sha(typeof item === 'string' ? item : JSON.stringify(item)) } : redacted(item)]));
}
function privateBytes(file) {
    assert(file.startsWith(PRIVATE + '/')); const stat = fs.lstatSync(file);
    assert(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0 && stat.nlink === 1); return fs.readFileSync(file);
}
export function exportCommissionDiffEvidence(reportFile, output) {
    assert.equal(process.platform, 'linux'); assert(!fs.existsSync(output));
    const bytes = fs.readFileSync(reportFile), report = JSON.parse(bytes); assert(report.result === 'observed' && report.doubleZero && report.requests.length === 114);
    assert(['nest', 'rust'].includes(report.backend)); assert(/^[0-9a-f-]{36}$/.test(report.runId)); assert.equal(report.marker, marker); assert.equal(report.sourceHead, sourceHead);
    const journalFile = PRIVATE + '/l-runs/' + report.backend + '-' + report.runId + '.json', journalRaw = privateBytes(journalFile), journal = JSON.parse(journalRaw);
    assert(journal.namespace === 'poms-r2l' && journal.marker === marker && journal.sourceHead === sourceHead && journal.runId === report.runId && journal.backend === report.backend && journal.database === databaseFor(report.backend) && journal.state === 'cleaned');
    const rawFile = report.privateReceipt.file; assert(rawFile.includes(report.runId)); const httpRaw = privateBytes(rawFile); assert.equal(sha(httpRaw), report.privateReceipt.sha256); const http = JSON.parse(httpRaw); assert.equal(http.runId, report.runId);
    const sourcePlan = report.preparedSource.plan, baseRows = journal.base.rows;
    const originalColumns = (table, id) => {
        const base = baseRows.find((row) => row.table === table && row.values.id === id); if (base) return { kind: 'original-fresh-base-source-plan', columns: Object.keys(base.values) };
        const prepared = sourcePlan.rows.find((row) => row.table === table && row.values.id === id); if (prepared) return { kind: 'original-named-prepared-literal-INSERT', columns: prepared.source.columns, source: prepared.source };
        assert(table === 'contract' && id === report.additionalPreparedContract.id, 'Unknown direct source row');
        return { kind: 'original-selected-contract-INSERT-with-declared-draft-overrides', columns: sourcePlan.rows.find((row) => row.table === 'contract').source.columns };
    };
    const directCreates = journal.directCreates.map((intent) => {
        assert(intent.beforeAbsent && intent.state === 'promoted'); assert.equal(String(BigInt(intent.transaction) % 4294967296n), intent.expectedXmin);
        return { caseId: intent.caseId, transaction: intent.transaction, xmin: intent.expectedXmin, beforeAbsent: intent.beforeAbsent, state: intent.state,
            rows: intent.captured.map((row) => ({ table: row.table, id: row.id, identity: redacted(row.identity), row: redacted(row.row), original: originalColumns(row.table, row.id) })) };
    });
    const objects = journal.objects.map((object) => ({ table: object.table, id: object.id, caseId: object.caseId, projectId: object.projectId, projectIds: object.projectIds,
        identity: redacted(object.identity), creationProof: redacted(object.creationProof), postcondition: object.postcondition }));
    const committedCreates = journal.committedCreates.map((item) => ({ table: item.table, id: item.id, caseId: item.caseId, intentId: item.intentId, authorityId: item.authorityId,
        identity: item.identity ? redacted(item.identity) : undefined, proof: redacted(item.proof) }));
    const responseBindings = [], sessionBindings = [];
    for (const request of report.requests) {
        const matches = http.requests.filter((item) => item.name === request.name); assert.equal(matches.length, 1); const raw = matches[0];
        assert(raw.response && raw.certification.state === 'complete'); const response = Buffer.from(raw.response.bodyBytesBase64, 'base64');
        assert.equal(response.length, request.response.wireBodyBytes); assert.equal(sha(response), request.response.wireBodySha256); assert.equal(raw.response.status, request.response.status);
        assert.equal(raw.response.contentType,request.response.contentType);
        const text=response.toString('utf8'),parsed=text && raw.response.contentType.includes('application/json') ? JSON.parse(text) : text || null;
        assert.deepEqual(redacted(parsed),request.response.body); assert.deepEqual(redacted(raw.before),request.before); assert.deepEqual(redacted(raw.after),request.after);
        if (report.authFreshnessPolicy==='fresh-except-named-due') assert.deepEqual(raw.authInputPreparation,request.authInputPreparation);
        responseBindings.push({ name: request.name, status: raw.response.status, bytes: response.length, sha256: sha(response), originalPrivateComplete: true,
            parsedPublicBodyEqualsOriginalBytes:true,publicBeforeAfterMatchOriginalPrivateRows:true });
        if (!request.name.endsWith('.login')) continue;
        const cookies = new Map(raw.response.setCookie.map((cookie) => { const pair = cookie.split(';', 1)[0], at = pair.indexOf('='); return [pair.slice(0, at), pair.slice(at + 1)]; }));
        const token = cookies.get('poms_session'), csrf = cookies.get('poms_csrf'); assert(/^[A-Za-z0-9_-]{43}$/.test(token ?? '') && /^[A-Za-z0-9_-]{43}$/.test(csrf ?? ''));
        const candidates = raw.after.auth_session.filter((row) => row.token_hash === sha(token)); assert.equal(candidates.length, 1); const row = candidates[0]; assert.equal(row.csrf_token_hash, sha(csrf));
        assert(journal.objects.some((object) => object.table === 'auth_session' && object.id === row.id && object.identity.user_id === row.user_id));
        sessionBindings.push({ caseId: request.name, id: row.id, userId: row.user_id, actualCookieToStoredHashVerified: true,
            tokenHashFingerprint: sha(row.token_hash), csrfHashFingerprint: sha(row.csrf_token_hash), rawTokenOrCookieExported: false });
    }
    const definitions = journal.borrowed.definitions.map(({ id, row, fullRowSha256 }) => ({ id, approvalScenarioKey: row.approval_scenario_key, packageKey: row.summary_package_key,
        beforeFullRowSha256: fullRowSha256, afterFullRowSha256: journal.borrowed.definitionChecks.at(-1).rowSha256.find((entry) => entry.id === id).fullRowSha256, neverOwned: !objects.some((object) => object.id === id) }));
    for (const entry of definitions) assert(entry.beforeFullRowSha256 === entry.afterFullRowSha256 && entry.neverOwned);
    if (report.authFreshnessPolicy==='fresh-except-named-due') {
        assert.equal(http.authFreshnessPolicy,report.authFreshnessPolicy);
        const publicEntries=http.authInputPreparations.map(({ before,after,mutation,...entry }) => entry); assert.deepEqual(publicEntries,report.authInputPreparations);
    }
    const evidence = { formatVersion: 1, kind: 'public-commission-diff-saved-ownership-and-response-bindings', result: 'pass-saved-evidence-only', backend: report.backend, runId: report.runId, sourceHead, marker,
        actualReport: { file: reportFile, bytes: bytes.length, sha256: sha(bytes), canonicalSha256: sha(JSON.stringify(report)) },
        sourcePrivateJournal: { file: journalFile, bytes: journalRaw.length, sha256: sha(journalRaw), rawCopied: false },
        sourcePrivateHttp: { file: rawFile, bytes: httpRaw.length, sha256: sha(httpRaw), rawCopied: false },
        base: { accounts: journal.base.accounts, roles: journal.base.roles, orgs: journal.base.orgs, rows: baseRows.map((row) => ({ table: row.table, values: redacted(row.values) })) },
        objects, directCreates, committedCreates, intents: journal.intents.map(({ id, table, selector, caseId, beforeObserved, beforeIds, state }) => ({ id, table, selector: redacted(selector), caseId, beforeObserved, beforeIds, state })),
        authorities: journal.authorities.map(({ id, kind, source, sourceAuthority, observerId, functionOid, approvedDefinitionSha256 }) => ({ id, kind, source, sourceAuthority, observerId, functionOid, approvedDefinitionSha256 })),
        responseBindings, sessionBindings, readonlyDefinitions: definitions,
        mutations: journal.mutations.map((item) => ({ table: item.table, id: item.id, reason: item.reason, values: redacted(item.values), before: redacted(item.before), after: redacted(item.after), transaction: item.transaction, expectedXmin: item.expectedXmin, state: item.state })),
        boundary: { DBOrHTTPOpened: false, newRuntimeOrCommitClaimed: false, rawPasswordsTokensCookiesOrPrivateCopied: false, onlyThisNewIsolatedFixtureSavedArtifacts: true } };
    fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' }); return evidence;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const [report, output] = process.argv.slice(2); assert(report && output); const result = exportCommissionDiffEvidence(report, output); console.log(JSON.stringify({ result: result.result, backend: result.backend, objects: result.objects.length, responses: result.responseBindings.length, sessions: result.sessionBindings.length, output }));
}
