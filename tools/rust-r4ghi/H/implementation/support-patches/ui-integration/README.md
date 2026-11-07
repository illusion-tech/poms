这组候选只写在 H 独占提案目录，Root 单写接入。没有新增 HTTP、修改数据库、签署 G3/G4 或关闭任务。

`proposed/` 有十个产品候选：三个旧文件最小差异（路由、I 子组件内部上传选择态、AttachmentStore create-session context 透传）和七个新页面/适配器文件。`ui-integration.patch` 与 `manifest.json` 提供逐文件原始/候选 SHA。先校验原始 SHA，再应用候选；源不同应重基候选，不能覆盖 Root 新变更。

默认 `projects/:id` 先走严格 ProjectDetailScopeEntry。FullProject 才挂原有详情并给中央办理入口；CreatorFirstAssignment 只有首次指派，所有人选和组织来自真实 owner reference；LegacyOwnerAnchor 只有基础锚点。中央页 `projects/:id/governance` 在相同三分支之后，按用户选择分别挂 G 编制、H 复核、I 生命周期和角色冻结，未选择事项不预取对应来源。现有原详情的完整 TypeScript/生成 SDK 适配由 Root 全 app 检查覆盖。

`projects/:id/condition-tasks` 独立于 ProjectWorkspace。子组件明确首先调用 completion list；不自动取 ProjectDetail、timeline、financial、project 附件 list/history。上传闭合证据从本次真实 TaskRow 取 completionRecordId/conditionId，经既有 R2 upload session 的 `completionConditionContext` 传递。adapter 的待办白名单和服务器双 UUID fresh proof 均须成立。原 task 冻结证据和新上传的真实 link 可精确下载；不创建附件行版本。I 的专用 Session 三字段外键和服务器路由支持是 Root corrective18 前置，尚不能把这份 UI 提案当作已通过端到端闭环。

回款表单先读真实合同和回款，再调用既有 unified-accounting GET 的 `view=preparation&intent=receipt-basis&receiptId`。选择项只来自 G delta05 的 ready Term/真实 Commercial 成员和 Attachment refs。若有合格 Commercial 成员优先只给该真实币种来源；无成员但 ready 的 Term 自身币种资格已由 G 证明。浏览器不计算净税、不填写 UUID/hash/税率/币种、不猜 latest。附件名来自完整项目范围内既有 R2 列表并与 sourceRows 白名单相交，包含该真实合同目标；本人任务路由完全不走这条列表分支。上传分类使用现有启用字典的 delivery/acceptance/finance，未启用即停止上传。确认按服务器 ref 版本/hash 和合同版本提交，历史补证要求真实附件，已有 ready basis 不能覆盖。

执行准入 sourcePayloadHash 使用 D handover detail 顶层的真实移交 payload hash；role freeze hash 是不同 authority。角色须 current/frozen/verified 且匹配同一移交和 summary。当前只有 project:write 而没有 commission:assignments:manage 的执行负责人无法读取既有 frozen role ID/version；候选对此保持禁用并说明缺少真实依据，Root 需裁决同一个既有读接口的可用投影，不能让 UI 猜字段。

真实运行证据：`check-facts.cjs` 的20项纯 UI 请求组装单元断言通过，fixture 都经过实际 canonical schema；该结果不等于授权/HTTP/数据库验收。`check-ui.cjs` 使用实际 Angular22、Root canonical、真实三 Store 和当前旧 SDK 的虚拟编译 overlay，没有写产品。最近结果13诊断：三新增 method 仍不存在、G 旧请求仍要求客户端金额、旧 TypeScript enum 名义类型与 canonical literals 不兼容、旧 create-session type 缺 context。已修正候选自身的模板/类型问题；当前3个目标树的 Angular template diagnostic 为0，但整个编译仍失败，不能称 UI build 通过。完整原详情入口、全 app、actual upload/HTTP/UI 由 Root 生成新版 client 后验证。

生成 SDK 后须逐项对齐实际 request 参数和 enum 类型，使用实际枚举值检查/转换，不能加 any/as-cast、optional 化 required-null 或丢弃现代字段。随后重跑这两个检查和 Root 全 app build/UI。脚本保留实际 compiler diagnostics，不会将预期的旧 SDK 错误过滤成成功。

`readonly-reviews/workspace-scope05.json` 是另行授权的 G 两候选非作者静态复核，结论仅静态 PASS，未执行 cargo/HTTP/PG。
