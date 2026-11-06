# RUST-R2-FIX 用户创建关联修复实施基线

- Gate Status: `Pass`（仅 #115；R4 G/H/I 联合 G1 仍 Pending）
- Parent: [总体 #57](https://github.com/illusion-tech/poms/issues/57)
- Slice: [#115](https://github.com/illusion-tech/poms/issues/115)
- Owner / G1 Reviewer: Root
- Date: 2026-11-06（Asia/Tokyo）
- Type: `api / command` + existing persistence，solo worktree checkpoint。
- Source: `aaa4b16ac66092f0cb1dc6646a02cf14e80823ee`。

## 1. 范围与不做内容

修复 `POST /api/platform/users` 携带初始角色或主组织时，生成用户 UUID 后主动抛出原 Node/MikroORM 缺陷的 500。生成真实用户 UUID 后，角色与主组织关联引用该 UUID；用户、关联、必要审计及待刷新认证会话使用同一事务，任一必要写失败整体回滚。

只改变创建命令。既有更新、角色替换、组织替换和激活命令的其他历史差异不扩大到本片。无新公开路由、DTO 字段、数据库结构或凭证创建行为；不计入 R4 新增 25 项。生产部署、完整 R4/R5–R7、性能均不在范围。

## 2. 正式输入与 SSOT

| Concern       | Source                                                                                                               | Rule                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 业务与必要写  | 用户要求业务正确性优先、#57 既有补缺                                                                                 | 修正已知缺陷，不把原 500 作为预期成功模型              |
| canonical     | `api-route-canonical-inventory.md` 的 `createPlatformUser` 行                                                        | 保留 `POST /platform/users`；完整前缀 `/api`           |
| 请求          | `libs/shared/contracts/src/lib/shared-contracts.ts` 的 `CreatePlatformUserRequestSchema`；Rust `users/validation.rs` | 保持现有字段和验证；UUID 以类型化 identity 比较        |
| 权限 / 状态码 | `users/http.rs` 的 create 与 policy                                                                                  | 保留认证、CSRF、`platform:users:manage` 和现有成功状态 |
| 持久化        | `platform_user`、`user_role_assignment`、`user_org_membership`、`audit_log`、待刷新 session                          | 原始迁移和现有 SQL 字段为结构 SSOT，不生成 DDL         |
| 唯一性        | `platform_user_username_unique`；关联唯一性和 typed UUID                                                             | 用户名并发冲突返回 409；同一角色重复请求拒绝 409       |
| 有效引用      | 真实 role/org 行及 is_active                                                                                         | 不存在返回 404，已停用返回 409；在创建事务内锁定并复核 |

源哈希清单见 `rust-r4ghi/user-fix-g1-sources01.json`。修复不改一向 TypeScript DTO 权威、共享枚举或完整 spec/client。

## 3. 命令、查询与持久化边界

创建命令在事务中按固定顺序锁定实际引用的角色（按 UUID 排序）及主组织；不依赖请求缓存判断引用当前有效性。拒绝重复 typed UUID；同一 UUID 的大小写写法表示同一 identity。通过数据库唯一约束处理竞态下的相同用户名。

插入用户，取得数据库生成的 UUID 与 row version；以该 UUID 插入真实 active 角色关联及可选 primary 组织关联。冻结实际初始角色清单作为创建审计 after snapshot，审计失败则回滚用户与关联；待刷新认证会话也在同一事务内完成。相关关联的零集合具有明确空集合语义。

读侧接口、用户返回模型及版本含义保持既有契约；后续用户详情/角色列表/主组织查询必须读到已提交关联。原本携带引用必然 500 的行为明确归类为 `existing-baseline-drift`，本片修复。无 migration/entity/DDL drift；OpenAPI/client 预期无差异。

## 4. 验收

- 对无角色无主组织、单/多角色、仅主组织、角色加主组织实际创建，核对生成 UUID、返回状态、真实关联、详情及审计。
- 空/不存在/停用引用、重复 UUID、重复用户名、认证/CSRF/权限拒绝；验证拒绝不残留业务行。
- 实际注入用户、角色关联、组织关联、必要审计及待刷新 session 的写失败，核对整体回滚并不带故障重试。
- 并发同用户名只有一个提交；角色/组织停用与创建的受控锁次序，不接受预检查后的失效引用。
- Rust fmt、clippy、build、相关测试与统一候选回归；真实 HTTP/PG 验收和独立 G3/G4。历史 ignored、旧 Node 参考和失败记录保留其标签。
- 新增关联测试有实际业务不变量，不写重复实现的快照测试。

## 5. 例外与 Gate

无 Gate 例外。无需新增 route inventory 行、DDL/migration 或生成 client；若实现发现这些必须改变，先记录增量纠偏再执行。

本基线只准入 #115 的限定实现，不代表实现或验收通过，也不解除 R4 G/H/I 尚待用户裁决的业务口径。#115 完成独立 G3/G4 后才可关闭，#57 始终保持开放。
