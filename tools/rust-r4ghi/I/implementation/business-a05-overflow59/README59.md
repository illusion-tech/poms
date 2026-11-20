# A05 overflow 旧409保全、精确元数据恢复与新 public preparation59

本候选仅改 `a05-capture26.mjs` 的 overflow continuation（及一个纯 helper import），发布 MAX snapshot/H 的函数原文保持。另加六个独立工具/输入文件，不改 Rust、Shared、公共 contract、时间或既有业务事实。Root 当前 capture base 为 `54795d59e210d6ec7779aeb1b9648bde9aa2283401e19e474a0fba1a979396d2`。

## 已核到的原件

原 `003867-a05-overflow64-01-partial.json` SHA `dd5f8c9c1ae06d5a5fcf3f0f6aa35b93e58a72a7c3dc7ec3be69e71e13c6771a`。003935 canonical create snapshot 返回完整409、`operating_input_hash_changed`；003936 ledger 无 recorded、无 blocker。作者仅用已有文件逐行比对003935 before/after：两库278表、2974行 raw SHA/xmin均相等，catalog/序列/对象均相等，认证 touch 为0。见 `existing-409-inspection59.json`，没有查询数据库或发 HTTP。

`input` 是追加0.01前的真实 public preparation，已因新 receipt 成为旧 hash。该409是正确的先验证输入来源结果，不计容量422，不再重 POST。已提交 receipt/C basis、原 published MAX/MAX proof、原 `input`、原错误及全部账本均保留。

## 先做 metadata-only 恢复

Root 晋升后在无 driver.lock、无 active FI/blocked observation 时运行：

```sh
node tools/rust-r4ghi/business/a05-overflow-recovery59.mjs plan \
  /home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business11/main01/state.json \
  /home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business11/main01/overflow59-plan.json

# Root复核生成的plan/raw SHA后，才执行：
node tools/rust-r4ghi/business/a05-overflow-recovery59.mjs apply ACTUAL_PLAN_FILE APPROVED_RAW_SHA
```

plan/apply 均不创建 DB client、不发 HTTP、不读取数据库密码；使用已批准的同步 consumer adapter 重验当前 Source11/process/registry。工具重读 exact 003935/003936、实际完整 HTTP receipt、原 partial/C basis，重算两库全部行/xmin等价，核旧 input / extraCash 的 exact hash。apply 必须仍是 plan 绑定的最新整份 state raw SHA，不容忽略其它状态漂移。

只允许删除已证无业务写的 `/fixtures/a05Boundaries26/views/max-zero/stages/aggregate-overflow={phase:running}`，并在同一 `a05Overflow26` 下追加 `staleAttempt59` 的原件 pin和严格回滚证明。pure regression会复原这两个变动后检查其余整份 state逐值相等。无 blocked 清除、owned/borrowed rebase、旧 source 标签改写或回款重发。计划可在 Root 实际准备执行时按最新 state 生成，不提前绑定正在进行的其它验收。

## 再从真实 public preparation 决定阻止层

```sh
node tools/rust-r4ghi/business/run-a05-overflow59.mjs g2-business11 main01 200
# 或Root明确审核当前public preparation应直接422后：
node tools/rust-r4ghi/business/run-a05-overflow59.mjs g2-business11 main01 422
```

参数只选一个精确预期状态，不全局放宽 status。新 CLI 要求已存在本次 confirmed extraCash / C basis 和 `staleAttempt59`，重新真实登录 manager，绝不重新 POST receipt，仍由既有 boundaryStep 保存实际 step 原件。

- 选择200：在追加回款后再次通过真实 public preparation 得到 `freshInput`，保留旧 `input`；新 hash 必须与旧 hash不同，CAS、ref和决策均来自该次真实响应。只用 `freshInput.body` 发新的 capture，期待 capacity422。发请求前保存 starting marker，已发出的请求不能盲重试。
- 选择422：只发真实 public preparation GET，期待 `operating_money_capacity_exceeded`，验证完整422响应与全部回滚；没有可用新 hash，不发任何 capture。证明明确 `rejectionLayer=public-preparation`、`commandCapacity422Certified=false`，不能冒称 command 层422。

源码事实需要 Root 实际确认：当前 `preparation.rs` 499-513 在已有 baseline 的 snapshot-create 路径调用 `context::build`，只把部分 Conflict 转为 blocker，容量 CodedUnprocessable 会向外传播；`context.rs`1396会汇总 receipt 金额。因此不能静态承诺 fresh preparation 必200，也不能为了得到 command422 本地造 hash 或改后端检查顺序。实际返回与选定预期不同会保留 partial、停止并等 Root 精确对账，不自动切换状态或重发。

无论在哪层拒绝，均校验真实 capacity code，按既有严格 matcher核两库全部 raw SHA/xmin/catalog/seq/objects回滚，仅容精确请求 actor 的独立原始认证 touch。原 MAX published snapshot、金额和结论不改。

作者离线85模块语法、原81+新2 pure共83通过，两 CLI help 无 I/O；实际 metadata恢复/API调用均未由作者执行，不授予 G3/G4。
