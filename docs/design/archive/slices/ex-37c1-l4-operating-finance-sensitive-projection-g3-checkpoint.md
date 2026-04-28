# EX-37C1 L4 经营金额后端投影切换 G3 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `EX-37C`
- Owner: Codex
- Slice Type: backend query / shared contract / generated client / frontend consumption
- Gate: `G3`
- Checkpoint Date: 2026-04-28
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-37C1`

---

## 1. 范围结论

本次实现按 `EX-37C1` G1 基线完成 `L4` operating-finance 后端投影第一批闭环：

1. `GET /projects/:projectId/business-outcome-overview`
2. `GET /projects/:projectId/unified-accounting`
3. `GET /projects/:projectId/variance-risk-explanation`
4. `GET /projects/:projectId/business-accounting-feedback`

完成内容：

1. `shared-contracts` 为本片冻结字段新增 `SensitiveStringFieldProjectionSchema` projection 字段，并移除对应 legacy scalar 字段。
2. `ProjectCostController` 将 request user 和 request context 传入 L4 query service。
3. `ProjectCostService` 使用 `SensitiveFieldProjectionService` 生成 `operating-finance` projection。
4. OpenAPI 与 shared API client 已重新生成并同步。
5. L4 经营总览 / 偏差风险 / 提成 gate 解释页已直接消费 projection 字段。
6. focused backend / frontend tests 覆盖 projection-only DTO fixture 与 authorized / unauthorized L4 projection 行为。

本次明确不做：

1. 不处理 `L5` commission-compensation 字段包；由 `EX-37C2` 承接。
2. 不处理 `L5` 前端页面消费；由 `EX-37C2` / `FE-44` 承接。
3. 不改 route path / method、不改 DDL、不新增权限 key。

---

## 2. 一致性检查

| Concern                             | G3 判断 | 证据                                                                                                                         |
| ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Document -> code                    | Pass    | 实现范围与 `EX-37C1` G1 baseline 的四个 L4 route 和冻结字段一致。                                                            |
| ADR-015 / route inventory           | Pass    | 不改 public route surface；`project-cost` B3 route 已存在并 aligned。                                                        |
| DTO / contract -> controller output | Pass    | shared contract、OpenAPI、generated client 均只暴露 projection 字段，不再保留本片 legacy scalar 字段。                       |
| Query / view                        | Pass    | 四个 L4 query mapper 在返回前调用 `SensitiveFieldProjectionService.projectStringField`，service 测试断言 legacy 字段不存在。 |
| Guard / permission                  | Pass    | 完整值读取权限使用 `operating:finance:sensitive:read`；既有 route guard 仍保持 `contract:finance:manage` 操作入口语义。      |
| Migration / entity                  | N/A     | 本片不改 DDL / entity / repository。                                                                                         |
| Frontend consumer                   | Pass    | L4 经营读取页和提成 gate 解释页已改为读取 generated projection 字段。                                                        |

---

## 3. 测试与校验

| Check                      | Required | Command / Evidence                                                                                                                 | Result | Notes                                                            |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| Shared contracts build     | Yes      | `corepack pnpm nx build shared-contracts`                                                                                          | Pass   | DTO schema 类型通过。                                            |
| Backend focused/full tests | Yes      | `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/project-cost/project-cost.service.spec.ts --runInBand`   | Pass   | Jest 实际运行 `poms-api` 40 个 test suites / 503 tests。         |
| Backend lint               | Yes      | `corepack pnpm nx lint poms-api`                                                                                                   | Pass   | 无新增 lint warning。                                            |
| Backend build              | Yes      | `corepack pnpm nx build poms-api`                                                                                                  | Pass   | API 编译通过。                                                   |
| OpenAPI generation         | Yes      | `corepack pnpm nx run poms-api:openapi`                                                                                            | Pass   | 生成 `libs/shared/api-spec/openapi.json`。                       |
| Generated client           | Yes      | `corepack pnpm nx run shared-api-client:generate`                                                                                  | Pass   | 更新 shared API client model。                                   |
| Generated client check     | Yes      | `corepack pnpm nx run shared-api-client:check`                                                                                     | Pass   | 与 OpenAPI 完全同步。                                            |
| Frontend lint              | Yes      | `corepack pnpm nx lint poms-admin`                                                                                                 | Pass   | L4 frontend consumer 类型通过。                                  |
| Frontend focused tests     | Yes      | `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts --runInBand` | Pass   | 1 个 test suite / 26 tests。                                     |
| Frontend build             | Yes      | `corepack pnpm nx build poms-admin`                                                                                                | Pass   | projection-only generated DTO 未打断前端构建。                   |
| Markdown format            | Yes      | `corepack pnpm run format:md:check`                                                                                                | Pass   | 已机械格式化本轮治理文档。                                       |
| Diff whitespace            | Yes      | `git diff --check`                                                                                                                 | Pass   | 无 whitespace error。                                            |
| Migration check            | No       | N/A                                                                                                                                | N/A    | 不改 DDL。                                                       |
| E2E                        | No       | N/A                                                                                                                                | N/A    | 当前不新增导航或入口；跨 L4 / L5 浏览器权限矩阵由 `FE-44` 收口。 |

---

## 4. Drift 判断

| Drift                                                                                                             | Classification          | Decision                                                                      |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| OpenAPI generator 输出 `CreateCommissionRuleVersionRequest.propertyNames` / `AuditSnapshot.propertyNames` warning | existing-baseline-drift | 非本片新增；`shared-api-client:check` 最终通过，暂不阻断。                    |
| `EX-37C1` 从过渡兼容口径改为 projection-only direct cutover                                                       | design-change-required  | 当前仍处开发期、未上线；不保留兼容层，正式 response 只暴露 projection。       |
| L4 前端消费从 `FE-44` 提前并入 `EX-37C1`                                                                          | design-change-required  | 避免 generated DTO 与页面消费短暂不一致；`FE-44` 缩小为 L5 与浏览器矩阵收口。 |

---

## 5. 例外与风险

| Exception ID                           | Status | Scope                | Owner | Cleanup Due | Notes                                              |
| -------------------------------------- | ------ | -------------------- | ----- | ----------- | -------------------------------------------------- |
| `EX37C1-R3-SUMMARY-STRING-GRANULARITY` | Open   | Field classification | Codex | 后续治理    | 部分摘要字段含混合业务解释，本片按字段包整体遮罩。 |

---

## 6. G3 结论

`EX-37C1` 本地实现可进入提交前收口。

在当前变更提交前，tracker 保持 `Doing / G3`；提交落地后再执行 `G4` close-out 并决定是否启动 `EX-37C2`。
