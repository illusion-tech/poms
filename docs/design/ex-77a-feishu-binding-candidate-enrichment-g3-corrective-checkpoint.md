# EX-77A / FE-74 飞书绑定候选资料补全与结果表可读性 G3 纠偏 Checkpoint

- Checkpoint Status: `Pass`
- Parent: GitHub issue `#30`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G3 Reviewer: `Pending PR review`
- Checkpoint Date: `2026-07-13`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-77A / FE-74`

## 1. 触发背景与范围

- 触发原因: G3 静态检查发现 `check:enum-like-strings` 在当前 `main` 基线已失败；不能通过放宽本切片的 allowlist 掩盖该治理债务。
- 本次目标: 证明 EX-77A 未新增枚举式字符串扫描 finding，登记已有基线漂移并将其移交 GitHub issue `#31`；同时完成飞书候选资料补全和结果表的 G3 验证。
- 本次明确不做: 不在 EX-77A 中重设全局 scan baseline、不提高 `maxMatches`、不修改外部组织同步的既有标签类型。
- 本次纠偏后可恢复的可信边界: EX-77A 的 adapter、contract、Admin 表格、授权诊断和生成客户端可独立评审；扫描基线修复由 #31 单独审阅。
- 仍不允许下游依赖的留白: 未经当前管理员授权可见的飞书资料不会被补全；已知静态扫描基线失败不能作为新增代码 finding 的豁免。

## 2. 正式输入

| Input Type           | Document / Source                                        | Section / Anchor     | Status                  | Notes                                                                                 |
| -------------------- | -------------------------------------------------------- | -------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| G1 baseline          | `ex-77a-feishu-binding-candidate-enrichment-baseline.md` | Sections 1-10        | Active                  | Frozen scope and B13 route boundary.                                                  |
| GitHub issue         | `#30`                                                    | Acceptance checklist | Active                  | Product slice state owner.                                                            |
| Static scan evidence | `check:enum-like-strings` on `HEAD` `25cc0125`           | Full repository scan | Existing baseline drift | Same 4 overflow groups and external-org-sync finding reproduce before EX-77A changes. |
| Follow-up issue      | `#31`                                                    | Acceptance checklist | Active                  | Owns restoring an executable scanner baseline.                                        |

## 3. Drift 清单与本次 SSOT

| Concern                | Drift / SSOT                                                                                                            | Corrective Rule                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Static scan baseline   | `main` already exceeds 4 historic allowlist limits and has one unrelated unclassified `Record<string, string>` finding. | Classify as `existing-baseline-drift`; do not add broad allowlist capacity or exemptions in EX-77A.                                              |
| Candidate field state  | Nullable value alone cannot distinguish provider omission, user non-provision, and unauthorized/visibility failure.     | Shared contract `fieldAvailability` is the response SSOT; UI renders its enum instead of guessing from `null`.                                   |
| Feishu enrichment      | Search hits expose identity discovery fields, not complete profile data.                                                | Use documented batch user and department endpoints with current admin `user_access_token`, bounded page size and bounded department concurrency. |
| Route / command naming | B13 already owns candidate search.                                                                                      | Keep `GET /platform/identity-providers/{id}/external-users`, its permission and command unchanged; only extend response DTO/OpenAPI.             |

## 4. 当前阻断结论

- Current Gate: `G3 / Ready for review`
- Blocking Findings:
  1. EX-77A has no unresolved implementation, contract, route, permission, lint, build or focused-test blocker.
  2. Repository-wide enum-like-string scan is not executable on `HEAD`; the repeated result is tracked by #31 and is not caused by this diff.
- Why parent task cannot be closed: #30 remains open until PR review, merge, test-environment verification and G4 archive/closeout complete.

## 5. 本次纠偏范围与修复结果

| Concern                  | Before                                                                          | After                                                                                                                                       | Result |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Candidate profile source | Adapter read undocumented search payload fields for department/email/mobile.    | Search hit supplies `open_id` and `department_ids`; bounded batch profile and department resolution supplies display data.                  | Pass   |
| Field-state semantics    | `null` became generic “无邮箱 / 无手机 / 未返回”.                               | Additive typed `fieldAvailability` returns `available`, `not-provided` or `not-returned`; blocking authorization remains an actionable 4xx. | Pass   |
| Authorization UX         | Required scope was presented as a configuration detail and only covered search. | POMS requests the full candidate-read capability package automatically and reports a product-level reauthorization action.                  | Pass   |
| Results table            | Long Subject ID, contact text and action could wrap into unreadable rows.       | Stable column budget, tooltip/truncation for technical IDs, contact rows and horizontal scroll fallback.                                    | Pass   |
| Static scan              | New helper initially used a broad `Record<string, string>`.                     | Replace it with bounded `FeishuBatchFixedQueryParams`; EX-77A contributes no unclassified finding.                                          | Pass   |

## 6. 测试与校验

| Check                                    | Required | Command / Evidence                                                                                             | Result                  | Gap / Reason                                                                                                                                                                       |
| ---------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API adapter / service / controller tests | Yes      | `corepack pnpm nx test poms-api --runInBand --skip-nx-cache --testPathPatterns=identity-provider`              | Pass                    | 5 suites, 72 tests; includes documented search-hit, batch enrichment, availability and controller delegation.                                                                      |
| Admin component tests                    | Yes      | `corepack pnpm nx test poms-admin --runInBand --skip-nx-cache --testPathPatterns=user-external-identity-panel` | Pass                    | 1 suite, 8 tests; includes long Subject ID and availability labels.                                                                                                                |
| Lint                                     | Yes      | `poms-api`, `poms-admin`, `shared-contracts:eslint:lint`, `admin-data-access`                                  | Pass                    | No new warnings.                                                                                                                                                                   |
| Build                                    | Yes      | `poms-api`, `poms-admin`, `shared-contracts`, `admin-data-access`                                              | Pass                    | API/Admin and dependent library builds passed.                                                                                                                                     |
| OpenAPI / generated client               | Yes      | `corepack pnpm nx run shared-api-client:check --skip-nx-cache`                                                 | Pass                    | B13 response extension regenerated and exact client check passed.                                                                                                                  |
| Browser smoke                            | Yes      | Local `http://127.0.0.1:4201/platform/users`; desktop plus `390x844` viewport                                  | Pass                    | Binding dialog uses table `min-width: 854px`; narrow view has horizontal scroll fallback. Live Feishu calls are intentionally covered by adapter mocks, not sent from local smoke. |
| Markdown / diff                          | Yes      | `pnpm run format:md:check`; `git diff --check`                                                                 | Pass                    | No whitespace or table-format error.                                                                                                                                               |
| Enum-like-string scan                    | Yes      | `corepack pnpm run check:enum-like-strings`; detached `HEAD` reproduction                                      | Existing baseline drift | Same failure exists at `25cc0125`; #31 owns cleanup; EX-77A adds no unclassified finding.                                                                                          |
| Migration / schema check                 | No       | No persistence entity or DDL change                                                                            | N/A                     | Not required.                                                                                                                                                                      |

## 7. 残余阻断与后续切片

- 已解除的阻断: 飞书候选部门、邮箱和手机号不再依赖搜索接口未承诺的字段；长 Subject ID 不再压缩操作列。
- 仍存在的阻断:
  1. PR review and merge for #30.
  2. Test-environment application must publish the newly requested Feishu scopes and reauthorize the operating administrator before live data is expected to enrich.
- 后续子切片:
  1. GitHub issue `#31` restores repository-wide enum-like-string scan baseline.
  2. G4 closes #30 only after merged test-environment smoke confirms live administrator visibility and published permission behavior.

## 8. 例外与风险

| Exception ID            | Level | Scope                                    | Approved By                          | Cleanup Owner      | Cleanup Due   | Notes                                                                     |
| ----------------------- | ----- | ---------------------------------------- | ------------------------------------ | ------------------ | ------------- | ------------------------------------------------------------------------- |
| Existing baseline drift | N/A   | Repository-wide enum-like-string scanner | N/A: reproduced on unmodified `HEAD` | GitHub issue `#31` | Before #31 G4 | Not a new EX-77A exception and not a reason to relax current-slice rules. |

## 9. G3 Checkpoint 结论

- Checkpoint Status: `Pass`
- Approved By: `Pending PR review`
- Approved At: `N/A`
- Conditions:
  1. Keep the B13 path and permission unchanged while reviewing the additive response field.
  2. Do not use tenant access token fallback for user-bound candidate enrichment.
  3. Before live acceptance, publish the Feishu capability change and reauthorize the operating administrator.
  4. Keep #31 separate; EX-77A must not change global scanner capacities.
