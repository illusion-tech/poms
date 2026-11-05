# poms-r4def 上游真实生产候选 32

本目录只提供 Root 可审阅/导入的工具候选。本作者未访问运行中的 31341、未连接任何 DB、未读取新旧 private、未改 Root/shared/runtime/环境或提交。summary Rust 候选已使用真实应用库离线编译通过；HTTP/内部服务生产仍未运行，全部阶段初始 not-run。

## 最小 summary example

完整源码为 `r4def_summary_producer32.rs`，SHA256 `9f282e14432c13d40d241924736290821c22963c0763984e591b146a03d50b1e`。它基于此前实际调用的 `apps/poms-api-rust/examples/r4_summary_producer.rs`，只将隔离 namespace、base、role/database、marker、private 根、package/trace 名称切到本批。没有改旧 example，也不能在新环境运行旧 r4abc 二进制。

新 guard 固定为 poms-r4def、base `756d813c9578090fcf8e56821acce01b46b40420`、`poms_r4def_rust` / `poms_r4def_rust_app`、host127.0.0.1:25433、`r4def_control.marker` 的真实 expectedInstanceId、PG服务端口15432/version150012、isolated=on、schema=poms、非superuser/bypassrls。31341是HTTP端口，不能填成DB端口。命令仅接受新 namespace private 内的单个 request 文件及显式 POMS_ENV_FILE，不接受符号链接，不打印配置/凭据。

输入与纯 `upstream-payloads01.mjs.summaryRequest` 同形状：runId、caseId(1..16)、actorId、expectedInstanceId、projectId、costPackageId、baselineId、fieldValues。其中 quoteVersion 非空≤64，报价/税率必须与实际同项目商业 baseline 的读取值精确一致。示例不会猜源、写基线状态或写审批状态。

真正的写入链是：

1. 同一外层 transaction 校验实际环境/marker、active actor、project/cost/baseline及金额；这些自定义SQL全部只读，另有必要行锁。
2. `ApprovalCommonService.repository_create(Table::Definition)` / `repository_save` 保存真实 active摘要定义。active是材料定义状态，不是报价/合同审批通过。
3. `create_summary_snapshot_with_session` 验证定义匹配，创建真实 summary snapshot / field projections；`projections` 读回真实7条projection和实际ID。
4. 单次外层COMMIT确认后才返回 `outerCommitAcknowledged=true` 和真实Trace。失败整事务回滚；commit_unknown须先只读核证，不能自动重试或伪造ACK。

summary 的 scenario/projection/export 为 `pricing-margin-review / pricing-facts / internal-only`，package为本次run+case唯一键。它保留实际项目/成本包/baseline材料hash引用，明确 `createsApproval=false`、`rawMaterialsStoredInSummary=false`；真实R3 pricing命令才登记 released，后续合同还必须真实submit→当前审批人approve→activate。summary不能代替任一步。

Root可在自己的目录用本目录独立 Cargo 包构建，无须修改共享Cargo或注册example；也可由Root单写复制新example进入其应用examples并构建。以下只为调用说明，本作者仅执行check，未执行build后的二进制：

```bash
CARGO_HOME=/home/wangzishi/.cache/poms-r4def-cargo-home CARGO_BUILD_JOBS=2 \
  /home/wangzishi/.cargo/bin/cargo +1.99.1 build --locked --offline \
  --manifest-path tools/rust-r4def/E/upstream32/Cargo.toml \
  --target-dir /home/wangzishi/.cache/poms-r4def-target-ROOT \
  --bin r4def_summary_producer32

# request由Root仅写入新namespace private，包含实际API返回的材料ID和真实marker。
POMS_ENV_FILE=/home/wangzishi/.local/share/poms-r4def/private/rust-api31.env \
  /home/wangzishi/.cache/poms-r4def-target-ROOT/debug/r4def_summary_producer32 \
  /home/wangzishi/.local/share/poms-r4def/private/summary32-actual-request.json
```

Root需要先保存新request、二进制/源码hash、实际stdout/stderr原件及退出码，再将解析body和真实receiptId注入driver。出现错误或不确定COMMIT时保留全部原件，按run/case/package自然键只读核证；不得直接重放。example拒绝覆盖同target/scenario/projection的既有active snapshot，因此每轮使用新的实际项目。

## request-only 合同链

`request-drivers32.mjs` 唯一复用的旧模块是纯请求factory `tools/rust-r4abc/upstream-payloads01.mjs`。它没有导入/运行旧 `fixture-core04`、旧环境、旧actor/credential SQL setup、旧connect或snapshot helper。`happy-http08.mjs` 只作已有真实调用顺序的只读参考。

```js
import { createContractUpstream32, createHandoverUpstream32 }
  from './tools/rust-r4def/E/upstream32/request-drivers32.mjs';
import { createEAcceptanceSuite }
  from './tools/rust-r4def/E/api-acceptance-vectors21.mjs';

const upstream = createContractUpstream32({
  tag: freshBoundedTag16, runId: actualRunId, expectedInstanceId: actualNewNamespaceMarker,
  creator: actualLoggedInCreator, plannedDate: '2026-11-10',
}, {
  request: h.request, // Root api-harness32真实HTTP callback，{status,body,receiptId}
  async produceSummary(input, meta) {
    // Root写新private request(wx/0600)，调用上面的实际新binary，保存原始回执。
    return await rootActualSummaryProducer32(input, meta); // {body,receiptId}
  },
  async resolveApprover(userId, actualApproval) {
    return rootActualLoggedInActorById(userId); // id必须等于currentApproverUserId
  },
});
const initial = upstream.manifest(); // 13阶段not-run、0HTTP、0内部生产回执
const contractResult = await upstream.run();
// 必须先检查contractResult.completed；失败后不可重建suite假装自动恢复。
```

creator须来自真实login回执 `{key,id,permissions}`，具备customer:write及project:read/write和实际其余入口授权；代码不发明contract:write权限。所有基础业务事实依次通过真实API：customer→project→technical cost→direct commercial→draft contract→commercial baseline→实际内部summary→R3pricing→readiness/diff review→preparation→submit/真实currentApprover批准→Active snapshot→formal receivable plan。

审批读的是正式 `ApprovalRecordSummary.currentStatus`，不是 `status`；currentApproverUserId须每次读真实记录，不硬编码vp_owner或使用creator代批。driver最多8次真实待审节点，未通过就停，不伪造released。prepare返回preparationId且snapshotId=null，activate才返回从该preparation生成的不可变snapshot；formal plan须绑定该exact snapshot。

示例保留原factory的项目报价113000.00与每合同独立56500.00/未税50000.00的条款。项目报价不是合同总预算；本候选不从项目金额倒推出合同预算，不将summary当审批。多合同应另通过真实命令建立各自referenceTerms、preparation、approval、snapshot和plan。

`contractResult.context` / `activeContract` 是实际返回数据，可拼入E21：

```js
const e = createEAcceptanceSuite({
  tag: freshE21Tag, project: contractResult.context.project,
  activeContract: contractResult.activeContract,
  otherProject: actualOtherProject, // 可通过真实ProjectController_create，不能假UUID
  expenseCategory: actualExpenseDictionaryCode, costCategory: actualCostCategory,
  actors: actualE21ActorMatrix, persons: actualE21People,
  assessments: actualE21ResponsibleAssessments,
}, { request: h.request, observeEvidence: rootReadOnlyEvidenceHook });
// e.manifest()仍21 not-run。只有Root显式e.run()才实际调用。
```

Root的 `api-harness32.request` 已按当前spec路由、id、body、actor、meta.query工作；driver的GET body为null、path不含query，避免旧factory直接拼URL与harness路径核对冲突。factory内不存在HTTP或环境访问。回执摘要没有cookie/password；完整原始敏感材料与会话由Root的新namespace证据制度管理。

## 已有 upstream-base36 的续跑入口

Root公开 `tools/rust-r4def/upstream-base36.mjs` 已真实创建 customer/project/otherProject、非空V1 scope/risk成本包、bid、主contract/secondContract及同baseline两份referenceTerms，应直接使用 `createContractContinuation32`，不重复基础create：

```js
import { createContractContinuation32 }
  from './tools/rust-r4def/E/upstream32/request-drivers32.mjs';

const continuation = createContractContinuation32({
  ...actualBase36Context, // Root自己读回的context，键contract/secondContract
  creator: h.actor('full'),
  summary: actualNewExampleAcknowledgedBody,
  summaryReceiptId: actualSavedSummaryStdoutReceiptId,
}, {
  request: h.request,
  resolveApprover: userId => rootActualLoggedInActorById(userId),
});
const before = continuation.manifest(); // 13个后续阶段全not-run
const completed = await continuation.run();
```

它先经真实GET重读项目、baseline和两份draft合同，确认同项目且未擅自进入其他状态；核验Root已执行新example的真实ACK/材料绑定/receiptId，跳过再次生成summary。然后只生成一份同项目pricing，依次完成两合同各自的readiness/diff review、preparation、submit/actual approver、Active及formal plan。每条写使用该合同最新实际rowVersion；各合同金额/计划独立，两个56500.00不是从项目总报价倒算硬预算。

返回 `contractContexts[0/1]` 保存各自真实contract/readiness/preparation/approval/snapshot/plan；`context.contract`、配套preparation/plan及 `activeContract` 固定为第一合同，`context.secondContract` 为第二份最终实际Active合同。不会让最后一次循环把主合同ID替换为第二合同。Root可直接复用其中project/otherProject/activeContract及原E21actor矩阵。currentApprover仍每次取实际记录并与已真实登录的身份比对，即使环境已知vp_owner也不跳过校验。

## D 准备及本人确认

D正式 `prepareProjectHandover` 已原子生成basis、contract/handover summary、实际confirmation/participants/todos；本example不额外制造D摘要。正式migration部署的D定义使用 `handover-confirmation`、`handover-controlled`、field rule `r4d-v1`，不能拿本例pricing定义冒充。

```js
const d = createHandoverUpstream32({
  project: contractResult.context.project, operator: actualProjectWriteReadActor,
  executionOwnerUserId: actualExecutionOwner.id,
  financeConfirmationRequired: explicitlyChosenBoolean,
  receiptJudgmentMode: explicitlyChosenMode, // project-aggregate / contract-separate
  participants: actualAssignedParticipants,
  // 每人只出现一次，responsibilities支持真实兼任；含唯一execution-owner、
  // sales-owner(须等于实际project.ownerUserId)、business-admin、technical-support，
  // financeConfirmationRequired=true时再含finance。
}, { request: h.request, resolveParticipant: rootActualLoggedInActorById });
const dInitial = d.manifest(); // 5阶段not-run，rebaseline另标not-run
const dResult = await d.run();
```

D顺序是GET真实contract-handover sourceHash/projectVersion→正式prepare→逐参与人本人session确认同summary/basis与最新confirmation rowVersion→操作人最终确认全部实际person-role集合→两种detail读回同一current。兼任人员只本人确认一次，最终职责按真实返回responsibilities逐项展开。不得在finalize请求里直接填confirmed代替本人调用。

最终D confirmed仍应 `closureStatus=handover-confirmed-freeze-pending`、`executionAdmission.allowed=false`，不声称R5同链有效提成角色冻结/正式执行准入完成。D7中的再基线化提供 `rebaselineRequest32` 纯factory，只有Root已有真实effective amendment回执、实际新baseline、当前handover basis/hash/version及受影响真实frozen item IDs后才能调用；没有这些producer就保持not-run，不能SQL插amendment或假included/snapshot。

## schema06 后需注意的当前差异

本目录 `bundle32.json` 固定本次读取的joint06与Root当前public spec原sha，并逐项保留schema差异，不把静态读回说成运行结果。

- 本driver所用operationId/path/method与joint06无变化。D若干UUID字段由生成器补出正式pattern，ConfirmProjectHandoverRequest当前明确additionalProperties=false；其required顺序调整没有新增/删除必填字段。所有D请求仅使用冻结字段。
- C发票create/update当前明确additionalProperties=false；显式currencyCode已在schema06冻结，不接受额外自造currency/source字段。无合同新发票必须显式币种；合同绑定可用真实snapshot→preparation证明。E21已有两条真实路径。
- Expense/ActualCost summary当前语义与joint06一致：raw兼容值null、敏感值经正式projection；不是恢复raw金额的理由。
- E04/C/F必要增量是私有来源证明与业务一致性：正式completed、每笔confirmed付款均CAS递增应付版本、锁内真实confirmed net SUM捕获、严格total增+version增/core不变、最近认证锚点链；无新增公有DTO字段，不能在adapter添加paid别名。
- LABOR create/replace的计算前labor敏感读、审计包读保护及仅投影GET的auth/securityevent共同flush由Root现集成承担；财务管理不是敏感读授权。这些是G2受控澄清，不回写G1或旧证据。

编译证据见 `compile32-receipt.json` 与原始stdout/stderr：Rust1.99.1 offline check真实应用库依赖，退出0，未运行binary/DB/HTTP。JS仅node语法及静态manifest检查；无fixture假回执、无实际服务计数、无G3/G4认证。
