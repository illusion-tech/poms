# ADR-011: 招投标与 Project 生命周期的建模关系

**状态**: 已接受 (Accepted)
**日期**: 2026-03-11

---

## 1. 背景 (Context)

当前 `POMS` 的需求说明、HLD 和 `project-lifecycle-design.md` 已经完成第一轮主链路收敛，但它们默认的签约前路径主要表现为：

- 立项评估
- 技术可行性与范围确认
- 报价与毛利评审
- 签约

然而，实际业务补充信息表明：

- 绝大多数真实业务项目都需要经过招投标环节
- 招投标并不是简单的附件活动，而是会直接影响项目是否继续推进的关键业务闸口
- 招投标会引入投标决策、标书编制、投标内部评审、正式投标、答疑澄清、定标结果、中标 / 未中标关闭等一组新的业务事实与动作

如果不尽快固定“招投标与 `Project` 生命周期的关系”，后续会在以下方面持续漂移：

- `poms-requirements-spec.md` 的销售流程阶段矩阵
- `project-lifecycle-design.md` 的主阶段链路和阻断规则
- `business-authorization-matrix.md` 中的对象动作矩阵
- 后续审批流设计与招投标相关的角色分工

---

## 2. 决策驱动因素 (Decision Drivers)

- **业务真实度 (Business Fidelity)**: 设计必须真实反映项目型销售中招投标的高频与高影响地位
- **主链路稳定性 (Lifecycle Stability)**: 不能为了覆盖招投标而把 `Project` 主生命周期建成过于臃肿的固定链路
- **差异化适配能力 (Conditional Path Support)**: 需要同时覆盖“需要招投标”和“不需要招投标”两类项目
- **审批贴合度 (Approval Fit)**: 招投标天然包含内部评审和外部节点，需与现有审批策略兼容
- **可扩展性 (Extensibility)**: 当前建模应支持后续补充保证金、标书版本、澄清记录、中标结果等对象

---

## 3. 候选方案 (Considered Options)

### 方案 A: 将招投标定义为所有项目的固定主阶段
- **描述**: 在 `Project` 主生命周期中强制加入招投标阶段，所有项目都必须经过该阶段后才能进入签约。
- **优点**: 设计上最显式，阶段矩阵直观。
- **缺点**: 与“并非所有项目都招投标”的现实不符，会把非招投标项目强行套入不必要流程。

### 方案 B: 将招投标作为签约前的条件化第一类业务分支
- **描述**: `Project` 主生命周期仍围绕立项、范围、商务收口、签约、移交、执行展开；对于需要招投标的项目，在签约前引入显式的招投标分支流程和里程碑。
- **优点**: 既能显式建模招投标，又不污染所有项目的主链路；更适合绝大多数但非全部项目的现实。
- **缺点**: 若不继续把边界收紧，容易把大量投标细节状态继续堆回 `Project`，导致主状态机膨胀。

### 方案 C: 将招投标仅视为报价评审阶段内的附属活动
- **描述**: 不单独建模招投标，只在报价评审或附件中补充投标材料和结果。
- **优点**: 短期改动最小。
- **缺点**: 严重低估招投标的业务地位，无法自然表达投标决策、投标失败、中标转签约、答疑澄清等关键事实。

### 方案 D: `Project` 主生命周期 + `BidProcess` 第一类受控子流程
- **描述**: `Project` 只保留主生命周期阶段；当项目采用招投标成交路径时，在签约前挂接独立的 `BidProcess` 子流程对象，由其承载投标决策、标书编制、递交、澄清、定标等细节状态与业务事实。
- **优点**:
  - `Project` 主状态机保持稳定，不被大量投标细节状态污染
  - 招投标仍然是第一类业务对象，而不是附件活动
  - 更利于后续补充保证金、标书版本、澄清记录、联合体、废标重投等扩展能力
  - 更适合后续在业务授权矩阵和审批流中按对象分层建模
- **缺点**: 需要新增 `BidProcess` 对象边界，并同步调整生命周期文档、授权矩阵和后续审批设计。

---

## 4. 决策 (Decision)

本 ADR 已接受 **方案 D：`Project` 主生命周期 + `BidProcess` 第一类受控子流程**。

最终结论如下：

- 不采用方案 A，因为它会把非招投标项目强制纳入固定主阶段
- 不采用方案 C，因为它会把招投标降格为报价评审中的普通附属活动
- 不直接采用方案 B 作为最终口径，因为它虽然优于 A / C，但若边界控制不严，仍容易把投标细节状态继续堆回 `Project`
- 采用方案 D，明确 `Project` 只承载主生命周期，招投标由独立 `BidProcess` 对象承载细节状态、里程碑、审批与结果语义

接受该决策后，后续详细设计应统一遵循以下口径：

- `Project.stage` 只表达主业务推进位置
- `Project.commercialMode` 用于表达签约前成交路径类型
- 当 `commercialMode = bidding` 时，`BidProcess` 成为签约前的必经受控子流程
- `BidProcess.result = won` 是进入 `contracting` 的前置条件之一
- 投标失败、弃标、废标、资格审查未通过等事实优先作为 `BidProcess` 结果和关闭原因建模，再映射到 `Project` 的关闭语义

---

## 5. 方案 D 的建议建模方式

若采用方案 D，建议进一步收敛为以下结构：

### 5.1 主生命周期口径

`Project` 主阶段链路保持围绕以下主链路收敛：

- `assessment`
- `scope-confirmation`
- `commercial-closure`
- `contracting`
- `handover`
- `execution`
- `acceptance`
- `completed`

其中：

- `commercial-closure` 用于承接签约前的商务收口阶段
- `Project` 仅表达主业务推进位置，不承载投标准备、递交、澄清、定标等细节状态
- 非招投标项目可直接通过商务谈判、报价确认等方式完成该阶段
- 招投标项目则在该阶段下挂接显式的 `BidProcess`

### 5.2 成交路径类型

建议在 `Project` 的签约前商务收口阶段显式记录成交路径，例如：

- `direct-negotiation` 直接商务谈判
- `bidding` 招投标
- `framework-calloff` 框架内下单 / 框架协议转单
- `single-source` 单一来源

说明：

- 是否需要 `BidProcess`，由成交路径是否为 `bidding` 决定
- 这样可以把“项目主阶段”与“具体成交机制”明确分层

### 5.3 `BidProcess` 子流程状态与里程碑

对于需要招投标的项目，建议新增独立 `BidProcess` 对象，并至少显式记录以下受控状态或里程碑：

- `bid-decision` 投标决策
- `bid-preparation` 标书编制 / 投标准备
- `bid-review` 投标内部评审
- `bid-submission` 正式投标 / 递交
- `bid-clarification` 答疑 / 澄清 / 述标
- `bid-result` 定标结果

说明：

- `BidProcess` 承载投标细节事实、责任人、时间点、附件与审批结论
- `Project` 仅持有当前主阶段、成交路径、当前有效 `bidProcessId` 和关键结果引用

### 5.4 主对象与子流程的闸口关系

- 当 `commercialMode != bidding` 时，`Project` 可在完成商务收口后直接进入 `contracting`
- 当 `commercialMode = bidding` 时，未形成有效 `BidProcess` 不得推进签约
- 当 `BidProcess` 的结果为 `won` 时，`Project` 才能进入 `contracting`
- 当 `BidProcess` 的结果为 `lost`、`abandoned`、`invalidated` 等关闭结果时，`Project` 应进入关闭态，而不是继续推进签约

### 5.5 关闭与转化语义

- 未中标项目可直接进入 `closed-lost`
- 中标项目才能进入 `contracting`
- 废标、弃标、资格审查未通过等情况应保留独立关闭原因，而不混入普通失单原因
- 若后续出现“废标后重新投标”，应优先通过新增或重开 `BidProcess` 处理，而不是篡改既有投标结果事实

---

## 6. 对现有文档的影响 (Consequences)

若采用方案 D，至少需要同步修订以下文档：

- `poms-requirements-spec.md`
  - 销售流程阶段矩阵
  - 制度到系统能力映射
  - 关键对象与动作说明
  - 增加成交路径与招投标子流程关系说明

- `project-lifecycle-design.md`
  - 主阶段链路
  - 商务收口阶段定义
  - `commercialMode` 的语义
  - `BidProcess` 与 `Project` 的闸口关系、阻断条件和关闭语义

- `business-authorization-matrix.md`
  - 增加 `BidProcess` 相关对象动作，如投标决策、标书编制、递交投标、登记中标结果、关闭未中标项目

- 后续 `workflow-and-approval-design.md`
  - 增加 `BidProcess` 对象上的内部评审、澄清答复、中标转签约等审批/确认环节

---

## 7. 后续落地建议

本 ADR 已接受，但仍不建议跳过上游文档回写而直接进入实现设计。原因是：

- 这是高影响、难回退的建模决策
- 一旦决定错误，会同时影响主状态机、审批流、业务授权矩阵和关闭语义

当前更稳妥的落地路径是：

1. 先回写 `poms-requirements-spec.md`
2. 再修订 `project-lifecycle-design.md`
3. 再把 `BidProcess` 相关动作回填到 `business-authorization-matrix.md`
4. 后续在 `workflow-and-approval-design.md` 中细化 `BidProcess` 的审批与确认环节

本 ADR 的已接受结论是：

- **优先采用方案 D：`Project` 主生命周期 + `BidProcess` 第一类受控子流程**
- 方案 B 可视为通往方案 D 的中间理解层，但不再作为正式落地口径
