# FE-43 前端消费后端敏感字段投影 G1 Baseline

- Task ID: `FE-43`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation / browser regression
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-43`
- Upstream: `EX-37B`

---

## 1. 背景

`EX-37B` 已关闭为 `Done / G4`，合同 / 项目 / 合同承接第一批 `contract-finance` 金额字段已经由后端返回 `SensitiveStringFieldProjection`。

当前前端仍保留 `FE-42` 的临时逻辑：用 `contract:finance:manage` 在页面侧推断金额是否可见。这不再是最佳实践，因为后端 projection 已经成为正式事实源；前端应该只根据响应字段的 `mode / value / displayText` 渲染完整值或遮罩文案。

---

## 2. G1 范围

### In Scope

1. 新增前端共享 projection 展示 helper：
   - 判断 `SensitiveStringFieldProjection` 是否为完整值；
   - 输出 projection 的 `displayText`；
   - 格式化金额 projection 与币种。
2. 合同列表：
   - `ContractSummary.signedAmountProjection`
   - 不再用 `contract:finance:manage` 判断金额展示。
3. 合同详情：
   - `ContractDetailView.signedAmountProjection`
   - `ContractTermSnapshotSummary.amountTaxInclusiveProjection`
   - `ContractTermSnapshotSummary.amountTaxExclusiveProjection`
   - 编辑 / 提交入口不能在完整金额不可读时打开依赖金额原值的表单。
4. 项目详情：
   - `ProjectDetailContractSummary.signedAmountProjection`
5. 合同承接页：
   - `ContractHandoverEffectiveContractSetSummary.totalSignedAmountProjection`
   - `ContractHandoverContractItemSummary.signedAmountProjection`
6. 更新 focused component specs，覆盖 full / masked projection。
7. 更新或复跑 admin / viewer 浏览器权限矩阵，确认登录后真实入口展示不再依赖前端本地完整值推断。

### Out Of Scope

1. 不新增后端 API、DTO、权限、DDL 或 generated client。
2. 不修改 `EX-37B` 后端 projection 语义。
3. 不切 `operating-finance`、`commission-compensation`、`labor-cost-rate`、`exception-approval-opinion` 字段包；这些属于 `EX-37C` 或后续切片。
4. 不重做合同 / 项目页面整体布局。
5. 不引入导出申请、短时揭示或审批型查看。
6. 不删除 `contract:finance:manage` 的操作权限用途；创建、编辑、提交等命令入口仍按既有前端 permission guard / action 权限处理。

---

## 3. 正式输入

| 输入                  | 文件 / 证据                                                                        | FE-43 使用方式                                                      |
| --------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| EX-37B G4             | `ex-37b-contract-finance-sensitive-projection-g4-closeout.md`                      | 确认后端 projection 已成为第一批合同经营金额正式响应事实源。        |
| Generated client      | `libs/shared/api-client/model/sensitive-string-field-projection.ts`                | 使用 `mode / value / displayText / reasonCode` 渲染金额展示。       |
| Contract list/detail  | `apps/poms-admin/src/app/features/contract/contract-list.ts`、`contract-detail.ts` | 替换本地权限推断展示。                                              |
| Project detail        | `apps/poms-admin/src/app/features/project/project-detail.ts`                       | 替换当前合同签约金额展示。                                          |
| Contract handover     | `apps/poms-admin/src/app/features/project/project-contract-handover.ts`            | 替换有效合同额和合同项签约金额展示。                                |
| FE-42 regression base | `frontend-permission-visibility.matrix.spec.ts`                                    | 继续覆盖 admin / viewer 可见性矩阵，但判断依据转向后端 projection。 |

---

## 4. Projection 展示规则

| Projection Mode | Frontend Display                                            | Operation Meaning                                                |
| --------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| `full`          | 使用 `value` 格式化金额并拼接币种。                         | 可进入依赖原金额的编辑表单。                                     |
| `summary`       | 使用 `displayText`。                                        | 本片不产生 summary；若后端未来返回 summary，前端按显示文本渲染。 |
| `masked`        | 使用 `displayText`，不读取 legacy scalar。                  | 不进入依赖原金额的编辑表单。                                     |
| `denied`        | 使用 `displayText`，不读取 legacy scalar。                  | 不进入依赖原金额的编辑表单。                                     |
| missing/null    | 使用统一 fallback 文案，不读取 legacy scalar 猜测完整金额。 | 视为不可编辑金额。                                               |

原则：

1. 金额展示只看 projection，不看 `contract:finance:manage`。
2. legacy scalar 只作为后端过渡兼容字段，不作为前端敏感展示事实源。
3. 操作入口仍可使用 `contract:finance:manage` 判断用户是否能执行命令，但不能用它判断字段完整值是否可见。

---

## 5. 文件范围

Expected runtime / test files:

1. `apps/poms-admin/src/app/shared/ui/sensitive-visibility.ts`
2. `apps/poms-admin/src/app/features/contract/contract-list.ts`
3. `apps/poms-admin/src/app/features/contract/contract-list.spec.ts`
4. `apps/poms-admin/src/app/features/contract/contract-detail.ts`
5. `apps/poms-admin/src/app/features/contract/contract-detail.spec.ts`
6. `apps/poms-admin/src/app/features/project/project-detail.ts`
7. `apps/poms-admin/src/app/features/project/project-detail.spec.ts`
8. `apps/poms-admin/src/app/features/project/project-contract-handover.ts`
9. `apps/poms-admin/src/app/features/project/project-contract-handover.spec.ts`
10. `apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts`

Expected docs:

1. This baseline.
2. `FE-43` G3 checkpoint.
3. `phase2-development-execution-tracker.md`
4. `poms-design-progress.md`

---

## 6. 测试计划

Required at G3:

1. `git diff --check`
2. `corepack pnpm run format:md:check`
3. `corepack pnpm nx lint poms-admin`
4. Focused component tests:
   - `contract-list.spec.ts`
   - `contract-detail.spec.ts`
   - `project-detail.spec.ts`
   - `project-contract-handover.spec.ts`
5. `corepack pnpm nx build poms-admin`
6. Targeted Playwright:
   - `frontend-permission-visibility.matrix.spec.ts`

Not required:

1. `poms-api` lint / build / tests，除非本片发现必须修后端行为。
2. `shared-api-client:check`，除非本片重新生成 client。
3. `migration-check`，因为不改 DDL。

---

## 7. 例外与风险

| ID                                      | Level  | Scope             | Owner | Cleanup Due  | Decision                                                                         |
| --------------------------------------- | ------ | ----------------- | ----- | ------------ | -------------------------------------------------------------------------------- |
| `FE43-R1-LEGACY-SCALAR-STILL-PRESENT`   | Medium | Generated client  | Codex | 后端兼容期   | legacy scalar 字段仍存在，但前端金额展示不再依赖它。                             |
| `FE43-R2-NON-PROJECTED-TERM-FIELDS`     | Medium | Contract detail   | Codex | `EX-37C+`    | 本片只消费 `EX-37B` 已投影金额字段；税率、付款条款等非投影字段不在本片扩大处理。 |
| `FE43-R3-BROWSER-MATRIX-USES-DEV-ROLES` | Low    | E2E fixture roles | Codex | 后续权限治理 | E2E 仍依赖 dev role fixture 中 admin / viewer 的敏感读权限差异。                 |

---

## 8. G1 结论

`FE-43` 可以进入 implementation。

冻结条件：

1. 第一批合同经营金额展示必须消费后端 projection。
2. 不得继续用 `contract:finance:manage` 推断金额完整值。
3. 不改 public API、generated client、DDL 或后端权限语义。
4. `EX-37C` 的 `L4 / L5` 扩展不得混入本片。
