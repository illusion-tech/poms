本候选只调整 Windows 测试输入容量和一个既有导航的等待，不修改产品。

旧 wr2c09a 的原事实是：第一次 fill75s 超时，完整 DOM 只有 app-root；auth initializer 的 navigation14/todos15 在原失败后完成，系统设置列表 GET 根本尚未发出。候选不把旧运行重标成 list 已返回，也不把此现象归为产品 DTO 缺陷。

原 app.config.ts 的 provideAppInitializer 等 AuthStore.initialize；其中 acceptAuthSession/loadUserData 等原 navigation/todos。初始化后 SystemSettingList constructor/reload 才通过 SystemSettingStore.loadSettings 发出原 GET /api/platform/system-settings。loading 结束且找到 attachment.max-upload-size-mb 时才创建原输入框。

仅 Root 已证明的 windows-external-rust、browser win32、API rust/linux、单 UI2 输入会在原 goto 前注册该原 list GET。固定150000ms整体窗口包括尚未发出 GET 的 bootstrap 阶段及完整 response.finished/body；必须真实200、JSON数组、canonical key恰一项、valueType integer、value/rowVersion为整数。随后执行完全未改的原 locator.fill、Tab、保存 enabled75、原 PATCH 和200断言。没有新请求、重试、假响应、selector替换或 ownership。Native、WindowsRust UI1/UI3/UI4、Linux参数形状不变。原 Native UI4 readiness/helper 完整保留。

独立 operator 输入仅对显式 Rust Windows 单 UI2/UI3/UI4：outer1800000、pipeline1500000、sourceGuardReserve480000；bridge=min(840000,1500000-真实preparation-480000)，driver=min(780000,bridge-60000)，不足1000仍拒绝。outer cleanup300000、startup60000、expect/transport75000、Native所有profile、RustUI1、undefined legacy、Linux不变。只修改相同已有 command owner 的 backend/journey最大准入表达式；原PID/nonce/argv/group/Stop整个尾部字节完全不变，原abort/deadline错误保留。

原900pipeline的 partial1004.621s 与 outer1200 deadline失败原件保留。此为有界 operator 容量，不是产品性能或超时成功保证；视图150失败、真实非200、body/typed不符、driver780、bridge/pipeline/outer超时都仍失败并保留证据。

新 browser raw pin会同步窄 UI package helper；fixture33只有该helper成员改变，Root新C review、同run准入和新cap必须绑定新摘要。原1b701 profile先完成旧partial精确恢复；不得用新profile打开旧journal。原118成员中只有4个view runtime和2个operator runtime改变；旧112其余成员及全部旧失败/原69epoch测试字节保留。旧硬pin/完整旧body测试属于已冻结旧epoch，不冒作新epoch的测试结果；新专属测试证明完整逆变、真实UI2回调、旧pin拒/新pin过、有限预算与准入守卫。

最终只以组合121叶图安装；不单独安装仍pin旧budget的中间UI图。Root先恢复旧partial、确认无writer，再精确安装、正常检查、新capture、新UUIDs实际运行。作者未DB/HTTP/browser/host/private访问，未安装。
