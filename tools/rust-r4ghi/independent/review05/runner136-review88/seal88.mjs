import fs from 'node:fs'; import path from 'node:path'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url';
const out = path.dirname(fileURLToPath(import.meta.url)), sha = b => createHash('sha256').update(b).digest('hex');
const shapeBytes = fs.readFileSync(out + '/mikro-shape88.json'), shape = JSON.parse(shapeBytes);
const report = { kind: 'Root136-normal-forward-runner-independent-review88', createdAt: new Date().toISOString(), nonAuthor: true,
  input: { file: 'tools/rust-r4ghi/migrate-frozen-parent98-136.mjs', rawBytesSha256: '29e195b4e80c6089387d66e384eb7b7eef28f5c58cf047a7ce87726e6cc0e5e1' },
  conclusion: 'bounded-fixed-up-only-mechanism-static-admission-no-P1-P2-found',
  reviewedBoundaries: [
    { lines: '12-26', result: 'Single fixed target basename; exact TS/SQL raw pins, exact Node path/hash, self runner hash and explicit G2 approval binding. No caller-controlled direction.' },
    { lines: '16-19', result: 'Linux/Node24.19.0/real executable/full argv exact; no execArgv, NODE_OPTIONS or NODE_PATH preload.' },
    { lines: '27-32,44-50', result: 'Namespace marker/database/OID/PG15/owner/97 migrations/139 tables and no app DB connections; old driver and both owned API ports must be stopped.' },
    { lines: '37-43', result: 'All 98 migration source hashes checked against approved inputs. Explicit migrationsList name uses file basename, irrespective of shorter TS class name.' },
    { lines: '58-62', result: 'Normal MikroORM transactional/allOrNothing/safe migrations path, only up({migrations:[fixed target]}), exactly one actual pending and result name/count, 98 executed after.' },
    { lines: '51-55,65-68', result: 'New exclusive per-database artifact directory, pinned intent/execution originals, failure preserved without a no-write claim or blind retry. Databases remain independently applied; no cross-DB atomicity claim.' }
  ],
  implementationShapeCheck: { installed: shape.installed, exactTargetDispatchAndReturnedName: true, returnedKeys: shape.returnedKeys,
    evidence: { file: 'mikro-shape88.json', rawBytesSha256: sha(shapeBytes) }, mode: 'real-installed-dispatcher-and-in-memory-stubs-only', actualDBConnections: 0, actualMigrationsApplied: 0 },
  currentExecutionReady: false, currentReason: 'source13-g2-freeze136.json was absent at the observed read; no actual Source13 plan, M98 receipt or admission exists in this review.',
  findings: [],
  requirementsBeforeActualAdmission: ['108-02 must pin this reviewed runner, Node and G2 approval, exact full argv/DB/target, up method/options and matching actual intent/execution/log originals; this closes IR87-01 only when its validator is independently reviewed.',
    'Root retains actual Source12 final state/source/archives/objects and stops its APIs/driver before normal M98.',
    'Actual 97-to-98 before/after/fresh two-database evidence must separately prove the narrow function/log/sequence delta and unchanged original business rows, OIDs/ACL/metadata/objects.',
    'Source13 actual source/count/binary/process/helper graph and schema3 plan remain separately frozen and verified.'],
  G3Certified: false, G4Certified: false, Source13Certified: false, actualM98Certified: false, SQL: 0, HTTP: 0, browserActions: 0, productOrRootHelperWrites: 0,
  installedImplementationPins: shape.installedImplementationPins };
fs.writeFileSync(out + '/review88.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ file: 'review88.json', rawBytesSha256: sha(fs.readFileSync(out + '/review88.json')), conclusion: report.conclusion }));
