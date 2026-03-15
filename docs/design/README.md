# 系统设计文档

本目录用于沉淀 `POMS` 的系统设计资产，重点回答以下问题：

- 业务制度如何翻译为系统能力与系统规则
- 核心领域、核心流程、核心状态如何划分
- 平台治理能力与业务域能力如何协同
- 各模块之间的数据边界、职责边界和依赖关系如何稳定下来

本目录中的文档以“主题分类”和“稳定命名”为主，不采用类似 `ADR-001` 的全局顺序编号。

原因是：

- `ADR` 本质上是时间序列的决策记录，编号用于表达决策演进与引用关系
- 设计文档本质上是持续演进的说明书，核心诉求是按主题被查找、按职责被维护，而不是按时间顺序阅读
- 对设计文档使用全局流水号，通常会弱化目录结构，放大时间顺序，反而不利于后续扩展

因此，`POMS` 当前采用：

- `docs/adr/` 保持编号治理
- `docs/design/` 保持分类治理
- 仅当某个分类后续文档数量很多、确实需要固定评审顺序时，再在该分类内部局部编号

## 设计文档分类约定

当前 `docs/design/` 目录建议按以下四类理解和维护。

### 1. 基线设计（Foundation）

用于承载系统级、跨域、长期有效的设计基线，回答“整体怎么做”。

当前文档包括：

- `poms-requirements-spec.md`：系统需求说明，负责把制度条款翻译成系统规则
- `poms-hld.md`：高层设计，负责给出系统蓝图、模块关系和核心边界
- `poms-design-progress.md`：设计进度跟踪，负责管理设计资产状态、依赖关系和下一步产出

### 2. 业务域设计（Domains）

用于承载围绕具体业务域展开的详细设计，回答“这个业务域怎么落地”。

当前文档包括：

- `project-lifecycle-design.md`：项目生命周期设计，聚焦 `Project` 主链路、阶段闸口与里程碑
- `contract-finance-design.md`：合同资金域设计，聚焦合同、回款、成本和发票台账
- `commission-settlement-design.md`：提成结算设计，聚焦提成计算、发放、异常调整与重算
- `workflow-and-approval-design.md`：审批流与风控闸口设计，聚焦审批模型、统一待办与通知审计

### 3. 治理与横切设计（Governance）

用于承载平台治理、授权、导航、组织、横切约束等设计，回答“平台级规则如何统一约束各业务域”。

当前文档包括：

- `business-authorization-matrix.md`：业务对象动作授权矩阵，用于沉淀跨域授权基线
- `platform-governance/README.md`：平台治理域设计入口，聚合总设计、子设计与配套输出物
- `platform-governance/` 子目录下的用户、角色权限、组织、导航等详细设计

### 4. 评审与治理文档（Reviews）

用于承载设计收口、评审检查、评审摘要等过程性资产，回答“当前设计成熟度如何、还差什么”。

当前文档包括：

- `design-convergence-review-checklist.md`：设计收口与评审前一致性清单
- `design-review-execution-checklist.md`：详细设计评审执行清单
- `design-review-follow-up-summary.md`：首轮正式评审后的 follow-up 归并与实现前补齐边界
- `platform-governance/` 子目录下的评审清单与评审摘要文档

## 命名规则

设计文档默认不使用全局编号，优先使用“主题 + 文档类型”的稳定命名方式。

推荐命名模式如下：

- `xxx-requirements-spec.md`：需求说明或规则映射文档
- `xxx-hld.md`：高层设计文档
- `xxx-design.md`：某个领域或专题的详细设计文档
- `xxx-matrix.md`：矩阵类文档，如对象动作、角色权限、字段授权矩阵
- `xxx-mapping.md`：映射类文档，如导航-路由映射、状态映射、对象映射
- `xxx-checklist.md`：检查单、评审前清单、收口清单
- `xxx-summary.md`：评审摘要、结论摘要、阶段性总结
- `README.md`：目录入口文档，只负责索引与阅读路径说明

命名时应优先体现“主题稳定性”，避免使用过强的阶段性词汇，除非文档本身就是过程产物。

## 页头元信息约定

除目录入口型 `README.md` 外，`docs/design/` 下的正式设计文档建议在标题后统一补充以下页头元信息：

- `文档状态`
- `最后更新`
- `适用范围`
- `关联文档`

推荐格式如下：

```md
# 文档标题

**文档状态**: Draft
**最后更新**: 2026-03-16
**适用范围**: `POMS` 第一阶段某业务域或某治理专题
**关联文档**:

- `上游设计文档或相关 ADR`
- `同域关联设计文档`
```

其中：

- `文档状态` 使用本 README 约定的标准状态体系
- `最后更新` 使用 `YYYY-MM-DD` 格式
- `适用范围` 用于明确当前结论在哪个阶段、哪个域或哪个专题内成立
- `关联文档` 用于建立与上游设计、同级设计和相关 ADR 的追溯关系

推荐把 `关联文档` 进一步拆成以下三组，以减少不同文档之间的口径漂移：

- `上游设计`：需求说明、HLD、域总设计、进度板等上游输入
- `同级设计`：同一业务域或同一治理域内互相依赖的专题设计
- `相关 ADR`：直接约束当前文档结论的 ADR

推荐格式如下：

```md
**关联文档**:

- 上游设计:
  - `../poms-requirements-spec.md`
  - `../poms-hld.md`
- 同级设计:
  - `platform-governance-design.md`
  - `user-management-design.md`
- 相关 ADR:
  - `../../adr/001-platform-permission-model.md`
```

如果某一组当前为空，可以省略该组，而不是人为补齐无意义引用。

如果文档属于评审清单、评审摘要或进度板，仍建议保留相同页头结构，以便统一检索和状态治理。

## 状态规则

设计文档与 `ADR` 使用不同状态体系。

### ADR 状态

- `Proposed`
- `Accepted`
- `Deprecated`
- `Superseded`

### 设计文档状态

- `Draft`：草稿中，方向已开始成形
- `Draft (Baseline)`：已形成首版稳定基线，但仍需继续收口
- `Review`：已进入评审或评审前收口阶段
- `Accepted`：已作为当前阶段正式设计依据
- `Active`：持续维护中的治理性文档或状态性文档
- `Archived`：历史保留，不再作为当前设计输入

其中：

- 进度板、清单、评审摘要这类治理性文档，通常使用 `Active`
- 能直接作为实现或下游详细设计输入的文档，通常应逐步从 `Draft` 演进到 `Review` 或 `Accepted`

如有必要，可在标准状态后追加范围或阶段限定，以表达“该状态在什么边界内成立”，例如：

- `Accepted (Phase 1 Baseline)`
- `Draft (Baseline)`

追加限定时，应满足两个原则：

- 基础状态仍然必须可归入上述标准状态之一
- 限定语只用于补充适用范围或阶段边界，不应创造新的状态体系

## 阅读顺序建议

对第一次进入 `POMS` 设计体系的读者，建议按以下顺序阅读：

1. 业务制度源文档
2. `poms-requirements-spec.md`
3. `docs/adr/` 下已接受的 ADR
4. `poms-hld.md`
5. `poms-design-progress.md`
6. 具体业务域设计文档
7. 平台治理域设计文档
8. 评审与治理文档

如果读者的目标是参与某一专项设计评审，则建议改为：

1. 先读对应业务域设计或治理设计主文档
2. 再回看相关 ADR
3. 最后结合评审清单与授权矩阵进行收口检查

## 当前目录索引

### 基线设计

- `poms-requirements-spec.md`
- `poms-hld.md`
- `poms-design-progress.md`

### 业务域设计

- `project-lifecycle-design.md`
- `contract-finance-design.md`
- `commission-settlement-design.md`
- `workflow-and-approval-design.md`

### 治理与横切设计

- `business-authorization-matrix.md`
- `platform-governance/README.md`

### 评审与治理文档

- `design-convergence-review-checklist.md`
- `design-review-execution-checklist.md`
- `design-review-follow-up-summary.md`

## 后续演进建议

当前阶段先不调整现有文件路径，仅统一目录治理约定。

后续若文档继续扩张，可按需要逐步演进为显式子目录，例如：

- `foundation/`
- `domains/`
- `governance/`
- `reviews/`

但在目录迁移之前，应先保证：

- 文档分类口径已经稳定
- 现有文档之间的引用关系已清楚
- README 已能承担稳定索引作用

## 维护约定

- 新增设计文档时，优先判断其属于基线、业务域、治理还是评审类资产
- 新增设计文档时，优先使用稳定主题命名，不默认引入编号
- 若新增内容属于“高影响、难回退、需要记录为什么这样定”的结论，应优先考虑补 ADR，而不是直接塞进设计文档
- 若某类文档后续数量明显增多，再考虑在该类内部增加子目录或局部编号
- 每次新增、归档或调整设计资产时，应同步更新本 README 与 `poms-design-progress.md`
