# ADR-014: 设计-执行状态模型与治理闸口

**状态**: 提议中 (Proposed)
**日期**: 2026-04-06

---

## 1. 背景 (Context)

随着 `POMS` 从设计收敛进入持续实现阶段，仓库内已经形成多类“状态”与“控制结论”：

- 设计文档状态，如 `Draft`、`Draft (Baseline)`、`Ready for Review`、`Accepted`、`Active`
- 执行追踪板任务状态，如 `Not Started`、`In Progress`、`Blocked`、`Done`
- 实施过程中的非正式说法，如“可开工”“已冻结”“评审中”“可合并”
- 在治理文档中逐步出现的 gate 语义，如 `G1`、`G3`、`G4`

这些表达目前存在三个问题：

1. **状态维度混用**
   - 文档成熟度、任务执行进度、PR 合并结论和实现输入冻结程度并不是一回事，但经常被混写成一组状态词。
2. **状态词过多且部分冗长**
   - 例如 `Not Started`、`In Progress` 在 tracker 中可读，但不够紧凑；`Draft (Baseline)`、`Ready for Review` 又与 `Review` 语义接近。
3. **治理文档与正式状态入口尚未完全统一**
   - 新治理要求希望引入“冻结闸口”“合并闸口”等正式概念，但如果只是靠映射说明长期维持，会继续扩散双轨语义。

同时，当前仓库已经具备以下正式输入：

- `docs/design/README.md`：定义设计文档状态体系
- `docs/design/poms-design-progress.md`：维护文档成熟度与 ADR 列表
- `docs/design/phase2-development-execution-tracker.md`：维护任务状态
- `docs/design/implementation-delivery-guide.md`：定义实施流程与完成判断
- `docs/design/implementation-governance-gates.md`：定义从设计到实现的治理闸口

因此，现在需要一个 ADR，把“状态模型”和“治理闸口的正式归属”一次性收口，避免后续继续靠补丁式映射推进。

---

## 2. 决策驱动因素 (Decision Drivers)

- **语义清晰度 (Semantic Clarity)**: 文档状态、任务状态、gate 结论必须分层，避免同词多义
- **一致性 (Consistency)**: `README`、`poms-design-progress`、tracker、治理文档与 PR 流程应采用同一正式模型
- **简洁性 (Brevity)**: 任务状态应足够短，适合看板、表格、PR 标签和例会沟通
- **可迁移性 (Migratability)**: 新模型应能从当前状态体系平滑迁移，而不是要求全仓库一次性重写全部历史记录
- **可执行性 (Operability)**: gate 应有正式归属，但不应强行混成新的文档状态或任务状态
- **扩展性 (Extensibility)**: 后续如引入 PR 模板、CI 门禁或实施基线包模板，应能直接复用同一状态模型

---

## 3. 候选方案 (Considered Options)

### 方案 A: 维持当前状态体系，只在治理文档中继续写映射说明

- **描述**: 保持现有设计状态与任务状态不变；治理文档继续通过“映射”“说明”“注释”表达 gate 结论。
- **优点**:
  - 当前改动最小
  - 不需要批量调整现有文档
- **缺点**:
  - 双轨语义会长期存在
  - 团队仍需靠口头理解“哪些是正式状态，哪些只是过程说法”
  - 新老文档之间的语义漂移会继续积累

### 方案 B: 用一套统一的扁平状态覆盖文档、任务与 gate

- **描述**: 所有对象都使用同一组状态，如 `Draft / Active / Blocked / Done`。
- **优点**:
  - 表面最统一
  - 看起来最简单
- **缺点**:
  - 把不同维度的语义硬压成一组状态，容易再次混淆
  - “文档已接受”和“任务已完成”无法用同一组词准确表达
  - `G1`、`G3` 这类闸口结论很难自然融入

### 方案 C: 采用正交的统一状态模型，分为文档状态、任务状态与 gate 状态三层

- **描述**:
  - 文档使用一组简化后的正式状态
  - 任务使用一组更短的执行状态
  - gate 使用独立的结论状态，不再伪装成文档状态或任务状态
- **优点**:
  - 语义最清晰
  - 最适合与 `implementation-governance-gates.md` 配合
  - 后续可直接扩展到 PR 模板、基线包、CI 门禁
- **缺点**:
  - 需要一次正式迁移
  - 需要在 `README`、进度板、tracker 和治理文档中同步落地

---

## 4. 决策 (Decision)

**最终选择：方案 C —— 采用正交的统一状态模型，并把治理闸口作为独立 gate 结论而非新的全局文档状态。**

进一步约束如下。

### 4.1 正式文档状态

设计文档正式状态统一收敛为：

- `Draft`
- `Review`
- `Accepted`
- `Active`
- `Archived`

说明：

1. `Draft (Baseline)` 不再作为新的正式状态类型，而视为 `Draft` 阶段中的说明性限定。
2. `Ready for Review` 统一并入 `Review`。
3. `Accepted` 用于可作为当前正式设计依据的基线文档。
4. `Active` 仅用于治理性、状态性、持续维护型文档。
5. `Archived` 用于历史保留、不再作为当前默认输入的文档。

### 4.2 正式任务状态

任务状态统一收敛为短状态：

- `Todo`
- `Doing`
- `Blocked`
- `Done`

说明：

1. `Not Started` 迁移为 `Todo`
2. `In Progress` 迁移为 `Doing`
3. `Blocked`、`Done` 保持不变

### 4.3 正式 gate 状态

治理闸口统一采用：

- `Pending`
- `Pass`
- `Block`
- `Waived`

说明：

1. gate 结论不是文档状态，也不是任务状态。
2. `Frozen for Build` 是 `G1 = Pass` 的展示语义，不再作为独立正式状态。
3. `Ready to Build`、`In Review` 这类表述可作为口语或界面展示，但不作为正式全局状态名。

### 4.4 状态与对象的归属

1. `Document Status` 只归属于设计文档与 ADR。
2. `Task Status` 只归属于 tracker / project board / 执行任务。
3. `Gate Status` 只归属于实施基线包、PR checklist、例外记录或未来结构化门禁。

不允许再把这三类状态混成单一字段。

---

## 5. 选择该方案的原因

### 5.1 统一并不等于“只保留一套词”

当前问题的根源不是状态词数量不够少，而是不同维度被混在了一起。

文档成熟度、任务执行进度、gate 结论本来就是不同对象上的不同状态。如果强行压成一组词，只会把问题从“映射过多”变成“语义混乱”。

### 5.2 任务状态应更短，但不能因此牺牲分层

把任务状态收敛成 `Todo / Doing / Blocked / Done`，确实比 `Not Started / In Progress / Blocked / Done` 更简洁，也更适合工程执行场景。

但这并不意味着文档状态或 gate 结论也应该沿用同一组词。

### 5.3 gate 应有正式归属，但不应伪装成文档状态

像 `G1 Build Freeze`、`G3 Merge Gate` 这类结论，核心问题是它们之前没有正式归属。

正确做法不是把 `Frozen for Build` 升格成新的文档状态，而是明确：

- 它是一个 gate 结论
- 它应该记录在哪
- 谁来批准
- 何时允许 `Waived`

### 5.4 这套模型最适合一次性迁移和长期治理

方案 C 允许我们做一次清晰的迁移：

- 文档状态统一
- tracker 任务状态简化
- gate 独立建模

迁移完成后，后续无论是文档治理、PR 审查还是 CI 门禁，都可以直接沿用同一套模型，而不是继续“看情况解释”。

---

## 6. 影响与后果 (Consequences)

### 6.1 正面影响

1. `README`、`poms-design-progress`、tracker、治理闸口文档将拥有统一且分层的状态模型。
2. 任务状态更短，更适合执行层使用。
3. gate 结论不再伪装成“状态词”，减少扩散式补丁。
4. 后续 PR 模板、实施基线包模板和 CI 门禁更容易标准化。

### 6.2 负面影响

1. 需要一次正式迁移，而不是继续局部修补。
2. 需要清理现有 `Ready for Review`、`Draft (Baseline)`、`Not Started`、`In Progress` 等旧状态。
3. 需要给已开工切片定义过渡规则和 grandfathering 边界。

### 6.3 明确不做的事

本 ADR 不直接定义：

1. 每个 gate 的详细检查清单
2. 每类例外的审批表单细节
3. CI 如何具体实现自动化

这些内容仍应由治理文档、PR 模板和工程配置继续承接。

---

## 7. 迁移方案 (Migration Plan)

本 ADR 若被接受，建议按以下顺序迁移。

### Phase 1: 状态模型正式切换

同步更新以下正式入口：

1. `docs/design/README.md`
2. `docs/design/poms-design-progress.md`
3. `docs/design/implementation-delivery-guide.md`
4. `docs/design/implementation-governance-gates.md`
5. `docs/design/phase2-development-execution-tracker.md`

目标：

- 把文档状态正式收敛到 5 个
- 把 tracker 任务状态正式收敛到 4 个
- 把 gate 结论正式声明为独立字段

### Phase 2: 现有文档与任务批量迁移

建议统一映射如下：

- `Draft (Baseline)` -> `Draft`
- `Ready for Review` -> `Review`
- `Not Started` -> `Todo`
- `In Progress` -> `Doing`

补充要求：

1. 对仍需表达“baseline 已形成”或“已到审阅前最后收口”这类附加语义，应通过备注、限定词或专门字段表达，而不是继续扩展正式状态集合。
2. grandfathering 规则仍由治理文档定义，但不得再产生新的旧状态实例。

### Phase 3: 模板与门禁同步

同步更新：

1. PR checklist 模板
2. 实施基线包模板
3. 例外记录模板
4. 如有需要，后续再补 CI 校验

---

## 8. 与已有 ADR / 文档的关系

### 8.1 与 ADR-012 的关系

本 ADR 不改变 `ADR-012` 已接受的 `PostgreSQL + SQL-first migration + MikroORM` 路线。

它只改变治理层面的状态表达与 gate 归属方式。

### 8.2 与 `implementation-governance-gates.md` 的关系

本 ADR 为 `implementation-governance-gates.md` 提供正式状态模型边界：

- 哪些词可以作为正式状态
- 哪些词只能作为 gate 语义
- 哪些词应从治理文档中退出正式状态体系

### 8.3 与 tracker 的关系

本 ADR 被接受后，tracker 应把任务状态正式切换到：

- `Todo`
- `Doing`
- `Blocked`
- `Done`

而不再保留 `Not Started` / `In Progress`。

---

## 9. 后续行动 (Follow-up Actions)

若本 ADR 被接受，建议立即跟进以下动作：

1. 回写 `docs/design/README.md` 的正式状态定义
2. 回写 `docs/design/poms-design-progress.md` 的文档状态表
3. 回写 `docs/design/phase2-development-execution-tracker.md` 的任务状态定义
4. 回写 `docs/design/implementation-governance-gates.md`，去掉过渡性映射说明，直接采用新正式模型
5. 新增 PR checklist 模板与实施基线包模板

---

## 10. 当前结论

`POMS` 当前最需要的不是继续在旧状态体系上追加映射说明，而是：

1. 明确哪些是文档状态
2. 明确哪些是任务状态
3. 明确哪些是 gate 结论
4. 用一次正式迁移替代长期补丁式映射

因此，本 ADR 提议采用：

- `Document Status`: `Draft / Review / Accepted / Active / Archived`
- `Task Status`: `Todo / Doing / Blocked / Done`
- `Gate Status`: `Pending / Pass / Block / Waived`

并以此作为 `POMS` 后续正式治理与实施入口的统一状态模型。
