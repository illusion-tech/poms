# R2M M3 实际输入纠偏

本记录保留原 G1、`an9a` 和 `an5b` 的完整输入、响应与 partial 标签，只纠正同一批集成验收的工具预期。产品、DTO、数据库和公共操作边界保持原定义；G3/G4 仍 Pending。

## 已观察事实与最小修正

1. `an9a` 的原 commission18 cohort 中 `project.customer_id` 本来就是 NULL。额外构造 customer 并将这个 NULL 传入要求 UUID 的 draft constructor 属于工具输入错误。保留原 cohort 和 NULL，移除无关 customer 准备；项目子表的 immutable intent 在请求前明确包含既有 owned `project_id`。该修正在 Source04 中登记，`an5b` 的 M3.1 已完整观察。
2. `an5b` 的 retention receipt 原 POST 返回 201，完整请求中的金额字符串仍为 `360.00`，`source_type` 仍为 `manual`。PG `to_jsonb` 中对应 NUMERIC 是 JavaScript number `360`；工具用字符串 `360.00` 作物理行的严格 binding，因此选出零行。只把该具名 physical binding 改为 number 360 并明确 `manual`，保留原请求及 DTO 金额类型，不对所有金额做宽松转换。
3. 原 `CommissionService.createRoleAssignment` 创建实体时没有赋 `createdBy`，原 DTO 和 producer body 只有 participants。`an5b` 的 M3.4 准备阶段真实 SDK afterCreate / 外层 COMMIT 及完整物理行证明 `created_by = NULL`；原 selector 错误地要求当前 admin。该具名意向改为既有 project 与显式 NULL，不伪造 `createdBy` 请求字段，不放宽普通 fixture 认领或 actor 边界。

## Adjustment 的原服务兼容边界

原 controller 提供 create、list、submit 和 execute，没有 PATCH revise。原提交服务只允许 draft。`an5b` 对同一 rejected Adjustment 再次 `submitApproval` 真实返回 400，消息明确指出 rejected 状态不能提交。

原同实体请求和完整 body 保留，作为 400 与业务事实不变的负例。正向审批、执行和版本冲突继续使用另行真实创建的新 draft，随后 submit、approve、execute；不得称为原 rejected 实体重提成功，不新增 PATCH 或改变状态机。

新 recipe 须透明登记请求计划数和 source epoch，经独立必要增量 SourceReady 后再实际运行。逻辑矩阵仍是每端 20 项，R2M 新增公共操作为 0。原 `an5b` 的未完成创建只按原 SDK 出生与 COMMIT 证书恢复，不通过查询匹配授予身份。

#80/#67 仅在全批验收和独立 G3/G4 条件满足后关闭；#57 保持开放。
