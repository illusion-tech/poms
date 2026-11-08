// Local evidence packaging only; never imports the acceptance runtime.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const dir = path.dirname(fileURLToPath(import.meta.url)), root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const read = file => JSON.parse(fs.readFileSync(file)), sha = value => createHash('sha256').update(value).digest('hex');
const pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');
const m = read(`${dir}/operation-matrix67.json`), f = read(`${dir}/focused-evidence67.json`), s = read(`${dir}/supplemental-evidence67.json`);
assert.deepEqual(m.currentState, f.currentState); assert.deepEqual(m.currentState, s.cut); assert.equal(m.currentState.sequence, 5501); assert.equal(m.rows.length, 32); assert.equal(m.inconsistencies.length, 0);
const decision = `${root}/docs/design/rust-r4ghi/user-decision-period05.json`, actualDecision = read(decision);
assert.equal(actualDecision.answer, '实时维护当前，期末保留期间历史（推荐）');
const periodFiles = ['preparation.rs', 'context.rs', 'baseline.rs', 'sources.rs', 'collector.rs', 'capture.rs', 'service.rs', 'store.rs'];
write('period-semantics67.json', { kind: 'Source12-fixed-code-first-period-source-cutoff-inspection', source: m.versions['g2-business12'],
  decision7: { status: 'approved', original: pin(decision) }, files: periodFiles.map(name => pin(`${root}/apps/poms-api-rust/src/project_operating/${name}`)),
  findings: [{ id: 'PER67-01', classification: 'confirmed-static-guard', contract: 'signed/effective business cutoff, current knowledge cutoff; no qualified contracts -> effective-contract-required -> capture operating_formal_evidence_missing' },
    { id: 'PER67-02', classification: 'static-baseline-provenance-time-gap', actualPath: 'first period chooses current baseline draft without an as-of adopted estimate/successor filter; derive has no business window',
      notClaimed: 'Late-close G row captured now is not itself invalid; no executed period command or observed bypass' }],
  authorExecution: { FSOnly: true, SQL: false, HTTP: false, RootWritten: false }, G3Certified: false });
write('review-H22-67.json', { kind: 'non-author-H22-exact-promotion-and-actual81-evidence-review', status: 'static-and-pinned-preflight-evidence-pass-limited-scope',
  findingsP1: [], findingsP2: [], evidence: f.H22,
  checkedCode: [{ file: 'tools/rust-r4ghi/business/ui-windows-preflight22.mjs', lines: [9, 13, 28, 29, 30, 38, 46, 58],
    facts: ['child env clone removes PSModulePath case-insensitively', 'absolute pwsh SHA and exact Core7 version', 'NoProfile/NonInteractive/File and hidden child', 'fresh directory, protected SID+SYSTEM ACL', 'sanitized failure diagnostics'] },
    { files: f.H22.exactPromotionFiles.filter(x => x.file !== 'tools/rust-r4ghi/business/ui-windows-preflight22.mjs').map(x => x.file),
      facts: ['same pinned guard before ACL/fileVersion', 'fresh profile and exact worker/runtime/tool pin checks', 'Root six promoted files equal candidate after SHA; every manifest sidecar exact'] }],
  actual81: { protected: true, edition: 'Core', exactVersion: '7.6.9', executableSHARechecked: true, parentEnvironmentUnchanged: true, taskPrivateOnly: true,
    oldRun01Reused: false, HTTPExecuted: false, browserStarted: false },
  limits: ['Preflight is not DOM acceptance', 'No browser, ACL command, process launch or runtime action by reviewer', 'No whole-batch G3/G4 certification'], G3Certified: false, G4Certified: false });
const blockers = [
  { id: 'B67-01', stories: ['A05', 'A06'], status: 'actual-positive-missing', operations: ['ProjectCostController_createPeriodClosingSnapshot', 'ProjectCostController_getPeriodClosingSnapshot'],
    facts: ['No positive actual HTTP in Source10/11/12 corpus at cut', 'Source11 period POST400/422 are protocol-negative only', 'Period producer/FI, period restatement and competing authority scenarios not certified'],
    decision7: 'approved; stale pending7 tool comments are not a user blocker', next: 'Root needs real eligible completed-period sources and public preparation/command/readback, without old-fact SQL or clock changes', staticInspection: 'period-semantics67.json' },
  { id: 'B67-02', stories: ['A05'], status: 'actual-rule-boundaries-partial', facts: ['9 persisted contexts have no exact20percent receipt/contract case', 'Persisted reason rules observed H02/H03/H07/H08/H11 only'],
    missingActualReasonRules: s.storedHBoundary.ruleIdsNotObservedInPersistedReasons, next: 'Use real supported producer facts for the missing branches; unit policy coverage retains its unit label' },
  { id: 'B67-03', stories: ['A07'], status: 'same-task-race-not-observed-at-cut', facts: ['Different-task real200/409 and fresh loser completion verified', 'Same-task-own-B result absent at5501'], next: 'Root may run the approved own-B dual-session scenario after actual UI closure; do not substitute the different-task proof' },
  { id: 'B67-04', stories: ['A03'], status: 'freeze-concurrency-evidence-not-observed-at-cut', facts: ['No actual public revised-draft-vs-freeze race certificate in this corpus', 'Forward65-02 is an unregistered/unexecuted defensive candidate'],
    safetyBoundary: 'Stopped parentless SQL reproduction is not resumed or counted', next: 'Only approved normal public-command two-session race / already approved frozen negative probe; actual lock evidence required' },
  { id: 'B67-05', stories: ['A02', 'A05'], status: 'historical-source-actual-HTTP-not-certified', facts: ['Historical confirmed missing-basis certification and exact1.2300/nonexact1.2340 source consumption lack a pinned actual producer case here'],
    previousFacts: pin(path.join(dir, '../business-a05-boundaries26/coverage-evidence26.json')), next: 'No SQL financial authority or quantity/unit-price substitution; preserve actual column-precision and unit-test labels' },
  { id: 'B67-06', stories: ['A08'], status: 'Native-HTTP-reference-not-executed', facts: ['34 actual API134 Rust negatives cover16modern writes plus supportingC, missing422 and modern-shape400', 'NativeHTTPExecuted=false in the pinned actual56 proof'],
    next: 'Do not promote Native pure guard/tsc evidence into actual Native HTTP evidence' },
  { id: 'B67-07', stories: ['A08'], status: 'live-UI-outside-this-cut', facts: ['H22/22-02 static promotion and actual81 Core7 preflight verified', 'Actual81 browserStarted=false/HTTPExecuted=false; UI02 was ongoing and is not certified by this file'],
    next: 'Review separate actual DOM+write observer receipts after Root completes them; frozen574+430 graph untouched' },
  { id: 'B67-08', stories: ['A05', 'A06', 'A08'], status: 'version-label-boundary', facts: ['30/32 is historical union existence, not full expected-business assertions for the fixed candidate', 'Source12 has14positive operations; API133/134 successes retain their original source and binary', 'API13578 is2list+3detail of API134 records, no restatementPOST replay'],
    next: 'Use exact independent impact review and explicitly scoped new consumer acceptance; never relabel historical producer as135 or replay an already-committed command to fill a label' },
];
write('blockers67.json', { kind: 'acceptance-evidence-gaps-not-a-product-Gate-certificate', cut: m.currentState, blockers,
  C85ActualNowObserved: s.C85, independentScope: 'G/H product evidence and H22; I/R5/C observations are author-domain factual inventory only', SQL: false, HTTP: false, RootWritten: false, G3Certified: false, G4Certified: false });
const count = (row, epoch) => { const v = row.versions[epoch]; return `${v.exactSuccessAndLedger}${v.domainProducerHTTP ? ` (P${v.domainProducerHTTP})` : ''}${v.preparationOnlySuccess ? ` (prep${v.preparationOnlySuccess})` : ''}`; };
const table = ['| 组 | operationId | API133 | API134 | API135 |', '| --- | --- | ---: | ---: | ---: |', ...m.rows.map(row => `| ${row.group} | ${row.operationId} | ${count(row, 'g2-business10')} | ${count(row, 'g2-business11')} | ${count(row, 'g2-business12')} |`)].join('\n');
const text = `截至 Source12 state 序号5501（raw SHA ${m.currentState.rawBytesSha256}），固定32个 operation 有30个找到 actual Rust canonical成功 HTTP及完整ledger；缺期末创建和读取。529条目标HTTP原件核验无pin不一致。此为证据盘点，不是全情景/G3/G4认证。\n\n` +
  `API133/134/135来源分别为 source404/a379d62b…、405/06d80fa6…、406/5263ad89…；完整source/binary/原件pin在 operation-matrix67.json。正向operation数分别21/22/14；真实producer operation数分别10/13/7。不同版本不合并成135。\n\n` +
  `表中数字为 actual成功HTTP+ledger数量；P为其中有真实对应领域birth/update的producer调用；prep为仅preparation GET。并发原始HTTP另在focused-evidence记录，不假称generic receipt扫描是所有HTTP传输的完整总数。每行最终两条原件/ledger及全部529条索引分别在 operation-matrix67.json/http-evidence-index67.jsonl。\n\n${table}\n\n` +
  `G/H重点：78已独立读核真实135的2list+3detail，消费真实134 restatement，不重POST。旧133 gate200保原failed ledger=false，通过显式41metadata-only reconciliation与同xmin九类写重新对账，不改旧失败。统一核算的135十次成功均为prep；134十一次也均为prep，不能算正式snapshot。\n\n` +
  `A07：错parent404、跨项目evidence409、非责任人403；必要sensitive GET audit实际primary-hit1返回500且无成功payload，正常masked200；两不同task双session实际200/409、刷新loser后aggregate closed、原conditional-completed不变。same-task截至5501仍未观察到。C85实际135回款确认200、两锁边与55P03/rollback、原terms SHA/xmin及净税币/ref均已核到原件；这是C作者域的事实盘点。\n\n` +
  `A05/A08缺口：period create/get无正向；第7决策已批准，旧pending7注释不作阻断。9个已存context无恰20%样本，真实reason只见H02/H03/H07/H08/H11；其余六规则的单位测试不补算实际链。MAX/cent/13%为既有真实134 published链；overflow保持真实cash提交+旧409/fresh preparation422，未冒称新capture422。历史precision/缺basis来源未认证。34个API134 Rust协议负例覆盖16新write+supportC；NativeHTTP=false。完整缺项和最小后续在 blockers67.json。\n\n` +
  `H22/22-02六实际提升文件及sidecar SHA精确；Core7.6.9 actual81的受保护ACL、不继承PSModulePath、父环境守恒、显式exe SHA已核。actual81没有启动浏览器/HTTP，不能代替正在运行的真实DOM结果。详细限定非作者结论见 review-H22-67.json。\n\n` +
  `Source12首次period的固定代码静审见 period-semantics67.md/json：真实合同业务cutoff有guard；未来estimate/approved-change的baseline采用链缺少等价显式as-of筛选。晚到结账现在封存本身可以合法，不能仅按G行创建时间一刀切。未执行任何period请求或SQL。\n\n` +
  `作者只读FS，写入仅本I67目录；Root产品/工具/私有state、UI02冻结图均未改。非作者结论限G/H及H22，未给本人I/R5/C产品独审/G3。新增结果须另建后续截点，不能回写这个5501证据。\n`;
fs.writeFileSync(`${dir}/README67.md`, text);
console.log(JSON.stringify({ union: m.rows.filter(row => Object.values(row.versions).some(v => v.exactSuccessAndLedger)).length, cut: m.currentState.sequence,
  written: ['README67.md', 'period-semantics67.json', 'review-H22-67.json', 'blockers67.json'], RootWritten: false }));
