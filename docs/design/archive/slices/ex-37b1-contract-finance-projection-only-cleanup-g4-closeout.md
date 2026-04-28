# EX-37B1 合同经营金额 projection-only 清退 G4 Close-out

- Task ID: `EX-37B1`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend query / shared contract / generated client / frontend fixture cleanup
- Baseline: `docs/design/archive/slices/ex-37b1-contract-finance-projection-only-cleanup-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/ex-37b1-contract-finance-projection-only-cleanup-g3-checkpoint.md`
- Implementation Commit: `39b8d1e feat(platform): 完成 EX-37B1 合同财务投影清理闭环`

---

## 1. G4 结论

`EX-37B1` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. `ContractSummary`、`ContractDetailView`、`ProjectDetailContractSummary`、`ContractHandoverContractItemSummary` 与 `ContractHandoverEffectiveContractSetSummary` 已清退第一批 `contract-finance` legacy scalar response 字段。
2. `ContractTermSnapshotSummary` 已清退 `amountTaxInclusive` / `amountTaxExclusive` legacy scalar response 字段。
3. API mapper 不再把 sensitive projection value 复制回 scalar 字段。
4. OpenAPI 与 generated client 已同步为 projection-only response。
5. 前端合同 / 项目 / 合同承接 fixtures 已同步删除 legacy scalar，页面展示继续只消费 projection。
6. `EX37B-R2-FRONTEND-CONSUMPTION-DEFERRED` 已关闭；`EX37B-R3` 仍作为审计事件量边界保留。

---

## 2. 提交证据

| Evidence              | Result                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Implementation commit | `39b8d1e feat(platform): 完成 EX-37B1 合同财务投影清理闭环`                                 |
| Shared contracts      | `libs/shared/contracts/src/lib/shared-contracts.ts`                                         |
| API runtime           | `apps/poms-api/src/app/features/contract/*`、`project/*`、`project-handover/*`              |
| Frontend fixtures     | `apps/poms-admin/src/app/features/contract/*`、`apps/poms-admin/src/app/features/project/*` |
| Generated files       | `libs/shared/api-spec/openapi.json`、`libs/shared/api-client/model/*`                       |
| Governance files      | EX-37B1 baseline、EX-37B1 G3 checkpoint、tracker、progress                                  |

---

## 3. G3 验证回放

| Check                                                                                                                                | Result |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `corepack pnpm nx build shared-contracts`                                                                                            | Pass   |
| `corepack pnpm nx lint poms-api`                                                                                                     | Pass   |
| `corepack pnpm nx build poms-api`                                                                                                    | Pass   |
| `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/contract/contract.controller.spec.ts --runInBand`          | Pass   |
| `corepack pnpm nx run poms-api:openapi`                                                                                              | Pass   |
| `corepack pnpm nx run shared-api-client:generate`                                                                                    | Pass   |
| `corepack pnpm nx run shared-api-client:check`                                                                                       | Pass   |
| `corepack pnpm nx lint poms-admin`                                                                                                   | Pass   |
| `corepack pnpm nx build poms-admin`                                                                                                  | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-list.spec.ts --runInBand`            | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-detail.spec.ts --runInBand`          | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-detail.spec.ts --runInBand`            | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-contract-handover.spec.ts --runInBand` | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts --runInBand`   | Pass   |
| Project fixture focused specs                                                                                                        | Pass   |
| `corepack pnpm run format:md:check`                                                                                                  | Pass   |
| `git diff --check`                                                                                                                   | Pass   |

`poms-api` focused command 实际运行全量 API Jest，结果为 `40` suites / `503` tests passed。前端补跑 `project-store`、`project-workspace-home`、`project-workspace-shell` focused specs，分别为 `6` / `3` / `4` tests passed。

---

## 4. Drift 与例外

| Item                                     | Status          | Decision                                                                          |
| ---------------------------------------- | --------------- | --------------------------------------------------------------------------------- |
| `EX37B-R2-FRONTEND-CONSUMPTION-DEFERRED` | Closed          | `FE-43` 已完成前端 projection 消费，本片已删除 legacy scalar response / fixture。 |
| `EX37B1-R1-NON-EX37B-FINANCE-FIELDS`     | Accepted guard  | 本片只清退 `EX-37B` 第一批 response 字段，不扩展到其他金额 DTO。                  |
| `EX37B-R3-SECURITY-EVENT-VOLUME`         | Open downstream | 批量列表 / 摘要读取可能产生多条 masked security event；如需降噪，另开审计增强。   |
| Public route surface                     | No change       | 本片未新增、删除或改名 public route，不需要更新 authoritative API inventory。     |
| Persistence                              | No change       | 本片未改 DDL、entity、repository 或 migration。                                   |

---

## 5. 下游承接

`EX-37B1` 关闭后，下游顺序为：

1. `EX-37C2`：将 `commission-compensation` 字段包扩展到 L5 提成 calculation / payout / adjustment / settlement / rule explanation 读取响应。
2. `FE-44`：消费 L5 projection 字段，补残余敏感字段展示和跨 L4 / L5 浏览器权限矩阵。

`EX-37` 父任务保持打开，直到 `EX-37C2` 与 `FE-44` 都完成 G4。
