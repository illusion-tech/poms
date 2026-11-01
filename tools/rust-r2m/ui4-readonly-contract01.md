# UI4 上传 locator 与原项目只读 GET 小增量

原 attachment-panel.ts 的上传 p-button 使用动态
label。只把脚本该一次上传调用改为 dialog.getByRole(button, name 上传, exact
true)，不改产品、其它按钮 helper、timeout、断言或重试。

项目页原 sales-follow-up panel/store 默认
includeHistory=false、lifecycleScope=active；sales-intelligence panel/store
同时发四个原列表 GET。只为 UI4 增加这五个具名原 Native
GET：sales-follow-up-records、opportunity-stakeholders、competitor-intelligence-records、sales-discovery-records、sales-intelligence-gaps。原
controller/permission/service/repository/panel/store/contracts 十一源逐 raw hash
固定。

实际每请求在原 uiExchangeIntents 准入路径验证：method GET、journey
UI4、projectId 只等 prepared.handover.project.id 且由已有 independentlyVisible
创建证明认证；只接受一个 projectId。followup 仅另一个
lifecycleScope=active，另外四项只有 projectId；拒 lead/customer/重复/额外
query、非 canonical 编码、fragment、换项目、未认证项目与其它 journey。未新增业务
intent、write table、Rust115 路由或响应 fallback。

这五个原 GET 只读取查询/映射。K 原 project.customer_id=NULL 使四个
sales-intelligence 查询可能按原 requireOpportunityContext
返回400；保原状态/错误/UI提示，不构造新 customer，不伪200，不将背景读取扩成R3
gate。全原HTTP/SDK/PG/full107证据仍照原owner保全。

原件与旧派生八body、旧两个profile33 tag均保全。三个 original 源是
browser、ui-runtime-sources、fixture-ui-package-intent 的两个 source
pin；fixture-profile 源本身不改，动态 sourceSet 仍33件但新hash。新 c01
三件候选在 ui4-readonly-c01-candidate01，full original/environment/hash inverse
在 generated01，另外94件派生不变。未安装到实际派生97/未改Linux；Root先用旧33完成
uin4c01a late恢复，再按三候选及新完整97pins同步/新cap/新UI admission。旧33
journal不拿新sourceSet重开。

九个新纯测试和既有51+7测试共67通过，7文件syntax/lexical全0；早期两个Fake测试缺字段/async包装错误日志保留，无实际I/O。旧modifier67只证源码/受控协议，不证UI、Windows、G3/G4。
