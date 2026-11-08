Source13 的规范目录准入草案，尚未实施；当前真实环境仍为 Source12 / API135 / M97 / 每库139表。

先完成或如实封存 Source12 界面及 Native 独立阶段。任何已提交但观察器失败的请求须按实际 before/after、响应、唯一受影响行和 xmin 修复元数据；不重复业务写入。停止旧 API 前确认没有 activeFault、blockedObservation、未知 HTTP 或 Native 未清理影响，保留实际私有 state、完整源包、双库归档及对象。

M98 只允许已审核的65-02函数体替换与正常迁移登记。真实执行前后逐库比较：139表、所有原业务行及 xmin、所有原迁移行、OID/owner/ACL/角色/约束/触发器/目录/对象不变；函数只允许同OID的已审核 definition 变化，其他属性不变；迁移表只新增实际 M98 行，只有实际正常迁移所用序列可按已证事实前进。所有例外必须逐对象列明，不能删除字段后宣称整个目录相等。

原数据基线不得整体重置到当前已产生的数千行。为后续 Source13 比较生成明确标成派生的 schema comparison baseline：保留最初基线的所有业务表行文件和对象基线，只将元目录与 poms_migrations 表替换为经 M98 收据核验的真实结果；始终保留原 M97 基线 pin 和完整变更链。现有 owned/borrowed/对象归属及每个源的原始出生标签保持。这样 schema 登记属于新的规范基线，业务新增行仍由原来的真实 HTTP 归属证明解释，G4 不会误把这些行当原始数据。

需要独立审查的新准入规则应明确区分“业务数据保真”与“已授权规范目录推进”，使用新 schema/plan 版本或等强的显式类型；不能沿用 retained54 的全目录等价结论。新状态必须记录 old retained snapshot、M98 actual before/after、每库精确目录 delta、派生基线、原基线、Source13 source/binary/process pin。旧 Source12 FI、UI、Common/actor manifest 和工具图归档为历史，不改标为新候选验收；已完成的无影响分支只能通过逐文件语义影响复核引用。

上下文的 migrations98、读取器的规范基线及 chained registry、139表和动态 source count 必须一起冻结。仍保留 namespace marker、原数据库OID、两app账号非超级权限、全部Source13源码字节、物理PID/start/exe/binary、既有G1与用户决策的严格检查。任何其他目录或数据漂移均拒绝。

组合106当前含65-02、90、83、84-02十份未应用产品候选；历史首次关账的选包策略仍等待用户答复，不能把safe90现有来源核验偷偷当自动历史选包。完成新G2冻结、正常前向迁移、完整Rust/Native相关检查和真实Source13准入后，再用fresh public preparation继续原Main失败G及Tax闭包验收。
