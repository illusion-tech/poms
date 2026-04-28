# EX-37B1 合同经营金额 projection-only 清退 G3 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `EX-37`
- Owner: Codex
- Slice Type: backend query / shared contract / generated client / frontend fixture cleanup
- Gate: `G3`
- Checkpoint Date: 2026-04-28
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-37B1`
- Baseline: `docs/design/archive/slices/ex-37b1-contract-finance-projection-only-cleanup-baseline.md`

---

## 1. 范围结论

本次实现按 `EX-37B1` G1 基线完成第一批 `contract-finance` response projection-only 清退：

1. `ContractSummary.signedAmount` 已移除。
2. `ContractTermSnapshotSummary.amountTaxInclusive` / `amountTaxExclusive` 已移除。
3. `ProjectDetailContractSummary.signedAmount` 已移除。
4. `ContractHandoverContractItemSummary.signedAmount` 已移除。
5. `ContractHandoverEffectiveContractSetSummary.totalSignedAmount` 已移除。
6. API mapper 不再输出上述 legacy scalar。
7. generated client 与前端 fixtures 已同步只消费 projection 字段。

本次明确不做：

1. 不改 create / update command DTO 的金额输入。
2. 不改 persistence 金额列、entity、repository 或 migration。
3. 不扩展到非 `EX-37B` 第一批金额 DTO。
4. 不改 route path / method、不新增权限 key。
5. 不新增 Playwright E2E；本片不改用户入口和 UI 行为。

---

## 2. 一致性检查

| Concern                             | G3 判断 | 证据                                                                                                 |
| ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| Document -> code                    | Pass    | 实现范围与 G1 baseline 的 6 个 projection-only 替换项一致。                                          |
| DTO / contract -> controller output | Pass    | shared contract、OpenAPI、generated client 已删除第一批 legacy scalar response 字段。                |
| Query / view                        | Pass    | `contract`、`project`、`project-handover` mapper 不再把 projection value 复制到 legacy scalar 字段。 |
| Frontend consumer                   | Pass    | 合同 / 项目 / 合同承接前端展示继续读取 projection，fixtures 已删除 legacy scalar。                   |
| Guard / permission                  | Pass    | 敏感读取权限仍由 `contract:finance:sensitive:read` 控制；本片不改权限 key。                          |
| Public route surface                | Pass    | 不改 public route path / method，不需要更新 authoritative inventory。                                |
| Migration / entity                  | N/A     | 本片不改 DDL / entity / repository。                                                                 |

---

## 3. 测试与校验

| Check                        | Required | Command / Evidence                                                                                                                   | Result | Notes                                            |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------ |
| Shared contracts build       | Yes      | `corepack pnpm nx build shared-contracts`                                                                                            | Pass   | DTO schema 类型通过。                            |
| Backend lint                 | Yes      | `corepack pnpm nx lint poms-api`                                                                                                     | Pass   | 无新增 lint warning。                            |
| Backend build                | Yes      | `corepack pnpm nx build poms-api`                                                                                                    | Pass   | API 编译通过。                                   |
| Backend focused/full tests   | Yes      | `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/contract/contract.controller.spec.ts --runInBand`          | Pass   | Jest 实际运行 `poms-api` 40 suites / 503 tests。 |
| OpenAPI generation           | Yes      | `corepack pnpm nx run poms-api:openapi`                                                                                              | Pass   | 生成 `libs/shared/api-spec/openapi.json`。       |
| Generated client             | Yes      | `corepack pnpm nx run shared-api-client:generate`                                                                                    | Pass   | 更新 shared API client model。                   |
| Generated client check       | Yes      | `corepack pnpm nx run shared-api-client:check`                                                                                       | Pass   | 与 OpenAPI 完全同步。                            |
| Frontend lint                | Yes      | `corepack pnpm nx lint poms-admin`                                                                                                   | Pass   | 无新增 lint warning。                            |
| Frontend build               | Yes      | `corepack pnpm nx build poms-admin`                                                                                                  | Pass   | generated DTO 删除字段后前端构建通过。           |
| Contract list spec           | Yes      | `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-list.spec.ts --runInBand`            | Pass   | 1 suite / 7 tests。                              |
| Contract detail spec         | Yes      | `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-detail.spec.ts --runInBand`          | Pass   | 1 suite / 3 tests。                              |
| Project detail spec          | Yes      | `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-detail.spec.ts --runInBand`            | Pass   | 1 suite / 21 tests。                             |
| Contract handover spec       | Yes      | `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-contract-handover.spec.ts --runInBand` | Pass   | 1 suite / 3 tests。                              |
| Project workspace store spec | Yes      | `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts --runInBand`   | Pass   | 1 suite / 26 tests。                             |
| Additional project fixtures  | Yes      | `project-store.spec.ts`、`project-workspace-home.spec.ts`、`project-workspace-shell.spec.ts` focused specs                           | Pass   | 分别为 6 / 3 / 4 tests。                         |
| Markdown format              | Yes      | `corepack pnpm run format:md:check`                                                                                                  | Pass   | 已机械格式化本轮治理文档。                       |
| Diff whitespace              | Yes      | `git diff --check`                                                                                                                   | Pass   | 无 whitespace error。                            |
| Migration check              | No       | N/A                                                                                                                                  | N/A    | 不改 DDL。                                       |
| E2E                          | No       | N/A                                                                                                                                  | N/A    | 不新增导航入口或 UI 行为。                       |

---

## 4. Drift 判断

| Drift                                                                                                             | Classification          | Decision                                                                          |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| `EX-37B` 历史 G4 中保留的 legacy scalar 兼容边界                                                                  | design-change-required  | 当前开发期不需要兼容，已由本片清退为 projection-only。                            |
| `EX37B-R2-FRONTEND-CONSUMPTION-DEFERRED` 仍在 tracker 上                                                          | new-real-drift          | `FE-43` 已完成前端 projection 消费，本片同步删除 fixtures，tracker 中关闭该例外。 |
| OpenAPI generator 输出 `CreateCommissionRuleVersionRequest.propertyNames` / `AuditSnapshot.propertyNames` warning | existing-baseline-drift | 非本片新增；`shared-api-client:check` 最终通过，暂不阻断。                        |

---

## 5. 例外与风险

| Exception ID                             | Status | Scope       | Owner | Cleanup Due | Notes                                                               |
| ---------------------------------------- | ------ | ----------- | ----- | ----------- | ------------------------------------------------------------------- |
| `EX37B1-R1-NON-EX37B-FINANCE-FIELDS`     | Open   | Scope guard | Codex | 后续治理    | 本片只清退 `EX-37B` 第一批 response 字段，不扩展到其他金额 DTO。    |
| `EX37B-R2-FRONTEND-CONSUMPTION-DEFERRED` | Closed | Historical  | Codex | `EX-37B1`   | `FE-43` 已完成前端消费，本片删除 legacy scalar response / fixture。 |

---

## 6. G3 结论

`EX-37B1` 本地实现可进入提交前收口。

在当前变更提交前，tracker 保持 `Doing / G3`；提交落地后再执行 `G4` close-out。`EX-37C2` 暂不混入本片。
