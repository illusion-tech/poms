# EX-15E4 platform / contract / contract-finance / project canonical route 基线包

- Gate Status: `Pass`
- Parent: `EX-15E`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-17`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-15E4`

## 1. 范围

- 本次目标:
  - 冻结 `platform`、`contract`、`contract-finance`、`project` 与 `runtime-audit` 余项 active capability 的 canonical route。
  - 清退剩余 `slash-action`、`/basic`、`/current-*` 页面后缀与 `contract-finance` 历史模块命名空间。
  - 为 controller、OpenAPI、generated client、HTTP E2E 与 authoritative inventory 提供单一实施输入。
- 本次覆盖:
  - `platform` 用户 / 角色 / 组织 / 导航 / 权限现有 public capability
  - `contract` 合同列表 / 详情 / 创建 / 普通更新 / 提交审核 / 生效 / 当前审批摘要
  - `project` 项目列表 / 详情 / 创建 / 普通更新
  - `contract-finance` 回款 / 采购承诺 / 发票 / 付款现有 public capability
  - `runtime-audit` 路由拒绝安全事件记录
- 本次明确不做:
  - 不新增长期兼容 alias。
  - 不扩大到尚未落地的 `contract-amendment`、`receivable-plan`、`reverseReceiptRecord`、`voidPaymentRecord` 等后续 capability。
  - 不引入 persistence schema 变更。

## 2. 正式输入

| Input Type           | Document / Source                                    | Section / Anchor                                  | Status    | Notes                                                                                   |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------- | --------- | --------------------------------------------------------------------------------------- |
| ADR                  | `docs/adr/015-api-route-canonical-grammar.md`        | §4.1 ~ §4.5                                       | Accepted  | 本片统一遵循 resource-first + colon-action + stable noun subresource                    |
| DTO / OpenAPI design | `docs/design/interface-openapi-dto-design.md`        | §5.0 平台治理域、§5.1 销售流程域、§5.2 合同资金域 | Corrected | 已给出平台 / 合同 / 合同资金域首批命令 canonical grammar                                |
| Query / view design  | `docs/design/query-view-boundary-design.md`          | §5.1 ~ §5.2、§5.8                                 | Active    | 约束 project / contract 列表详情、合同台账、回款 / 发票列表与安全事件查询边界           |
| Domain design        | `docs/design/contract-finance-design.md`             | §12、§15                                          | Active    | 回款 / 发票 / 付款 / 承诺记录对象边界已稳定；路径仍需按 ADR-015 收口                    |
| Domain design        | `docs/design/platform-governance/org-unit-design.md` | 最小接口建议                                      | Corrected | 现有 `org-units/tree` 与 slash-action 仍是历史表达，本片统一纠正                        |
| Runtime fact         | `apps/poms-api/src/app/features/*/*.controller.ts`   | platform / contract / project / contract-finance  | Fact      | 当前控制器仍存在 slash-action、`/basic`、`/current-approval` 与 `contract-finance` 前缀 |

## 3. 本次 SSOT

| Concern                    | SSOT                                                                  | Implementation Rule                                                                                      |
| -------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Platform command grammar   | `interface-openapi-dto-design.md` §5.0                                | 启停 / 移动统一用 item `colon-action`；成员集合全量替换统一用 `PUT /subresource`                         |
| Contract identity          | `Contract`                                                            | item detail / update / command 一律围绕 `/contracts/{id}` 展开；`/basic` 与 `current-*` 不再作为正式路径 |
| Project identity           | `Project`                                                             | 普通维护回到 `PATCH /projects/{id}`；不再保留 `/basic` 页面后缀                                          |
| Contract finance resources | `ReceiptRecord` / `PayableRecord` / `InvoiceRecord` / `PaymentRecord` | 以记录资源自身为正式边界；不继续保留 `/contract-finance/...` 历史模块命名空间                            |
| Parent subcollection       | `Contract` / `Project` 下天然依附集合                                 | create / list 走父资源名词型子集合；item action 不再混入父级 identity                                    |
| Audit command grammar      | `RuntimeAudit`                                                        | `recordRouteDeniedEvent` 为 collection custom method，统一用 `POST /security-events:recordRouteDenied`   |
| No compatibility           | `ADR-015` default direct cutover                                      | controller、OpenAPI、generated client、调用方、E2E 同步切换，不保留 legacy route                         |

## 4. 裁决结论

| Capability                       | Canonical Route                                | Key Decision                                                         |
| -------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| `listUsers`                      | `GET /platform/users`                          | 保持                                                                 |
| `getUser`                        | `GET /platform/users/{id}`                     | 保持                                                                 |
| `updateUser`                     | `PATCH /platform/users/{id}`                   | 保持                                                                 |
| `createPlatformUser`             | `POST /platform/users`                         | 保持                                                                 |
| `activatePlatformUser`           | `POST /platform/users/{id}:activate`           | slash-action -> colon-action                                         |
| `deactivatePlatformUser`         | `POST /platform/users/{id}:deactivate`         | slash-action -> colon-action                                         |
| `assignUserRoles`                | `PUT /platform/users/{id}/roles`               | 当前语义是全量替换成员集合，不再继续使用 `POST`                      |
| `assignUserOrgMemberships`       | `PUT /platform/users/{id}/org-memberships`     | 当前语义是全量替换成员集合，不再继续使用 `POST`                      |
| `listRoles`                      | `GET /platform/roles`                          | 保持                                                                 |
| `listPermissions`                | `GET /platform/permissions`                    | 只读字典查询；与 `roles` 分离保持清晰                                |
| `getRole`                        | `GET /platform/roles/{id}`                     | 保持                                                                 |
| `createPlatformRole`             | `POST /platform/roles`                         | 保持                                                                 |
| `updateRole`                     | `PATCH /platform/roles/{id}`                   | 保持                                                                 |
| `activatePlatformRole`           | `POST /platform/roles/{id}:activate`           | slash-action -> colon-action                                         |
| `deactivatePlatformRole`         | `POST /platform/roles/{id}:deactivate`         | slash-action -> colon-action                                         |
| `assignRolePermissions`          | `PUT /platform/roles/{id}/permissions`         | 当前语义是全量替换权限集合，不再继续使用 `POST`                      |
| `listOrgUnits`                   | `GET /platform/org-units`                      | 保持                                                                 |
| `listOrgUnitTree`                | `GET /platform/org-unit-tree`                  | `tree` 不是页面后缀；本片提升为稳定聚合 query resource               |
| `getOrgUnit`                     | `GET /platform/org-units/{id}`                 | 保持                                                                 |
| `createOrgUnit`                  | `POST /platform/org-units`                     | 保持                                                                 |
| `updateOrgUnit`                  | `PATCH /platform/org-units/{id}`               | 保持                                                                 |
| `activateOrgUnit`                | `POST /platform/org-units/{id}:activate`       | slash-action -> colon-action                                         |
| `deactivateOrgUnit`              | `POST /platform/org-units/{id}:deactivate`     | slash-action -> colon-action                                         |
| `moveOrgUnit`                    | `POST /platform/org-units/{id}:move`           | slash-action -> colon-action                                         |
| `getPlatformNavigation`          | `GET /platform/navigation`                     | 保持                                                                 |
| `syncNavigation`                 | `POST /platform/navigation:sync`               | collection custom method；不继续使用 `/sync`                         |
| `listContracts`                  | `GET /contracts`                               | 保持                                                                 |
| `getContractByNo`                | `GET /contracts/no/{contractNo}`               | 现有唯一业务键 lookup 暂保持；不构成 ADR-015 明确禁止项              |
| `getContract`                    | `GET /contracts/{id}`                          | 保持                                                                 |
| `getContractApprovalRecord`      | `GET /contracts/{id}/approval-record`          | `current-approval` 页面后缀改为稳定单例子资源                        |
| `createContract`                 | `POST /contracts`                              | 保持                                                                 |
| `updateContract`                 | `PATCH /contracts/{id}`                        | 普通维护回到标准资源更新；清退 `/basic`                              |
| `submitContractReview`           | `POST /contracts/{id}:submitReview`            | slash-action -> colon-action                                         |
| `activateContract`               | `POST /contracts/{id}:activate`                | slash-action -> colon-action                                         |
| `listProjects`                   | `GET /projects`                                | 保持                                                                 |
| `getProjectByCode`               | `GET /projects/code/{projectCode}`             | 现有唯一业务键 lookup 暂保持；不构成 ADR-015 明确禁止项              |
| `getProject`                     | `GET /projects/{id}`                           | 保持                                                                 |
| `createProject`                  | `POST /projects`                               | 保持                                                                 |
| `updateProject`                  | `PATCH /projects/{id}`                         | 普通维护回到标准资源更新；清退 `/basic`                              |
| `listReceiptRecords`             | `GET /contracts/{contractId}/receipt-records`  | 去掉 `contract-finance` 命名空间；集合名显式对齐资源名               |
| `createReceiptRecord`            | `POST /contracts/{contractId}/receipt-records` | 去掉 `contract-finance` 命名空间；保持父资源天然子集合 create        |
| `confirmReceiptRecord`           | `POST /receipt-records/{id}:confirm`           | item action 不再混入 `{contractId}`；slash-action -> colon-action    |
| `listPayableRecords`             | `GET /projects/{projectId}/payable-records`    | 去掉 `contract-finance` 命名空间；集合名显式对齐资源名               |
| `getPayableRecord`               | `GET /payable-records/{id}`                    | 去掉 `contract-finance` 命名空间                                     |
| `createPayableRecord`            | `POST /projects/{projectId}/payable-records`   | 去掉 `contract-finance` 命名空间                                     |
| `updatePayableRecord`            | `PATCH /payable-records/{id}`                  | 去掉 `contract-finance` 命名空间                                     |
| `closePayableRecord`             | `POST /payable-records/{id}:close`             | slash-action -> colon-action                                         |
| `voidPayableRecord`              | `POST /payable-records/{id}:void`              | slash-action -> colon-action                                         |
| `listInvoiceRecords`             | `GET /projects/{projectId}/invoice-records`    | 去掉 `contract-finance` 命名空间；集合名显式对齐资源名               |
| `getInvoiceRecord`               | `GET /invoice-records/{id}`                    | 去掉 `contract-finance` 命名空间                                     |
| `createInvoiceRecord`            | `POST /projects/{projectId}/invoice-records`   | 去掉 `contract-finance` 命名空间                                     |
| `updateInvoiceRecord`            | `PATCH /invoice-records/{id}`                  | 去掉 `contract-finance` 命名空间                                     |
| `markInvoiceException`           | `POST /invoice-records/{id}:markException`     | slash-action -> colon-action                                         |
| `resolveInvoiceException`        | `POST /invoice-records/{id}:resolveException`  | slash-action -> colon-action                                         |
| `closeInvoiceRecord`             | `POST /invoice-records/{id}:close`             | slash-action -> colon-action                                         |
| `listPaymentRecords`             | `GET /projects/{projectId}/payment-records`    | 去掉 `contract-finance` 命名空间；集合名显式对齐资源名               |
| `createPaymentRecord`            | `POST /projects/{projectId}/payment-records`   | 去掉 `contract-finance` 命名空间                                     |
| `confirmPaymentRecord`           | `POST /payment-records/{id}:confirm`           | item action 不再混入 `{projectId}`；slash-action -> colon-action     |
| `listAuditLogs`                  | `GET /audit-logs`                              | 保持                                                                 |
| `listSecurityEvents`             | `GET /security-events`                         | 保持                                                                 |
| `recordRouteDeniedSecurityEvent` | `POST /security-events:recordRouteDenied`      | collection custom method；不继续使用 `/security-events/route-denied` |

## 5. 明确拒绝的方案

1. 继续保留 `/contract-finance/...` 作为 formal public namespace
   - 原因: 这是历史模块分层，不是正式资源边界；`ReceiptRecord`、`PayableRecord`、`InvoiceRecord`、`PaymentRecord` 已有稳定资源名。
2. 继续保留 `/:id/action` slash-action
   - 原因: 已被 `ADR-015` 否决。
3. 继续保留 `/contracts/{id}/current-approval`、`PATCH /resources/{id}/basic`
   - 原因: `current-*`、`/basic` 都是页面 / 表单投影词，不是正式资源边界。
4. 对全量替换子资源关系继续使用 `POST`
   - 原因: `assignUserRoles`、`assignUserOrgMemberships`、`assignRolePermissions` 的语义都是 replace，不是 append-only create。
5. 让 item action 继续混入父资源 identity
   - 原因: `ReceiptRecord`、`PaymentRecord` 已有稳定主键；确认动作不应继续依赖 `{contractId}` 或 `{projectId}`。

## 6. 一致性结论

- Document -> code: 当前 `platform`、`contract`、`project`、`contract-finance`、`runtime-audit` 控制器仍有明显 grammar drift，本片统一 direct cutover。
- Route -> command: 平台成员集合替换语义与当前 `POST` 实现不一致，本片统一收口到 `PUT /subresource`。
- Query -> view: `org-unit-tree` 与 `contract approval record` 都属于稳定聚合 / 单例查询，不应继续使用页面后缀。
- Module -> public API: `contract-finance` 是实现模块名，不是 public resource namespace。

## 7. 测试与校验

| Check                            | Required | Command / Evidence                                  | Result | Gap / Reason                                      |
| -------------------------------- | -------- | --------------------------------------------------- | ------ | ------------------------------------------------- |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                   | Pass   | `contract / contract-finance / platform` 编译通过 |
| Build                            | Yes      | `corepack pnpm nx build poms-admin`                 | Pass   | 管理端调用方已同步切到 canonical route            |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`        | Pass   | 32 suites / 334 tests 通过                        |
| API / integration tests          | Yes      | `corepack pnpm nx run poms-api:openapi`             | Pass   | OpenAPI 已产出 canonical path                     |
| E2E                              | Yes      | `corepack pnpm nx run poms-api-e2e:e2e --runInBand` | Pass   | 10 suites / 59 tests 通过                         |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run shared-api-client:generate`   | Pass   | generated client 已按新 path / method 重生        |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run shared-api-client:check`      | Pass   | 仅存在既有 generator warning，无新增 diff         |
| Migration / schema check         | No       | `N/A`                                               | N/A    | 本片不含 persistence 变更                         |
| Diff hygiene                     | Yes      | `git diff --check`                                  | Pass   | CRLF 告警已用 LF normalize 收口                   |

## 8. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-17`
- Conditions:
  - 进入实现时，必须同步回写 controller、OpenAPI、generated client、调用方、E2E、inventory、tracker 与相关设计文档。
  - 不接受仓库内可控调用方继续保留 legacy route。

## 9. G4 Close-Out

- Gate Status: `Pass`
- Closed At: `2026-04-17`
- Scope:
  - 已完成 `platform`、`contract`、`project`、`contract-finance` 与 `runtime-audit` 剩余 public capability 的 direct cutover。
  - 已清退 `contract-finance` public namespace、剩余 slash-action、`/basic`、`current-approval` 与 `/security-events/route-denied`。
  - 已同步回写 OpenAPI、shared generated client、HTTP E2E、inventory、tracker、progress 与 `org-unit` authoritative 设计。
- Validation:
  - `corepack pnpm nx run poms-api:openapi` `Pass`
  - `corepack pnpm nx run shared-api-client:generate` `Pass`
  - `corepack pnpm nx build poms-api` `Pass`
  - `corepack pnpm nx build poms-admin` `Pass`
  - `corepack pnpm nx test poms-api --runInBand` `Pass`
  - `corepack pnpm nx run poms-api-e2e:e2e --runInBand` `Pass`
  - `corepack pnpm nx run shared-api-client:check` `Pass`
  - `git diff --check` `Pass`
