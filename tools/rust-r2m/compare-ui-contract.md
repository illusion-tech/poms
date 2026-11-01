# R2M UI1/UI2 离线完整比较器（源审候选）

本工具只实现 UI1、UI2。最终输入为同 `r2m-joint23` 的 Native `uin12b` 与 Rust `uir12b`：每端七个步骤、76 个实际 HTTP 证书、73 个 UUID-owned 行及一个不拥有、不删除的迁移设置租约。计数、report/cap/late-final-ledger 的精确原字节 pin 位于独立 case-input，不是通用 UI 不变量。UI3/UI4 和 Windows 组合尚未由本工具认证。

作者只读公开源和 Root 的 sanitized metadata，运行纯测试及公开 `--check`；没有读 private、运行 DB/API/浏览器或改产品。Root 在 C 源审通过后执行 `--run`。每个 private 输入只从 report 明列的新 M `ui-runs/<backend>-<run>/NNNNN.json` 和另外具名的最终 `m-runs` journal 读取；最终 journal 是完成后的独立 late pin，不能声称原 report 已包含它。所有输入校验常规文件、非链接、原字节长度/SHA；原失败信息只写新 M 的专用 private 目录，公开输出无 token、密码、环境或原始错误消息。

比较保留以下边界：

- 每条原始代理请求/响应的完整 base64 bytes、长度、SHA、parsed/raw headers 一致性，必须与相应 actual-HTTP 证书逐字一致；再核实际固定 method/path dispatch、real context、原 Native SDK outer-COMMIT 或 PG INSERT/outer-COMMIT 的 epoch/xmin/独立可见性及原 source/profile。每个 step 的 network、证书 ref 与 report 的 step ref 完整相连。
- 每次 HTTP 和步骤的 before/after 都投影全部 107 表、所有物理列；所有 unowned/readonly 行必须与本侧最早 prepare 前基线完全相同，最终完整基线必须恢复。每个 HTTP 产生的实际 INSERT 都须有该请求的真实 PG 证书；Native 还须有对应原 SDK 证书。UUID alias 仅来自真实 direct/SDK/PG typed birth，既有 readonly UUID 保持字面值，不能用 query/response ID 创建 alias。
- 密码仅在实际本 run 合成 plaintext、bcrypt rounds4 验证成功后归一。session/CSRF hash 必须等于先前真实 Set-Cookie 的 SHA256，body token/实际 Cookie/header/物理 owned session 必须关联。登录 cookie 过期时间必须等于其物理 absolute expiry；GET CSRF 是实际匿名 TTL 或当前 session 最小到期时间。cookie Path `/api`、HttpOnly、SameSite、Secure、清除行为保留比较。
- 时钟仅限明确列出的 source runtime 字段和真实 run/frame 窗口、PG `+08:00`/最大6位与 DTO `Z`/3位。所有七个原 prepared Todo 固定时间和其他业务固定日期保持；唯一 idle expiry 只认已存 direct mutation 的精确 before/after 与 `-1000ms` 来源。原 draft customer/project 的短 run 名称，仅在原 source-plan 与 typed birth 值一致后映射那两个完整字符串，不泛替换短 hex。
- UI2 只使用原单例 `attachment.max-upload-size-mb` / `m2-ui2.attachment-max-upload-size`。必须核原50/v1完整行、真实 `{value:51, expectedVersion:1}` CAS、精确 after/observation/request bytes 和 v2、原行完整 CAS restore/外层 COMMIT/独立连接。复用 Root 的纯 `comparison-special-rows.mjs`，不获得 UUID ownership 或删除许可。audit JSON 的 updatedAt 只可对应已观测的实际版本。这里验证本次 UI 的正 CAS；没有冒称 UI 新跑了 API M2.2 的 stale409。
- wrong-CSRF 必须是原固定错误 header、真实403/`csrf_failed`，且该请求前后实际发送的 admin session 仍 active、CSRF hash 不变、没有 cookie clear/替换。viewer 的 RouterGuard 记录202与真实 users403也必须使用真实 active viewer session，403后还有真 GET session/authenticated200。原 Angular `snapshot()` 等式/authtrue 断言由已 pin 原脚本完成、对应实际 step observed；不声称另有未保留的 raw Angular snapshot。

功能响应头沿已冻结集合严格比较：`content-type`、已核完整 body 字节长度的 `content-length`、`content-disposition`、`x-request-id`。现有 Rust R1A 诊断头必须语法正确且本 run 唯一，新增 presence 差显式记录。其他框架/日期/连接头仍在完整 private raw capture 中，不宣称字节相等。请求比较原 accept/content-type/origin/referer、实际 cookie/CSRF 和条件 validator，其余原始请求头仍保全。

ETag 边界经 Root 明确裁定：逐 HTTP 输出真实 presence、原头 SHA 和实际完整 body（或原304已有 entity）验证观察；不默默删除观察，不宣称 Native ETag 与 Rust absence 相等。`cacheEquivalenceCertified=false`，不做缓存兼容或性能认证。新 profile 必须具备两个真实 CDP ACK（首导航前）和每个 exchange 的原条件头为空/未改写证据。旧 `joint17` cached case 独立保留；304 的 status/空实体/原条件行为严格比较，绝不把原11条 Native304/Rust200变为等价。

唯一 readonly DTO 时钟例外是原 `ProjectQueryService.listProjects` 的 baseline `project.createdAt`：先核原 mapper raw pin、该 DTO 与本侧最初 typed physical row 的确切时间相同，再给这个具名来源标记；不改/忽略原 unowned physical row，不归一业务 milestone 日期。

Root 命令形状（用最终 C manifest/input SHA）：

```text
node tools/rust-r2m/compare-ui.mjs --check --input tools/rust-r2m/compare-ui-case-ui12-joint23.json --input-sha <inputSHA> --manifest tools/rust-r2m/compare-ui-source02.json --manifest-sha <manifestSHA>
node tools/rust-r2m/compare-ui.mjs --run --input tools/rust-r2m/compare-ui-case-ui12-joint23.json --input-sha <inputSHA> --manifest tools/rust-r2m/compare-ui-source02.json --manifest-sha <manifestSHA> --tag joint23-ui12-01
```

公开结果：`tmp/rust-r2m/compare-ui-<tag>.json`。完整归一投影或原始诊断：新 M `private/ui-comparisons/<tag>/`（独占新目录/0600文件）。存在差异或必需证明失败都返回非零，保留原证据。

后续仅复用运输、107表、source/证书/opaque 基核：UI3 需新增真实提交/驳回/再提交与借用 VP 会话的 typed 状态判据；UI4 需新增 provider/null-audit、上传/版本/移交历史/敏感选项、真实文件对象、ZIP/CRC/manifest 的具名规则及独立清理证据。不得用当前 UI1/UI2 状态或宽泛 opaque 声明它们完成。
