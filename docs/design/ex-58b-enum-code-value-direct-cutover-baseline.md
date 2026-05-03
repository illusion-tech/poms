# EX-58B 枚举代码值风格统一 direct cutover 基线

- Task ID: `EX-58B`
- Slice type: `cross-layer-high-risk`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-58B`
- Public route surface: no new, changed or removed public route; existing DTO / OpenAPI enum values change.
- Status: `G1`
- G1 Date: 2026-05-03

## 1. Scope

本片承接 `EX-58` / `EX-58A`，只做 enum / dictionary code value 的开发期 direct cutover：

1. 将非外部口径的 `void` 统一为 `voided`。
2. 将非外部口径的 snake case code value 统一为 `lower-kebab`。
3. 将非外部口径的 `UPPER_SNAKE` 统一为 `lower-kebab`。
4. 同步 shared contracts、后端实体 / 服务 / seed、DB check / index / defaults、OpenAPI / generated client、Admin generated enum 消费和 tests。

本片不做：

1. 不做旧值兼容映射、双写或前后端 fallback。
2. 不把配置型枚举改为字典；由 `EX-58C` 承接。
3. 不新增状态历史表；由 `EX-58D` 承接。
4. 不修改 public route path / method。

## 2. Cutover Groups

| Group | Area                                              | Current Values                                                                                  | Target Values                                                                                   |
| ----- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| B1    | 合同财务与项目移交 projection                     | `void`、`pending_effective`、`not_started`、`not_frozen`                                        | `voided`、`pending-effective`、`not-started`、`not-frozen`                                      |
| B2    | 项目实际成本与内部成本率                          | `PROCUREMENT`、`PAYMENT_FACT`、`DRAFT`、`PAYMENT_RECORD`、`WEEK`、`PERSON` 等                   | `procurement`、`payment-fact`、`draft`、`payment-record`、`week`、`person` 等                   |
| B3    | 经营信号 / 动作 / 基线来源 / 提成 gate projection | `PROMPT`、`REVIEW`、`BLOCK`、`INSUFFICIENT`、`handover_rebaseline`、`ALLOW_FINAL_SETTLEMENT` 等 | `prompt`、`review`、`block`、`insufficient`、`handover-rebaseline`、`allow-final-settlement` 等 |
| B4    | 跨对象引用类型与 CRM 辅助 code                    | `Contract`、`ApprovalRecord`、`sales_follow_up_reminder`、`sales_follow_up`、`legal_name` 等    | `contract`、`approval-record`、`sales-follow-up-reminder`、`sales-follow-up`、`legal-name` 等   |

以下不纳入本片：

| Value                                                | Reason                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| `LeadRating` 的 `A/B/C/D`                            | 业务评级代码，非显示中文，也不是风格混乱来源。             |
| `PresigningRiskLevel` 的 `R1/R2/R3/R4`               | 风险级别代码，保留。                                       |
| 附件分类 / 跟进类型 / 费用分类                       | 将在 `EX-58C` 作为字典 code 重新初始化，不在本片重复治理。 |
| `CommandResult.resultStatus` / `businessStatusAfter` | 当前仍是开放命令结果投影；不在本片强行收窄。               |

## 3. Persistence Boundary

本片需要新增 direct cutover migration：

1. 先 drop 受影响 check constraint / partial index。
2. 更新开发库现有行到目标 code value。
3. 更新 column default。
4. 重建 check constraint / partial index。
5. 更新 column comment。

迁移不保留旧值兼容，不允许新代码继续接受旧值。`down` 只做必要的约束清理，不承诺恢复旧值。

## 4. Validation

Required:

1. `corepack pnpm nx build shared-contracts`
2. `corepack pnpm nx run poms-api:openapi`
3. `corepack pnpm nx run shared-api-client:generate`
4. `corepack pnpm nx run shared-api-client:check`
5. `corepack pnpm nx build poms-api`
6. `corepack pnpm nx build poms-admin`
7. `corepack pnpm nx lint poms-api`
8. `corepack pnpm nx lint poms-admin`
9. `corepack pnpm nx test poms-api`
10. `corepack pnpm nx test poms-admin --watch=false`
11. `corepack pnpm nx run poms-api:migration-check`
12. `corepack pnpm run format:md:check`
13. `git diff --check`

## 5. G1 Conclusion

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-03`
- Condition: if a value is discovered to be an actual external integration code, stop and document it as an exception instead of renaming it.
