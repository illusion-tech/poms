# POMS 第二阶段第三批实现映射准备

**文档状态**: Archived
**最后更新**: 2026-04-04
**适用范围**: `POMS` 第二阶段第三批五个流程健壮性与审批增强专题，在正式规则范围锁定后进入实现设计层并完成六份总文档首轮写回前后的映射桥接
**关联文档**:

- 上游设计:
  - `../reviews/phase2-review-checklist.md`
  - `../reviews/phase2-review-comprehensive-assessment.md`
  - `../reviews/phase2-review-follow-up-plan.md`
  - `phase2-third-batch-scope.md`
  - `../../phase2-mainline-implementation-design-matrix.md`
- 同级设计:
  - `../../interface-command-design.md`
  - `../../interface-openapi-dto-design.md`
  - `../../query-view-boundary-design.md`
  - `../../data-model-prerequisites.md`
  - `../../table-structure-freeze-design.md`
  - `../../schema-ddl-design.md`
  - `../../implementation-delivery-guide.md`

---

## 1. 文档目标

本文档不是新增业务规则，而是把第三批五个专题已经锁定的流程健壮性与审批增强口径，翻译成进入实现设计层可直接使用的工程输入。

本文档重点回答以下问题：

- 第三批五个专题分别需要补哪些写侧命令或系统派生动作
- 第三批专题分别需要哪些读侧历史视图、审批摘要与守卫约束
- 哪些字段必须进入 DTO，哪些不能再退回页面临时判断
- 哪些请求链、揭示链、争议链、再基线化链需要在数据模型、表结构和 schema 层补齐
- 第三批何时才算真正进入与前两批同等深度的实现设计闭环

本文档不替代第三批范围说明，也不直接替代 OpenAPI 或 DDL；它是第三批规则与实现设计之间的桥接层。

---

## 2. 使用边界

当前第三批映射准备统一遵循以下边界：

1. 不回头改写第一批已经冻结的主对象、主事实和敏感边界。
2. 不回头改写第二批已经写回总文档的经营可信源、历史口径和 gate 绑定规则。
3. 不在本文件中直接冻结最终接口 path、最终表名或最终字段名，但要把动作链、审批链、揭示链和争议链说清楚。
4. 若某项第三批映射会反向改变前两批已冻结前提，应升级为评审动作，而不是在本文件中静默改写。

---

## 3. 第三批通用实现映射规则

### 3.1 写侧分类

第三批专题统一拆成四类写侧入口：

1. 受控重开 / 回退接口
   用于签约前回退重估、合同变更再基线化等需要重开上游结论的动作。

2. 例外授权接口
   用于敏感字段短时揭示、审批摘要扩权和到期失效，不应退化为页面直接放宽显示。

3. 争议 / 受控变更接口
   用于冻结后争议发起、审批、仲裁和版本替代，必须保留完整审计链。

4. 系统派生动作
   用于审批摘要包生成、回退影响分析、受控揭示失效和回溯影响计算，不应退化为页面临时拼装。

### 3.2 读侧分类

第三批专题统一落到以下读侧层次：

1. `DetailQuery`
   支撑合同变更再基线化详情、签约前回退详情、短时揭示请求详情和冻结争议详情。

2. `AggregateViewQuery`
   支撑审批摘要包、签约前状态重开影响视图和冻结后变更影响总览。

3. `HistoryQuery`
   支撑回退链、再基线化链、短时揭示授权链、审批摘要生成链和争议 / 仲裁链。

### 3.3 DTO 与字段包规则

第三批专题统一采用以下 DTO 规则：

1. 任何会改变流程路径、审批最小可见、历史解释或冻结后版本关系的字段，不得进入普通 `PatchDto`。
2. 任何回退、再基线化、短时揭示、审批摘要扩权、冻结后争议处理，都必须通过显式命令 DTO 输入与结果 DTO 输出表达。
3. 第三批命令响应 DTO 优先返回当前动作结果、关键引用、链路引用和下一步入口，不直接回传完整聚合详情。
4. 第三批查询响应仍应继续遵守第一批已冻结的敏感投影边界与第二批已冻结的经营可信口径，不因其属于异常流程就默认返回更多原值。

### 3.4 数据模型规则

第三批专题统一要求以下模型特征：

1. 回退、再基线化、短时揭示、审批摘要和冻结争议都必须可追溯。
2. 请求、放行、执行、失效四个状态必须显式分层，不能只靠一组“当前标记”字段。
3. 所有会重开上游流程或放宽敏感可见范围的动作都应具备 `expectedVersion` 或等价并发控制。
4. 审批摘要和短时揭示必须通过稳定包定义与授权记录进入，而不是在审批页组件里临时拼装。

---

## 4. 第三批五专题实现映射总表

| 包    | 专题                     | 写侧实现重点                                   | 读侧实现重点                                                 | DTO / 守卫重点                                                 | 数据模型重点                                                       |
| ----- | ------------------------ | ---------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| `B14` | 合同变更再基线化         | 发起再基线化、确认影响范围、切换移交前有效基线 | 合同到移交承接详情必须解释原始基线、变更影响和当前承接口径   | 变更包引用、影响范围、重建结果不得退回页面说明                 | 再基线化记录、影响链、移交前有效基线替代链                         |
| `B15` | 签约前受控回退与负路径   | 发起回退、批准回退、重开上游工作区             | 承接关系图必须解释回退来源、重开节点、作废结论和待重估状态   | 回退起点 / 终点、回退原因、重开状态必须显式进入命令 DTO        | 回退请求、工作区重开记录、被作废结论链                             |
| `B16` | 例外查看与短时揭示       | 发起揭示申请、批准揭示、到期失效               | 详情页与审批页必须解释当前揭示范围、有效期与授权来源         | 揭示字段包、用途、过期时间不得混入普通查询 DTO                 | 揭示申请、揭示授权记录、揭示访问审计链                             |
| `B17` | 审批摘要字段包           | 生成审批摘要包、刷新场景级投影结果             | 审批页必须返回最小摘要字段集，而不是详情页字段的随机子集     | `summaryPackageKey`、`projectionLevel`、`exportPolicy` 显式化  | 审批摘要包定义、审批摘要快照、场景级字段投影来源                   |
| `B18` | 冻结后受控变更与争议处理 | 发起冻结后争议、审批变更、确认替代冻结版本     | 提成冻结详情必须解释争议来源、仲裁结论、回溯影响和当前有效版 | 争议原因、影响角色、回溯模式、仲裁结论不得进入普通冻结维护 DTO | 冻结后争议记录、受控变更申请、替代冻结版本链、对已生效计算的影响链 |

---

## 5. 分专题实现映射

### 5.1 `B14` 合同变更再基线化

#### 写侧建议

- 需要补一组再基线化动作：
  - 发起合同变更再基线化
  - 确认影响的移交前事实范围
  - 切换当前承接链路消费的有效基线
- 不允许继续通过口头解释把正式变更和移交前承接口径偏差混成同一原因。

#### 读侧建议

- 至少补齐或下钻以下读模型：
  - `ContractToHandoverRebaselineHistoryView`
  - `HandoverBaselineImpactView`
- 这些视图必须能同时解释：
  - 原始基线摘要
  - 变更包影响摘要
  - 当前移交前有效基线

#### DTO / 守卫建议

- `contractAmendmentId`、`rebaselineReason`、`affectedHandoverItemIds`、`effectiveBaselineAfterId` 必须进入命令 DTO。
- 合同页或移交页不得通过普通维护按钮直接重写当前承接基线。

#### 数据模型建议

- 至少能稳定表达：
  - `ContractHandoverRebaselineRecord`
  - `affectedHandoverItemId[]`
  - `supersedesBaselineId`
  - `effectiveHandoverBaselineId`

### 5.2 `B15` 签约前受控回退与负路径

#### 写侧建议

- 需要补一组受控回退动作：
  - 发起签约前回退
  - 审批回退并重开工作区
  - 标记原结论为待重估 / 已失效
- 若发生否决、重估或范围重大变更，不得继续让用户在线下重跑再回填结果。

#### 读侧建议

- 承接关系图与签约前总览至少应返回：
  - 当前回退链状态
  - 被重开工作区
  - 原结论失效摘要
  - 待重估责任人

#### DTO / 守卫建议

- `rollbackFromStage`、`rollbackToStage`、`rollbackReasonCode`、`reopenWorkspaceKeys[]` 必须进入命令 DTO。
- 普通工作区保存不得顺带把已通过节点改回“待评估”。

#### 数据模型建议

- 至少需要稳定表达：
  - `PresigningRollbackRequest`
  - `PresigningWorkspaceReopenRecord`
  - `invalidatesDecisionId`
  - `reopenedWorkspaceKey[]`

### 5.3 `B16` 例外查看与短时揭示

#### 写侧建议

- 需要补一组例外揭示动作：
  - 发起敏感字段短时揭示申请
  - 批准 / 驳回揭示
  - 到期自动失效或受控提前撤销
- 不允许继续通过截屏、线下群发或人工口头补充绕过权限边界。

#### 读侧建议

- 至少补齐以下读模型：
  - `SensitiveFieldRevealRequestDetailView`
  - `SensitiveFieldRevealHistoryView`
  - `RevealScopePreviewView`
- 这些视图必须能同时解释：
  - 申请范围
  - 授权范围
  - 失效时间
  - 已访问审计摘要

#### DTO / 守卫建议

- `fieldPackageKey`、`usageReason`、`expiresAt`、`revealScopeSummary` 必须进入命令 DTO 或结果 DTO。
- 查询层不得因为当前存在短时揭示就永久放宽详情页字段投影。

#### 数据模型建议

- 至少需要稳定表达：
  - `SensitiveFieldRevealRequest`
  - `SensitiveFieldRevealGrant`
  - `grantedFieldPackageKey`
  - `expiresAt`
  - `SensitiveFieldRevealAudit`

### 5.4 `B17` 审批摘要字段包

#### 写侧建议

- 第三批优先采用系统派生动作生成审批摘要包与场景级投影结果。
- 若审批场景要求人工确认摘要范围，应补独立复核动作，而不是让页面组件自由裁字段。

#### 读侧建议

- 报价评审、移交确认、第二阶段发放和异常调整审批页至少应返回：
  - 摘要包标识
  - 场景级最小字段集
  - 遮罩 / 摘要 / 完整投影级别
  - 导出 / 打印策略

#### DTO / 守卫建议

- `summaryPackageKey`、`projectionLevel`、`exportPolicy`、`approvalScenarioKey` 必须进入响应 DTO。
- 不得把详情页字段直接拿来当审批摘要字段，造成最小可见基线失效。

#### 数据模型建议

- 至少需要稳定表达：
  - `ApprovalSummaryPackageDefinition`
  - `ApprovalSummarySnapshot`
  - `ApprovalSummaryFieldProjection`
  - `approvalScenarioKey`

### 5.5 `B18` 冻结后受控变更与争议处理

#### 写侧建议

- 需要补一组争议与受控变更动作：
  - 发起冻结后争议
  - 审批 / 仲裁争议
  - 生成替代冻结版本并标记回溯影响
- 冻结后错误修正不得继续通过直接改版本或线下口头仲裁处理。

#### 读侧建议

- `CommissionFreezeDisputeHistoryView`、`CommissionFreezeImpactAssessmentView` 至少应返回：
  - 争议来源
  - 涉及角色 / 权重
  - 仲裁结论
  - 是否影响既有计算 / 发放
  - 当前有效冻结版本摘要

#### DTO / 守卫建议

- `disputeReason`、`affectedAssignmentIds[]`、`recalculationImpactMode`、`arbitrationDecision` 必须进入命令 DTO。
- 冻结页普通维护动作不得顺带改写已冻结版本或已生效提成结果。

#### 数据模型建议

- 至少需要稳定表达：
  - `CommissionFreezeDisputeRecord`
  - `CommissionFreezeChangeRequest`
  - `replacementFreezeVersionId`
  - `recalculationImpactMode`

---

## 6. 已完成的首轮实现设计总文档写回

截至 2026-04-02，第三批已按本文件桥接结果完成以下六份实现设计总文档的首轮写回：

1. `../../interface-command-design.md`
  已补第三批专用命令，尤其是：
   - 合同变更再基线化
   - 签约前回退 / 重开
   - 敏感字段短时揭示申请 / 失效
   - 审批摘要包生成 / 复核
   - 冻结后争议处理与受控变更

2. `../../interface-openapi-dto-design.md`
  已补第三批 DTO 边界，尤其是：
   - 回退 / 再基线化 DTO
   - 例外揭示 DTO
   - 审批摘要包 DTO
   - 争议与仲裁 DTO

3. `../../query-view-boundary-design.md`
  已补第三批查询视图，尤其是：
   - 回退链 / 重开链历史视图
   - 再基线化影响视图
   - 短时揭示历史视图
   - 审批摘要包视图
   - 冻结争议历史与影响视图

4. `../../data-model-prerequisites.md`、`../../table-structure-freeze-design.md`、`../../schema-ddl-design.md`
  已补第三批涉及的回退请求、再基线化记录、短时揭示授权、审批摘要包、冻结争议记录与替代版本链。

5. 关键业务主文档首轮写回
  已完成以下业务主文档的首轮写回：
   - `../../phase2-contract-to-handover-workspace.md`
   - `../../phase2-presigning-workspace-handoff-map.md`
   - `../../phase2-data-permission-and-sensitive-visibility-design.md`
   - `../../phase2-commission-freeze-at-handover.md`
   - `../../phase2-commission-staged-payout-adjustment-paths.md`
   - `../../workflow-and-approval-design.md`

---

## 7. 第三批七层闭环前的最小检查项

在把第三批认定为已进入与前两批同等深度的实现设计之前，建议至少确认以下事项：

1. `B14 ~ B18` 都已映射到明确的 `command / query / DTO / data model / table freeze / schema / DDL / guard` 补点。
2. 合同变更再基线化与签约前受控回退都已具备正式历史追溯链，而不是只存在于备注解释。
3. 短时揭示与审批摘要包已经通过稳定授权链和场景包进入，而不是仍依赖页面临时拼装。
4. 冻结后争议处理已经能解释对既有提成计算 / 发放的回溯影响。
5. 第三批补点没有破坏第一批敏感投影边界与第二批经营可信源口径。

---

## 8. 当前结论

第三批五个专题当前已经不再适合继续只作为“后续增强项”停留在 follow-up 表格里。

更合理的推进方式是：

1. 第三批五个专题已按本文档映射到 command、query、DTO、数据模型、表结构和 guard 补点。
2. 上述补点已完成六份实现设计总文档的首轮写回，不再只分散在流程说明和权限说明里。
3. 上述补点已继续下沉到剩余关键联动文档，包括 `../../phase2-project-handover-gate-workspace.md`、`../../phase2-commission-stage-gate-overview-workspace.md` 与 `../../phase2-estimated-to-actual-cost-bridge.md` 的必要补点。
4. 下一步应在此基础上继续做跨总文档、业务主文档与联动文档的一致性复核，而不是回退到仅保留桥接入口。

换句话说：

- 第一批已经证明主事实和主边界可以下钻
- 第二批已经证明经营可信源与历史回看口径可以下钻
- 第三批当前已经完成首轮总文档下钻、关键业务主文档写回，以及剩余关键联动文档补点，下一步要做的是继续收口跨文档一致性
- 只有这样，`L1 / L3 / L5` 才能在当前范围内完成更接近真实业务运行的实现设计闭环
