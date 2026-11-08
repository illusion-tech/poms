// Public, nonsecret fact index; original data stays private and immutable.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = '/home/wangzishi/.local/share/poms-r4ghi/private';
const D = P + '/business/g2-business13/main01';
const sha = value => createHash('sha256').update(value).digest('hex');
const native = file => process.platform === 'win32' ? file.startsWith(P + '/')
  ? '//wsl.localhost/Debian' + file : file.replace('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', R.replaceAll('\\', '/')) : file;
const pin = (file, expected) => { const bytes = fs.readFileSync(native(file)); const rawBytesSha256 = sha(bytes); if (expected) assert.equal(rawBytesSha256, expected, file); return { file, bytes: bytes.length, rawBytesSha256 }; };
const publicPin = (file, expected) => { const value = pin(R.replaceAll('\\', '/') + '/' + file, expected); return { ...value, file }; };
const record = {
  kind: 'actual-Source13-build-M98-schema-admission-and-continuation-boundaries208', date: '2026-11-09',
  branch: 'codex/poms-r4ghi-next25', inputCheckpoint: 'd90811f2e422d8037699058452d42cfbbd020345',
  officialRustOperations: 240, officialNewDelivered: 0, G1ScopedOperations: 32, G3Certified: false, G4Certified: false,
  source: { epoch: 'g2-business13', run: 'main01', count: 416, digest: '5e467b677cfe08e44c8cb1c71cac62478e416e394ba4a5ec8651dab5732c255e',
    pins: pin(P + '/source13-preparation193/sourcePins.json', 'e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c'),
    helperCount: 195, helperH0: pin(P + '/source13-preparation183/helperH0.json', 'e65db96998f5dc15ed406bf5d30b2a1bfa95c82affb448b625ca3295227d0459'),
    G2: publicPin('docs/design/rust-r4ghi/source13-g2-freeze136.json', 'b15582a0d32e60f9f7f462c9ce3db7ef1d90431b5edfb22a0c12b430c567328d') },
  product: { composedManifest: publicPin('tools/rust-r4ghi/corrective-composed106/manifest106.json', '5adc6d8b0179b5d2505e318d24101d400fde725dfcd48384c4d8189143d97b27'),
    exactAppliedFiles: 10, corrections: ['frozen-participant-parent-lock65-02', 'real-period-source-eligibility90', 'tax-ref-cost-root-discovery83', 'foreign-fiscal-parent-lineage84-02'],
    publicRouteAndDTOChanges: false, historicalBaselineReselectionApproved: false },
  rustValidation: { binding: pin(P + '/source13-build180-03/actual-build-binding.json', '15e088cf71f68880d3985fe18133338d281403fc999ef65f6fbbe4e4c0944d29'),
    RootOperation: 'actual-source-inventory-and-copy', mirrorOperation: 'actual-fmt-clippy-lib-all-target-test-build', cargoCommands: 4, allExitZero: true,
    passed: 535, historicalIgnored: 54, failed: 0, binarySHA256: '2d9ed8f711818b83b1cff440b72265bcacf9ff2f31f409d2d7d5a9aabd346e13',
    summaryBinarySHA256: '45efe528cb5045b8f9f46293144990fbd8641025f3e805f3847c15a5d6bb0f24' },
  nativeValidation: publicPin('docs/design/rust-r4ghi/source13-native186-static.json', '03324267d18cf53808f2c98672822b2e0fc2a1314766b5311f3e83658aa83577'),
  helperValidation: { receipt: pin(P + '/source13-helper207/receipt207.json', '40e779febac6765dddb23a54ffbbe211cb00b62c8e41977c35fb231a1f7cc935'),
    testFiles: 26, passed: 211, failed: 0, skipped: 0, actualH0Unchanged: true, actualBackendAcceptanceSubstitute: false },
  schema: { migrationsPerDatabase: 98, tablesPerDatabase: 139, normalForwardBothActualExitZero: true,
    receipt: pin(D + '/Source13-M98-receipt108.json', 'fad604ce8850cae183055774e5e97366f547e583b3bbbb0b59fce2298104fc88'),
    stateFreeAfter: pin(P + '/migration98-136/after164/receipt164.json', '90202b4935a4bebbdbb3292435fa8624c68256875da3ba50de2debf849e4d419'),
    originalM97BusinessBaselineRetained: true, oldBusinessRowsAndXminPreserved: true, actualRestoreCertified: false },
  api: { generation: 136, process: pin(P + '/rust-api136-process.json', '0b5817a0f32f4ad12fce36a4035c59c06d852611f65891dec349e6eccf505f6f'),
    readinessOriginal: pin(P + '/api136-start182/stdout.json', '2a475fb83c09225259f79fd495427e948a08cb1b3fa73b646698d1ea7f702348'), readiness: 200 },
  admission: { bootstrapB0: pin(D + '/B0-Source13-bootstrap.json', '11530fcd47ee59f1929832b28c03fa022021cff9f0a18d3b7f95d761abd7acf2'),
    plan: pin(D + '/Source13-final-plan108.json', '060b52d132b3cfb4384085f77f9c1637d60e50ad9c5510a249bab60dd2143f8c'),
    registryR3: pin(D + '/000004-consumer-admission108-registry.json', '23cc54f891fb5200a1bad30083f75805e27a1d046096705381034ff32493971c'),
    admittedB1: pin(D + '/B1-Source13-admitted.json', '4c4ff2dc98e7c604470b9e82e9dd807f5cc06ac4a886125177d57e66527d6ebd'),
    R3ConsumerPermanentlyReferencesOriginalB0: true, B1DoesNotMutateR3: true, actorBindingsFinal: false },
  frozenParticipantNegatives: { receipt: pin(D + '/000021-m98fz-complete.json', 'ab4da151d581f45908ab8c057df087d4b680dd6132b329c04f612e70cea82773'),
    actualCases: 5, expectedSQLState: '23514', bothRealParentsLockedBeforeEachChildUpdate: true, allRolledBack: true, parentlessCommittableWindowAttempted: false },
  independentTechnicalFacts: { facts: publicPin('tools/rust-r4ghi/independent/final-gates13/actual13-facts01.json', 'b1be2615ec03ab9ab20263987ca2f1835de6c415502cb53fb22203a2a2da9ddc'),
    manifest: publicPin('tools/rust-r4ghi/independent/final-gates13/manifest-actual13-01.json', '223c3486e359e05657221c540f6696ed77bf4a3ea323eb004a97faf2a55c0e88'), finalBusinessG3OrG4Granted: false },
  taxContinuation: { status: 'stopped-before-Tax-HTTP-missing-exact58-resource-admission',
    partial: pin(D + '/000022-tax203-finish-main-partial.json', 'c5f58aa939aa18bc535ec6ddb83c23e69c768d86c70bb18179ab02539ec2ee7b'),
    diagnosis: publicPin('tools/rust-r4ghi/independent/review05/resource-admission-review118/diagnosis118.json', 'e1cbc3936dac2d6dd0eb73205bd506eb5d1e4e3174b1b40d14c249a7f1c6bd1e'),
    recordProducerEpoch: 'g2-business12', projectHTTPBirthEpoch: 'g2-business10', plannedToolRevision: 'explicit-reviewed-119-H1-B2', current195SilentlyChanged: false,
    producerRecordsRelabelled: false, freshMainGCertified: false, TaxCorrectionCommitted: false },
  periodPreparation: { naturalHongKongBoundaryPassed: true, actualBusinessDate: '2026-11-09', completedPeriod: '2026-W45',
    overallStatus: 'partial-original-retained-no-period-POST',
    partial: pin(D + '/000037-period204-partial.json', '60d43cb50d6f1964e86fd072642283aa6cc0b4f28ff294789d8f607a55d7e2fc'),
    main: { preparation: pin(D + '/000031-period204-preparation.json'), status: 200, eligibility: 'missing-evidence', blockingReasonCodes: ['cost-classification-required'] },
    receiver: { preparation: pin(D + '/000034-period204-preparation.json'), status: 200, eligibility: 'eligible', blockingReasonCodes: [] },
    max: { response: pin(D + '/000035-http-response-body.bin'), status: 422, code: 'operating_money_capacity_exceeded', positivePeriodFixture: false },
    normalPeriodPOSTExecuted: false, historicalBudgetAutomaticallyReselected: false },
  remaining: ['explicit-tool-and-exact58-resource-admission119-H1-B2', 'fresh-Main-G-and-Tax-full-target-required-write-atomicity', 'H01-and-20percent-H04-policy-boundaries', 'exact-public-EO-role-setup49-and-transitive-Labor47-masking-audit', 'natural-period-producer-and-read-and-period-target-masking', 'unified-independent-G3-G4-and-owned-fixture-preservation-cleanup'],
  issueState: { open: [57, 101, 110, 111, 112, 113, 114, 116, 117], independentlyClosed: [115], mainMergeDeployOrCutoverAuthorized: false },
};
const file = R + '/docs/design/rust-r4ghi/source13-actual208.json';
fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
const statusFile = R + '/docs/design/rust-r4ghi-delivery-status.json';
const status = JSON.parse(fs.readFileSync(statusFile));
status.date = record.date; status.periodAcceptance.status = 'natural-boundary-passed-real-receiver-preparation-eligible-producer-pending';
status.periodAcceptance.preparation = 'rust-r4ghi/source13-actual208.json';
Object.assign(status.currentCorrective, { status: 'Doing', currentSourceEpoch: 'g2-business13', currentAPI: 136, newSourceCount: 416,
  newSourcePinsSHA256: record.source.digest, currentCandidate: record.admission.admittedB1, currentBinarySHA256: record.rustValidation.binarySHA256,
  currentAPIStopped: false, source13Actual: 'rust-r4ghi/source13-actual208.json', currentRustValidation: { binding: record.rustValidation.binding,
    passed: 535, historicalIgnored: 54, failed: 0, RootCompiled: false, ownedMirrorCompiled: true },
  source12HistoricalProcess: 1351, source12HistoricalCandidate: { file: P + '/business/g2-business12/main01/007133-p1351-candidate.json', rawBytesSha256: '1dde0fda6f0c23682568f8256ea98da4137ebd7793da7915238e0ac066a9740c' },
  continuationBlock: record.taxContinuation.status });
status.currentStaticValidationSource13 = 'rust-r4ghi/source13-native186-static.json';
status.currentUIValidation.certificationBoundary = 'Separate Source12 actual UI runs preserved; current Source13 unified business acceptance and G3/G4 still pending';
fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
console.log(JSON.stringify({ publicFactIndex: publicPin('docs/design/rust-r4ghi/source13-actual208.json'), deliveryIndexUpdated: true,
  GitHubMutated: false, officialNewDelivered: 0, G3Certified: false, G4Certified: false }));
