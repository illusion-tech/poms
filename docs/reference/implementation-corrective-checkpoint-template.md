# POMS 实施纠偏 Checkpoint 模板

**文档状态**: Active
**最后更新**: 2026-04-18
**适用范围**: `POMS` 已开工切片在实现中发现 design / DDL / entity / contract / API drift 后，用于记录 `G3` 阻断、纠偏范围与修复证据
**关联文档**:

- 上游设计:
  - `../design/implementation-governance-gates.md`
  - `../design/implementation-delivery-guide.md`
  - `../design/phase2-development-execution-tracker.md`
- 同级参考:
  - `implementation-baseline-package-template.md`
  - `implementation-governance-checks.md`
  - `solo-worktree-governance.md`
- 相关 ADR:
  - `../adr/014-design-execution-state-model-and-governance-gates.md`

---

## 1. 使用规则

实施纠偏 checkpoint 不是新的 `G1` 实施基线包，而是针对“已经进入实现、但发现真实偏差”的补救记录。

使用规则如下：

1. 当切片已经开工，且在 `G3` 或本地 checkpoint 中发现真实 drift 时，优先使用本模板，而不是伪装成新的 `G1` baseline。
2. corrective checkpoint 必须明确回答三件事：当前为什么被阻断、这次纠偏只修什么、剩余哪些问题仍阻断父任务关闭。
3. corrective checkpoint 只适用于 remediation / corrective slice；若是新的可执行子切片，仍应回到 `implementation-baseline-package-template.md`。
4. corrective checkpoint 可以为后续子切片提供输入，但不得替代这些子切片自己的 `G1` baseline。
5. 若 drift 实际证明上游设计输入需要修订，应在本 checkpoint 中明确标为 `design-change-required`，不得直接把实现当作新事实。

---

## 2. 模板

复制以下内容到对应切片的纠偏记录中。推荐位置是 `docs/design/` 下与该纠偏事项直接相关的实施记录；不要继续用 `<task>-implementation-baseline.md` 这类容易与 `G1 baseline` 混淆的命名。

```md
# <Task ID> <Slice Name> 纠偏 Checkpoint

- Checkpoint Status: `Pending` / `Pass` / `Block` / `Waived`
- Parent:
- Owner:
- Slice Type:
- G3 Reviewer:
- Checkpoint Date:
- Tracker Link / Row:

## 1. 触发背景与范围

- 触发原因:
- 本次目标:
- 本次明确不做:
- 本次纠偏后可恢复的可信边界:
- 仍不允许下游依赖的留白:

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

## 3. Drift 清单与本次 SSOT

| Concern                   | Drift / SSOT | Corrective Rule |
| ------------------------- | ------------ | --------------- |
| Business semantics        |              |                 |
| Route / command naming    |              |                 |
| DTO / contract naming     |              |                 |
| Table / column naming     |              |                 |
| Date / time semantics     |              |                 |
| Identifier semantics      |              |                 |
| Money / decimal semantics |              |                 |
| Status machine            |              |                 |

## 4. 当前阻断结论

- Current Gate:
- Blocking Findings:
  1.
  2.
- Why parent task cannot be closed:

## 5. 本次纠偏范围与修复结果

- 本批修复范围:
  1.
  2.
- 本批未修复范围:
  1.
  2.

| Concern | Before | After | Result |
| ------- | ------ | ----- | ------ |
|         |        |       |        |

## 6. 测试与校验

| Check                            | Required | Command / Evidence | Result | Gap / Reason |
| -------------------------------- | -------- | ------------------ | ------ | ------------ |
| Lint                             |          |                    |        |              |
| Build                            |          |                    |        |              |
| Unit tests                       |          |                    |        |              |
| API / integration tests          |          |                    |        |              |
| E2E                              |          |                    |        |              |
| OpenAPI generation / client diff |          |                    |        |              |
| Migration / schema check         |          |                    |        |              |

## 7. 残余阻断与后续切片

- 已解除的阻断:
- 仍存在的阻断:
  1.
  2.
- 后续子切片:
  1.
  2.

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----- |
|              |       |       |             |               |             |       |

## 9. G3 Checkpoint 结论

- Checkpoint Status:
- Approved By:
- Approved At:
- Conditions:
```

---

## 3. 与实施基线包模板的边界

两类模板职责不同：

1. `implementation-baseline-package-template.md`：用于 `G1`，回答“在开工前，本切片的正式输入和实现边界是什么”。
2. `implementation-corrective-checkpoint-template.md`：用于 `G3 corrective checkpoint`，回答“为什么已经实现的内容被阻断，这次纠偏修了什么，还剩什么没修”。

不允许的错误用法：

1. 发现 drift 后，继续把 corrective slice 伪装成新的 `G1 baseline`。
2. 新切片开工前，不写 baseline，直接写 corrective checkpoint。
3. 用同一份文档同时承担“新切片输入冻结”和“历史偏差修复留痕”两种职责。

---

## 4. EX-06 类纠偏的最低记录线

若切片已经编码后才发现以下问题，至少应使用本模板留痕：

1. migration / DDL / entity / contract 之间存在真实 drift。
2. 已承诺的命令或读侧在代码里没有最小闭环。
3. 写侧声称形成可追溯记录，但没有落来源引用、金额、替代链或状态。
4. 父任务名义下只修了部分范围，但 tracker 或进度文档可能误导为整体完成。
5. 修复后仍有剩余阻断，需要拆出新的可执行子切片。
