# 剩余 Rust Windows UI4 原视图读取输入

状态：仅源码候选及纯检查；未安装，未运行浏览器、API、数据库或恢复。仅 Root 在旧 BCC/profile33 失败图精确恢复并完成独立源审后安装，随后新 cap、新 UUID 完整重跑 UI4。

候选只适用于 Root 已证明的 `windows-external-rust`、Linux Rust API、Windows browser、`selection=['UI4']`。Root owner 证明 SHA、sourceCap、origin、已证 project/handover 及 pagePath 精确绑定；不授予新行/对象所有权。整体运行模式仍 Rust，三处项目读取经原 `uiNativeReadModels` 固定分派到 Native，实际每请求证书必须保留该归属。

三个原调用点：upload 的项目详情导航、checklist-refresh-select 的合同承接导航、cancel-upload-dialog 的项目详情导航。各自在原 `page.goto` 前注册原 GET：项目详情只有 `/api/projects/{ownedProjectId}`；合同承接为 `/api/projects/{ownedProjectId}/contract-handover` 与 `/project-handover`。同一个 150000ms 总视图等待涵盖实际响应、`finished()` 和完整正文读取；真实状态必须200、正文为 JSON object，详情 ID/承接 projectId/handoverId 均精确等于已证输入。然后执行原按钮、上传、扫描/选择或取消，原75s expect/transport、完整业务断言保持。无额外 GET、重试、假响应或跳过认证。

独立 helper 与原 Native helper 机械同构，源包记录全文 inverse；原 Native helper、三个优先 Native 分支及其他模式的参数/结果形状不改。只新增 RustUI4 构造/可选参数与回执。Windows UI2/3、Native 已通过 cells、Linux、所有 operator/bridge/driver 容量、每 callback fresh identity、Stop/cleanup 语义不改。

真实依据为公开安全诊断 `wr4c10a-first-upload-diagnostic01.json`（96ef8a7d61fe6e757eb05555db174d9c42a4492b5cc351246278332a56f4d8e8）：原75s上传按钮超时，原 DOM 是项目详情 loading，原 GET17 完整200/2101B且 ownProject 匹配的 Root 同钟保留发生在失败后。该证据不是原 browser.finished 时刻、不是 DTO 缺陷或产品性能结论。原失败/全部 raw refs 与 cap10 保留。

UI package helper 仅 browser hardpin 同 epoch 更新；33-member fixture source set 只此 helper raw hash 改变。父/子 package intent Max64、真实 context/SDK/PG/typed-parent/commit 守卫不变，原 BCC 账本不得用新 profile 恢复。新124源码图包括原121、3新增 helper/test/本文；4既有 runtime delta 为 browser、driver、runtime REQUIRED、package helper。其余117原字节及 M3独立46原件保持。

纯测试执行实际 driver 构造/参数 AST 与三个生产 callback 的 Fake 页面正反例，同时核原 Native 全文 inverse、旧 browser pin 真拒/新 pin 真过、33源摘要。测试不启动真实 browser/HTTP/DB，不认证实际 UI4 成功；最终 actual 仍需完整六步、全部 HTTP/facts/cleanup/owner/PG 和独立 C 核验。
