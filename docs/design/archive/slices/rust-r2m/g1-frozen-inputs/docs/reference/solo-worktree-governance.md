# POMS 个人开发与本地工作树治理

**文档状态**: Active
**最后更新**: 2026-04-18
**适用范围**: `POMS` 个人开发、单 `main` 分支、本地 worktree 或不通过 PR 的实现推进
**关联文档**:

- 上游设计:
  - `../design/implementation-governance-gates.md`
  - `../design/implementation-delivery-guide.md`
  - `../design/phase2-development-execution-tracker.md`
  - `../design/api-route-canonical-inventory.md`
- 同级参考:
  - `implementation-baseline-package-template.md`
  - `implementation-corrective-checkpoint-template.md`
  - `implementation-governance-checks.md`
- 相关 ADR:
  - `../adr/014-design-execution-state-model-and-governance-gates.md`
  - `../adr/015-api-route-canonical-grammar.md`

---

## 1. 文档目标

PR 不是治理本身，只是多人协作时承载治理证据的一种载体。

个人开发、单 `main` 分支或本地 worktree 模式下，不需要为了形式而强行创建 PR。但仍需要保留以下能力：

1. 开工前知道本次正式输入是什么。
2. 提交前知道本次是否引入设计 / DDL / entity / contract 漂移。
3. 标记 `Done` 前知道下游是否可以依赖本次交付。
4. 未来回看时能知道当时为什么放行。

因此，本文件定义的是 `PR mode` 之外的 `solo worktree mode`。

---

## 2. 核心原则

个人开发模式下只改变证据载体，不降低 gate 要求。

| Concern       | PR Mode                       | Solo Worktree Mode                                   |
| ------------- | ----------------------------- | ---------------------------------------------------- |
| `G1` 冻结输入 | PR 描述或实施基线包链接       | 实施基线包、tracker 备注或本地 checkpoint            |
| `G3` 合并判断 | PR checklist                  | commit 前 checkpoint、commit message 或 tracker 备注 |
| 自动化证据    | PR 评论 / CI                  | 本地命令结果摘要                                     |
| 例外记录      | PR checklist / review comment | 实施基线包或 tracker 备注                            |
| `G4 / Done`   | PR 合并后更新 tracker         | commit 后更新 tracker                                |

不推荐为了单人开发创建“空 PR 自审”。这会制造流程噪声，而不是降低风险。

---

## 3. 推荐工作流

### 3.1 Main-only 模式

适用于低并发、个人独占仓库或短周期切片。

推荐流程：

1. 选择切片，确认 tracker 当前状态。
2. 若实施基线包把父任务进一步收敛为新的可执行子切片，先补 tracker 行与 `Task ID / Subtask ID`，再开始编码。
3. 若切片新增、变更或删除公共 API route surface，先在 `api-route-canonical-inventory.md` 中确认或新增 authoritative inventory 行，并补对应 route-governance 子任务 / 基线。
4. 若是工程实现切片，先形成最小实施基线包或在 tracker 备注中记录 `G1 = Pass`。
   若编码中途发现真实 drift，则停止继续堆叠实现，改用 `implementation-corrective-checkpoint-template.md` 记录 `G3` 阻断与 corrective scope。
5. 在本地直接修改 `main` 工作树。
6. 提交前执行本文件第 4 节的 local checkpoint。
7. commit message 中记录 `G3` 结论摘要。
8. commit 后回写 tracker；只有满足 `G4` 才标记 `Done`。通过 `git mv` 将该切片所有生命周期产物迁移至 `docs/design/archive/slices/`。

适用边界：

- docs-only、process-only、低风险 refactor 可以直接用 main-only。
- 涉及 persistence、api / command、跨层主路径时，仍必须保留字段 / 类型 / 命名对照证据。

### 3.2 Worktree Checkpoint 模式

适用于切片较长、需要同时保留多个试验方向，或希望隔离主工作树。

推荐流程：

1. 为切片创建独立 worktree 或独立本地分支。
2. 若实施基线包把父任务进一步拆成新的可执行子切片，先补 tracker 行与对应子任务 ID。
3. 若切片新增、变更或删除公共 API route surface，先冻结 `api-route-canonical-inventory.md` 中的 authoritative inventory 行，再进入编码。
4. 在 worktree 内按 `G1 -> G2 -> G3` 推进。
   若在 `G3` 前发现 design / DDL / entity / contract / API drift，则切换到 corrective checkpoint，而不是继续把纠偏记录写进原 `G1 baseline`。
5. 每个关键 checkpoint 使用本文件第 4 节模板记录。
6. 回到 `main` 前，先确认没有未解释的 diff、未提交生成物或未回写文档。
7. 将通过 checkpoint 的提交合入 `main`，再更新 tracker。

适用边界：

- EX-06 这类跨 DDL / entity / contract / API 的高风险切片，优先使用 worktree checkpoint。
- 如果中途发现设计输入不稳定，应把任务状态改为 `Blocked` 或拆子切片，不要继续在本地堆叠未解释实现。

---

## 4. Local Checkpoint 模板

个人开发时，`G3` 证据可以不用 PR checklist，但提交前至少要形成如下本地 checkpoint。

推荐记录位置按优先级：

1. commit message
2. 实施基线包的 `一致性结论` / `测试与校验` 章节
3. tracker `备注 / 阻塞`
4. 临时本地笔记，仅限低风险且不影响未来回看

模板：

```md
Local Gate Checkpoint

- Slice:
- Tracker Row:
- Slice Type:
- Gate: `G3 = Pending` / `Pass` / `Block` / `Waived`
- Formal Inputs:
- This change explicitly does not cover:

Evidence:
- Scope:
- Document -> code:
- ADR-015 inventory / route surface:
- Route -> command:
- Migration -> entity:
- Entity -> contract / OpenAPI:
- Query / view:
- Guard / permission:

Commands:
- `git diff --check`:
- Lint:
- Build:
- Unit / API tests:
- E2E:
- OpenAPI / generated client:
- Migration / schema check:

Drift:
- Classification:
- Existing baseline drift:
- New drift introduced:

Exceptions:
- Exception ID:
- Cleanup owner:
- Cleanup due:

Decision:
- Can commit to main: yes / no
- Can mark tracker Done: yes / no
```

低风险切片可以裁剪不适用项，但必须保留 `Slice Type`、`Scope`、`Commands`、`Decision`。

---

## 5. Commit Message 建议

个人开发时，commit message 是最轻量、最稳定的治理留痕位置。

推荐格式：

```text
<slice-id>: <short outcome>

Gate: G3 Pass
Type: persistence / api-command / docs-only / ...
Scope: <what changed>
Evidence: <commands or matrix summary>
Drift: none / existing-baseline-drift / accepted-db-specific-difference / ...
Docs: updated / not required
Tracker: updated / pending <reason>
```

示例：

```text
EX-06A: align cost record contract with DDL

Gate: G3 Pass
Type: persistence + api-command
Scope: cost record dates, source identifiers, supersedes chain
Evidence: git diff --check; poms-api lint; poms-api tests; OpenAPI generated client check
Drift: no new drift
Docs: updated
Tracker: EX-06A remains Doing until source mapping closes
```

---

## 6. 什么时候仍建议开 PR

即使是个人开发，以下情况仍建议开 PR 或至少使用独立 worktree + checkpoint：

1. 一次改动跨 persistence、api、frontend 和 docs。
2. 需要长时间保留未完成实现。
3. 要比较两种设计或实现方案。
4. 需要让 AI agent / 外部 reviewer 做专项 review。
5. 要合入会影响下游切片可信输入的高风险变更。

PR 的价值不是“多人审批”，而是把 diff、讨论、证据和结论集中到一个稳定审查单元。

---

## 7. 防止 Checklist Theater 的规则

个人开发模式下尤其要避免把治理变成填表。

执行规则：

1. docs-only 不需要 migration / entity / contract 对照。
2. refactor-only 不需要实施基线包，除非触及外部行为或结构边界。
3. 代码切片触及存在 `lint target` 的项目时，提交前必须记录对应 lint 结果与 warning 结论。
4. persistence 必须有 migration / entity / DDL / contract 对照。
5. api / command 必须有 route / command / DTO / contract 对照；若触及公共路由，还必须记录 authoritative inventory 行与状态。
6. 公共 API route surface 未先冻结 authoritative inventory 行时，不得提交 controller / DTO / OpenAPI / generated client 改动。
7. cross-layer-high-risk 必须显式判断是否需要 E2E。
8. 不适用项写 `N/A` 和原因即可，不要复制空表。

最小目标是：未来的你能在 3 分钟内判断“这次为什么可以合入或为什么不能标记 Done”。
