# cleanup125a：Root140 剩余来源纠偏

125 和 manifest125/validation125 全部原件保留。125a 只新增同目录后缀文件，消费原125构建器的实际结果，仅能从该结果的精确 `unclaimed` PK 集合补证，不改变 baseline、counter、core70、产品或旧103。

Root140 实际只读 plan 已报告 Rust 2673 新增、2634 claimed、39 unclaimed（34 audit、5 receivable_plan_node）、counterIssues=0；Native 新增和计划均0。该时点还没有 Rust 可 apply 计划，也没有 DML。公开 `cleanup-provenance140.json` 仅是来源诊断，不能当作125a实际 ledger。

本次只补两类：

- NULL request ID 审计使用11种冻结 `(event_type,target_type)` 组合，逐项核 metadata.schemaVersion/operationId/projectId/contractId、精确 typed owned target/所属项目/合同/准备或确认链、真实 actor、POST route 和 occurred_at 请求窗口。reviewDiff、createReadiness、initializeSnapshot、submitReview、activate、D prepare/participant-confirm/final-confirm/rebaseline 分开处理；未知 event 即使等于某个 operationId 也不放行。rebaseline 的旧 target_type 是 `project-handover`，其 UUID 实际绑定 `contract_handover_rebaseline_record`，必须校 source/replacement handover、basis、amendment 和反向 record 指针。
- 5条无时间 receivable_plan_node 的父 plan 实际由 `ContractController_activate` 创建；只接受父原 receiptIds 中同一已成功 activate、精确合同 route、实际 returned plan UUID、父 created_at/initialized_at 窗口和初始化主体。不得用后来 GET、另一个 activation 或任意同合同请求认领。

`rules125a.mjs` 和 `ownership125a.mjs` 是纯函数；`ownership125a` 复用原125并只扩充严格证明的剩余条目。`io125a` 仅替换输出 namespace，其余原始读取/逐SHA校验协议复用125。`cleanup125a` import新的纯构建器；作者只检查语法，未执行入口、读取 private、连接DB或发送HTTP。4项新增正反例及原20项纯测试通过。

## Root 导入

保留现有125目录；只导入 manifest125a 的8个新 products 和 manifest125a 本身，逐 SHA/bytes 验证。`baseManifest` 与 `immutableBaseProducts` 绑定全部已封存125原件，`publicSourcePins` 绑定140诊断及实际生产源码。静态捕获命令：

```text
node tools/rust-r4def/E/cleanup-wrapper125/capture-manifest125a.mjs E:/projects/worktrees/poms-r3hijk-next28/poms
```

它只检查公开源码、纯测试和入口语法，并向本包新写 manifest125a/validation125a，已存在则停止。

## Root 实际只读重建

以下由Root执行，作者未运行。全新edition；旧140bundle仅用于已核当前实例和状态的实际归属重建：

```bash
node tools/rust-r4def/E/cleanup-wrapper125/cleanup125a.mjs \
  --allowRootExecution --mode=plan --edition=145 --backend=both \
  --baselineTimeZone=Etc/GMT-8 \
  --input=/home/wangzishi/.local/share/poms-r4def/private/cleanup-wrapper125-140/bundle125.json \
  --inputSha=3bc032bc556117d815fbc0eda440abdde851efd8529ed37dd66af0c0e7d76df3
```

不带input则Root重新读取最新完整快照并严格验证 quiet window。输出目录 `cleanup-wrapper125a-<edition>`，private `bundle125a.json` / `source-snapshots125a.json`，public `receipt125a.json`。plan不执行DML；存在任何 unclaimed/counter缺口都没有可apply计划。apply/verify只接受125a自己新生成且已审的bundle，仍执行冻结core70的停止/端口/同事务seal/120表锁/逐PK完整行guards及双no-op协议。

125a作者侧真实 ledger、行planner、DML、借用恢复、双no-op、G3/G4仍未运行；能否闭合39条以Root实际结果为准。
