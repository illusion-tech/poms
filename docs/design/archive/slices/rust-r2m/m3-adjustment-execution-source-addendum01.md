# R2M Adjustment 下游消费来源补充

本记录补充 M3 输入纠偏，原 checkpoint 与 G1 原件不改。

新增独立 draft 的正向链中，创建与提交使用本轮原 Native 生产者，公共 approve 使用当前目标后端的 R2 公共机制。原 `POST /api/commission-adjustments/{id}:execute` 不属于冻结的 Rust 115 操作；执行步骤在两个隔离数据库都明确调用原 Native，以具名固定 dispatch、原权限和版本 DTO、真实 SDK/SQL 与完整事实证明下游消费。Rust 数据库中的该请求标为 `m.producer`。

该步骤不增加 Rust 路由，不计入 Rust 108/115 操作覆盖，不宣称 Adjustment 领域执行已迁移。它只证明 R2 公共审批结果可以被原下游服务消费，沿用 G1 真实 Native 生产者及完整 R3–R5 尚未迁移的边界。禁止通用 Native fallback 或通过查询匹配认领创建。

原 rejected 同实体提交的 400 负例保留。新源包透明登记计划 HTTP 从 164 增为 167；计划数不冒充实际通过。#80/#67 仍须全批实际验收、独立 G3/G4 后才可关闭，#57 保持开放。
