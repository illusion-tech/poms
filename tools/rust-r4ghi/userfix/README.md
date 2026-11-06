# #115 用户创建修复真实验收工具

本目录只提供 Root 审查后执行的工具；作者未连接 DB/API、未启动进程、未清理数据、未改产品或 Git。Root 实际运行的结果以本轮 `tmp/rust-r4ghi/userfix/<epoch>/<run>` receipts 与同 namespace private 原件为准，不把本地语法/纯函数测试称为真实验收。

固定环境：Debian WSL、`poms-r4ghi`、PG15 `127.0.0.1:25434`（服务端 15432）、双库 `poms_r4ghi_native/rust`、marker/source base `aaa4b16a…`、`poms.r0e_isolated=on`、`Etc/GMT-8`。API 仅 `127.0.0.1:31441`，Origin `http://127.0.0.1:44551`。不读旧 private、不改时区/容器、不接受环境中的任意 DATABASE_URL。API 生命周期由 Root 的现有工具负责。

## 状态与已发现工具错误

- createUser、createRole、createOrgUnit 的真实成功均 **201**：分别由 Rust `http.rs` 的 W01 Native 绑定、`roles/http.rs`、`org_units/http.rs` 明确 `CREATED`。Swagger 的 200 是既有声明差异，保留标签；不能据此断言实际 200。GET、activate/deactivate、auth login/current 使用其单一已登记成功状态 200。
- 初版 baseline 的 `array_agg(name)` 得到 `name[]` 字符串，已改为 `text[]`；原失败目录/partial 不覆盖。成功 baseline 使用唯一 `baseline-<driver label>`，写 `state.baselineLabel`。
- smoke01 的首次 createRole 真实 201，被初版 200 断言截停。原成功响应不能被改写为失败或重发覆盖。独立 `reconcile-roleA` 只处理 Root 提供的精确 `uf1222fe274c-00008-http-a4317413` 原件：空 before locator、实际 201+UUID、自然键、原字节 hash、baseline 不存在、当前 role 与真实 create audit/operator 全匹配后，仅补本地 journal 与 fixture 指针。不发 HTTP、不写业务表，保留原 partial。

## Root 执行顺序

在 `/home/wangzishi/projects/poms-rust-r4ghi` 中运行下列命令；入口是 Windows 工作树的工具，不需要复制旧环境或启动额外服务。这里的 `userfix115/run01` 是 Root 当前原始 evidence epoch/run，不要换 run 隐去既有 partial。

```text
node /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/userfix/driver.mjs preflight --epoch userfix115 --run run01
node /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/userfix/driver.mjs baseline --epoch userfix115 --run run01 --phase baseline-retry
```

**Root 当前已经成功 baseline；不要再执行上述 baseline。** 对当前 partial，Root 审查后执行：

```text
node /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/userfix/driver.mjs run --stage reconcile-roleA --epoch userfix115 --run run01 --phase reconcile-roleA01
node /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/userfix/driver.mjs run --stage smoke --epoch userfix115 --run run01 --phase smoke02
node /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/userfix/driver.mjs run --stage faults --epoch userfix115 --run run01 --phase faults01
node /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/userfix/driver.mjs run --stage pending --epoch userfix115 --run run01 --phase pending01 --throttle-seconds 60
node /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/userfix/driver.mjs run --stage races --epoch userfix115 --run run01 --phase races01
```

`--throttle-seconds 60` 必须与 Root 实际 API 配置一致；当前配置源码默认 60。工具自然等待真实 session.last_seen_at 节流到期，不 UPDATE 时钟或 session 伪造 due。两笔 pending actor 先真实登录，再分别证明 raw touch 与 managed flush。每 phase 保存当前全部 helper `.mjs` SHA；产品 pins 全程锁定，状态源码另有不可变 hash receipt。已通过阶段不可在同 run 覆写；失败/partial 保留，换明确 phase 只创建新的尝试，不抹旧状态。

smoke：六种成功形态、typed UUID 重复/大小写、404/409/格式、401/403/CSRF、同用户名并发；角色/组织 fixture 都经现有 HTTP create/deactivate。成功用户的实际 PG 关联/create audit 和 HTTP getUser 的 primaryOrgUnitId、roleNames、orgUnits 一并核验。并发 409 只记观察；必须由本轮实际 201+生成 UUID 建立 birth，journal 保存原实际 status 和 sharedCaseKey，不伪造 409 创建确认。

faults：user/role link/org link/create audit 各注入 P0001 和非用户名 23505，再追加 audit 上伪装用户名约束的 23505，均应 500，去 FI 同 body 重试 201。pending 单独两种 SQLSTATE。SECURITY DEFINER 函数仅在自有 control schema，固定 `search_path=pg_catalog`；非事务 sequence 证明实际命中，错误回滚不会抹去命中证据。

真实边界：认证 raw touch 在业务前独立提交，可能已 `row_version+1`；用户、关联、create audit 和第二 managed session UPDATE 整体回滚。pending hook 只在 last_seen_at 不变、row_version+1、当前业务事务已插入目标用户时触发；序列和整库前后快照一起证明。允许的唯一失败后变化是准确 session 的已证 raw touch 字段/版本，不声称整个 HTTP 请求没有持久副作用。

races：role/org 各两次真实 HTTP 停用顺序；advisory trigger 只做门控。必须观察首请求 advisory 等待与第二请求真实 `pg_blocking_pids` 直接阻塞、实际 wait_event。create 先持 FOR SHARE 时停用等待且 create 201；停用先持更新锁并提交时 create 409。缺任一实际等待证明就是 partial，不用调度时间猜测。

## 原件、journal 与清理

所有 HTTP 配置 headers/body、响应 raw headers/body、完整失败、PG 原始行与证据保存在新 private。公开仅 status、UUID/计数和原字节 SHA，不发布 password/cookie/token/业务行内容。行保存为 `row_to_json(t)::text` 的原字符串；PK/FK 值单独 `::text`，绝不 JSON parse→serialize 数字金额。每库原始 120 表、PK、FK、catalog、owner/ACL、trigger/function、sequence 均 baseline，每阶段有增量。HTTP 的字节边界是 Node 已配置 header 表示与 transfer-decoded entity bytes，不伪称 TCP wire capture。

journal 只登记实际响应 ID+自然键、真实用户的子关联、确切 target/event 的 audit、token hash 绑定 session 与 requestId 绑定安全事件。baseline 行不得被领为新增。新增 scan 行没有 birth 证据不能自动删除；已领行当前 hash 不符也阻断。预置 seed 仅明确借用实际 admin/viewer，恢复字段白名单 `last_login_at/updated_at/row_version`。

Root 完成所有验收后生成 dryrun：

```text
node /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/userfix/driver.mjs plan-cleanup --epoch userfix115 --run run01 --phase cleanup-plan01
```

从此 run 不再准入新业务写。Root 审查 private plan 原字节及公开 blockers/count/hash，停止 API，取得真实 lifecycle receipt，然后才执行（占位符需替换为真实值）：

```text
node /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/userfix/driver.mjs apply-cleanup --epoch userfix115 --run run01 --phase cleanup-apply01 --approved-plan-sha PLAN_SHA256 --api-stopped-receipt ACTUAL_STOP_RECEIPT
node /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/userfix/driver.mjs noop --epoch userfix115 --run run01 --phase cleanup-noop01 --api-stopped-receipt ACTUAL_STOP_RECEIPT
```

当前 stop receipt 校验接受新 namespace private 或 `tmp/rust-r4ghi` 内文件，要求 `kind`、`namespace=poms-r4ghi`、`processGone=true`、`portFree=true`、`port=31441`、实际 pid/binarySha256/capturedAt。另与新 private `rust-api01-process.json` 的 namespace/root/port/pid/binarySha256/startTime 绑定；实测 PID 消失、31441 拒绝连接、双库 app-role 连接为 0，receipt 与 process record 原字节 hash 一并保留。不能手造 approval flag。

apply 先确认 native 库仍全原字节一致；对 Rust 全表按固定序加 EXCLUSIVE lock，逐 PK 复核当前 raw/sha，再按**行级** FK child-before-parent 删除，不用 CASCADE、不按窗口删除；借用行只按允许字段和当前 raw 条件恢复。自有 FI 函数/触发器 OID/定义/ACL、control relation identity/config 均精确核对后移除。现有 sequence 漂移没有 producer 所有权就阻断，不猜 setval；仅移除本轮精确自有 FI sequence。最终原 120 表及逻辑 catalog/ACL/trigger/function/sequence 与 baseline 在提交前一致，提交后再用两轮新连接做 noop。未知 commit 失败保留 partial，不自动重试删除。

## 本地无网络检查

`node --check` 全模块；`node --test tools/rust-r4ghi/userfix/pure.test.mjs tools/rust-r4ghi/userfix/status.test.mjs`。这些只核原始金额精度、行级 FK 顺序/环拒绝、路径守卫及真实 CREATED 源码绑定，不连接环境或产生业务结果。SQL/FI/锁/清理仍需 Root 审查与真实执行，作者不预先认证。
