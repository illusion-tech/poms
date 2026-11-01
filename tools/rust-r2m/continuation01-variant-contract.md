# continuation01 finite literal variant

`tools/rust-r2m-continuation01` 是 96 件、约 1.83 MB 的有限 source
closure，基于最终 Source10（eeeb1e43…）及其 C review b171ea0b…。没有复制
private、运行树、旧恢复入口或 QA provision。原目录与旧 cap/journal/review
不改。完整原/新字节、hash、每一次精确 literal/hash 替换和完整逆向证据保存在
`continuation01-variant-generated01.json`，另有 59 件变更的完整文本 diff。

只有环境身份变动：不同名 DB pair、lowrole、marker、control schema、新
private/state/object 根、public evidence 根、sibling 工具路径和固定 profile
名称；引用实际映射文件的 hash 才沿依赖图重新计算。任务业务 namespace 仍是
`poms-r2m`。产品源码/二进制、291/115 边界、请求/SQL/selector/权限/证书/owned
union/完整107/清理/clock/opaque
协议全部保留；所有未映射字节均可逆回原完整源码。新旧 loader 分别拒绝另一侧
DB/private/marker，禁止 ambient DB/MIKRO/PG/JWT/NODE_OPTIONS 覆盖。

API 入口是 `tools/rust-r2m-continuation01/run-api-owned.mjs` /
`acceptance-api-runtime.mjs`，原八个位置参数顺序不变（最后为 package-item
admission）。Root audit/setting/package admission
必须用新数据库名、marker、run/cap 与 C 本次 **derived 文件 pins**；不能拿旧
helper 约定的 SourceReady hash 冒充新路径。新 matching cap 由 sibling
`capture-source.mjs` 生成，同时收原公开 source provenance 与新 sibling；旧 cap
不重写。

```sh
node tools/rust-r2m-continuation01/capture-source.mjs <fresh-epoch>
node tools/rust-r2m-continuation01/run-api-owned.mjs \
  <nest-or-rust> api <fresh-tag> <fresh-epoch> <finite-selection> \
  <optional-setting-admission> <audit-admission> <package-item-admission>
```

本次 C SourceReady 目标是当前 M4/M5 API 及环境映射。已包含 Linux full
UI、Windows UI/Native 源闭包，但 **UI4 package Max64 的专项预约仍 Pending**；API
的 M4.2/Max10 许可不授权它。UI4 实际之前再补独立 source
delta/epoch；不要求重跑已合格 Linux UI1/2/3。Windows 是实际 Windows Native +
Windows browser 或 Windows browser + Linux Rust 两种真实
arrangement，不能用浏览器平台替代 API 平台。

Root 实际输入/资源：

- `poms_r2m_c01_nest` / `poms_r2m_c01_rust`，role `poms_r2m_c01_app`，marker
  `abd093b8-c584-45b3-9c62-6357ad6dfa5d`，schema `r2m_c01_control`。
- `/home/wangzishi/.local/share/poms-r2m-continuation01/private/{nest,rust}.env`
  与维护 owner-password 来自已审 provision/固定续建；新 JWT/app
  password，原失败图不连接、不认领。
- 新
  `target/release/poms-api-rust`，957fcc17763aaba3fa6d4093d9251d1935fcabe500e6bbfd9c80d90ae8f8e9cd；`target/release/examples/m_shared_uow_probe`
  b2325368a2a885a6b40a7fb16410632a7ff59ea1f0eaa4e95b79ff01c8f00294；`m_number_probe`
  aa199d34f724f8e5abae26ddae6bac229a521bff0410ca3916d7391c3fafcc40。capture 固定
  pin 三件，probe 仅具名 internal 操作才启动。Root 只 stage 这三件，不复制
  target 树。
- Linux Native 仍为原 `dist/apps/poms-api/main.js` 2958081 B /
  0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4。Windows 同一
  bytes 由 Root stage 到
  `tmp/rust-r2m-continuation01/windows-native-bundle/<0efSHA>/main.cjs`。
- `tmp/rust-r2m-continuation01/ui-build-current.json` 是 Root 已验证的同源 build
  元数据副本；551 个原成员与 `dist/tools/rust-r2m-ui-current/browser`
  目录保持原位。Windows 通过原有限 UNC build 读取，不复制整树。
- Linux browser/cache/libs/fonts 的固定根移到新 state 的 `browser-*`。Root
  负责已 pin 成员 stage 与新 fontconfig 两路径 literal/新 pin；没有从旧
  private/profile 补文件。Windows browser 仍需原已审平台/Node/browser pin
  与各次真实 PID/start/driver ACK。
- OBS 为 node:http 双 127.0.0.1/::1:10091，不使用 TLS key/cert；每次 tag 的
  control token/blobs 都新生于新 private。Feishu 为 HTTP10090，每次新 private
  plan/control；原公开 synthetic seed 登录来自 pinned
  `dev-platform.fixtures.ts`，无需旧 private 凭据。
- Windows env 派生使用 sibling `windows-native-environment.mjs`，只把新 nest.env
  的新 local-root 行转换为同新 namespace UNC 路径，Linux源 env 原字节保持。

A 仅生成公开源、静态检查和 Fake 测试。没有读取任何 private/env 文件，没有执行
DB/HTTP/browser/container/实际进程 owner；C 源审后 Root 才同步两端完整 matching
epoch、按单 writer 组实际运行。实际/G3/G4 尚待，原失败和其精确恢复均独立保留。
