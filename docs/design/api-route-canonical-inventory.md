# API Canonical Inventory

**文档状态**: Active
**最后更新**: 2026-04-16
**适用范围**: `POMS` API 路由 canonical grammar 落地、drift 盘点与批量整改执行底表
**关联文档**:

- 上游设计:
  - `poms-design-progress.md`
  - `interface-openapi-dto-design.md`
  - `interface-command-design.md`
- 同级设计:
  - `api-route-governance-discussion-draft.md`
  - `ex-08-contract-handover-gate-baseline.md`
  - `ex-09b-commission-freeze-command-query-baseline.md`
- 相关 ADR:
  - `../adr/015-api-route-canonical-grammar.md`

## 1. 文档定位

本文件是 `ADR-015` 落地后的 authoritative inventory。

用途只有三个：

1. 固定每个 API capability 的 canonical route。
2. 明确当前实现路由、当前设计路由与 canonical route 之间的 drift。
3. 为后续批量整改提供执行底表，而不是继续在多个 baseline、tracker 和记叙性文档里重复找接口。

本文件不是：

- OpenAPI 生成物
- 业务设计正文替代品
- tracker
- 历史归档文档

## 2. Source Priority

单条记录的判断顺序统一按以下优先级执行：

1. `Accepted` ADR
2. 当前 authoritative 设计文档
3. 当前已实现 controller
4. OpenAPI / generated client
5. tracker / progress / archive 中的派生性引用

若发生冲突：

- canonical route 以 `ADR-015` 与后续已回写的 authoritative 设计文档为准
- tracker / progress / archive 只作为事实留痕，不反向定义 canonical route

## 3. 字段说明

| 字段                        | 含义                                                              |
| --------------------------- | ----------------------------------------------------------------- |
| `Domain`                    | 业务域或模块归属                                                  |
| `Capability`                | 单条 API 能力名称；一行只表达一个能力，不按文档 mention 拆行      |
| `Canonical Route`           | 按 `ADR-015` 固定的正式 canonical route                           |
| `Current Implemented Route` | 当前 controller 已落地的真实路由；如存在 legacy alias，一并列出   |
| `Current Design Route`      | 当前 authoritative 设计文档中正在写的路由；如存在漂移，按事实记录 |
| `Authority`                 | 当前 canonical 直接依据的设计源                                   |
| `Drift Type`                | 当前主要偏差类型                                                  |
| `Action`                    | 下一步整改动作                                                    |
| `Batch`                     | 计划所属整改批次                                                  |
| `Status`                    | 当前执行状态                                                      |

## 4. Status / Drift Vocabulary

### 4.1 Status

| Status                 | 含义                                   |
| ---------------------- | -------------------------------------- |
| `aligned`              | canonical、设计与实现已一致            |
| `implementation-drift` | canonical 已定，实现仍未收敛           |
| `design-drift`         | canonical 已定，设计文档仍未收敛       |
| `dual-drift`           | 设计与实现都未收敛，且彼此也不完全一致 |
| `planned`              | canonical 已定，但能力尚未进入实现     |

### 4.2 Drift Type

| Drift Type                     | 含义                                                 |
| ------------------------------ | ---------------------------------------------------- |
| `slash-vs-colon-action`        | action 路由风格漂移                                  |
| `page-suffix-query`            | `/detail`、`/summary`、`/current` 等页面后缀写进 URI |
| `api-prefix-in-design`         | 设计文档写入 `/api` 前缀                             |
| `nested-vs-top-level-identity` | 顶层 identity 与父资源嵌套 identity 并存             |
| `resourceization-required`     | 应升级为独立资源而非继续保留 action suffix           |
| `legacy-alias-present`         | 仍存在待清退的旧路由 alias                           |

## 5. Batch 1 Inventory

### 5.1 EX-08 Project Handover

| Domain             | Capability                            | Canonical Route                               | Current Implemented Route                     | Current Design Route                          | Authority                                     | Drift Type | Action | Batch | Status    |
| ------------------ | ------------------------------------- | --------------------------------------------- | --------------------------------------------- | --------------------------------------------- | --------------------------------------------- | ---------- | ------ | ----- | --------- |
| `project-handover` | `getProjectContractHandoverAggregate` | `GET /projects/{projectId}/contract-handover` | `GET /projects/:projectId/contract-handover`  | `GET /projects/{projectId}/contract-handover` | `ADR-015` + `EX-08` route governance          | `N/A`      | 保持   | `B1`  | `aligned` |
| `project-handover` | `getProjectHandoverAggregate`         | `GET /projects/{projectId}/project-handover`  | `GET /projects/:projectId/project-handover`   | `GET /projects/{projectId}/project-handover`  | `ADR-015` + `EX-08` route governance          | `N/A`      | 保持   | `B1`  | `aligned` |
| `project-handover` | `getProjectHandover`                  | `GET /project-handovers/{id}`                 | `GET /project-handovers/:handoverId`          | `GET /project-handovers/{id}`                 | `ADR-015` + `EX-08` route governance          | `N/A`      | 保持   | `B1`  | `aligned` |
| `project-handover` | `confirmProjectHandover`              | `POST /project-handovers/{id}:confirm`        | `POST /project-handovers/:handoverId:confirm` | `POST /project-handovers/{id}:confirm`        | `ADR-015` + `interface-openapi-dto-design.md` | `N/A`      | 保持   | `B1`  | `aligned` |
| `project-handover` | `rebaselineContractHandover`          | `POST /contract-handover-rebaselines`         | `POST /contract-handover-rebaselines`         | `POST /contract-handover-rebaselines`         | `ADR-015` + `interface-openapi-dto-design.md` | `N/A`      | 保持   | `B1`  | `aligned` |

### 5.2 EX-09 Commission Freeze / Change

| Domain       | Capability                         | Canonical Route                                   | Current Implemented Route                      | Current Design Route                              | Authority                                                         | Drift Type                 | Action                                                                                                      | Batch | Status    |
| ------------ | ---------------------------------- | ------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- | ----- | --------- |
| `commission` | `getCommissionRoleAssignment`      | `GET /commission-role-assignments/{id}`           | `GET /commission-role-assignments/:id`         | `GET /commission-role-assignments/{id}`           | `ADR-015` + `EX-09` route governance                              | `N/A`                      | 已在 `EX-15D` 去掉 `/detail`，统一 item detail canonical path                                               | `B1`  | `aligned` |
| `commission` | `freezeCommissionRoleAssignment`   | `POST /commission-role-assignments/{id}:freeze`   | `POST /commission-role-assignments/:id:freeze` | `POST /commission-role-assignments/{id}:freeze`   | `ADR-015` + `interface-openapi-dto-design.md`                     | `N/A`                      | project-scoped legacy freeze alias 已在 `EX-15D` 清退，当前实现与 canonical inventory 一致                  | `B1`  | `aligned` |
| `commission` | `submitCommissionFreezeDispute`    | `POST /commission-freeze-disputes`                | N/A                                            | `POST /commission-freeze-disputes`                | `ADR-015` + `ex-09d-commission-freeze-dispute-change-baseline.md` | `resourceization-required` | `EX-09D` 按 dispute-first 创建 `CommissionFreezeDisputeRecord`；不再落 direct `CommissionRoleChangeRequest` | `B1`  | `planned` |
| `commission` | `getCommissionFreezeDispute`       | `GET /commission-freeze-disputes/{id}`            | N/A                                            | `GET /commission-freeze-disputes/{id}`            | `ADR-015` + `ex-09d-commission-freeze-dispute-change-baseline.md` | `resourceization-required` | 争议详情 query、摘要链与 guard 必须与 `submitCommissionFreezeDispute` 同轮冻结                              | `B1`  | `planned` |
| `commission` | `arbitrateCommissionFreezeDispute` | `POST /commission-freeze-disputes/{id}:arbitrate` | N/A                                            | `POST /commission-freeze-disputes/{id}:arbitrate` | `ADR-015` + `ex-09d-commission-freeze-dispute-change-baseline.md` | `resourceization-required` | 仲裁命令必须生成稳定 change request / replacement chain，不得原地覆盖冻结版本                               | `B1`  | `planned` |
| `commission` | `getCommissionFreezeChangeRequest` | `GET /commission-freeze-change-requests/{id}`     | N/A                                            | `GET /commission-freeze-change-requests/{id}`     | `ADR-015` + `ex-09d-commission-freeze-dispute-change-baseline.md` | `resourceization-required` | `CommissionFreezeChangeRequest` 为仲裁后的受控变更详情资源；当前不保留 direct create route                  | `B1`  | `planned` |

## 6. 批次推进原则

1. `B1` 先处理 `EX-08`、`EX-09` 与 commission 相关高优先级能力。
2. 单个 batch 内同时收口：
   - authoritative 设计文档
   - controller
   - OpenAPI
   - generated client
   - tests
3. tracker / progress / archive 只在 authoritative 文档与实现收口后再回写。
4. 默认直接切换，不为仓库内可控调用方保留过渡路由。
