# EX-35A 业务编号系统生成后端 / 契约 / migration 实现基线

- Gate Status: `G1 = Pass`
- Parent: `EX-35`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-35A`

## 1. 范围

本次目标:

1. 新增 `business_number_sequence` 表与后端 `BusinessNumberService`。
2. 将 `Lead.leadCode` 收敛为系统生成 `Lead.leadNo`。
3. 将 `Project.projectCode` 收敛为系统生成 `Project.projectNo`，并新增 optional `customerProjectNo`。
4. 保留 `Contract.contractNo` 作为 POMS 内部合同号，但改为后端生成，并新增 optional `customerContractNo`。
5. 将 `ProjectActualCostRecord.recordNo` 从 `Date.now()` / 临时前缀改为正式 generator。
6. 为 `ProjectBidCommercialProcess` 新增 optional 外部 `tenderNo` / `bidPackageNo`。
7. 同步 entity、service、repository、shared contract、API DTO、OpenAPI、generated client、后端测试与 API fixtures。

本次明确不做:

1. 不新增 public HTTP route。
2. 不新增前端表单入口改造；`FE-30` 承接。
3. 不保留旧 `leadCode` / `projectCode` request alias；当前系统处于开发期。
4. 不给 `InvoiceRecord.invoiceNumber`、receipt / payable / payment、平台配置编码或规则 key 生成编号。
5. 不保证编号连续，只保证唯一、稳定、后端生成。

下游可依赖的交付边界:

1. 创建 Lead / Project / Contract / ProjectActualCostRecord 时，POMS 内部编号由后端生成。
2. DTO / generated client 不再要求前端传入 POMS 内部编号。
3. 外部客户 / 招标编号只作为 optional 外部字段保存。

下游不能依赖的留白:

1. 线索、项目、合同创建页面仍可能暂时引用旧字段，必须由 `FE-30` 修复后才能把 admin UI 作为完成入口。
2. 编号管理后台、重置 sequence、人工补号、跳号审计视图不在本片。

## 2. 正式输入

| Input Type       | Document / Source                                                                          | Section / Anchor      | Status | Notes                          |
| ---------------- | ------------------------------------------------------------------------------------------ | --------------------- | ------ | ------------------------------ |
| Business design  | `docs/design/archive/slices/ex-35-business-number-generation-governance-baseline.md`       | 首批系统生成编号规则  | Frozen | 本片直接消费。                 |
| Tracker          | `docs/design/phase2-development-execution-tracker.md`                                      | `EX-35A` / `FE-30`    | Frozen | 前后端切片已拆分。             |
| Lead runtime     | `EX-31`                                                                                    | Lead create/list/read | Frozen | 改输入编号来源，不改权限。     |
| Project runtime  | `EX-32`                                                                                    | Lead -> Project       | Frozen | 转项目不再要求前端给项目编号。 |
| Cost runtime     | `docs/design/phase2-project-actual-cost-records.md`                                        | `recordNo`            | Frozen | 编号字段已有，生成方式需收敛。 |
| Development rule | `docs/design/archive/slices/ex-35-business-number-generation-governance-g3-g4-closeout.md` | direct cutover        | Frozen | 不保留旧 DTO / UI 兼容层。     |

## 3. 本次 SSOT

| Concern                   | SSOT             | Implementation Rule                                       |
| ------------------------- | ---------------- | --------------------------------------------------------- |
| Lead internal number      | `EX-35` baseline | `leadNo = LD-{YYYY}-{000000}`。                           |
| Project internal number   | `EX-35` baseline | `projectNo = PRJ-{YYYY}-{000000}`。                       |
| Contract internal number  | `EX-35` baseline | `contractNo = CT-{YYYY}-{000000}`，仍是 POMS 内部合同号。 |
| Actual cost record number | `EX-35` baseline | `AC-PAY/INV/EXP/PRC/LBR-{YYYY}-{000000}`。                |
| External project number   | `EX-35` baseline | `Project.customerProjectNo`，optional，不生成。           |
| External bid numbers      | `EX-35` baseline | `tenderNo` / `bidPackageNo`，optional，不生成。           |
| External contract number  | `EX-35` baseline | `Contract.customerContractNo`，optional，不生成。         |
| Sequence period           | `EX-35` baseline | 年度，首版使用服务端当前时间年份。                        |
| Public route grammar      | `N/A`            | 本片不新增或改 public route path。                        |

## 4. 命令与接口边界

| Surface / Command                  | Input Change                                                        | Output Change                                               | Permission Boundary  | Result |
| ---------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------- | ------ |
| `LeadService.createLead`           | 移除 `leadCode` 输入。                                              | 返回 `leadNo`。                                             | `lead:write`         | Frozen |
| `LeadService.convertToProject`     | 移除 `projectCode` 输入；保留 `projectName?` / `plannedSignAt?`。   | 返回 `projectNo` 与来源线索摘要中的 `leadNo`。              | `lead:write`         | Frozen |
| `ProjectService.createAndSave`     | 移除 `projectCode` 输入；新增 `customerProjectNo?`。                | 返回 `projectNo` / `customerProjectNo`。                    | `project:write`      | Frozen |
| `ContractService.createAndSave`    | 移除 `contractNo` 输入；新增 `customerContractNo?`。                | 返回系统生成 `contractNo` / optional `customerContractNo`。 | `contract:write`     | Frozen |
| `ProjectCostService` create paths  | 保持无 `recordNo` 输入。                                            | 返回正式 `recordNo`。                                       | existing cost write  | Frozen |
| Bid commercial process create/list | 新增 optional `tenderNo?` / `bidPackageNo?`，均为外部编号，不生成。 | summary / workspace 输出同名字段。                          | `project:write/read` | Frozen |

Public route impact:

- New route: `N/A`
- Changed route path: `N/A`
- Authoritative inventory update required: `No`
- OpenAPI impact: request / response schema changes only

## 5. 持久化边界

| Table                                 | Change                                                                             | Result  |
| ------------------------------------- | ---------------------------------------------------------------------------------- | ------- |
| `poms.business_number_sequence`       | 新表：`scope`、`period`、`next_value`、`prefix`、`padding`、audit / version 字段。 | Pending |
| `poms.lead`                           | `lead_code` -> `lead_no`，唯一约束保留。                                           | Pending |
| `poms.project`                        | `project_code` -> `project_no`；新增 nullable `customer_project_no`。              | Pending |
| `poms.contract`                       | 保留 `contract_no`；新增 nullable `customer_contract_no`。                         | Pending |
| `poms.project_actual_cost_record`     | `record_no` 改为 not-null unique；存量开发数据由 migration 补齐。                  | Pending |
| `poms.project_bid_commercial_process` | 新增 nullable `tender_no` / `bid_package_no`。                                     | Pending |

Sequence scopes:

| Scope               | Prefix   | Period | Padding |
| ------------------- | -------- | ------ | ------- |
| `lead`              | `LD`     | year   | 6       |
| `project`           | `PRJ`    | year   | 6       |
| `contract`          | `CT`     | year   | 6       |
| `cost-payment-fact` | `AC-PAY` | year   | 6       |
| `cost-invoice`      | `AC-INV` | year   | 6       |
| `cost-expense`      | `AC-EXP` | year   | 6       |
| `cost-procurement`  | `AC-PRC` | year   | 6       |
| `cost-labor`        | `AC-LBR` | year   | 6       |

## 6. 一致性结论

- Document -> code: pending implementation.
- Public route inventory -> route: no route path change; no inventory row required.
- DTO / contract -> controller: create DTOs must remove system number inputs.
- Migration -> entity: migration first, then entities.
- Entity -> shared contract / OpenAPI: all renamed output fields must be synchronized.
- Query -> view: query summaries must expose generated number fields and optional external fields.
- Frontend: deferred to `FE-30`; this slice may leave admin build blocked until `FE-30` is implemented in the same batch or next slice.

## 7. 测试与校验

| Check                            | Required | Command / Evidence                               | Result  | Gap / Reason            |
| -------------------------------- | -------- | ------------------------------------------------ | ------- | ----------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                 | Pending |                         |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                | Pending |                         |
| Unit tests                       | Yes      | focused lead/project/contract/project-cost specs | Pending |                         |
| API E2E                          | Yes      | focused lead / contract workflow where feasible  | Pending |                         |
| Admin lint/build                 | No       | deferred to `FE-30`                              | N/A     | frontend-only follow-up |
| OpenAPI generation / client diff | Yes      | `poms-api:openapi` + `shared-api-client:check`   | Pending |                         |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-check`  | Pending |                         |
| Markdown                         | Yes      | `corepack pnpm run format:md:check`              | Pending |                         |
| Diff whitespace                  | Yes      | `git diff --check`                               | Pending |                         |

## 8. 例外与风险

| Exception ID                    | Level | Scope                        | Approved By | Cleanup Owner  | Cleanup Due | Notes                                                            |
| ------------------------------- | ----- | ---------------------------- | ----------- | -------------- | ----------- | ---------------------------------------------------------------- |
| `EX35-E1-DEV-NO-HISTORY-COMPAT` | `E1`  | 不保留旧编号 DTO / UI 兼容层 | `Codex`     | `EX-35A owner` | `EX-35A G4` | 本片按开发期 direct cutover 执行，G4 时关闭。                    |
| `EX35A-E1-FRONTEND-DEFERRED`    | `E1`  | 前端表单 / 展示改造不在本片  | `Codex`     | `FE-30 owner`  | `FE-30 G4`  | generated client 完成后由 `FE-30` 接入，不允许前端本地生成编号。 |

## 9. G1 结论

- Gate Status: `G1 = Pass`
- Approved By: `Codex`
- Approved At: `2026-04-26`
- Conditions:
  1. 先写 migration / entity，再改 service / DTO / contract。
  2. 编号生成必须在后端服务中完成，不能使用 `select max + 1`、`Date.now()`、随机数或前端生成。
  3. 若 admin build 因前端旧表单失败，必须记录为 `FE-30` 交付前的已知前端缺口，不能把 `EX-35A` 误标为完整产品体验。
