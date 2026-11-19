import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', author = 'E:/projects/worktrees/poms-r4h-signals/poms', sha = value => createHash('sha256').update(value).digest('hex');
const prefix = 'tools/rust-r4ghi/H/implementation/support-patches/';
const packages = [
  { rel: prefix + 'independent-tax13-review40', leaf: 'manifest40.json', digest: '84af45c10810f2143b8ec1ba08a52551f3035ba81e78ae6dfae8c12a066fb79d' },
  { rel: prefix + 'ui-integration/restart-ui39-alignment41', leaf: 'manifest41.json', digest: '7b539f32f9420c9d871fb3ad4f3d53b87c25fac942ff55e51eb4f927d67a64f0' },
  { rel: prefix + 'ui-integration/api1351-ui-input42', leaf: 'manifest42.json', digest: 'd79411555454c77267ceba544ea4300e78b3a59fc701014f1fad2d91e597b07f' },
];
for (const p of packages) {
  const bytes = fs.readFileSync(author + '/' + p.rel + '/' + p.leaf); assert.equal(sha(bytes), p.digest); const m = JSON.parse(bytes);
  for (const f of [...m.files, { file: p.leaf, rawBytesSha256: p.digest }]) {
    assert(!f.file.split('/').includes('..') && !path.isAbsolute(f.file)); const source = author + '/' + p.rel + '/' + f.file, raw = fs.readFileSync(source); assert.equal(sha(raw), f.rawBytesSha256);
    const destination = root + '/' + p.rel + '/' + f.file; fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.existsSync(destination)) assert.deepEqual(fs.readFileSync(destination), raw); else fs.writeFileSync(destination, raw, { flag: 'wx' });
  }
}
const priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private', linuxPrivate = priv.replace('//wsl.localhost/Debian', '');
function privatePin(relative, expected) { const raw = fs.readFileSync(priv + '/' + relative); assert.equal(sha(raw), expected); return { file: linuxPrivate + '/' + relative, rawBytesSha256: sha(raw) }; }
const oldProcess = privatePin('rust-api135-process.json', 'a42333c74b7afd8aa7359bb3cf915444cc7cbbfebff9049a467c2cdb33ccef06');
const oldRegistry = privatePin('business/g2-business12/main01/000002-consumer-admission54-registry.json', '3ed7bd387b6f4f3b8e44201e7985043b18b71cefceba3194f83ab19300f7d29c');
const registryPin = privatePin('business/g2-business12/main01/007134-p1351-registry.json', '05985940f4a4085fab81d0711d2285931818a2b78fb29a9612bfcc1365b1667b'), registry = JSON.parse(fs.readFileSync(priv + '/business/g2-business12/main01/007134-p1351-registry.json'));
const candidatePin = privatePin('business/g2-business12/main01/007133-p1351-candidate.json', '1dde0fda6f0c23682568f8256ea98da4137ebd7793da7915238e0ac066a9740c'), candidate = JSON.parse(fs.readFileSync(priv + '/business/g2-business12/main01/007133-p1351-candidate.json'));
assert.equal(candidate.sourcePins.length, 406); assert.equal(sha(JSON.stringify(candidate.sourcePins)), '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa'); assert.equal(registry.startupFresh.length, 2);
const output = { kind: 'Root-actual-same-source-original-volume-and-new-physical-process-recovery161', source: { epoch: 'g2-business12', sourceCount: 406, sourcePinsSHA256: candidate.sourcePinsSHA256, tables: 139, migrations: 97, unchangedBinarySHA256: candidate.process.record.binarySha256 },
  originalProcessRecord: oldProcess, originalSchema2Registry: oldRegistry, originalContainerRecovery: privatePin('environment-recovery147/receipt.json', '9751ef3caf3427c103997c2dcf0105a23e1bfa8d3f8ae5df8d9052a67ce5a682'),
  originalDataConservation: privatePin('environment-recovery147/data-verification148/proof148.json', '22d159201edac5ea916fc069c7072afdb92d15fe0534b72e4f335e0ab64b6cb9'),
  newProcess: privatePin('rust-api1351-process.json', 'fd81b926dbaad79debc0343ac63b6cff7c967ac4a52cd64db0a7d0e7d4dbc2a1'), newCandidate: candidatePin, newProcessRegistry: registryPin, preStartup: registry.preparation, startupFresh: registry.startupFresh,
  admittedSequence: registry.admittedSequence, allStartupRowsRawXminMetaSequencesObjectsEqualLastExpenseAfter: true, comparisonBoundary: 'Startup conservation before new acknowledged auth; later UI requests have their own actual ledger',
  originalRegistryOrProcessRecordsRewritten: false, dataRestoredOrBaselineRebased: false, productSourceChanged: false, sourceEpochChanged: false, domainCommandsReplayed: false, old135EvidenceRelabelled1351: false,
  newAuthenticationCookieDerivation: privatePin('ui-config/runtime14/api1351-auth-receipt157.json', sha(fs.readFileSync(priv + '/ui-config/runtime14/api1351-auth-receipt157.json'))),
  toolReviewsArchived: packages.map(p => ({ file: p.rel + '/' + p.leaf, rawBytesSha256: p.digest })), G3Certified: false, G4Certified: false };
const file = root + '/docs/design/rust-r4ghi/process1351-recovery161-actual.json', raw = Buffer.from(JSON.stringify(output, null, 2) + '\n'); fs.writeFileSync(file, raw, { flag: 'wx' });
console.log(JSON.stringify({ packagesArchived: packages.length, recoveryReport: { file, rawBytesSha256: sha(raw) }, productOrHelperGraphWritten: false, SQLOrHTTPExecuted: false }));
