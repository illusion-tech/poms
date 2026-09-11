# GOV-13 nestjs-zod/zod 解 pin 与自引用 schema 碰撞修复实施基线

- Gate Status: `Pass`
- Parent: N/A
- Owner: Codex
- Slice Type: `process-only`（依赖解 pin + 本地补丁，不改业务契约语义）
- G1 Reviewer: Codex
- G1 Date: 2026-09-11
- GitHub Issue: `#43`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `GOV-13`

## 1. 范围

- 本次目标:
  - 解除 `EX-80A` 遗留的 `nestjs-zod` `5.3.0` 保护性 pin（EX80A-E1），升级到 `^5.5.0`。
  - `zod` 维持精确 pin `4.3.6`：实施中证实 nestjs-zod 5.5 的序列化器在 zod >= 4.4 下把带注册 id 的 object query schema 序列化为非 object 根（`Query or url parameters must be an object type`），4.4.3 / 4.5.4 / 4.6.1 全部复现，属 nestjs-zod 上游缺陷（与 #220 同族），解 pin 条件见第 11 节纠偏。
  - 修复升级暴露的 `cleanupOpenApiDoc` 阻断：带 `.meta({ id })` 的数组 schema 包装为 DTO 时（`AuditLogListDto` 是仓库唯一实例），zod 4.6 + nestjs-zod 5.4+ 产生"自引用 `$ref` 与真实 schema 同名碰撞"，OpenAPI 导出报 `Found multiple schemas with name AuditLogList`。
  - 修复载体：G1 冻结时定为 pnpm 本地补丁；实施中证实 `zod 4.3.6 + nestjs-zod 5.5.0` 组合下自引用碰撞不触发，补丁已移除（见第 11 节纠偏）。
  - 验证：`poms-api:openapi` 重新生成 + `shared-api-client:check` 证明 generated client 零变化、双应用 lint/build/test 矩阵、`migration-check`。
- 本次明确不做:
  - 不修改任何业务 schema 定义、DTO、契约语义或公共路由。
  - 不引入 nestjs-zod 之外的库补丁；不为 zod 打补丁。
  - 不处理 `EX-80A-E2`（`@mikro-orm/*` pin，归 GOV-14）。
  - 不部署测试环境。
- 下游可依赖的交付边界:
  - `nestjs-zod` 5.5.0 可用；`openapi.json` 表述更新为 OpenAPI 3.1 合规形式（`exclusiveMinimum` 布尔化、enum 显式 `null`、`AuditSnapshot.propertyNames` 噪声移除），`shared-api-client:check` 证明 generated client 与规范完全同步（零类型变化）。
  - `zod` 精确 pin `4.3.6` 为已知约束，解除条件见第 11 节。
- 不允许下游依赖的留白:
  - 不承诺 nestjs-zod 5.5 的全部新特性被采用。
  - 不承诺 zod 4.4-4.6 全部行为变化已完成审计（以矩阵等价性为准）。

## 2. 正式输入

| Input Type            | Document / Source                        | Section / Anchor                      | Status | Notes                                                                                                                   |
| --------------------- | ---------------------------------------- | ------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Business design       | GitHub issue `#43`                       | 问题 / 待办                           | Pass   | GOV-13 范围冻结。                                                                                                       |
| 诊断证据（插桩 dump） | 本切片诊断（2026-09-11）                 | DUMP_A/DUMP_B/DUMP_OLDNAME            | Pass   | 冲突双方：`AuditLogList`（真实数组）vs `AuditLogListDto` 解包产物（纯自引用 `$ref`）；触发点 `cleanupSchema` 同名校验。 |
| 上游状态              | BenLorantfy/nestjs-zod#220               | duplicate schema error                | Pass   | 已知 bug，5.5.0（2026-07-25）未修复；无新版可用。                                                                       |
| 现有契约事实          | `libs/shared/api-spec/openapi.json`      | `components.schemas.AuditLogList`     | Pass   | 现产物中该组件为真实数组 schema，全文档 2 处引用；补丁必须保持该输出。                                                  |
| nestjs-zod 源码       | `node_modules/nestjs-zod/dist/index.cjs` | `cleanupSchema` / `cleanupOpenApiDoc` | Pass   | 修复点为 `additionalNewSchemas` 同名校验的自引用分支。                                                                  |
| EX-80A 记录           | issue `#42`、EX80A-E1                    | pin 来源                              | Pass   | 本切片为其 cleanup。                                                                                                    |

## 3. 本次 SSOT

| Concern                     | SSOT                                     | Implementation Rule                                         |
| --------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| Business semantics          | 既有产品行为                             | 解 pin 不得改变任何业务行为。                               |
| OpenAPI 契约语义            | 既有 `libs/shared/api-spec/openapi.json` | 重新生成必须零 diff。                                       |
| 补丁内容                    | `patches/` 下补丁文件                    | 只改自引用碰撞分支；上游发版后删除。                        |
| 依赖版本                    | package.json                             | `zod`/`nestjs-zod` 恢复 caret 范围（`^4.6.1` / `^5.5.0`）。 |
| Public route canonical path | N/A                                      | 不触及 public route。                                       |

## 4. 命令与接口边界

N/A——不新增或修改任何 route、command、DTO、guard；`AuditLogListDto` 及其两个端点复用保持原样。

## 5. 读侧边界

N/A——不触及任何 query / view。

## 6. 持久化边界

N/A——不触及 migration、entity、DDL。

## 7. 一致性结论

- Document -> code: N/A。
- ADR-015 inventory -> route: N/A。
- Migration -> entity: N/A（GOV-14 另行处理 mikro-orm）。
- Entity -> contract: N/A。
- Route -> command: N/A。
- Query -> view: N/A。
- Guard / permission: N/A。
- OpenAPI / generated client: 补丁后 `poms-api:openapi` 产物与 HEAD 零 diff 为通过标准；`AuditLogList` 组件保持真实数组形态。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                       | Result                     | Gap / Reason                                                   |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------- |
| OpenAPI generation / client diff | 是       | `corepack pnpm nx run poms-api:openapi` + `corepack pnpm nx run shared-api-client:check` | 通过                       | spec 表述更新（3.1 合规）；client 与规范完全同步、零类型变化。 |
| Lint                             | 是       | `corepack pnpm nx lint poms-api` / `poms-admin`                                          | 通过                       | —                                                              |
| Build                            | 是       | `corepack pnpm nx build poms-api` / `poms-admin`                                         | 通过                       | —                                                              |
| Unit tests                       | 是       | `corepack pnpm nx test poms-api` / `poms-admin`                                          | API 806/806；Admin 358/359 | Admin 唯一失败为既有 UTC 时区断言（EX-79A 已记录）。           |
| Migration / schema check         | 是       | `corepack pnpm nx run poms-api:migration-check`                                          | 通过                       | mikro-orm 仍 pin 7.0.x，本片未触及。                           |
| Markdown format                  | 是       | `corepack pnpm run format:md:check`                                                      | 通过                       | 本片 docs 变更。                                               |

## 9. 例外与风险

| Exception ID | Level  | Scope                                                        | Approved By          | Cleanup Owner                                                   | Cleanup Due | Notes                                                                                         |
| ------------ | ------ | ------------------------------------------------------------ | -------------------- | --------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| GOV13-E1     | medium | `zod` 精确 pin `4.3.6` 延续（原 EX80A-E1 的 zod 部分未解除） | 用户（会话指令授权） | 上游 nestjs-zod 修复 zod >=4.4 query 序列化后由依赖维护切片解除 | 待上游      | 4.4.3 / 4.5.4 / 4.6.1 均复现 `Query or url parameters must be an object type`；与 #220 同族。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: Codex（用户会话指令授权）
- Approved At: 2026-09-11
- Conditions: OpenAPI 产物非零 diff 即阻断；补丁必须限定在自引用碰撞分支，不得顺手改其他逻辑。

## 11. G2 范围纠偏（corrective checkpoint）

实施中发现的与 G1 冻结范围的偏差，逐项分类：

| 偏差             | G1 冻结                           | 实际                                            | 分类                                                                                                                                                                                                                                                                                                  |
| ---------------- | --------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| zod 版本         | 解 pin 至 4.6.1                   | 维持精确 pin 4.3.6                              | `design-change-required`（上游）：nestjs-zod 5.5 序列化器在 zod >=4.4 下将带注册 id 的 object query schema 序列化为非 object 根，4.4.3/4.5.4/4.6.1 全部复现；插桩 dump 证实（`EntityAuditLogListQuery` 参数带 `x-nestjs_zod-unwrap-root`）。解 pin 条件：上游修复或本地接受 invasive 补丁，另开切片。 |
| 修复载体         | pnpm patchedDependencies 本地补丁 | 移除补丁                                        | zod 4.3.6 组合下自引用碰撞不触发，补丁成为死代码；按 YAGNI 移除，诊断与补丁语义已留存于本基线与 issue #43。                                                                                                                                                                                           |
| OpenAPI 产物标准 | 零 diff                           | spec 表述更新（364/269 行，OpenAPI 3.1 合规化） | `accepted`：`exclusiveMinimum: 0` 在 3.1 下本不合规；`shared-api-client:check` 证明 generated client 零变化，消费方语义等价。                                                                                                                                                                         |

## 12. G1 结论（修订）

- Gate Status: `Pass`（含第 11 节纠偏后的范围）
- Approved By: Codex（用户会话指令授权）
- Approved At: 2026-09-11（修订同日）
- Conditions: 后续解 zod pin 的切片必须先处理上游 query 序列化问题。
