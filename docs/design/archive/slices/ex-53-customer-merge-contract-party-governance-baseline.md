# EX-53 客户主数据合并与合同签约主体绑定治理基线

- Task ID: `EX-53`
- Slice type: `governance`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-53`
- Public route surface: no runtime route change in this slice
- Status: `G1`
- G1 Date: 2026-05-04

## 1. Background

`EX-42` 已把客户提升为第一类主数据，并把 `Lead.customerId`、`Project.customerId` 纳入正式链路；同时它明确延后两类高风险能力：

1. 客户合并运行时命令。
2. 合同签约主体独立建模。

这两类能力会直接影响客户主档、别名去重、线索 / 项目 / 合同身份外键、历史快照、权限和审计。`EX-53` 只冻结治理边界，不修改客户 / 合同运行时代码、不新增 public route、不做数据库迁移。

## 2. Current Boundary

| Area              | Current State                                                                           | Governance Decision                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Customer identity | `customer.id` 是客户身份 SSOT，`lead.customer_id` 和 `project.customer_id` 已正式引用。 | 未来任何合并命令都只能改身份 FK，不能把名称快照当身份来源。                                           |
| Customer alias    | `customer_alias` 支持同客户内规范化别名去重，并允许跨客户出现相同规范化名称。           | 跨客户重名是合并候选，不是自动合并依据；合并时必须去重迁移别名。                                      |
| Merge placeholder | `customer.merged_into_customer_id` 已预留，`merged` 客户不允许继续被业务选择。          | 合并必须通过受控命令写入该字段，不允许直接 PATCH `status` / `mergedIntoCustomerId` 完成业务合并。     |
| Contract party    | `contract` 当前只绑定 `project_id`，签约主体尚未独立字段化。                            | 未来合同运行时切片必须新增签约客户绑定，不再长期依赖 Project 客户投影表达合同签约主体。               |
| Historical name   | `lead.customer_name` / `project.customer_name` 是创建或更新身份时写入的名称快照。       | 合并和签约主体调整不得重写历史快照；快照表达当时业务上下文，当前身份由 FK 和解析后的 canonical 表达。 |

## 3. Customer Merge Command Boundary

未来运行时切片必须以显式命令实现客户合并，禁止通过普通更新接口拼装合并语义。

| Capability             | Canonical Route                     | Request Contract                                           | Guard            | Notes                                                      |
| ---------------------- | ----------------------------------- | ---------------------------------------------------------- | ---------------- | ---------------------------------------------------------- |
| Preview customer merge | `POST /customers/{id}:previewMerge` | `targetCustomerId`、可选 `includeOpenBusinessObjects`      | `customer:merge` | 只返回影响范围，不写库；`id` 是源客户。                    |
| Merge customer         | `POST /customers/{id}:merge`        | `targetCustomerId`、`reason`、`expectedRowVersion`、`mode` | `customer:merge` | 事务内完成；`id` 是源客户，`targetCustomerId` 是目标客户。 |

`mode` 第一版只允许 `canonicalize-current-identity`，含义是：

1. 源客户必须是 `active` 或 `inactive`，且未被合并。
2. 目标客户必须是 `active`，且未被合并。
3. 源客户和目标客户不能相同，不能形成合并链路或循环。
4. 事务内将当前业务对象身份 FK 从源客户改到目标客户。
5. 源客户状态改为 `merged`，`merged_into_customer_id` 指向目标客户。
6. 源客户所有别名迁移到目标客户；目标客户已存在的同 `normalized_name + alias_type` 别名不重复插入。
7. 源客户主别名降级为普通别名；目标客户只能保留一个主别名。
8. 写入 `customer_merge_record` 和平台审计日志。

第一版不支持批量模糊合并、不支持撤销合并、不支持物理删除源客户。

## 4. Business Reference Rules

客户合并时，运行时切片必须按“当前身份 FK 可迁移，历史快照不迁移”的原则处理。

| Object                                | FK Handling                                    | Snapshot Handling                      | Rule                                                                |
| ------------------------------------- | ---------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `lead.customer_id`                    | 源客户改为目标客户。                           | `lead.customer_name` 不重写。          | 未转项目和已转项目线索都保留原名称快照，列表可展示 canonical 客户。 |
| `project.customer_id`                 | 源客户改为目标客户。                           | `project.customer_name` 不重写。       | 项目主身份归一到目标客户，历史快照保留立项时名称。                  |
| Future `contract.signing_customer_id` | 源客户改为目标客户。                           | 签约主体名称快照不重写。               | 合并不改变合同签署时留存的主体名称证据。                            |
| Attachment / follow-up links          | 如果通过业务对象间接归属，不直接迁移附件本体。 | 附件原始文件名、描述和审计日志不重写。 | 附件身份跟随业务对象读取；共享附件不复制。                          |
| Audit / state history                 | 不回写旧记录。                                 | 不回写旧记录。                         | 历史记录必须能说明“当时是什么”和“后来如何合并”。                    |

如果后续发现某类对象需要保留源客户 FK 而不是迁移，必须单独创建治理切片说明理由，不能在合并命令中隐式分叉。

## 5. Contract Signing Customer Boundary

未来合同切片必须把合同签约主体从 Project 客户投影提升为合同自己的结构化绑定。

| Field                            | Required Rule                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `contract.signing_customer_id`   | 合同进入正式签约 / 生效状态前必须非空，默认取 `project.customer_id`。             |
| `contract.signing_customer_name` | 合同签约主体名称快照，绑定或生效时从 `customer.display_name` 写入，之后不自动改。 |
| `contract.signing_customer_no`   | 可选快照字段，用于合同归档和外部凭证核对。                                        |

签约主体变更必须通过显式命令完成：

| Capability                     | Canonical Route                            | Request Contract                             | Guard            |
| ------------------------------ | ------------------------------------------ | -------------------------------------------- | ---------------- |
| Bind contract signing customer | `POST /contracts/{id}:bindSigningCustomer` | `customerId`、`reason`、`expectedRowVersion` | `contract:write` |

命令规则：

1. 只能绑定 `active` 客户，不能绑定 `merged` 客户。
2. 合同已盖章、已归档、已作废后，第一版禁止直接改签约主体；必须通过补充协议或合同变更切片处理。
3. 变更签约主体时必须记录原因、操作者、前后客户 ID 和前后快照名称。
4. 合同签约主体参与客户合并：合并源客户后，当前 FK 指向目标客户，签约快照保持不变。

本片不建付款方、开票方、最终用户、集团 / 子公司层级和多签约方模型；这些属于未来多 party 切片。

## 6. Persistence Baseline For Future Runtime Slice

未来 runtime slice 至少需要以下持久化增量：

| Object                  | Required Fields / Rules                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `customer_merge_record` | `id`、`source_customer_id`、`target_customer_id`、`reason`、`merged_by`、`merged_at`、`business_object_counts`、`alias_migration_summary`、`created_at`。             |
| `contract`              | `signing_customer_id`、`signing_customer_name`、可选 `signing_customer_no`、`row_version` 校验；现有开发数据迁移直接从 `project.customer_id` 回填，不保留 null 兼容。 |
| Audit log               | 记录 `customer_merged`、`contract_signing_customer_bound`，包含 before / after、reason、actor、request id。                                                           |

当前仍处于开发阶段，未来迁移不做旧值兼容层、不允许保留“未知签约主体”作为长期运行态。

## 7. Permission And Audit Boundary

| Operation                      | Required Guard   | Audit Requirement                                                                |
| ------------------------------ | ---------------- | -------------------------------------------------------------------------------- |
| Preview customer merge         | `customer:merge` | 可记录 query audit；不写业务事实。                                               |
| Execute customer merge         | `customer:merge` | 必须写业务 merge record 和平台审计。                                             |
| Bind contract signing customer | `contract:write` | 必须写平台审计，包含 reason、before / after customer id 与名称快照。             |
| View merged customer detail    | `customer:read`  | 详情页必须显示 merged target；不得允许把 merged 客户作为新业务对象身份继续选择。 |

`customer:merge` 是独立高权限，不应默认并入普通 `customer:write`。

## 8. Non-goals

- 不在 `EX-53` 修改 API、entity、migration、OpenAPI 或 Admin 页面。
- 不实现客户合并命令。
- 不实现合同签约主体字段。
- 不做历史兼容 mapping、旧值 fallback 或双写。
- 不做客户集团、付款方、开票方、最终用户、多签约方建模。
- 不做自动模糊合并或批量合并。

## 9. Validation Plan

本片是治理基线，必需检查：

| Check                                             | Purpose                |
| ------------------------------------------------- | ---------------------- |
| `corepack pnpm run format:md:check`               | 文档表格格式回归。     |
| `git diff --check`                                | 补丁 whitespace 检查。 |
| Tracker row updated from `G0` to `G4` at closeout | 确认治理任务完成闭环。 |

未来 runtime slice 进入 G1 前，必须先回写 API route inventory，并扩展迁移 / OpenAPI / generated client / API tests 验证矩阵。

## 10. G1 Decision

`EX-53` 可以进入收口：它只冻结客户合并和合同签约主体治理边界，不改变运行时行为。后续实现应拆分为客户合并 runtime slice 与合同签约主体 runtime slice。
