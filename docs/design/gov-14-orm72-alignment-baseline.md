# GOV-14 mikro-orm 解 pin（部分）与 7.2 阻断证据实施基线

- Gate Status: `Pass`（含第 11 节纠偏）
- Parent: N/A
- Owner: Codex
- Slice Type: `process-only`（依赖解 pin，最终未新增 migration）
- G1 Reviewer: Codex
- G1 Date: 2026-09-11
- GitHub Issue: `#44`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `GOV-14`

## 1. 范围

- 本次目标（G1 冻结时为"接受对齐 migration"路径，实施纠偏后为下述部分解 pin，见第 11 节）:
  - 解除 `EX-80A` 遗留 pin（EX80A-E2）中 `@mikro-orm/nestjs` 的部分：精确 pin `7.0.1` → `^7.1.0`。7.1.0 的 peer 为 `@nestjs/core ^11.0.5 || ^12.0.0` + `@mikro-orm/core ^7.0.0`，与 core 7.0.11 兼容，NestJS 12 升级的前置就此解除。
  - `@mikro-orm/{core,migrations,postgresql,seeder,cli}` 维持精确 pin `7.0.11`：7.2 的 schema 比对器对表达式型 EXCLUDE 约束存在不收敛缺陷（第 11 节证据），升级阻断，重编号 GOV14-E1。
  - 本地开发库恢复至 7.0 一致状态：对齐 migration 已回滚、账本残留行已清理、约束健康（`pg_get_constraintdef` 规范形态、语义不变）。
  - 验证：`migration-check` 绿、双应用 lint/build/test、OpenAPI / client check 零变化。
- 本次明确不做:
  - 不落地任何对齐 migration（G1 冻结路径已被证据否决）。
  - 不修改 entity、业务代码或既有 migration。
  - 不升级 NestJS 12（独立切片）。
  - 不部署测试环境。
- 下游可依赖的交付边界:
  - `@mikro-orm/nestjs` ^7.1.0 可用；NestJS 12 的 peer 前置就绪。
  - core 系 7.0.11 pin 有明确解封条件（第 11 节）。
- 不允许下游依赖的留白:
  - 不承诺 7.2 生成器输出的任何部分被采用。

## 2. 正式输入

| Input Type      | Document / Source                                           | Section / Anchor        | Status | Notes                                                                                                                 |
| --------------- | ----------------------------------------------------------- | ----------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| Business design | GitHub issue `#44`                                          | 问题 / 决策项           | Pass   | 决策项 1（是否接受对齐 migration）被第 11 节证据否决。                                                                |
| drift 全量清单  | `migration:create -d` dump（2026-09-11）                    | 11 comment + 1 约束重述 | Pass   | 注释部分可收敛；约束部分不收敛。                                                                                      |
| 不收敛证据      | 对齐 migration 应用后的再次 dry-run（2026-09-11）           | up/down                 | Pass   | 应用 7.2 表述后比对仍报差异；将 entity 表达式改为 PG 规范化形态后 up/down 自对称但比对仍红 → 比对器缺陷，非表述问题。 |
| 基线对照        | 2026-07-21 EX-77B closeout（issue #33）                     | migration gate 通过     | Pass   | 7.0.11 下 check 稳定绿。                                                                                              |
| 本地库事实      | `.env` → `127.0.0.1:5432/poms`；`poms.poms_migrations` 账本 | —                       | Pass   | 回滚与账本清理已完成并验证。                                                                                          |

## 3. 本次 SSOT

| Concern                     | SSOT                                  | Implementation Rule                                  |
| --------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Business semantics          | 既有产品行为                          | 解 pin 不得改变任何业务行为。                        |
| Migration 一致性            | `migration-check`（core 7.0.11 语义） | 必须绿。                                             |
| 依赖版本                    | package.json                          | wrapper `^7.1.0`；core 系精确 `7.0.11`（GOV14-E1）。 |
| Public route canonical path | N/A                                   | 不触及 public route。                                |

## 4. 命令与接口边界

N/A——不触及任何 route、command、DTO、guard。

## 5. 读侧边界

N/A——不触及任何 query / view。

## 6. 持久化边界

最终未新增任何 migration；本地开发库已恢复 7.0 一致状态（对齐 migration 回滚、`poms.poms_migrations` 账本残留行清理、`internal_cost_rate_version_active_range_excl` 约束健康且语义不变）。库内个别列 comment 残留（与 entity 元数据一致、7.0 比对器忽略）无害。

## 7. 一致性结论

- Migration -> entity: `migration-check` 在 core 7.0.11 语义下绿。
- 7.2 约束重述判定: 原始 SQL 与 7.2 输出语义等价（仅 `::text` 强转/引号差异）→ `accepted-db-specific-difference`；但比对器不收敛使接受路径不可行。
- Entity -> contract / OpenAPI / generated client: 零变化（check 通过、`libs/shared` 无 diff）。
- 其余边界 N/A。

## 8. 测试与校验

| Check                    | Required | Command / Evidence                               | Result                     | Gap / Reason                                         |
| ------------------------ | -------- | ------------------------------------------------ | -------------------------- | ---------------------------------------------------- |
| Migration / schema check | 是       | `corepack pnpm nx run poms-api:migration-check`  | 通过                       | core 7.0.11 语义；本地库恢复后。                     |
| Lint                     | 是       | `corepack pnpm nx lint poms-api` / `poms-admin`  | 通过                       | —                                                    |
| Build                    | 是       | `corepack pnpm nx build poms-api` / `poms-admin` | 通过                       | —                                                    |
| Unit tests               | 是       | `corepack pnpm nx test poms-api` / `poms-admin`  | API 806/806；Admin 358/359 | Admin 唯一失败为既有 UTC 时区断言（EX-79A 已记录）。 |
| OpenAPI / client check   | 是       | `poms-api:openapi` + `git status libs/shared/`   | 通过，零 diff              | —                                                    |
| Markdown format          | 是       | `corepack pnpm run format:md:check`              | 通过                       | 本片 docs 变更。                                     |

## 9. 例外与风险

| Exception ID | Level  | Scope                                                                                               | Approved By          | Cleanup Owner                                    | Cleanup Due | Notes                                                        |
| ------------ | ------ | --------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------ | ----------- | ------------------------------------------------------------ |
| GOV14-E1     | medium | `@mikro-orm/{core,migrations,postgresql,seeder,cli}` 精确 pin `7.0.11`（EX80A-E2 的 core 部分延续） | 用户（会话指令授权） | 上游修复表达式约束比对不收敛后由依赖维护切片解除 | 待上游      | 证据见第 11 节；解封前 NestJS 12 可行（wrapper 已 ^7.1.0）。 |

## 10. G1 结论（修订）

- Gate Status: `Pass`
- Approved By: Codex（用户会话指令授权）
- Approved At: 2026-09-11（修订同日）
- Conditions: core 系解 pin 前必须先在上游确认比对缺陷修复。

## 11. G2 范围纠偏（corrective checkpoint）：接受路径被证据否决

G1 冻结"接受对齐 migration"路径（11 条 comment + 1 条等价约束重述），实施与验证过程如下，每步均有失败证据：

1. 生成对齐 migration 并本地应用成功；`migration-check` 仍红。
2. 再次 dry-run：残余差异仅剩约束本身——up 输出 7.2 表述，down 还原出 PG 规范化表述（`::text` 强转形态）。PG 存储约束时会重写为规范化形态，而 7.2 比对器拿生成文本与 `pg_get_constraintdef` 规范化文本直接比对 → 应用后仍判差异 → **不收敛循环**。
3. 将 entity 中约束表达式（`internal-cost-rate-version.entity.ts` 的 index expression）改写为 PG 规范化形态：dry-run 的 up/down 变为自对称，但 `migration-check` 仍红 → 差异判定与表述无关，属比对器对表达式型 EXCLUDE 约束（声明于 `indexes`、返回完整 `alter table ... add constraint` 语句）的处理缺陷。entity 改动已回退。
4. 结论：注释部分 7.2 可收敛，约束部分不可收敛；只要该约束存在，7.2 的 `migration-check` 永远红 → 接受路径不可行，改走部分解 pin（第 1 节）。

本地开发库恢复操作记录：`migration:down` 因 down 段 `drop index` 与约束依赖冲突部分报错（约束未被破坏，最终形态经 `pg_get_constraintdef` 验证健康且语义不变）；手工清理 `poms.poms_migrations` 中已删文件的残留账本行；`migration-check` 恢复绿。
