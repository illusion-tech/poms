# EX-38 敏感字段投影审计事件批量降噪 G3 Checkpoint

- Task ID: `EX-38`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend internal audit behavior / refactor-with-behavior-change
- Baseline: `docs/design/archive/slices/ex-38-sensitive-projection-audit-batching-baseline.md`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-38`
- Checkpoint Status: Pass

---

## 1. Scope Delivered

本地实现按 `EX-38` G1 基线完成：

1. `SensitiveFieldProjectionService.projectStringFields()` 已新增为内部批量投影 helper。
2. `projectStringField()` 已委托到批量路径，保持单字段行为和返回 shape 一致。
3. 未授权 grouped projection 现在按同一 `fieldPackageKey` / `targetType` / `targetId` / `projectionMode` 记录一条 security event。
4. batched event details 记录 `fieldKeys`、`hiddenFieldCount`、`targetCount`、`sampleTargetIds`、`requiredPermission` 和 `auditAggregationMode`。
5. `ContractTermSnapshotSummary` 的 6 个合同经营字段已改为批量 projection。
6. L4 经营总览、统一核算、偏差风险、经营反哺 grouped `operating-finance` 字段已改为批量 projection。
7. L5 calculation、payout、adjustment、final settlement / rule explanation shared evidence package grouped projection 已改为批量 projection。

---

## 2. Out Of Scope Confirmation

| Item                     | Decision  |
| ------------------------ | --------- |
| Public API route         | No change |
| Shared DTO / OpenAPI     | No change |
| Generated client         | No change |
| Permission model         | No change |
| DDL / entity / migration | No change |
| Frontend behavior        | No change |
| Audit query UI           | No change |

---

## 3. Validation

| Check                     | Command                                                                                                                                                  | Result                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Projection service tests  | `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/core/sensitive-field-projection/sensitive-field-projection.service.spec.ts --runInBand` | Pass, poms-api 40 suites / 507 tests |
| Contract controller tests | `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/contract/contract.controller.spec.ts --runInBand`                              | Pass, poms-api 40 suites / 507 tests |
| `poms-api` lint           | `corepack pnpm nx lint poms-api`                                                                                                                         | Pass                                 |
| `poms-api` build          | `corepack pnpm nx build poms-api`                                                                                                                        | Pass                                 |
| Markdown check            | `corepack pnpm run format:md:check`                                                                                                                      | Pass                                 |
| Diff whitespace           | `git diff --check`                                                                                                                                       | Pass                                 |

Jest 当前 `--testFile` 参数会触发 `poms-api` 全量 test suite；因此两条 focused 命令实际均覆盖全部 40 个 suite。

---

## 4. Drift Classification

| Item                        | Classification           | Decision                                                                                   |
| --------------------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| Security event count        | `design-change-required` | 本片有意将逐字段事件收敛为 grouped event，以关闭审计噪声例外。                             |
| Security event detail shape | Expected internal change | `details` 增加 batch evidence，不改 public DTO 或 DDL。                                    |
| Public API / DTO            | No drift                 | 未改 route、shared contract、OpenAPI 或 generated client。                                 |
| Persistence                 | No drift                 | 未改 `SecurityEvent` entity、migration 或 repository。                                     |
| Request-wide aggregation    | Accepted boundary        | 本片按显式 grouped call 聚合，不做跨目标 / 跨请求全局缓冲，避免异步 flush 和内存泄漏风险。 |

---

## 5. Exception Close-out

| Exception   | Status             | Evidence                                                                 |
| ----------- | ------------------ | ------------------------------------------------------------------------ |
| `EX37B-R3`  | Closed at local G3 | 合同条款快照 grouped projection 不再逐字段写多条 masked / denied event。 |
| `EX37C2-R2` | Closed at local G3 | L5 calculation / payout / adjustment grouped projection 已批量记录事件。 |

---

## 6. G3 Decision

`EX-38` 本地实现可以进入提交前收口。

提交落地后，执行 `EX-38` G4 close-out，并同步清空 `EX-37B`、`EX-37C`、`EX-37C2` 的剩余审计事件量例外列。
