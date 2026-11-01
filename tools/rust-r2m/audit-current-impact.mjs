// Current source impact only. Root binds actual URI/DB/HTTP/UI evidence separately.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const base = '9dcfb498b175e9fdaae7584aff1d5d3f93bf814f';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const git = args => cp.execFileSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }).trim().split('\n').filter(Boolean);
const readStable = file => {
    const before = fs.lstatSync(file, { bigint: true }); assert(before.isFile() && !before.isSymbolicLink());
    const bytes = fs.readFileSync(file), after = fs.lstatSync(file, { bigint: true });
    for (const field of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(before[field], after[field], 'Source changed during bounded audit');
    return { file, bytes: bytes.length, rawBytesSha256: sha(bytes), normalizedLfSha256: sha(bytes.toString('utf8').replace(/\r\n/g, '\n')), text: bytes.toString('utf8') };
};
const affectedGroups = file => {
    if (/\/(?:auth|compat|shared)\/|\/(?:http|database|error|binary_http|uri[^/]*)\.rs$|Cargo\.(?:toml|lock)$/.test(file)) return ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'];
    if (/\/(?:approval|approval_common)\//.test(file)) return ['M0', 'M1', 'M3'];
    if (/\/(?:attachments|attachment_storage|handover_facts)\//.test(file)) return ['M0', 'M4'];
    if (/\/(?:identity_providers|provider_support|external_org_sync)\//.test(file)) return ['M0', 'M5'];
    return ['M0', 'M1', 'M2'];
};

export function auditCurrentImpact() {
    const delivery = JSON.parse(fs.readFileSync('docs/design/rust-r2m/delivery-audit-input.json'));
    assert.equal(delivery.baseline.commit, base);
    const qualified = delivery.sourceReuse.LCompiled169.files;
    const sources = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '--', 'apps/poms-api-rust/src', 'apps/poms-api-rust/tests', 'apps/poms-api-rust/examples', 'apps/poms-api-rust/Cargo.toml', 'apps/poms-api-rust/Cargo.lock', 'apps/poms-api-rust/rust-toolchain.toml']))].sort();
    const records = sources.map(readStable), byFile = new Map(records.map(item => [item.file, item]));
    const changes = qualified.map(old => {
        const current = byFile.get(old.file) ?? (fs.existsSync(old.file) ? readStable(old.file) : null);
        return { file: old.file, originalRawBytesSha256: old.rawBytesSha256, currentRawBytesSha256: current?.rawBytesSha256 ?? null,
            changed: !current || old.rawBytesSha256 !== current.rawBytesSha256, affectedGroups: affectedGroups(old.file) };
    }).filter(item => item.changed);
    const additions = records.filter(item => !qualified.some(old => old.file === item.file)).map(({ text, ...item }) => ({ ...item, affectedGroups: affectedGroups(item.file) }));
    const ignored = [];
    for (const item of records.filter(item => item.file.endsWith('.rs'))) {
        const lines = item.text.split('\n');
        lines.forEach((line, index) => {
            if (!/#\[ignore(?:\s*=|\])/.test(line)) return;
            const child = /child fixture/.test(line);
            ignored.push({ file: item.file, line: index + 1, literal: line.trim(), followingDeclaration: lines.slice(index + 1, index + 4).join(' '),
                kind: child ? 'process-child-fixture' : 'explicit-controlled-integration-target',
                currentGroups: child ? ['process-lifecycle'] : /\/(?:auth_database|auth_projection_db|database)\.rs$/.test(item.file) ? ['M0', 'M1', 'M2', 'M3'] : /e_foundation/.test(item.file) ? ['M2'] : ['M1', 'M2'],
                actualEvidenceRefs: [], disposition: 'Actual explicit target or finite replacement scope must be bound by Root; ignored never counted passed.' });
        });
    }
    const uriFinding = delivery.findings.find(item => item.id === 'A-M-URI-01'); assert(uriFinding);
    return {
        formatVersion: 1, kind: 'R2M-current-source-impact-and-ignore-closure-input', result: 'SourceOnly-not-actual-acceptance', at: new Date().toISOString(),
        baseline: base, checkoutHead: git(['rev-parse', 'HEAD'])[0], wholeSnapshotAtomicClaimed: false,
        productDeltaFromBaseline: git(['diff', '--name-only', base, '--', 'apps', 'libs', 'tools', '.gitattributes']),
        qualified169Compared: qualified.length, changes, additions, currentSourceFiles: records.map(({ text, ...item }) => item),
        ignored: { total: ignored.length, explicitIntegrationTargets: ignored.filter(item => item.kind !== 'process-child-fixture').length,
            processChildFixtures: ignored.filter(item => item.kind === 'process-child-fixture').length, items: ignored, noPassedClaim: true },
        URI: { inheritedId: uriFinding.id, originalObservation: uriFinding.original, currentAffectedSource: [...changes, ...additions].filter(item => item.affectedGroups.includes('M0')),
            frozenGrid: 'GET/PATCH/PUT × absent/owned-valid/retained-expired session × raw%/raw%FF/valid encoded ownedUUID =27 cells/backend, plus actual affected dispatch/error ordering cases.',
            actualEvidenceRefs: [], status: 'Root must bind Native original/current Rust results and explicit disposition; source delta alone does not close URI handoff.' },
        reuseBoundary: 'Unchanged exact dedicated sources retain inherited finite evidence. Changes and additions require affected current checks. Source/hash matching is not new HTTP,DB,UI,SQL-wire or performance execution.',
        execution: { DB: 0, HTTP: 0, browser: 0, container: 0, privateReads: 0 }, stageOrG3OrG4Certified: false
    };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
    const output = 'tools/rust-r2m/audit-current-impact.json', report = auditCurrentImpact();
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ file: output, rawBytesSha256: sha(fs.readFileSync(output)), changed: report.changes.length, added: report.additions.length, ignored: report.ignored.total, result: report.result }));
}
