import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const output = 'tools/rust-r4ghi/independent/userfix-final';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const pin = file => { const bytes = fs.readFileSync(file); return { file, bytes: bytes.length, rawBytesSha256: sha(bytes) }; };
const integrity = read(`${output}/evidence-integrity01.json`);
const actual = read(`${output}/acceptance-recomputed01.json`);
const terminal = read(`${output}/terminal-verified01.json`);
const checkpointFile = 'docs/design/rust-r4ghi/user-fix/validation01.json';
const checkpoint = read(checkpointFile);
assert(integrity.allOriginalsMatch);
assert.equal(integrity.testTotals.passed, 416); assert.equal(integrity.testTotals.failed, 0); assert.equal(integrity.testTotals.ignored, 54);
assert.equal(actual.faultResults.length, 11); assert.equal(actual.raceResults.length, 4);
assert(actual.faultResults.every(item => item.businessAndManagedWritesRolledBack && item.actualFailureStatus === 500 && item.actualRetryStatus === 201));
assert(terminal.actualOwnedProcessGone && terminal.actualAPIPortConnectionRefused && terminal.processIdentityAndBinaryHashMatch);
assert.equal(terminal.actualContainer.running, false);
assert(checkpoint.readyForIndependentG3 && !checkpoint.G3Certified && !checkpoint.G4Certified);
assert.deepEqual(checkpoint.testTotals, integrity.testTotals);
const productFiles = checkpoint.productFiles.map(expected => { const observed = pin(expected.file); assert.deepEqual(observed, expected); return observed; });
const git = (...args) => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' }); assert.equal(result.status, 0); return result.stdout.trim();
};
const changedProductPaths = git('diff', '--name-only', '--', 'apps', 'libs').split(/\r?\n/).filter(Boolean).sort();
assert.deepEqual(changedProductPaths, productFiles.map(item => item.file).sort());
const whitespace = spawnSync('git', ['diff', '--check', '--', ...changedProductPaths], { cwd: root, encoding: 'utf8' }); assert.equal(whitespace.status, 0);
const testReceipt = read('tmp/rust-r4ghi/root/rust-test01/receipt.json');
const sourceMap = new Map();
for (const item of testReceipt.inputs) {
  if (sourceMap.has(item.file)) assert.equal(sourceMap.get(item.file), item.rawBytesSha256);
  sourceMap.set(item.file, item.rawBytesSha256);
  assert.equal(pin(item.file).rawBytesSha256, item.rawBytesSha256);
}
assert.equal(testReceipt.inputs.length, 343); assert.equal(sourceMap.size, 342);
const currentExportFile = 'tmp/rust-r4ghi/root/contract01/current-stdout.bin';
const priorExportFile = 'tmp/rust-r4ghi/root/contract01/previous-stdout.bin';
assert(fs.readFileSync(currentExportFile).equals(fs.readFileSync(priorExportFile)));
const runtimeSpec = read(currentExportFile), sharedSpec = read('libs/shared/api-spec/openapi.json');
const specCount = spec => ({ paths: Object.keys(spec.paths).length, operations: Object.values(spec.paths).flatMap(methods => Object.values(methods)).filter(operation => operation?.operationId).length, schemas: Object.keys(spec.components.schemas).length });
assert.deepEqual(specCount(runtimeSpec), { paths: 193, operations: 240, schemas: 626 });
assert.deepEqual(specCount(sharedSpec), { paths: 239, operations: 293, schemas: 626 });
fs.mkdirSync(`${output}/input-snapshots`, { recursive: true });
for (const [index, source] of productFiles.entries()) fs.writeFileSync(`${output}/input-snapshots/${index + 1}-${path.basename(source.file)}`, fs.readFileSync(source.file), { flag: 'wx' });
fs.writeFileSync(`${output}/input-snapshots/root-validation01.json`, fs.readFileSync(checkpointFile), { flag: 'wx' });
const result = {
  kind: 'independent-issue115-final-G3-review', gate: 'G3', decision: 'Pass', signedAt: new Date().toISOString(),
  issue: 115, parentIssue: 57, scope: 'Existing POST /api/platform/users creation repair only',
  governanceInputCommit: '21e9124160f92dce38a5029786273fdb893759f0', observedHead: git('rev-parse', 'HEAD'),
  productFiles, changedProductPaths, openFindings: [], openP0P1P2: 0,
  previouslyReportedFinding: { id: 'UF-PRE-G3-01', resolution: 'Corrected and actually regressed: only platform_user INSERT with 23505 and platform_user_username_unique maps to username 409; unrelated 23505 and audit spoof of the same constraint stay 500 with atomic rollback and clean retry.' },
  sourceBinding: { rawInputRecords: 343, uniqueInputFiles: 342, repeatedIdenticalInput: 'libs/shared/api-spec/openapi.json', allFourEngineeringRoundsBindSameInputs: true, allUniqueInputsMatchCurrentBytesAtSigning: true, onlyDifferenceFromCorrectedPreReview02: 'Rustfmt wrapping of js_message arguments in users/service.rs', actualRuntimeBinarySHA256: integrity.binary.rawBytesSha256 },
  engineering: { checks: integrity.buildChecks, testTotals: integrity.testTotals, changedProductWhitespace: 'Pass', newRustWarnings: false, ignoredTestsCountedAsAcceptance: false, historicalW01: 'Explicitly superseded for current creation semantics; guarded ignored test updated but not used as actual PG proof.' },
  actualAcceptance: { smoke: actual.smoke, necessaryWriteFaults: 11, cleanRetries: 11, naturallyDueManagedSessionFaults: 2, actualReferenceLockRaces: 4, unrelatedUniqueErrorsStay500: true, auditSpoofUsernameConstraintStays500: true, actualUUIDAssociationsAuditAndGetUserVerified: true, noCredentialCreated: true, actualConcurrentUsernamePair: 'Same body, distinct concurrent HTTP requests, exactly one 201 and one 409, one committed user and one association/audit set; no extra database barrier claim.', rawHTTPBoundary: 'Configured Node request headers and transfer-decoded response entity bytes, not TCP wire capture.' },
  transactionBoundary: { businessUserRelationsCreateAuditAndPendingManagedSessionAreAtomic: true, priorAuthenticationRawTouchCanCommitIndependently: true, failedRequestMayRetainExactlyItsProvenRawTouch: true, wholeHTTPRequestSideEffectFreeRollbackClaimed: false, managedSessionZeroRowCASRaceSeparatelyExecuted: false, realLostCommitAckOrUnknownCommitOutcomeCertified: false },
  schemaAndContracts: { newPublicOperations: 0, productSchemaDelta: 0, generatedContractClientDelta: 0, runtimeExportByteIdenticalToPriorLocalReference: true, runtimeExport: pin(currentExportFile), runtimeSurface: specCount(runtimeSpec), fullSharedSurface: specCount(sharedSpec), existingDeclarationDrift: 'Three platform create operations declare 200 in Swagger while their frozen existing/current runtime success is 201; this repair preserves 201 and does not claim declaration cleanup.' },
  validationApplicability: { browserUI: { result: 'N/A', reason: checkpoint.UI.reason, independentAssessment: 'Sufficient for this bounded command/store repair: no frontend or shared contract delta, byte-identical runtime schema and six actual getUser consumers cover the changed association/read behavior. No browser pass is claimed.' }, nodeAndAdminLintBuild: { result: 'Not required', reason: 'No TypeScript, Admin or generated-client changes in the reviewed product delta.' }, migrationGenerationAndORMCheck: { result: 'Not required', reason: 'No migration, entity or DDL changes; existing PK/FK/unique constraints and SQL fields are exercised in the isolated actual PG runs.' } },
  cleanupAndTerminal: { exactReviewedPlanSHA256: actual.cleanupPlan.rawBytesSha256, exactDeletedNewRows: 121, originalRowsRewritten: 0, originalRowsPerDatabase: 532, tablesPerDatabase: 120, independentRowFKOrderEdges: actual.cleanupPlan.actualRowFKEdges, postCommitFreshConnectionNoopRounds: 2, rawRowsAndLogicalCatalogACLTriggersFunctionsSequencesEqualBaseline: true, APIActualProcessGoneAndPortRefused: true, PGActualContainerStopped: true, volumeRetained: terminal.actualContainer.volume, privateEvidencePermissionsVerified: terminal.privateRunPermissions, reviewerPerformedCleanup: false },
  evidence: { rootCheckpoint: pin(checkpointFile), integrity: pin(`${output}/evidence-integrity01.json`), independentActualRecomputation: pin(`${output}/acceptance-recomputed01.json`), independentTerminal: pin(`${output}/terminal-verified01.json`), APIStop: terminal.apiStop, PGStop: terminal.pgStop, privateRawOriginalPinsVerified: integrity.originalPinCount, fullSnapshotManifestsVerified: integrity.snapshotCount, rawTableFilesVerified: integrity.tableFileCount, rawRowRecordHashesVerified: integrity.rowCount, effectiveStagesHelperAndProductPinsCurrent: true, privateBusinessRowsCookiesPasswordsOrTokensCopiedToReviewArtifacts: false },
  retainedHistory: { originalBaselineToolFailure: 'tool-noise; immutable partial retained', originalSmoke01StatusAssertion: 'tool-noise; actual role 201 preserved and exact journal-only reconciliation performed without business DML', clippy01MissingIncludeAssets: 'tool-noise; exit 101 retained, excluded from final passing checks', oldG1AndPreG3SnapshotsRewritten: false, terminalVerifierInitialContainerCLIProbe: 'Reviewer tooling-only command-not-found for docker; corrected to the actual read-only Podman metadata interface, no DB/API mutation.' },
  independence: { role: 'Non-author independent reviewer', productEdits: false, gitOrGitHubMutations: false, databaseConnectionsOpened: 0, APIOrDatabaseStarted: false, credentialsPublished: false, writableBoundary: 'tools/rust-r4ghi/independent/userfix-final/**', requestedModel: 'gpt-6.1-sol', requestedReasoningEffort: 'max', actualRuntimeModelIndependentlyVerified: false, fast: 'unverified' },
  deliveryDecision: { scopedG3Pass: true, readyForFixedImplementationCommitVerification: true, fixedCommitVerified: false, mainIntegrationVerified: false, G4Certified: false, issueCloseAllowedAtThisGate: false, officialNewRustOperations: 0, R4OrR5MinimumOrGHI_G1CertifiedByThisReview: false, productionDeploymentOrPerformanceCertified: false, parent57MustRemainOpen: true },
};
fs.writeFileSync(`${output}/g3-review01.json`, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
const note = `# #115 最终独立 G3 审查\n\n**Pass，仅认证现有用户创建命令的限定修复。** 3 个产品文件和受测二进制 ${integrity.binary.rawBytesSha256} 已固定；四工程轮为同一 343 条输入记录、342 个不同文件（OpenAPI 同哈希重复一项），全部与签署时原字节一致。Rust fmt/clippy/build 通过，26 组测试 416 passed / 54 历史 ignored；ignored 不作实际 PG 验收。\n\n实际原件独立复核覆盖 19 smoke、6 个 getUser 消费、11 项必要写故障与同请求重试、2 项自然 due 会话故障和 4 项实际引用锁竞态。此前 P2 的宽泛 23505 映射已修，并用其他唯一错误及 audit 伪装同名约束证实仍为 500。用户、关联、create audit 与待刷新 managed session 整体回滚；前置认证 raw touch 的独立提交保留真实边界，不宣称整个 HTTP 请求零持久副作用。\n\n121 行精确新增清理与原始差分相同，0 原件改写，108 条行级 FK 次序通过；两轮新连接 noop 的双库各 120 表、各 532 原行与 catalog/ACL/trigger/function/sequence 精确恢复。已实际核原 API 进程消失、31441 拒绝连接、新 PG 容器 exited、卷及 private 保留。\n\nUI 有依据地记 N/A，不冒称浏览器通过；原基线/工具失败/partial/ignored 和 Swagger 200 与既有 runtime 201 的差异保留标签。原件 SHA 完整性 ${integrity.originalPinCount} 项、38 份整库快照已核，未复制业务行或凭证。\n\n允许进入固定实现提交复核；fixed commit、main 和 G4 尚未认证，#115 暂不据此关闭，#57 保持 Open。本片新增操作数 0，G/H/I 与最小 R5 的 G1 不由本证书判断。完整机器证书见 g3-review01.json。\n`;
fs.writeFileSync(`${output}/g3-review01.md`, note, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ decision: result.decision, file: `${output}/g3-review01.json`, rawBytesSha256: sha(fs.readFileSync(`${output}/g3-review01.json`)), uniqueInputFiles: sourceMap.size, privatePins: integrity.originalPinCount, G4Certified: false })}\n`);
