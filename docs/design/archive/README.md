# POMS 设计归档目录

**文档状态**: Active
**最后更新**: 2026-04-04
**适用范围**: `docs/design/` 历史过程资产的归档入口与使用说明
**关联文档**:

- `../README.md`
- `../poms-design-progress.md`
- `../phase2-lx-t04-full-mainline-development-decision.md`
- `../implementation-delivery-guide.md`

---

## 1. 文档目标

本文档用于给 `docs/design/archive/` 提供稳定入口，避免历史过程文档继续与当前正式输入混放在同一层目录。

本文档重点回答以下问题：

- 哪些文档被归档到这里
- 为什么归档而不是删除
- 归档文档是否仍然是当前正式设计输入
- 当前应该优先阅读哪些未归档文档

---

## 2. 归档原则

归档文档保留用于以下目的：

1. 保留关键评审过程、批次拆分、范围演化和历史判断的审计留痕。
2. 允许后续在争议定位、设计回溯和经验总结时查看当时的上下文。
3. 降低 `docs/design/` 根目录的噪声，使当前正式输入更容易识别。

归档不等于删除，也不等于否定历史价值；它只表示：

**这些文档不再作为当前默认设计输入。**

---

## 3. 当前结构

### 3.1 `phase1-closure/`

用于存放第一阶段正式收口后已完成使命的路线图、补齐计划、验收清单、缺口矩阵与最终探活快照，包括：

- 第一阶段收口归档入口
- 第一阶段交付路线图
- 第一阶段缺口补齐计划
- 第一阶段缺口补齐验收清单
- 第一阶段承诺-实现-验证缺口矩阵
- 第一阶段最终验收快照

这些文档用于回答“第一阶段当时如何完成补齐、验收和正式收口”，但不再作为当前默认工程入口。

### 3.2 `reviews/`

用于存放已完成使命的评审过程资产，包括：

- 第二阶段正式审阅清单、综合评估与 follow-up 清单
- 评审前收口清单
- 评审执行清单
- 历史评审摘要
- 分轮评审记录
- 已撤销的历史判断文档

### 3.3 `phase2-batches/`

用于存放第二阶段批次化推进过程中形成的范围说明和桥接映射文档，包括：

- 第一批、第二批、第三批范围说明
- 第一批、第二批、第三批实现映射桥接文档

这些文档的结论已经被吸收到当前主线控制文档、统一开发判断文档和六份实现设计总文档中，因此转为历史过程资产保留。

### 3.4 `mainline-closure/`

用于存放第二阶段主线实现设计完成后的收口记录与完成轨迹文档，包括：

- 主线任务收口记录
- 主线实现设计覆盖证明矩阵

这些文档用于回答“当时是如何从主线跟踪走到统一开发判断”的问题，但不再承担当前默认实施入口职责。

### 3.5 `control-history/`

用于存放当前仍保留在根目录的控制文档之历史长文版本，包括：

- `phase2-mainline-delivery-plan.md` 的长篇治理论证版本
- `phase2-lx-t04-full-mainline-development-decision.md` 的长篇判断依据版本

这些文档用于回答“为什么当前根目录只保留短版入口、完整论证放在哪里”，但不再承担当前默认入口职责。

---

## 4. 当前正式输入入口

如果要参与当前设计判断或工程实现，优先阅读以下未归档文档：

1. `../README.md`
2. `../poms-design-progress.md`
3. `../phase2-lx-t04-full-mainline-development-decision.md`
4. `../phase2-mainline-delivery-plan.md`
5. `../phase2-detailed-design-index-map.md`
6. `../implementation-delivery-guide.md`
7. 当前相关业务域主文档、治理文档与六份实现设计总文档

若需要回溯 `LX-T03` 的正式审阅执行、综合评估与 follow-up 分批依据，再回看 `reviews/` 下的三份第二阶段审阅结果文档与分轮记录。

若需要回溯第一阶段如何从缺口补齐走到正式验收快照，再回看 `phase1-closure/README.md`、`phase1-closure/poms-phase1-final-acceptance-snapshot.md` 与同目录下的路线图、清单、矩阵文档。

若需要回溯 `L1 ~ L5` 主线任务如何逐项完成、何时完成以及当时的完成标准，再回看 `mainline-closure/phase2-mainline-task-tracker.md`。

若需要回溯当时如何证明 `L1 ~ L5` 已具备完整实现设计路径，以及哪些后置项不会阻断统一开发判断，再回看 `mainline-closure/phase2-mainline-implementation-design-matrix.md`。

若需要回溯当前两份 phase2 控制文档在瘦身前的完整论证、历史分层与过程叙事，再回看 `control-history/phase2-mainline-delivery-plan.md` 与 `control-history/phase2-lx-t04-full-mainline-development-decision.md`。

---

## 5. 维护约定

1. 只有在结论已被更高层结果文档吸收、且不再作为当前默认入口时，过程文档才应归档。
2. 每次归档后，都必须同步更新 `../README.md` 与 `../poms-design-progress.md`。
3. 若某份归档文档又重新成为当前正式输入，应先回迁或在上层入口中显式恢复其权威地位，而不是默默继续引用。
