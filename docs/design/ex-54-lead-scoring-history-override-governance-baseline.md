# EX-54 线索评分历史与人工覆盖治理基线

> 状态: G1 baseline
> 日期: 2026-05-06
> 关联 tracker: EX-54
> 前置: EX-47 线索评分与闸口解释
> 后续实施: EX-54A 后端运行时, FE-56 前端入口, EX-55 智能评分增强评估

## 1. 目标

EX-54 是治理基线, 不直接交付运行时代码。它冻结线索评分从“当前值”升级到“可解释历史 + 受控人工覆盖”时的业务语义、接口边界、持久化边界、权限审计和后续实施切片。

本基线需要支持:

- 销售和主管能看到评分为什么变化, 变化发生在什么时候, 由哪些线索事实触发。
- 主管可以在明确理由、权限和审计下对评分进行人工覆盖, 并能撤销或被新的覆盖记录 supersede。
- 系统评分和人工有效评分同时可解释, 不把人工覆盖伪装成系统自动评分。
- 转项目硬闸口继续由事实完整度和状态机决定, 评分与人工覆盖只影响优先级、展示和管理判断。
- 后续智能评分、附件解析或跟进画像增强必须先消费本片冻结的历史 / override 边界, 不能直接覆盖当前评分字段。

## 2. 正式输入

| 输入                      | 结论                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| EX-47 当前评分            | 已交付 `lead.score`、`lead.rating`、`lead.score_reason`、`lead.score_updated_at`, 使用 deterministic `lead-score-v1` 规则同步重算。 |
| EX-47 硬闸口              | 评分不是确认有效或转项目硬闸口; 确认有效 / 转项目继续使用 shared gate helper 的缺口项。                                             |
| EX-47 延后例外            | `EX47-E2-NO-SCORE-HISTORY` 明确把评分历史和版本链留给后续治理切片; EX-54 正式关闭该治理留白。                                       |
| EX-61 销售情报            | 联系人、关系人、竞争态势和销售发现是销售推进事实, 但本片不把这些内容自动纳入评分公式, 更不纳入私人画像或敏感个人信息自动计算。      |
| Route Inventory / ADR-015 | EX-54 需要新增评分历史和评分覆盖 planned routes; 后续 EX-54A 消费这些行并在运行时落地后切为 `aligned`。                             |
| 权限治理                  | 普通线索编辑权限不足以批准人工覆盖; 评分覆盖必须有独立高权限和审计事件。                                                            |

## 3. 范围

### 3.1 Included

- 线索评分历史的快照语义、公式版本、触发条件和去重规则。
- 系统评分、人工覆盖评分和当前有效评分的关系。
- 人工覆盖的提交、审批、驳回、撤销、supersede 和并发控制。
- 历史解释、审计载荷、权限边界和不变式。
- 后续运行时需要实施的 planned route、合同、持久化、迁移和测试清单。

### 3.2 Excluded

- AI 评分、外部画像、OCR、附件内容解析、全文检索或通话转写。
- 基于个人爱好、婚姻、籍贯等私人画像字段的自动评分。
- 把评分阈值、评级或人工覆盖作为确认有效 / 转项目硬闸口。
- 修改 EX-47 scoring formula 或现有 gate missing item 定义。
- 通用审批流引擎、主管辅导任务、销售培训任务或消息推送。
- 线索转项目时把评分历史复制到 Project 评分历史; 评分历史仍属于来源 Lead。

## 4. 核心语义

### 4.1 三类评分

| 概念         | 说明                                                                                   | 是否可人工改写 |
| ------------ | -------------------------------------------------------------------------------------- | -------------- |
| 系统评分     | EX-47 deterministic rule 根据线索事实计算出的 `score/rating/reason`。                  | 否             |
| 人工覆盖评分 | 主管或授权人员基于业务判断提交并批准的覆盖值, 必须有理由、状态、操作者和审计。         | 通过命令变更   |
| 当前有效评分 | 读侧用于优先级展示的投影: 存在 active approved override 时取人工覆盖, 否则取系统评分。 | 由系统投影     |

现有 `lead.score` / `lead.rating` / `lead.score_reason` 的语义继续表示系统评分, 不在 EX-54A 中静默改成有效评分。后续读侧需要新增 `effectiveScore`、`effectiveRating`、`effectiveScoreReason`、`effectiveScoreSource` 和 `activeScoreOverrideId`。

### 4.2 硬闸口不变

评分历史和人工覆盖不得改变以下规则:

1. 确认有效仍只看线索状态和 shared gate helper 认定的事实缺口。
2. 转项目仍要求线索已确认有效、未关闭、未转项目且事实项齐备。
3. 人工覆盖评分不能补齐需求描述、预算、预计金额、紧迫程度、负责人或主责组织。
4. UI 可以把低有效评分作为风险信号, 但不能因为高有效评分隐藏硬闸口缺口。

### 4.3 生命周期

| 对象                    | 状态 / 类型                                                    | 规则                                                                         |
| ----------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Score snapshot          | `system` / `manual-override` / `override-revoked`              | append-only, 不更新历史记录。                                                |
| Score override          | `pending` / `approved` / `rejected` / `revoked` / `superseded` | 同一 Lead 同时最多一个 pending override, 最多一个 active approved override。 |
| Current effective score | `system` / `manual-override`                                   | 读侧投影, 不作为业务状态机。                                                 |

转换约束:

- 新建覆盖请求默认为 `pending`。
- 批准新的覆盖请求时, 旧的 active approved override 自动进入 `superseded`。
- 撤销 active override 后, 当前有效评分回退到最新系统评分, 并追加 `override-revoked` 快照。
- 已关闭或已转项目 Lead 不允许新增 active override; 历史仍可读取。

## 5. 历史快照规则

后续 EX-54A 必须新增评分历史快照, 用于解释“当时为什么是这个分数”。

### 5.1 快照触发

系统评分快照至少在以下场景产生:

1. 创建 Lead 后形成初始系统评分。
2. `PATCH /leads/{id}` 修改评分组件并导致系统评分 tuple 变化。
3. 申领 / 改派导致 owner 分变化。
4. 确认有效、关闭或转项目命令执行后, gate summary 或业务状态变化需要留痕时。
5. 评分公式版本变更后的首次重算。

为避免无意义历史膨胀, 后续运行时应使用 `formulaVersion + componentFactsHash + gateSummaryHash + systemScore + systemRating` 去重; tuple 未变化时不追加 system 快照。

### 5.2 快照内容

| 字段                             | 规则                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `leadId`                         | 线索身份。                                                                                           |
| `snapshotKind`                   | `system` / `manual-override` / `override-revoked`。                                                  |
| `formulaVersion`                 | 第一版固定 `lead-score-v1`; 手工覆盖也必须记录基于哪个系统版本发生。                                 |
| `systemScore/systemRating`       | 当时系统评分结果。                                                                                   |
| `effectiveScore/effectiveRating` | 当时读侧有效评分结果。                                                                               |
| `scoreReason`                    | 面向用户的简短解释, 不放私人画像。                                                                   |
| `componentBreakdown`             | 来源、需求、预算、金额、紧迫度、决策日期、owner 等 EX-47 组件分。                                    |
| `gateSummarySnapshot`            | 当时确认有效 / 转项目缺口摘要, 用于解释评分不等于闸口。                                              |
| `sourceCommand`                  | `create` / `update` / `claim` / `assign` / `qualify` / `convert` / `close` / `override` / `revoke`。 |
| `sourceRecordId`                 | 可选, 关联 override 或动作记录。                                                                     |
| `createdBy/createdAt`            | 操作者与时间; 系统触发时记录触发命令 actor。                                                         |

快照中不得保存附件原文、OCR 内容、外部画像、联系人私人偏好、婚姻、籍贯等自由画像信息。未来 EX-55 若评估智能增强, 也必须只写入可解释、可授权、可审计的评分因子摘要。

## 6. 人工覆盖规则

### 6.1 提交

覆盖请求必须包含:

- `score`: 0-100 的整数。
- `reason`: 必填, 说明为什么系统评分无法表达当前业务判断。
- `expectedLeadRowVersion`: 必填, 防止基于过期线索事实提交覆盖。

`rating` 默认由 `score` 按 EX-47 阈值派生, 第一版不支持“分数和评级不一致”的覆盖。若未来业务需要只改评级, 必须另开治理切片解释原因。

### 6.2 审批与撤销

| 操作             | 权限                  | 必填信息                                    | 结果                                         |
| ---------------- | --------------------- | ------------------------------------------- | -------------------------------------------- |
| Submit override  | `lead:write`          | `score`、`reason`、`expectedLeadRowVersion` | 新增 pending override。                      |
| Approve override | `lead:score:override` | `expectedOverrideRowVersion`、可选 `note`   | 覆盖生效, 追加 manual snapshot。             |
| Reject override  | `lead:score:override` | `reason`、`expectedOverrideRowVersion`      | 请求终止, 不影响有效评分。                   |
| Revoke override  | `lead:score:override` | `reason`、`expectedOverrideRowVersion`      | active override 失效, 有效评分回退系统评分。 |

普通 `PATCH /leads/{id}` 不得直接写入覆盖字段。任何手工覆盖都必须走独立 command route, 留下 override record 和 audit event。

### 6.3 冲突与并发

- 同一 Lead 已有 pending override 时, 不允许再提交第二个 pending 请求。
- 审批时必须校验 override rowVersion; 线索事实变化不自动作废 pending 请求, 但审批视图必须展示“请求后系统评分是否已变化”。
- 批准新 override 会 supersede 旧 active override, 不物理删除旧记录。
- 撤销必须保留撤销原因和 actor, 不允许静默回退。

## 7. Planned API

这些 route 已同步登记到 `api-route-canonical-inventory.md`, 状态为 `planned`。

| Capability                 | Route                                     | 说明                                           |
| -------------------------- | ----------------------------------------- | ---------------------------------------------- |
| `listLeadScoreHistory`     | `GET /leads/{id}/score-history`           | 读取单条线索评分系统快照、人工覆盖和撤销历史。 |
| `submitLeadScoreOverride`  | `POST /leads/{id}/score-overrides`        | 在线索上下文提交人工覆盖请求。                 |
| `approveLeadScoreOverride` | `POST /lead-score-overrides/{id}:approve` | 批准覆盖请求并让其成为当前有效评分。           |
| `rejectLeadScoreOverride`  | `POST /lead-score-overrides/{id}:reject`  | 驳回 pending 覆盖请求。                        |
| `revokeLeadScoreOverride`  | `POST /lead-score-overrides/{id}:revoke`  | 撤销 active 覆盖并回退系统评分。               |

评分历史是 Lead 子资源; 覆盖记录批准 / 驳回 / 撤销时, override 本身拥有稳定 identity, 因此使用顶层 `lead-score-overrides/{id}:action`。

## 8. Planned Contracts

后续 EX-54A 至少需要新增或扩展:

| Contract                                          | 用途                                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `LeadEffectiveScoreSource`                        | `system` / `manual-override`。                                                                                      |
| `LeadScoreSnapshotKind`                           | `system` / `manual-override` / `override-revoked`。                                                                 |
| `LeadScoreOverrideStatus`                         | `pending` / `approved` / `rejected` / `revoked` / `superseded`。                                                    |
| `LeadScoreHistoryView`                            | 评分历史总览, 包含当前系统评分、当前有效评分、active override、pending override 和 timeline。                       |
| `LeadScoreHistoryItem`                            | 单条快照或覆盖事件, 包含 score、rating、reason、actor、source、createdAt。                                          |
| `SubmitLeadScoreOverrideRequest`                  | `score`、`reason`、`expectedLeadRowVersion`。                                                                       |
| `ApproveLeadScoreOverrideRequest`                 | `expectedOverrideRowVersion`、可选 `note`。                                                                         |
| `RejectLeadScoreOverrideRequest`                  | `reason`、`expectedOverrideRowVersion`。                                                                            |
| `RevokeLeadScoreOverrideRequest`                  | `reason`、`expectedOverrideRowVersion`。                                                                            |
| `LeadSummary` / `LeadListView` / `LeadDetailView` | 新增 `effectiveScore`、`effectiveRating`、`effectiveScoreReason`、`effectiveScoreSource`、`activeScoreOverrideId`。 |

现有 `LeadListQuery.rating` 第一版继续表示系统评级筛选。若前端需要按有效评级筛选, EX-54A 必须新增显式 `effectiveRating` query 参数, 不得悄悄改变现有参数含义。

## 9. Planned Persistence

### 9.1 `lead_score_snapshot`

| 字段                               | 规则                               |
| ---------------------------------- | ---------------------------------- |
| `id`                               | UUID。                             |
| `lead_id`                          | FK -> `lead.id`。                  |
| `snapshot_kind`                    | `LeadScoreSnapshotKind`。          |
| `formula_version`                  | 第一版 `lead-score-v1`。           |
| `system_score/system_rating`       | 当时系统评分。                     |
| `effective_score/effective_rating` | 当时有效评分。                     |
| `score_reason`                     | 展示解释。                         |
| `component_breakdown`              | JSONB, 只保存 EX-47 评分组件摘要。 |
| `gate_summary_snapshot`            | JSONB, 保存当时硬闸口摘要。        |
| `source_command`                   | 触发命令。                         |
| `source_record_id`                 | 可选 override / action record ID。 |
| `created_by/created_at`            | 操作者和时间。                     |

### 9.2 `lead_score_override`

| 字段                                               | 规则                                 |
| -------------------------------------------------- | ------------------------------------ |
| `id`                                               | UUID。                               |
| `lead_id`                                          | FK -> `lead.id`。                    |
| `requested_score/requested_rating`                 | 请求覆盖值, rating 由 score 派生。   |
| `reason`                                           | 提交原因, 必填。                     |
| `status`                                           | `LeadScoreOverrideStatus`。          |
| `requested_by/requested_at`                        | 提交人和时间。                       |
| `approved_by/approved_at`                          | 批准人和时间。                       |
| `rejected_by/rejected_at/reject_reason`            | 驳回人、时间和原因。                 |
| `revoked_by/revoked_at/revoke_reason`              | 撤销人、时间和原因。                 |
| `superseded_by_id`                                 | 被新 override 替代时指向新记录。     |
| `system_score_at_request/system_rating_at_request` | 提交时系统评分, 便于审批时解释差异。 |
| `row_version`                                      | 乐观并发控制。                       |

第一版可以通过查询 active approved override 投影有效评分; 如后续列表性能要求新增 `lead.effective_*` 投影列, 必须仍保持 `lead.score/rating` 为系统评分语义。

## 10. 权限与审计

| 操作         | 权限                  | 审计事件                                                         |
| ------------ | --------------------- | ---------------------------------------------------------------- |
| 读取评分历史 | `lead:read`           | 可记录读取审计, 不写业务事实。                                   |
| 提交人工覆盖 | `lead:write`          | `lead.score_override_submitted`。                                |
| 批准人工覆盖 | `lead:score:override` | `lead.score_override_approved` + `lead.score_snapshot_created`。 |
| 驳回人工覆盖 | `lead:score:override` | `lead.score_override_rejected`。                                 |
| 撤销人工覆盖 | `lead:score:override` | `lead.score_override_revoked` + `lead.score_snapshot_created`。  |
| 系统评分快照 | 触发命令原权限        | `lead.score_snapshot_created`。                                  |

审计载荷必须包含 `leadId`、`overrideId`、before / after score、before / after rating、actor、reason、requestId 和 formula version。不得在审计里写入附件原文或私人画像。

## 11. 前端体验边界

后续 FE-56 应按以下体验边界消费 EX-54A:

1. 线索列表突出当前有效评分, 同时能查看系统评分和人工覆盖标识。
2. 线索详情提供评分历史 drawer / tab, 按时间展示系统快照、覆盖提交、批准、驳回、撤销和 supersede。
3. 人工覆盖入口只在有权限且 Lead 未关闭 / 未转项目时显示。
4. 覆盖提交表单必须要求原因, 并提示“不会补齐转项目闸口缺口”。
5. 审批 / 撤销入口必须展示当前系统评分是否已和提交时不同。
6. 前端不得自行计算评分、评级或闸口结果。

## 12. 后续实施清单

- 新增 route inventory planned rows 对应的 controller / service / DTO。
- 新增 shared contracts、OpenAPI 和 generated client。
- 新增 `lead_score_snapshot`、`lead_score_override` migration、entity 和 DB check。
- 扩展 Lead 读侧 DTO 的有效评分投影。
- 扩展评分重算路径, 在 tuple 变化时追加 system snapshot。
- 实现覆盖提交、批准、驳回、撤销、supersede 和并发校验。
- 补齐权限种子 `lead:score:override`。
- 补齐后端 focused tests 和前端评分历史 / 覆盖入口 tests。

## 13. 验收边界

EX-54 作为治理基线的完成条件:

- 系统评分、人工覆盖和当前有效评分的语义已冻结。
- 评分历史快照、覆盖生命周期、权限和审计边界已冻结。
- Planned routes 已登记到 route inventory。
- Tracker 已新增后续运行时 / 前端切片, 并把 EX-54 关闭为 `G4`。

EX-54 不要求运行时代码、migration、OpenAPI、generated client 或前端截图。

## 14. G4 结论

- Gate Status: `Pass`
- Closed At: 2026-05-06
- Delivered:
  1. 冻结线索评分历史、公式版本、快照去重和解释边界。
  2. 冻结人工覆盖提交、审批、驳回、撤销、supersede、权限和审计规则。
  3. 明确 `lead.score/rating` 继续表示系统评分, 有效评分以后续显式字段投影。
  4. 在 `api-route-canonical-inventory.md` 登记评分历史与覆盖 planned routes。
  5. 在 tracker 新增 `EX-54A` 后端运行时和 `FE-56` 前端入口切片。
- Remaining follow-up slices:
  1. `EX-54A`: 后端运行时、迁移、OpenAPI / generated client、权限与测试。
  2. `FE-56`: 线索列表 / 详情评分历史和人工覆盖前端入口。
  3. `EX-55`: AI / OCR / 附件 / 跟进画像增强评估, 不得绕过 EX-54 历史与 override 边界。
