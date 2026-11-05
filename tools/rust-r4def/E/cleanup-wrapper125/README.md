# cleanup-wrapper125：精确来源纠偏候选

本包只在 `tools/rust-r4def/E/cleanup-wrapper125/**` 内新增和修改。作者仅检查公开源码、公开投影及纯合成规则；没有读取 private、连接 DB、发送 HTTP、执行 cleanup 入口或生成真实 ledger。产品、Root、Git/GitHub、旧 103 和冻结 core70 均未改。实际剩余未认领行由 Root 的只读重建决定。

125 修复 UI request ID 的 response header fallback；为无 request ID 的平台、storage provider、K checklist 审计建立封闭的 event→operation/type/target/actor/window 规则；ContractReadiness 的归属 domain 包含真实 amendment；无时间字段的七类子表绑定其已证明父记录的同一创建命令。`initialized_at` 作为真实时间字段参与归属。

附件必须由已 owned 且 completed 的真实 upload session、完整 complete ACK、成功 PUT 原始 body 的 SHA/bytes、实际上传窗口及相同 uploader 共同证明；`attachment.created_at` 等于 session 的 `uploaded_at`，不扩大为跨请求窗口。继承 link 再核 ACK 中的完整 link tuple。D confirmation/participant/todo 核正反指针、项目及已证明职责名单；F evidence 核 typed target 的反向 evidence 指针、该类型的精确生产 operation、request ID、actor 和时间。匿名 foundation 仅允许固定 agent、同一 authenticated-full run UUID、固定两个源码请求位置 `:6`/`:21`、精确事件和 foundation77 实际窗口。上述严格路径受保护，不能经通用 response-ID、FK 或 NULL-audit UI 分支绕过。任何未证明行继续 unclaimed。

`ownership125.mjs`、`rules125.mjs` import-safe；`io125.mjs` import 时只定义函数。`cleanup125.mjs` 是 Root 执行入口，作者只做 `node --check`。为兼容旧协议，内部保留 `103` 导出名，并额外导出 `normalizeHTTP125`、`buildOwnership125`、`diagnoseRows125`、`sanitize125`。冻结 planner、nullable cycle 白名单和三个借用原件授权仍只由 core70 管理。

## Root 导入和静态核对

把 manifest 的全部 products 原样导入 Root 同名 `tools/rust-r4def/E/cleanup-wrapper125/` 目录，逐文件核完整 SHA/bytes。运行依赖仅为既有 `../cleanup70/core70.mjs` 及 Root 旧 103 的冻结 `operation-authority103.json`、`number-specs103.json`；入口会校其完整 SHA。`publicSourcePins` 绑定公开投影125/127、旧 io123/cleanup123 和实际生产源码。投影中的337未认领、3012 HTTP、30 completed sessions、158 claimed parents只是旧124时点诊断，不是125 ledger或认领结论。

仅静态核对可以运行：

```text
node --test tools/rust-r4def/E/cleanup-wrapper125/rules125.test.mjs tools/rust-r4def/E/cleanup-wrapper125/ownership125.test.mjs
node tools/rust-r4def/E/cleanup-wrapper125/capture-manifest125.mjs E:/projects/worktrees/poms-r3hijk-next28/poms 125
```

capture 只读列出的公开源码并向本包写新的 `validation125.json`、`manifest125.json`；不导入或执行 cleanup 入口。重复捕获用新后缀 `125a` 等保留旧原件。

## Root 实际只读重建

以下仅供 Root，作者未执行。edition 必须全新；保留旧失败和124原件。

```bash
node tools/rust-r4def/E/cleanup-wrapper125/cleanup125.mjs \
  --allowRootExecution --mode=probe-plan --edition=136 --backend=both \
  --baselineTimeZone=Etc/GMT-8
```

也可传旧103的实际 private bundle 和完整 SHA 进行重建；路径和 SHA 均由 Root 从真实原件取得：

```bash
node tools/rust-r4def/E/cleanup-wrapper125/cleanup125.mjs \
  --allowRootExecution --mode=probe-plan --edition=136a --backend=both \
  --baselineTimeZone=Etc/GMT-8 \
  --input=/home/wangzishi/.local/share/poms-r4def/private/cleanup-wrapper103-124/bundle103.json \
  --inputSha=b8f7bc339492a34a166f2971bf41a626409f0d1a879666b2191d38f9f81333b3
```

只有 Root 已核旧原件和当前实例一致时才消费旧快照；它不会把旧 seal 声称为最新状态。API collector 读取实际 `api32`、`api53`、`api7802/7803/7804/7805` 及真实 UI 原件。UI Cookie 仅在内存关联主体；binary witness 仅由逐 SHA/bytes 读取原始 body 后生成。public report 不输出 raw rows、密码、cookie、token 或 storage key。

125 输出到独立 `cleanup-wrapper125-<edition>`，公开 `receipt125.json`、private `bundle125.json` 和 `source-snapshots125.json`。probe 永远 execution-ineligible；未认领或 counter 缺口时不生成可 apply 计划。要进入实际清理，Root 仍须另做 stopped/latest 的 `--mode=plan` 并审阅；apply/verify 只接受125新 bundle。全部120表锁、同事务 reseal、逐PK完整行 guards、COMMIT ACK、双新连接 no-op 和未知 COMMIT 禁止重放协议沿用冻结 core70。

不执行 `SET timezone`；严格记录并验证 `Etc/GMT-8`，保留原始 timestamp literal/fingerprint。不自动停服务、处理 objects、删 main DB、改变约束或扩大借用恢复。真实归属、实际行清理、恢复、双 no-op、G3/G4 均仍待 Root 实测。
