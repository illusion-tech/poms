// Independent FS-only coverage precheck. Does not import or execute product/Root helpers.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const own = root + '/tools/rust-r4ghi/independent/final-gates13/period-coverage-precheck01';
const privateRoot = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const sha = b => createHash('sha256').update(b).digest('hex');
const records = [];
function output(name, value) {
  if (name === 'period-coverage-precheck01.md') {
    value = value.replaceAll('一次新的 mixed-target stage/tax successor', '一次新的 mixed-target allocation 整批 replacement 或真实 stage/tax successor');
    value = value.replace('再根据真实在窗来源和合法证据选择一次新的 F stage/tax successor', '再根据真实在窗来源选择一次受控整批 allocation 调比（例如 2:1→1:1），或有合法证据的 F stage/tax successor');
    value += '\n整批调比已由冻结 DTO/产品支持：AllocationCorrection 要求 basisRef、完整 sourceCostRefs、projectShareItems、reason；每份 share 含 projectId、exact allocationWeight、expectedCurrentResultRef 和 reason。F correction.rs:235–254 调用真实 batch producer，370–386 显式采用新权重，883–920 核完整项目/来源/旧份额 refs。Root 已选择后续实际整批 2:1→1:1 路径；本审件只核其支持范围，没有执行。必须按真实层/币种/measurement 验新份额精确分配和总额守恒，不能仍要求每项目旧金额不变。它与 stage/tax 隐式刷新保原权重是不同受支持语义；后者仍由实际 Tax 证据单列。旧 correction-preparation37:35 又要求四种 producer 都非空，也不是最小 allocation-only mixed adapter。\n\nlegacy-current-contract 是 G1 source manifest 的正式成员，明确 source0 不能无准入晋升，baseline 要 project lock 跨 producer 查询，period 跨 producer 同 key 检查。当前查到 legacyCompatibilityFixture writer 的明确授权仅一条 owned 缺 ownerOrg 项目用于 scope 兼容负例，不写 baseline/period authority；不能从此外推新 authority seed 授权。Root 已澄清 legacy-bindings 是未验证的路径猜测。本轮结论为【现工具/既有 seed 范围不足，需另封明确 G2 负控 fixture 协议及独审】。Root 拟在既定 G1 必验范围内另审 isolated owned 真项目/头先锁、准确 source0 新 PK/列/原件、真实 modern HTTP 等待；winner 提交后仅清精确新增 PK 回 S0。该设计未审前不执行，本次未批准 writer 或 cleanup。保留 actual legacy seed 负控与真实 Rust HTTP 两种证据标签，禁止新 Node 指向 RustDB、跨库混用、迁移/重标旧 legacy。\n';
  }
  const destination = path.resolve(own, name);
  assert(destination.startsWith(path.resolve(own) + path.sep));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  return { file: destination.replaceAll('\\', '/'), bytes: fs.statSync(destination).size, rawBytesSha256: sha(fs.readFileSync(destination)) };
}
function input(relative, expected = null, copy = true) {
  assert(!relative.includes('state.json'), 'Only individually named fixed artifacts are allowed');
  const absolute = relative.startsWith('@private/') ? privateRoot + relative.slice(8) : root + '/' + relative;
  const bytes = fs.readFileSync(absolute), hash = sha(bytes);
  if (expected) assert.equal(hash, expected, relative);
  const record = { file: absolute, bytes: bytes.length, rawBytesSha256: hash, copy: null };
  if (copy) record.copy = output('inputs/' + relative.replace('@private/', 'private/'), bytes);
  records.push(record);
  return { pin: { file: absolute, rawBytesSha256: hash }, bytes, json: () => JSON.parse(bytes) };
}

const acceptance = input('docs/design/rust-r4ghi/acceptance-plan01.json', '57881bb732c0fc816d99227a9f55cfc1451c29c0b879181d65575970c39462a2');
const operations = input('docs/design/rust-r4ghi/operation-map01.json', '73b82726b2c87053e019d35191803a608c56054a49ce5408567709d097a90769');
const matrix = input('tools/rust-r4ghi/independent/final-gates13/operation-checklist13.json', '8e7abf1ddf70ab3837ef2bb11d640251f381e7ceed2a452f8f81b276470b4cb3');
const status = input('tools/rust-r4ghi/independent/final-gates13/operation-status162.json');
input('tools/rust-r4ghi/independent/final-gates13/preparation13.md', 'b251701703c57cf168e80b0c01e114a386ff57bd3ed38e9e1696bfa1599e7b50');
const impact = input('tools/rust-r4ghi/independent/final-gates13/impact-review62-193.json', 'e4808affba9ceb3a1a3b5d7e59dd796d2dedc6ab2728ba15de44ae3a084a9980');
const comparison = input('tools/rust-r4ghi/independent/final-gates13/source-comparison193.json', '5d3b13b96ae70c59d09b2208c346277fce9e91bdff505140a9e0e351e4e1d7b1');
const actual = input('tools/rust-r4ghi/independent/final-gates13/actual13-facts01.json', 'b1be2615ec03ab9ab20263987ca2f1835de6c415502cb53fb22203a2a2da9ddc');
input('tools/rust-r4ghi/independent/final-gates13/manifest-actual13-01.json', '223c3486e359e05657221c540f6696ed77bf4a3ea323eb004a97faf2a55c0e88');
const sourcePins = input('@private/source13-preparation193/sourcePins.json', 'e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c');
const sourceDigest = '5e467b677cfe08e44c8cb1c71cac62478e416e394ba4a5ec8651dab5732c255e';
assert.equal(sha(JSON.stringify(sourcePins.json())), sourceDigest);
assert.equal(sourcePins.json().length, 416);
const fixed = new Map();
const files = [
  'tools/rust-r4ghi/business/tax13-main.mjs',
  'tools/rust-r4ghi/business/tax13-facts.mjs',
  'tools/rust-r4ghi/business/tax13-sweep.mjs',
  'tools/rust-r4ghi/business/tax13-semantics.mjs',
  'tools/rust-r4ghi/business/gh-write-facts.mjs',
  'tools/rust-r4ghi/business/gh-restatement-preparation.mjs',
  'tools/rust-r4ghi/business/restatement.mjs',
  'tools/rust-r4ghi/business/restatement-assertions.mjs',
  'tools/rust-r4ghi/business/restatement-sweep-adapter.mjs',
  'tools/rust-r4ghi/business/shared-source-inventory58.mjs',
  'tools/rust-r4ghi/business/shared-source-sweep58.mjs',
  'tools/rust-r4ghi/business/shared-source-race58.mjs',
  'tools/rust-r4ghi/business/legacy-compatibility.mjs',
  'tools/rust-r4ghi/business/correction-preparation37.mjs',
  'tools/rust-r4ghi/I/implementation/period-driver206/manifest206.json',
  'tools/rust-r4ghi/I/implementation/period-driver206/README206.md',
  'tools/rust-r4ghi/I/implementation/period-driver206/driver206.mjs',
  'tools/rust-r4ghi/I/implementation/period-driver206/facts206.mjs',
  'tools/rust-r4ghi/I/implementation/period-driver206/checks206.json',
  'tools/rust-r4ghi/period205-02/manifest205-02.json',
  'tools/rust-r4ghi/independent/review05/period205-review119/review119-04.json',
  'tools/rust-r4ghi/joint-g1/effective-v2/restatement-contract.json',
  'tools/rust-r4ghi/joint-g1/effective-v2/legacy-current-contract.json',
  'tools/rust-r4ghi/joint-g1/effective-v2/public-contracts.schema.json',
  'docs/design/rust-r4ghi/g1-source-manifest01.json',
  'apps/poms-api-rust/src/project_operating/restatement.rs',
  'apps/poms-api-rust/src/project_operating/service.rs',
  'apps/poms-api-rust/src/project_operating/preparation.rs',
  'apps/poms-api-rust/src/project_operating/store.rs',
  'apps/poms-api-rust/src/project_operating/capture.rs',
  'apps/poms-api-rust/src/project_cost_governance/correction.rs',
];
for (const file of files) fixed.set(file, input(file));
const a = acceptance.json(), a06 = a.stories.find(s => s.id === 'A06');
assert.equal(a06.required.length, 4);
assert(a06.required[0].includes('every applicable live/period endpoint'));
assert(a.transactionAndConcurrency.cases.includes('period/current legacy and modern competing authorities'));
assert(a.transactionAndConcurrency.rowLockEvidence.includes('a sequential pair of HTTP calls is not a race certificate'));
assert.equal(operations.json().operations.length, 32);
assert.equal(matrix.json().operations.length, 32);
assert.equal(impact.json().consumerSourcePinsSHA256, sourceDigest);
assert.equal(impact.json().retainHistoricalLabels, true);
assert.equal(impact.json().currentConsumerCertificationGranted, false);
assert.equal(impact.json().evidenceGroups.length, 18);
assert(impact.json().evidenceGroups.every(g => g.use === 'historical-by-impact-review' && g.certifiesCurrentConsumerExecution === false));
assert.equal(actual.json().G3Certified, false);
assert.equal(actual.json().G4Certified, false);
assert.equal(actual.json().newCertifiedOperations, 0);
const textOf = f => fixed.get(f).bytes.toString('utf8');
assert(textOf('tools/rust-r4ghi/business/tax13-sweep.mjs').includes('never removed to run this live-only effect adapter'));
assert(textOf('tools/rust-r4ghi/business/shared-source-inventory58.mjs').includes('Real periods require a separately reviewed period inventory; never discard them'));
assert(textOf('tools/rust-r4ghi/business/gh-write-facts.mjs').includes('This source-bound late-expense inventory is one-project/live'));
assert(textOf('tools/rust-r4ghi/I/implementation/period-driver206/facts206.mjs').includes("operation: 'ProjectCostController_createPeriodClosingSnapshot'"));
assert(textOf('tools/rust-r4ghi/I/implementation/period-driver206/facts206.mjs').includes('assert.equal(period.latestRestatementRef, null)'));
assert(textOf('tools/rust-r4ghi/I/implementation/period-driver206/driver206.mjs').includes('mustReprepareLabor47ScopeIncludingThesePeriods: true'));
assert(textOf('apps/poms-api-rust/src/project_operating/service.rs').includes('let scope = if period_ref.is_some()'));
assert(textOf('apps/poms-api-rust/src/project_operating/restatement.rs').includes('if actual != expected'));
const productComparison = [];
for (const file of files.filter(f => f.startsWith('apps/'))) {
  const match = sourcePins.json().find(p => p.file === file || p.file.endsWith('/' + file));
  assert(match, 'Product file must be a frozen Source13 leaf: ' + file);
  assert.equal(fixed.get(file).pin.rawBytesSha256, match.sha256, file);
  productComparison.push({ file, frozenSource13SHA256: match.sha256, matches: true });
}
const proposal = fixed.get('tools/rust-r4ghi/I/implementation/period-driver206/manifest206.json').json();
for (const p of proposal.files) {
  const got = fixed.get(p.file);
  if (got) { assert.equal(got.pin.rawBytesSha256, p.rawBytesSha256); assert.equal(got.bytes.length, p.bytes); }
}
const g1Manifest = fixed.get('docs/design/rust-r4ghi/g1-source-manifest01.json').json();
const legacyG1 = g1Manifest.entries.find(p => p.path === 'tools/rust-r4ghi/joint-g1/effective-v2/legacy-current-contract.json');
assert(legacyG1);
assert.equal(fixed.get(legacyG1.path).pin.rawBytesSha256, legacyG1.sha256);
const allocationSchema = fixed.get('tools/rust-r4ghi/joint-g1/effective-v2/public-contracts.schema.json').json().components.schemas;
assert.deepEqual(allocationSchema.AllocationCorrection.required, ['basisRef', 'sourceCostRefs', 'projectShareItems', 'reason']);
assert.deepEqual(allocationSchema.AllocationShareInput.required, ['projectId', 'allocationWeight', 'expectedCurrentResultRef', 'reason']);
const handoff = {
  source13TechnicalCommitParentReported: '0b82739a', remoteOrGitVerifiedThisPrecheck: false,
  plannedOrderParentReported: ['Tax live-only complete targets', 'H46', 'H49', 'H47', 'Receiver natural 2026-W45 period206 create/read/FI'],
  resourceTool119H1B2ReviewStatusParentReported: 'under-independent-tool-review',
  MAXOriginalOneCentOverflowSourceRetainedParentReported: true,
  MAXPeriodPreparation422IsNotPositivePeriodFixture: true,
  receiverPeriodPositiveIsPlannedNotObservedByThisPrecheck: true,
  additionalMixedProducerSelectedByRoot: 'actual whole-allocation 2:1 to 1:1 after genuine period creation; not executed or admitted by this review',
  legacyBindingsPathGuessWithdrawnByRoot: true,
  newLegacyNegativeFixtureProtocolRootWillPrepareSeparately: true,
};
const review = {
  kind: 'independent-fixed-G1-period-restatement-authority-coverage-precheck01',
  reviewer: '/root/r4ghi_final_gates13',
  stage: 'planned-coverage-gap-review-not-G3-or-G4',
  sourceEpoch: 'g2-business13', sourcePinsSHA256: sourceDigest, sourceCount: 416,
  acceptancePlan: acceptance.pin, operationMap: operations.pin, priorMatrix: matrix.pin, priorStatus: status.pin,
  retainedEvidenceImpact193: impact.pin, sourceComparison193: comparison.pin, actualTechnicalFactsOnly: actual.pin,
  G1A06RequiredVerbatim: a06.required,
  G1TransactionAndConcurrencyVerbatim: a.transactionAndConcurrency,
  handoff,
  conclusion: 'The planned Tax-live-only then period-create/read/current-preservation sequence does not discharge period restatement or period/current legacy-modern competing-authority acceptance. One genuine full-target mixed live/period source correction can cover the first two gaps together.',
  gaps: [
    {
      id: 'PC01-real-period-restatement', obligation: 'G1-explicit-required-A06',
      G1Anchor: ['stories.A06.required[0]', 'stories.A06.required[2]'],
      plannedCoverage: '206 creates one new period root and paired snapshot, reads them, checks latestRestatementRef is null, FI and realtime-current preservation. It does not issue createOperatingRestatement.',
      result: 'required-behavior-not-covered-by-described-plan',
      sufficientMinimum: 'A genuine governed correction after the actual eligible period exists must restate at least one applicable period terminal; verify scope=period, exact original period/root/window, advanced real knowledge cutoff, new immutable G/H output and public restatement/detail/list/snapshot/period reads.',
      combineWith: 'PC02-mixed-full-target-source-correction', actualPassReceipt: null,
    },
    {
      id: 'PC02-mixed-full-target-source-correction', obligation: 'G1-explicit-completeness-behavior-with-applicability-condition',
      G1Anchor: ['stories.A06.required[0]', 'stories.A06.required[1]', 'evidenceRules[2]', 'transactionAndConcurrency.requiredWriteFaultInjection'],
      applicability: 'The same real shared source is applicable to both existing live and period terminal outputs, determined from real business cutoff/consumption and server reverse discovery. No invented period target is required before one exists.',
      plannedCoverage: 'Tax live-only adapter rejects a period target. Creating a period after that Tax command observes its then-current source; it is not a correction of that already-published period.',
      result: 'required-when-live-and-period-coexist; proposed-minimal-witness-not-a-new-product-feature',
      sufficientMinimum: 'After genuine Receiver W45 creation, derive one fresh lawful F whole-allocation replacement or evidence-backed stage/tax successor against the active predecessor, query server correction roots and every returned target, prepare exact full set including applicable live and period. Execute real necessary-family FI/complete rollback then one same-body normal request. Do not replay any committed Tax or period POST.',
      completeTargetPolicy: 'At least one actual applicable period plus all returned live/period terminals across every affected project/batch. Do not require a period on a project where none is applicable; do not impose targets-times-families Cartesian testing.',
      actualPassReceipt: null,
    },
    {
      id: 'PC03-legacy-modern-period-current-authority-competition', obligation: 'G1-explicit-required-concurrency-case',
      G1Anchor: ['stories.A06.required[2]', 'transactionAndConcurrency.cases[7]', 'transactionAndConcurrency.rowLockEvidence'],
      plannedCoverage: 'Tax live-only and period206 contain no legacy publication/race mode. Current preservation after creating a modern historical period is not a competing-authority proof. Existing legacy-compatibility helper performs controlled project-scope denials, not baseline/period authority contention.',
      result: 'required-concurrency-case-not-covered-by-described-plan',
      sufficientMinimum: 'Use a separately reviewed bounded owned compatibility scenario with legal modern requests and actual conflicting legacy authority at the same project/current-baseline or project/period key. Establish overlapping transactions with pg activity/locks or controlled barriers. Verify one consistent authority and documented semantic 409 before unique/internal errors, complete losing-command rollback, and immutable legacy originals. Cover both period and current/baseline authority assertions; one combined schedule is sufficient only if it actually exercises both paths.',
      optionalNotG1Mandate: ['Both scheduler order permutations', 'All modern API x legacy kind Cartesian combinations', 'A new public legacy mutation endpoint'],
      actualPassReceipt: null,
    },
  ],
  minimalAdditionalScenario: {
    prereq: 'Receiver natural W45 create/read/FI succeeds on genuine qualified sources; preserve original period root. Do not use MAX overflow fixture for positive period proof.',
    scenarioA: 'One new genuine mixed-target F correction (explicit complete allocation reweighting is supported; evidence-backed stage/tax successor is also possible) + complete required-write-family FI + one same-body normal request and actual public reads; covers PC01 and PC02 together.',
    scenarioAAssertions: [
      'Fresh exact source/project/head CAS, source-derived pre-effect input hash; no hand pruning of affected targets or client-created monetary overrides.',
      'Lock/re-discover complete sorted affected project/source/batch set and require authorized scope for every project. Implicit stage/tax batch refresh preserves old real weights; an explicit allocation replacement may use exact approved new full-project weights. Preserve source set/measurement/layers and verify exact-cent conservation plus actual new shares.',
      'Every necessary F/G/H/audit/managed-auth write belongs to one outer transaction; each actual inventory family has its actual one-hit failure, full rollback and same-body retry. A prior live-only inventory is not a period/mixed inventory certificate.',
      'Preserve frozen source contexts/members/business payloads/classifications/evidence and original period row; permit only documented predecessor status/CAS metadata changes. Period business window stays original while actual knowledge advances.',
      'Live current authority moves to its own replacement through CAS. A period successor remains tied to the original period root and does not replace live current; head version changes must follow actual per-target CAS semantics.',
      'Read createOperatingRestatement results, detail/list, each new snapshot, original period and latest period restatement references, plus paired H facts; do not reuse 206 assertion latestRestatementRef=null after restatement.',
    ],
    scenarioB: 'A bounded actually concurrent legacy-modern authority scenario; period and current/baseline assertions cannot be replaced by sequential denials or modern-modern source/capture contention.',
    afterAllNewOutputs: 'H47 must be freshly prepared after period creation and again after any mixed restatement output, covering every new applicable period/restated snapshot/detail/summary view. 206 explicitly disclaims labor-period masking certification.',
    proposalPolicy: 'Root chooses actual lawful source and scheduling details; tool extensions need their own exact non-author protocol/input review. This is a minimum coverage witness derived from frozen G1, not approval of an unreviewed writer.',
  },
  toolCapabilitiesObserved: [
    { tool: 'Tax13', facts: ['tax13-sweep:22 rejects any periodEndSnapshotRef in all complete packets', 'tax13-main:22 primary scope live', 'tax13-semantics:56 requires new snapshot.period_end_snapshot_id=null'], consequence: 'Can certify its live-only effect, cannot execute/certify mixed period targets by removing assertions or dropping targets.' },
    { tool: 'period206-proposal', facts: ['facts206:10 operation=createPeriodClosingSnapshot', 'facts206:84 latestRestatementRef=null', 'driver206:195 one period-create POST', 'driver206:172-184 GETs and explicit fresh H47 period scope'], consequence: 'Candidate create/read/FI/current-preservation support; no actual effects or tool admission granted here, no period-restatement/authority-race mode.' },
    { tool: 'old-GH/shared58', facts: ['gh-write-facts:59-61 one-project/live', 'gh-restatement-preparation:10 primary live', 'restatement-assertions:51 no cross-project/period', 'shared-source-inventory58:19/23/39 rejects real periods', 'shared-source-sweep58:94/121 periodPositiveCovered=false', 'shared-source-race58:40-44 stage correction vs realtime capture'], consequence: 'Useful reviewed building blocks only after scoped extension; prior race is a different concurrency case.' },
    { tool: 'legacy-compatibility', facts: ['legacy-compatibility:97-101 permission 403 checks', 'legacy-compatibility:123-125 controlled project-scope fixture, producerDelivery=false'], consequence: 'Does not demonstrate legacy baseline/period authority guard under concurrent publication.' },
  ],
  requirementVersusRecommendation: {
    explicitG1Must: ['Every applicable live/period endpoint in a true governed correction', 'Full actual affected shared batch/project outputs, locking, permission and CAS', 'Immutable old period roots/evidence and legacy semantic conflict guard', 'Actual period/current legacy-modern competing authority case with overlap evidence', 'Necessary-family one-hit rollback and same-body retry'],
    derivedMinimalWitness: ['One mixed-target explicit allocation replacement or evidence-backed stage/tax successor can jointly prove period restatement and complete live/period rebuilding', 'Use Receiver W45 once actually qualified; exact target count comes from current fixed preparation, not a predicted number', 'Fresh H47 scope after all new outputs'],
    notRequiredByQuotedG1: ['New product DTO/route', 'Artificial earlier period/source timestamps or deleting the retained MAX one-cent cash', 'Automatic historical baseline reselection', 'Every ordering permutation or all possible matrix combinations', 'A supported producer for explicitly unsupported receipt/payment/invoice mutations'],
  },
  producerChoice: {
    allocationReplacementSupportedByExistingProduct: true,
    formalDTO: 'AllocationCorrection{basisRef,sourceCostRefs,projectShareItems,reason}; each AllocationShareInput{projectId,allocationWeight,expectedCurrentResultRef,reason}',
    exactCode: ['project_cost_governance/correction.rs:235-254 explicit allocation corrections load/validate real batch', 'correction.rs:370-386 explicit supplied new weights go to real replacement producer; no explicit change preserves old weights', 'correction.rs:883-920 requires exact whole old project set and source-cost set, expected current result refs and exact weights'],
    example: 'A Root-governed real 2:1 to 1:1 full-batch replacement can be used, with real reason, all current refs and exact actual source set. No tax determination or stage evidence need be invented.',
    economicAssertions: 'Verify true new 1:1 shares using selected-measurement-first exact-cent/remainder rules; preserve basis/source totals and currency. Do not assert old per-project shares unchanged in an explicit reweighting case.',
    doesNotReplace: 'A06 separately requires consumed stage/tax implicit refresh preserve actual weights/measurement; the current genuine live Tax evidence must retain that own label and assertion.',
    toolingGap: 'Tax13/shared58 inventories accept stage/tax and live-only; correction-preparation37:35 requires all four nonempty producers. Neither is an already reviewed minimal allocation-only mixed-target effect adapter. A separate external adapter/inventory needs exact review; frozen H1 helpers/source416 stay unchanged.',
  },
  legacySeedAuthorization: {
    formalContract: fixed.get('tools/rust-r4ghi/joint-g1/effective-v2/legacy-current-contract.json').pin,
    formalContractIsG1ManifestMember: true,
    contract: 'Cross-producer baseline is queried under project lock; source0 current baseline blocks admission409; active project/period key across producers blocks legacy period409; any current frozen assignment blocks replacement. There is no source0-to-modern admission protocol.',
    observedExistingWriter: 'legacy-compatibility.mjs:10-14/27-30 writes exactly one new owned project with missing ownerOrg and no modern chain as a compatibility scope-negative fixture, real DB clock, explicit labels. It does not write baseline/period authority rows.',
    existingProjectFixtureAuthorizationDoesNotAuthorizeNewAuthoritySeed: true,
    exactLegacyBindingsSource0WriterLocatedInReadInputs: false,
    parentClarification: 'legacy-bindings was an unverified path guess, not an existing authorized source0 baseline/period writer',
    verdict: 'Existing tool/seed scope is insufficient; a separately sealed exact G2 negative-fixture protocol and independent review are required before effects.',
    newBaselineOrPeriodFixtureSeedExecutionApprovedByThisReview: false,
    conditionalMinimum: 'Only if Root supplies an already authorized exact source0 authority fixture-writer/input boundary: reuse the bounded owned fixture concept with real project/head parent locks and one actual Rust HTTP waiter per authority kind, retain actual legacy-seed-negative labels and immutable old facts. Otherwise exact seed writer/input scope must be separately admitted before execution; no inference from G1 requirement alone.',
    futureDesignParentReportedNotApproved: 'Isolated owned real project/head locked first; source0 negative contender exact columns/new PK/originals, real modern HTTP waiter; after winner commits, delete only that exact newly seeded PK and verify S0 restoration. No original-fact backfill/date mutation or Node app writing Rust DB. None executed/approved here.',
    prohibitions: ['Do not point a new Node app at Rust DB', 'No cross-DB app/fixture mixing', 'No old legacy fact migration, producer relabeling or silent promotion', 'No fixture seed counted as a positive business producer or new32 operation'],
  },
  evidenceBoundary: {
    Source11Or12PeriodAssumedProven: false, historicalLabelsPreserved: true,
    impact193CurrentConsumerCertificationGranted: false, technicalBuildM98BootstrapIsBusinessAcceptance: false,
    actualPeriodOrRestatementEffectsReadThisPrecheck: false, fixed216CapturesRequiredForPlanGapFinding: false,
    reason216NotRead: 'Plan and exact fixed tool scope suffice to find the coverage gap. Actual applicability/IDs/versions require later fixed captures and real preparation; no live target count is inferred.',
    MAXClarification: 'Parent reports original Source11 one-cent extraCash and genuine basis remain retained; current capacity422 is a negative fixture, not a regression or positive period substitute. This precheck did not read its state/cash rows.',
  },
  actions: { fixedFSRead: true, ownDirectoryWritesOnly: true, RootHelpersImportedOrExecuted: false, activeStateRead: false, SQL: false, HTTP: false, browser: false, serviceStartStop: false, CargoOrProductChecksRerun: false, GitOrGitHubReadWrite: false, subagentsSpawned: false },
  G3Reviewed: false, G3Certified: false, G4Reviewed: false, G4Certified: false,
  newCertifiedOperations: 0, officialRustDeliveryUnchanged: 240, mainMergeAuthorized: false, deploymentAuthorized: false,
};
const readback = output('fixed-input-readback01.json', { kind: 'independent-FS-only-fixed-input-readback01', inputs: records, productLeavesAgainstFrozen193: productComparison, allNamedInputsReadAndPinned: true, stateFilesRead: 0, currentTargetsOrEffectSuccessInferred: false });
review.fixedInputReadback = readback;
const json = output('period-coverage-precheck01.json', review);
const md = output('period-coverage-precheck01.md', `本轮前置结论：仅完成 Tax live-only 全目标，再完成 Receiver 真实 W45 期末 create/read/FI 和 current 守恒，仍不足以覆盖冻结 G1 的真实期间重述及 period/current legacy-modern authority 竞争。未签 G3/G4，新增认证仍为 0。\n\n冻结依据为 acceptance-plan01 的 A06 四条及 transactionAndConcurrency；输入 SHA、原文和逐项定位见同名 JSON 与 fixed-input-readback01.json。impact193 仍仅批准 18 组历史证据按影响引用，currentConsumerCertificationGranted=false；Source13 实际 build/M98/B0/B1 事实不替代业务验收。\n\n| 缺口 | G1 必验性质 | 当前计划的边界 | 最小补验 |\n|---|---|---|---|\n| PC01 真实 period restatement | A06 明确要求每个适用 live/period endpoint 重述、原 period root/证据不可变 | 206 只创建新 period，读取时明确要求 latestRestatementRef=null；未调用 createOperatingRestatement | 与 PC02 合并：在真实 period 已存在后，用一次有真实业务依据的 F 修正重述它 |\n| PC02 一次共享来源修正覆盖完整 live+period | A06 明确完整共享批次、所有受影响项目/输出；同时适用两类终端时，同一命令不可只做 live | Tax13 明确拒 period；先 Tax 后新建 period 是捕获修正后的事实，不能证明修正已发布 period | 新鲜 source/CAS/哈希、服务器全目标、全部项目授权/锁；完整必要写族 FI 回滚，再一次同体正常提交，读实际新旧链 |\n| PC03 period/current legacy-modern authority 竞争 | transactionAndConcurrency 明确列项，要求实际锁或 controlled barrier；A06 要业务冲突早于 unique error | current 不回退、顺序 409、旧 legacy 403 scope 工具、stage correction vs realtime capture 均不是该竞争 | 另行受审的有界 owned 兼容/并发场景，实际覆盖 period 与 current/baseline authority 两个断言；只要一个调度确实覆盖两者即可合并 |\n\n这里的“必须”是冻结行为和并发用例；“一次新的 mixed-target stage/tax successor + 一次有界 authority 调度”是减少新增操作的验收建议。G1 没要求完整笛卡尔组合、双方先后顺序各跑一遍，或新增 legacy API。若 Tax 执行当时没有适用 period，live-only 本身并不错误；但它不能替代随后仍欠的期间重述验收。实际期间目标数量必须由真实来源/业务截止和服务器反查决定，不能预言每个共享项目都有 period。\n\n产品现有 service.rs:321 按每个 target 的 periodRef 选择 live/period；restatement.rs:632–650 精确比较完整 targets；preparation.rs:83–113 返回真实期间锚点。补验沿用现有 API/DTO。工具则仍有明确界限：Tax13 sweep:22、shared-source-inventory58:19/23/39、GH facts:59–61 拒绝期间/混合范围；不能删除断言、剪裁目标、重用旧 live 库存冒称期间 FI。206 是待准入提案，16 pure-FS 记录不等于任何实际效果或本审查的工具批准。\n\n最小安排：保留 Root 当前真实 live Tax；206 真正完成 Receiver 自然 W45 期末后，再根据真实在窗来源和合法证据选择一次新的 F stage/tax successor（不得重发已经成功的 POST，不得为测试捏造修正），重新准备完整 live+period 目标及必要族，做实际一击回滚/同体正常提交与公开 restatement detail/list、各新 snapshot、原 period/latest-restatement 读取。保持期间原业务窗口、原 period 行和冻结 payload；只允许协议明确的 predecessor status/CAS 元数据变化。混合重述会正常推进 live successor 与 head CAS，期间 successor 不得抢占 live current；这与 206 创建期间时的 current 原图守恒是不同断言。\n\n206 明确输出新 period targets 并要求重新准备 H47；若随后又新增 mixed-restated 输出，H47 也要在全部新输出之后按完整 scope 复核。先于 206 的 H47 不能自动涵盖尚未出生的期间。敏感 GET 审计、raw null/projection、H 下游和必要写族仍依冻结矩阵逐项交证。\n\n本轮未读取活 state、216 captures 或任何当前效果包；无需这些数据即可判断计划缺口。后续 fixed captures/真实准备才能判适用 targets、版本和源证据。MAX 保留的一分溢出负例及 Receiver 资格来自 Root 明示交接，未读取其现金行、未将 MAX 当期末正向夹具。旧 Source11/12 结果保原标签，不推断已有 period 实测。\n\n32 HTTP 范围不扩展，正式 Rust240/新增认证0；G3/G4、main、部署均未批准。\n`);
const filesToSeal = [readback, json, md, ...records.map(r => r.copy), { file: import.meta.filename.replaceAll('\\', '/'), bytes: fs.statSync(import.meta.filename).size, rawBytesSha256: sha(fs.readFileSync(import.meta.filename)) }];
const manifest = output('manifest01.json', { kind: 'independent-period-coverage-precheck-seal01', reviewer: review.reviewer, sourcePinsSHA256: sourceDigest, files: filesToSeal, fixedFSOnly: true, G3Certified: false, G4Certified: false, newCertifiedOperations: 0 });
console.log(JSON.stringify({ result: 'sealed-planned-coverage-gaps-not-Gate', review: json, narrative: md, manifest, namedFixedInputs: records.length, copiedProductLeavesMatchFrozen193: productComparison.length, G3Certified: false, G4Certified: false, newCertifiedOperations: 0 }));
