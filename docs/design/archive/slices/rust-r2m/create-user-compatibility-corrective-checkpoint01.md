# R2M 用户创建与请求版本预期纠偏

本记录保留原 G1 输入和 `an8a` 原始失败，更新同一批 M2.1/M2.3 的验收协议；待独立必要源审及新实际验收，不构成 G3/G4 放行。

## 已冻结的上游事实

- [R2D 纠偏记录](../archive/slices/rust-r2d-corrective-checkpoint.md)和[收口记录](../archive/slices/rust-r2d-closeout.md)已明确：无关系用户创建返回 201；带主组织或初始角色的六种已观察形状，在关系 SQL 前失败并回滚。Rust 保留该边界，不预分配 UUID。
- 同一 R2D 收口明确：原用户更新服务忽略请求的 `expectedVersion`，迁移不加严它。版本冲突继续由真实支持 CAS 的设置、字典等操作验证。
- 当前原 Native `PlatformUser.id` 使用数据库 `gen_random_uuid()` 默认值；`createUser` 在首次 flush 前读取 `user.id` 构造组织/角色关联。原服务、schema、repository 和两端产品均保持不变。

## 本轮实际证据

原 `an8a` 使用 `r2m-joint17`（manifest `d0d1ab4e731ccbe2213748672c66391efd3af4ee51ca4e484cf3001de536323b`）。原 Native bundle 为 `0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4`。

M1.1–M1.4、M2.2、M2.4 共六项记录为 `observed`。M2.1/M2.3 原非空关系创建请求真实返回 500，原日志为 `UserRoleAssignment.userId` 必填值缺失；原输入中的 201 预期导致该次完整验收保持 `partial-preserved`。不将它归为新 ORM 版本引入的问题，也不将其改标为通过。

公共报告 `tmp/rust-r2m/acceptance-api-nest-an8a.json` 的 SHA256 为 `cc7173bd1d58d50b686887e1b061a8785875a38569d33a9fdd390223ffac1f2c`。原 837720 字节私有 ledger 的 SHA256 为 `d2dbef9f61544f71ac3792346bd08fe74e5847371881981d71a7b9af762ccc98`。原实际响应、完整 107 表事实、SDK/PG、设置租约和 18 行业务号复合租约均保留，按精确原证据恢复后才切换下一 source epoch。

## 同一逻辑矩阵中的显式纠偏

1. 两条原非空关系请求保留其完整 body，单独验证 500 与用户创建业务事实完整回滚；认证触达事实仍完整捕获及比较。
2. M2.1 新增显式无关系 201 创建，再通过既有真实 PUT 角色、PUT 组织关系形成正向链。M2.3 通过显式无关系创建产生实际非空审计，再由既有统一审计查询消费。
3. 原带极大 `expectedVersion` 的用户 PATCH body 完整保留，明确命名为忽略请求版本的 200 更新，核实际字段、rowVersion 和审计；另以重复用户名 409 验证真实冲突及业务无变化。
4. 新步骤、原请求、预期、具名审计 profile 和计划请求数须由新 source 包明确登记并独立复核。不得静默剥离原输入、伪造用户创建正例或将原 500 请求改称 201。

逻辑案例仍为每后端 20 项；公共操作仍为 R2 的 108 项，本片新增 0 项。无产品、DTO、DDL、生成客户端或全局 UUID 策略变更；旧 singleton 租约纠偏文件及其固定哈希不改。#80/#67 仍待完整验收与独立 G3/G4，#57 保持开放。
