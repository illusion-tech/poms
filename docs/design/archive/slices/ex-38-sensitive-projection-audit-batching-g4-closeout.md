# EX-38 敏感字段投影审计事件批量降噪 G4 Close-out

- Task ID: `EX-38`
- Date: 2026-04-29
- Owner: Codex
- Slice Type: backend internal audit behavior / refactor-with-behavior-change
- Baseline: `docs/design/archive/slices/ex-38-sensitive-projection-audit-batching-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/ex-38-sensitive-projection-audit-batching-g3-checkpoint.md`
- Implementation Commit: `69055b5 feat(platform): 完成 EX-38 敏感字段投影审计批处理闭环`

---

## 1. G4 结论

`EX-38` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. `SensitiveFieldProjectionService.projectStringFields()` 已作为内部批量投影 helper 落地。
2. 单字段 `projectStringField()` 已委托到批量路径，保持返回语义一致。
3. 合同条款快照 grouped projection 已从逐字段 security event 收敛为 grouped event。
4. L4 经营读取页 grouped `operating-finance` projection 已收敛为 grouped event。
5. L5 calculation / payout / adjustment / shared evidence package grouped projection 已收敛为 grouped event。
6. grouped event 保留字段包、权限、projection mode、field keys、hidden field count、target count 和 sample target ids。
7. 本片未改 public API、shared DTO、OpenAPI、generated client、权限、DDL、entity、migration 或前端行为。

---

## 2. 提交证据

| Evidence               | Result                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Implementation commit  | `69055b5 feat(platform): 完成 EX-38 敏感字段投影审计批处理闭环`                                    |
| Baseline               | `docs/design/archive/slices/ex-38-sensitive-projection-audit-batching-baseline.md`                 |
| G3 checkpoint          | `docs/design/archive/slices/ex-38-sensitive-projection-audit-batching-g3-checkpoint.md`            |
| Runtime implementation | `apps/poms-api/src/app/core/sensitive-field-projection/sensitive-field-projection.service.ts`      |
| Runtime tests          | `apps/poms-api/src/app/core/sensitive-field-projection/sensitive-field-projection.service.spec.ts` |
| Domain call sites      | `contract.controller.ts`、`project-cost.service.ts`、`commission.service.ts`                       |
| Tracker / progress     | `docs/design/phase2-development-execution-tracker.md`、`docs/design/poms-design-progress.md`       |

---

## 3. G3 验证回放

| Check                     | Command                                                                                                                                                  | Result                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Projection service tests  | `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/core/sensitive-field-projection/sensitive-field-projection.service.spec.ts --runInBand` | Pass, poms-api 40 suites / 507 tests |
| Contract controller tests | `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/contract/contract.controller.spec.ts --runInBand`                              | Pass, poms-api 40 suites / 507 tests |
| `poms-api` lint           | `corepack pnpm nx lint poms-api`                                                                                                                         | Pass                                 |
| `poms-api` build          | `corepack pnpm nx build poms-api`                                                                                                                        | Pass                                 |
| Markdown check            | `corepack pnpm run format:md:check`                                                                                                                      | Pass                                 |
| Diff whitespace           | `git diff --check`                                                                                                                                       | Pass                                 |

---

## 4. Drift 与例外

| Item                        | Status            | Decision                                                                                   |
| --------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| `EX37B-R3`                  | Closed at G4      | 合同 / 项目经营金额 grouped projection 已保留审计证据并减少逐字段事件噪声。                |
| `EX37C2-R2`                 | Closed at G4      | L5 提成 grouped projection 已保留审计证据并减少逐字段事件噪声。                            |
| Security event count        | Expected change   | 本片有意将逐字段事件收敛为 grouped event。                                                 |
| Security event detail shape | Expected change   | `details` 增加 batch evidence，不改 public DTO 或 DDL。                                    |
| Public API / DTO            | No change         | 未改 route、shared contract、OpenAPI 或 generated client。                                 |
| Persistence / migration     | No change         | 未改 `SecurityEvent` entity、repository、DDL 或 migration。                                |
| Request-wide aggregation    | Accepted boundary | 本片按显式 grouped call 聚合，不做跨目标 / 跨请求全局缓冲，避免异步 flush 和内存泄漏风险。 |

---

## 5. Parent / Exception Close-out

当前执行板中的敏感投影剩余例外已关闭：

1. `EX-37B` 例外列中的 `EX37B-R3` 由本片关闭。
2. `EX-37C` 例外列中的 `EX37C2-R2` 由本片关闭。
3. `EX-37C2` 例外列中的 `EX37C2-R2` 由本片关闭。

`EX-38` 关闭后，当前执行任务板不再保留敏感字段投影链路的开放例外。
