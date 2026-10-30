// Read-only post-run validation. Date normalization is permitted only after
// each DTO value is tied to the actual corresponding owned stored row.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { compareLookupNativeReports } from './lookup-native-actual.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const timeColumns = { createdAt: 'created_at', updatedAt: 'updated_at', effectiveAt: 'effective_at' };
export function verifyLookupStoredTimes(report) {
    const observations = [];
    for (const request of report.requests.filter(row => row.compare && row.response?.status === 200)) {
        const stored = (request.after ?? []).flatMap(fixture => Object.entries(fixture.rows).flatMap(([table, rows]) => rows.map(row => ({ table, row }))));
        function visit(value, location = '$') {
            if (!value || typeof value !== 'object') return;
            if (Array.isArray(value)) { value.forEach((entry, index) => visit(entry, location + '[' + index + ']')); return; }
            for (const [field, column] of Object.entries(timeColumns)) {
                if (!Object.hasOwn(value, field)) continue;
                assert.equal(typeof value.id, 'string', 'A normalized DTO datetime must have a typed owned object identity');
                const expectedTable = location.endsWith('.currentTermSnapshot') ? 'contract_term_snapshot'
                    : Object.hasOwn(value, 'contractNo') ? 'contract' : Object.hasOwn(value, 'projectNo') ? 'project' : null;
                assert(expectedTable, 'Unreviewed DTO datetime owner: ' + location);
                const rows = stored.filter(entry => entry.table === expectedTable && entry.row.id === value.id);
                assert.equal(rows.length, 1, 'DTO time must have one actual stored source row');
                assert(Object.hasOwn(rows[0].row, column));
                const raw = rows[0].row[column];
                if (raw === null) assert.equal(value[field], null);
                else {
                    assert.equal(typeof raw, 'string'); assert(Number.isFinite(Date.parse(raw)));
                    assert.equal(value[field], new Date(raw).toISOString(), request.name + ' ' + location + '.' + field);
                }
                observations.push({ caseId: request.name, table: expectedTable, id: value.id, field,
                    actualStored: raw, actualDto: value[field], exactOriginalDateIsoProjection: true });
            }
            for (const [key, entry] of Object.entries(value)) if (entry && typeof entry === 'object') visit(entry, location + '.' + key);
        }
        visit(request.response.body);
        for (const audit of request.audit ?? []) {
            const at = Date.parse(audit.occurred_at), start = Date.parse(request.startedAt), end = Date.parse(request.responseReceivedAt);
            assert(Number.isFinite(at) && Number.isFinite(start) && Number.isFinite(end));
            assert(at >= start && at < end + 1, 'Actual sensitive/denial event must fall inside its real HTTP request');
        }
    }
    return { result: 'pass-exact-stored-row-to-original-DTO-time-projection', fields: observations.length, observations };
}
export function classifyLookupTransport(report) {
    return ['project.transport-nul-observed', 'contract.transport-nul-observed'].map(name => {
        const request = report.requests.find(row => row.name === name); assert(request?.observationOnly);
        const errors = report.sql.filter(row => row.context?.caseId === name && row.phase === 'error');
        assert.equal(request.response.status, 500); assert.equal(errors.length, 1); assert.equal(errors[0].code, '08P01');
        assert.deepEqual(request.response.body, { statusCode: 500, message: 'Internal server error' });
        assert.deepEqual(request.certificates.actualCommittedRows, []);
        return { name, actualHttpStatus: 500, actualPgCode: '08P01', queryRelation: errors[0].relations,
            classification: 'retained-original-Native-PG-query-failure-boundary', newRequestValidationAdded: false,
            actualCommittedCreates: 0, bodyBytesSha256: request.response.wireBodySha256 };
    });
}
export function validateAndMapLookupQueryClock(report) {
    const copy = structuredClone(report), observations = [];
    for (const request of copy.requests.filter(row => row.compare && row.response?.status === 200)) {
        if (!Object.hasOwn(request.response.body, 'generatedAt')) continue;
        assert.equal(request.name, 'project.item-uuid', 'Unreviewed generatedAt source point');
        const value = request.response.body.generatedAt, at = Date.parse(value);
        assert.equal(value, new Date(at).toISOString());
        assert(at >= Date.parse(request.startedAt) && at <= Date.parse(request.responseReceivedAt));
        observations.push({ caseId: request.name, value, startedAt: request.startedAt, receivedAt: request.responseReceivedAt,
            source: 'apps/poms-api/src/app/features/project/project-query.service.ts', method: 'getProjectDetail', line: 316,
            sourceExpression: 'new Date().toISOString()' });
        request.response.body.generatedAt = '<validated-getProjectDetail-generatedAt>';
    }
    return { copy, observations };
}
export function compareActualLookupFiles(legacyFile, currentFile, output) {
    assert(!fs.existsSync(output));
    const report = { formatVersion: 1, kind: 'actual-two-process-lookup-comparison-and-boundary-classification', result: 'pending', startedAt: new Date().toISOString(), inputs: [] };
    try {
        const inputs = [legacyFile, currentFile].map(file => { const raw = fs.readFileSync(file); report.inputs.push({ file, bytes: raw.length, rawBytesSha256: sha(raw) }); return JSON.parse(raw); });
        report.storedTimes = inputs.map(input => ({ variant: input.variant, ...verifyLookupStoredTimes(input) }));
        report.transport = inputs.map(input => ({ variant: input.variant, cases: classifyLookupTransport(input) }));
        const clocks = inputs.map(validateAndMapLookupQueryClock); report.queryClock = clocks.map((row, index) => ({ variant: inputs[index].variant, observations: row.observations }));
        report.comparison = compareLookupNativeReports(...clocks.map(row => row.copy)); report.result = 'pass';
        report.scope = 'Actual original Native old/new HTTP and DI projection; explicit stored-time and transport checks. Generated SDK/browser and Rust business migration are separate evidence.';
    } catch (error) { report.result = 'fail'; report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
    finally { report.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); }
    return { result: report.result, file: output, pairs: report.comparison?.pairs.length, storedTimeFields: report.storedTimes?.map(row => row.fields), failure: report.failure ?? null };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) console.log(JSON.stringify(compareActualLookupFiles(...process.argv.slice(2))));
