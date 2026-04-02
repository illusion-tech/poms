# POMS 第二阶段主线实现设计覆盖矩阵

**文档状态**: Active
**最后更新**: 2026-04-02
**适用范围**: `POMS` 第二阶段 `L1 ~ L5` 五条主线从业务基线进入实现设计层的覆盖证明、阻断判断与推进矩阵
**关联文档**:

- 主线与路线:
  - `phase2-mainline-delivery-plan.md`
  - `phase2-experience-optimization-roadmap.md`
  - `phase2-detailed-design-index-map.md`
- 审阅与收口:
  - `phase2-review-comprehensive-assessment.md`
  - `phase2-review-follow-up-plan.md`
  - `phase2-first-batch-scope.md`
  - `phase2-first-batch-implementation-mapping.md`
  - `phase2-second-batch-scope.md`
  - `phase2-second-batch-implementation-mapping.md`
- 实现设计总文档:
  - `interface-command-design.md`
  - `interface-openapi-dto-design.md`
  - `query-view-boundary-design.md`
  - `data-model-prerequisites.md`
  - `table-structure-freeze-design.md`
  - `schema-ddl-design.md`

---

## 1. 文档目标

本文档不再回答“22 个审阅问题如何分批处理”这一单点问题，而是直接回答一个更关键的问题：

`L1 ~ L5` 五条主线，是否都存在从业务基线走到实现设计闭环的明确路径。

本文档重点回答以下问题：

- 五条主线是否都需要实现设计
- 如何证明五条主线都能完成实现设计，而不是只完成审阅收口
- 四个批次与五条主线之间到底是什么关系
- 哪些问题会阻断主线继续下钻，哪些不会
- 第四批不做，是否会阻断第二阶段继续进入实现设计

---

## 2. 判定原则

要证明 `L1 ~ L5` 都可以完成实现设计，不能只看“22 个问题是否都已关闭”，而应同时满足以下四个条件：

1. 每条主线都已有正式业务基线文档。
2. 每条主线都能映射到统一的七层实现设计结构：
   - `command`
   - `query`
   - `DTO`
   - `data model`
   - `table freeze`
   - `schema / DDL`
   - `guard`
3. 影响该主线当前继续下钻的阻断项，已被识别并纳入明确批次。
4. 不属于当前范围的后置项，已被显式声明为范围限制，而不是隐性未决项。

只要以上四条成立，就可以证明：

- 该主线存在完整实现设计路径
- 当前只是推进深度不同，而不是“是否会做”的问题

---

## 3. 两个轴必须分开看

第二阶段至少有两个必须同时成立、但不能混用的轴：

### 3.1 主线轴

主线轴回答：第二阶段业务上要建设什么。

- `L1` 签约前统一工作区
- `L2` 执行期成本归集主线
- `L3` 签约与移交强节点
- `L4` 项目经营核算视图
- `L5` 提成制度化操作体验

### 3.2 收口轴

收口轴回答：为了安全进入实现，哪些问题要先收口、哪些可以后置。

- 第一批：主对象与主事实前置
- 第二批：经营与成本可信源前置
- 第三批：流程健壮性与审批增强
- 第四批：受控后置或范围限制

结论：

- 四个批次不是五条主线的替代物
- 四个批次只能管理“问题收口顺序”
- 五条主线是否完成实现设计，要看主线自身是否完成七层下钻

---

## 4. 五条主线实现设计覆盖矩阵

| 主线 | 业务基线是否齐备 | 需要覆盖的实现设计层                              | 当前已覆盖层                                                                                                                                                                                                                                                      | 当前阻断批次           | 明确可后置项                       | 是否存在完整实现设计路径 |
| ---- | ---------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------- | ------------------------ |
| `L1` | 是               | `command/query/DTO/data model/table/schema/guard` | 已覆盖 `command/query/DTO` 的首轮下钻，并已把第三批受控回退 / 负路径补点写回六份实现设计总文档与关键业务主文档                                                                                                                                                    | 第一批、第三批         | 第四批中的多币种扩展               | 是                       |
| `L2` | 是               | `command/query/DTO/data model/table/schema/guard` | 已完成第一批七层下钻，并已把第二批分摊 / 阶段 / 税务 / 时点快照补点写回六份实现设计总文档，同时补齐移交前再基线化与执行期基线衔接，并显式固定税务影响摘要与快照输出                                                                                               | 第一批、第二批、第三批 | 无核心后置；部分表达增强可后置     | 是                       |
| `L3` | 是               | `command/query/DTO/data model/table/schema/guard` | 已覆盖 `command/query/DTO` 的首轮下钻，并已把第三批合同变更再基线化补点写回六份实现设计总文档、关键业务主文档与联动 gate 文档，同时补齐统一收口结果对移交前有效基线、移交记录与冻结版本的联合追溯                                                                 | 第一批、第三批         | 第四批中的分期移交                 | 是                       |
| `L4` | 是               | `command/query/DTO/data model/table/schema/guard` | 已完成第一批前置覆盖，并已把第二批核算 / 历史回看 / 信号规则补点写回六份实现设计总文档，同时补齐 `phase2-project-business-outcome-overview.md`、`phase2-project-variance-risk-explanation.md` 与 `phase2-business-accounting-feedback-rules.md` 的稳定消费 / 传递 | 第一批、第二批         | 部分展示增强可后置                 | 是                       |
| `L5` | 是               | `command/query/DTO/data model/table/schema/guard` | 已完成第一批前置覆盖，并已把第二批 `L4 -> L5` gate 绑定与解释链补点、第三批争议处理 / 审批增强补点写回六份实现设计总文档、关键业务主文档与联动 gate 文档，同时补齐经营基线版本、税务影响摘要、快照消费与冻结结果联合追溯，并贯穿到分阶段发放与最终结算页          | 第一批、第二批、第三批 | 第四批中的异常摘要增强与细粒度通知 | 是                       |

这张矩阵已经足以证明一件事：

- `L1 ~ L5` 五条主线全部都已经具备进入实现设计的正式入口
- 当前还没有全部做完，只是推进深度不同
- “是否能完成”不是问题，真正的问题是“当前推进到哪一层、哪些阻断项要先处理”

---

## 5. 分主线完成路径证明

### 5.1 `L1` 签约前统一工作区

`L1` 已具备完整实现设计路径，原因如下：

1. 业务基线已经齐备：
   - `phase2-presigning-initiation-advancement-workspace.md`
   - `phase2-presigning-project-overview-workspace.md`
   - `phase2-presigning-technical-cost-workspace.md`
   - `phase2-presigning-bid-commercial-workspace.md`
   - `phase2-presigning-pricing-margin-workspace.md`
   - `phase2-presigning-contract-readiness-workspace.md`
2. 第一批已把 `R2-001` 与 `R4-001` 纳入实现设计前置，因此 `签约就绪` 承接与商业放行差异复核已有正式下钻入口。
3. 第三批的 `R3-001` 是负路径增强，不是否定 `L1` 主链实现设计本身。
4. 第四批的多币种扩展已显式后置，不阻断单币种主线继续下钻。

因此 `L1` 的完成路径是明确且闭环的：

`业务基线 -> 第一批主链收口 -> command/query/DTO -> data model/table/schema/guard -> 第三批补负路径 -> 范围外能力后置`

### 5.2 `L2` 执行期成本归集主线

`L2` 已具备完整实现设计路径，原因如下：

1. 业务基线已经齐备：
   - `phase2-project-actual-cost-records.md`
   - `phase2-cost-source-to-project-record-mapping.md`
   - `phase2-actual-cost-accumulation-stage-view.md`
   - `phase2-estimated-to-actual-cost-bridge.md`
2. 第一批已把 `R3-002` 纳入实现设计前置，因此人力成本可信源已有正式实现入口。
3. 第二批的 `R1-002`、`R2-002`、`R1-004`、`R2-003` 是在 `L2` 主链上继续补可信源、历史回看和核算稳定性的必经步骤，而不是另起一条新主线。
4. 这意味着 `L2` 不是“能不能做完”，而是必须先完成第一批，再继续做第二批。

因此 `L2` 的完成路径是：

`业务基线 -> 第一批成本率治理 -> 第二批分摊/阶段/税务/时点快照 -> command/query/DTO/data model/table/schema/guard 全层闭环`

### 5.3 `L3` 签约与移交强节点

`L3` 已具备完整实现设计路径，原因如下：

1. 业务基线已经齐备：
   - `phase2-contract-to-handover-workspace.md`
   - `phase2-project-handover-gate-workspace.md`
   - `phase2-commission-freeze-at-handover.md`
   - `phase2-handover-closure-rules.md`
2. 第一批已把 `R4-005` 纳入实现设计前置，因此多合同、冻结模式和移交流程的主事实已进入实现设计入口。
3. 当前 `phase2-handover-closure-rules.md` 已进一步把当前有效合同集合、移交前有效基线快照、移交记录和冻结版本收成统一收口结果，确保后续 `L4 / L5` 不再各自引用不同依据。
4. 第三批的 `R1-003` 属于签后变更再基线化；第四批的 `R3-003` 属于分期移交扩展。两者都建立在 `L3` 主链已经存在的前提下。
5. 也就是说，`L3` 的主链实现设计不会因为第四批不做而失效，只会失去未来扩展能力。

因此 `L3` 的完成路径是：

`业务基线 -> 第一批多合同与冻结主链 -> 第三批再基线化与统一收口追溯 -> data model/table/schema/guard -> 第四批分期移交按范围决定`

### 5.4 `L4` 项目经营核算视图

`L4` 已具备完整实现设计路径，原因如下：

1. 业务基线已经齐备：
   - `phase2-project-business-outcome-overview.md`
   - `phase2-project-unified-accounting-view-caliber.md`
   - `phase2-project-variance-risk-explanation.md`
   - `phase2-business-accounting-feedback-rules.md`
2. `L4` 的实现设计天然依赖 `L1`、`L2`、`L3` 输出的可信输入，这一点已在路线图和主线地图中明确。
3. 第一批只是补齐多合同口径前提和敏感投影边界；真正让 `L4` 完整进入实现设计的，是第二批的税务影响、时点快照、公式边界、变更包基线和 `L4 -> L5 gate` 绑定矩阵，这些补点当前已被 `L4-T01 / T03 / T04` 稳定消费与向下传递。
4. 这不是阻止 `L4` 最终完成，而是说明 `L4` 的完成路径明确依赖第二批收口。

因此 `L4` 的完成路径是：

`业务基线 -> 第一批汇总前提与敏感边界 -> 第二批核算可信源与信号规则 -> command/query/DTO/data model/table/schema/guard 完整下钻`

### 5.5 `L5` 提成制度化操作体验

`L5` 已具备完整实现设计路径，原因如下：

1. 业务基线已经齐备：
   - `phase2-commission-stage-gate-overview-workspace.md`
   - `phase2-commission-staged-payout-adjustment-paths.md`
   - `phase2-commission-retention-final-settlement.md`
   - `phase2-commission-rule-explanation-language.md`
2. 第一批已把 `R2-004`、`R1-006`、`R4-005` 纳入实现设计前置，因此阶段 gate、第二阶段发放前置、敏感边界和多合同前提已进入实现设计入口。
3. 当前 `phase2-commission-stage-gate-overview-workspace.md`、`phase2-commission-staged-payout-adjustment-paths.md` 与 `phase2-commission-retention-final-settlement.md` 已进一步把冻结版本、经营基线版本、税务影响摘要和经营快照版本贯穿到 gate、分阶段发放、异常调整与最终结算链路。
4. 第二批的 `R4-003` 会决定经营信号如何真正阻断或放行提成阶段；第三批的 `R3-006`、`R4-004` 会补争议处理和审批摘要。
5. 第四批中的异常摘要增强和细粒度通知，即使不做，也不阻断 `L5` 主链进入实现设计。

因此 `L5` 的完成路径是：

`业务基线 -> 第一批 gate 前置与敏感边界 -> 第二批 L4/L5 绑定 -> gate/发放/最终结算统一引用链 -> 第三批争议/审批增强 -> 第四批表达增强按范围决定`

---

## 6. 为什么第四批不做也不阻断第二阶段继续推进

第四批的定义不是“还没做的重要核心主链”，而是“当前受控后置或范围限制项”。

只要第四批中的内容满足以下条件，就不应阻断第二阶段继续推进：

1. 当前范围内已有明确替代口径或限制口径。
2. 不会改变当前可信源归属。
3. 不会改变当前主对象边界。
4. 不会让已确定的主链规则失效。

当前第四批中的典型项都满足这一点：

- 多币种与汇率扩展：当前单币种范围已明确。
- 分期移交：当前整体移交范围已明确。
- 异常调整摘要展示：属于展示增强，不改变 `L5` 主链。
- 细粒度通知与协作触发：属于横切增强，不改变当前主事实。

因此，第四批不做，不等于第二阶段不能进入实现设计。

真正会阻断第二阶段继续推进的，是第一批或第二批里那些会改变主对象、主事实、可信源、主链路或关键权限边界的未决项。

---

## 7. 第二阶段主线完成的真正判定标准

第二阶段主线是否“从基线推进到了实现设计”，不应按“四个批次是否全部完成”判断，而应按以下标准判断：

1. 该主线业务基线文档已形成。
2. 该主线当前层级的阻断项已被处理、隔离或显式后置。
3. 该主线已经或能够明确进入七层实现设计结构。
4. 该主线的后续增强项没有被误当作当前主链阻断项。

满足以上条件，就可以认定：

- 该主线可以继续推进到后续实现设计
- 它不需要等所有审阅问题全部清零后才继续

---

## 8. 当前结论

如果目标是“充分自证 `L1 ~ L5` 的实现设计都可以全部完成”，当前已经可以给出正向结论：

1. 五条主线的业务基线都已齐备。
2. 五条主线都已被映射到统一的七层实现设计结构。
3. 22 个审阅问题的四个批次，只是阻断项收口顺序，不是主线完成定义。
4. 第一批和第二批负责解决会改变主事实和可信源的关键问题。
5. 第三批和第四批中可后置项，不阻断第二阶段继续进入实现设计。

因此，第二阶段当前真正需要做的，不是继续争论“批次做没做完”，而是继续把五条主线按当前批次推进到更深的实现设计层，直到各自主链在当前范围内完成闭环。
