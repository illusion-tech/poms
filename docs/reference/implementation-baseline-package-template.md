# POMS 实施基线包模板

**文档状态**: Active
**最后更新**: 2026-04-11
**适用范围**: `POMS` 工程切片在 `G1` 冻结闸口前形成实现输入、范围边界与一致性证据
**关联文档**:

- 上游设计:
  - `../design/implementation-governance-gates.md`
  - `../design/implementation-delivery-guide.md`
  - `../design/phase2-development-execution-tracker.md`
- 相关 ADR:
  - `../adr/014-design-execution-state-model-and-governance-gates.md`

---

## 1. 使用规则

实施基线包不是新的设计文档，而是某个工程切片的冻结输入包。

使用规则如下：

1. 新建工程实现切片在进入 `Doing` 前，原则上必须先形成实施基线包并取得 `G1 = Pass`。
2. grandfathering 的旧切片若进入新的关键合并评审，至少要补最小实施基线包和 `G3` 风险说明。
3. 低风险切片可以裁剪不适用章节，但不能删除“范围、不做内容、测试、例外”四类信息。
4. 涉及 persistence 或 api / command 的切片，必须保留字段 / 类型 / 命名一致性矩阵。
5. 若设计输入、DDL、entity、contract 或 OpenAPI 之间存在差异，必须在本包中归类为“已修复、可接受、既有 drift、阻断项或例外”，不得留空。

---

## 2. 模板

复制以下内容到对应切片的实施记录中。推荐位置是 PR 描述、任务说明或 `docs/design/` 下与该切片直接相关的实施记录；不要把临时基线包放入归档目录作为当前输入。

```md
# <Task ID> <Slice Name> 实施基线包

- Gate Status: `Pending` / `Pass` / `Block` / `Waived`
- Parent:
- Owner:
- Slice Type:
- G1 Reviewer:
- G1 Date:
- Tracker Link / Row:

## 1. 范围

- 本次目标:
- 本次明确不做:
- 下游可依赖的交付边界:
- 不允许下游依赖的留白:

## 2. 正式输入

| Input Type                | Document / Source | Section / Anchor | Status | Notes |
| ------------------------- | ----------------- | ---------------- | ------ | ----- |
| Business design           |                   |                  |        |       |
| Command design            |                   |                  |        |       |
| DTO / OpenAPI design      |                   |                  |        |       |
| Query boundary            |                   |                  |        |       |
| Data model / table freeze |                   |                  |        |       |
| Schema / DDL              |                   |                  |        |       |
| ADR                       |                   |                  |        |       |

## 3. 本次 SSOT

| Concern                   | SSOT | Implementation Rule |
| ------------------------- | ---- | ------------------- |
| Business semantics        |      |                     |
| Route / command naming    |      |                     |
| DTO / contract naming     |      |                     |
| Table / column naming     |      |                     |
| Date / time semantics     |      |                     |
| Identifier semantics      |      |                     |
| Money / decimal semantics |      |                     |
| Status machine            |      |                     |

## 4. 命令与接口边界

| Route / Controller | Command / Service | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source | Result |
| ------------------ | ----------------- | ---------------------- | ----------------------- | ------------------ | ------------- | ------ |
|                    |                   |                        |                         |                    |               |        |

## 5. 读侧边界

| Query / View | Consumer | Fields | Filter / Sort | Permission Boundary | Design Source | Result |
| ------------ | -------- | ------ | ------------- | ------------------- | ------------- | ------ |
|              |          |        |               |                     |               |        |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result |
| ----- | --------- | ------------------- | ------------------- | ------------ |
|       |           |                     |                     |              |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
|       |                       |                 |        |                           |        |

## 7. 一致性结论

- Document -> code:
- Migration -> entity:
- Entity -> contract:
- Route -> command:
- Query -> view:
- Guard / permission:
- OpenAPI / generated client:

## 8. 测试与校验

| Check                            | Required | Command / Evidence | Result | Gap / Reason |
| -------------------------------- | -------- | ------------------ | ------ | ------------ |
| Build                            |          |                    |        |              |
| Unit tests                       |          |                    |        |              |
| API / integration tests          |          |                    |        |              |
| E2E                              |          |                    |        |              |
| OpenAPI generation / client diff |          |                    |        |              |
| Migration / schema check         |          |                    |        |              |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----- |
|              |       |       |             |               |             |       |

## 10. G1 结论

- Gate Status:
- Approved By:
- Approved At:
- Conditions:
```

---

## 3. EX-06 类风险的最低阻断线

若切片涉及统一记录对象、来源映射、版本链、替代链、金额、日期或标识符，以下差异默认阻断 `G1` 或 `G3`：

1. 设计 / DDL 使用 `date`，contract 使用 `datetime`，但未解释日期语义。
2. DDL 使用 `varchar` 承载外部来源 ID，contract 使用 `uuid`，但来源不是系统内 UUID。
3. 实体使用 `supersedesId`，contract 使用 `replacementOfId`，但未定义是否为同一语义。
4. migration 未落唯一约束或当前有效约束，设计却要求版本链唯一当前有效。
5. 写侧命令声明会形成可追溯记录，但实现没有落来源引用、替代链、金额或状态。

这些问题必须先改设计或改实现。只有在明确属于旧切片 grandfathering 且不影响下游可信输入时，才允许通过例外流程临时放行。
