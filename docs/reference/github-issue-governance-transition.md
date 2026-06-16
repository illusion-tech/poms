# GitHub Issue-first Governance Transition

**文档状态**: Active
**最后更新**: 2026-06-16
**适用范围**: `POMS` 从本地 tracker-first 任务管理迁移到 GitHub issue-first 任务管理的第一阶段
**关联文档**:

- `../design/implementation-governance-gates.md`
- `../design/phase2-development-execution-tracker.md`
- `../design/poms-design-progress.md`
- `../design/archive/slices/README.md`
- `implementation-baseline-package-template.md`
- `implementation-corrective-checkpoint-template.md`
- `implementation-governance-checks.md`
- `solo-worktree-governance.md`

---

## 1. 文档目标

本文定义 `POMS` 任务治理从“本地文档跟踪”为主，迁移到“GitHub issue 跟踪”为主的第一阶段规则。

第一阶段不是删除本地治理文档，也不是把 GitHub issue 变成新的设计文档。它只调整任务状态的归属：

- GitHub issue 负责当前任务状态、父子关系、依赖、验收 checklist、PR 链接和 closeout 证据。
- 本地治理文档负责冻结输入、路线与契约 SSOT、验证矩阵、长期设计证据和完成切片归档。

## 2. 单一事实源分工

| 事项                        | 第一阶段事实源                                     | 本地文档职责                                         |
| --------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| 父任务 / 子任务关系         | GitHub issue / subissue                            | tracker 只保留过渡索引                               |
| 当前任务状态                | GitHub issue state、checklist、issue comment       | tracker 状态必须镜像 GitHub，不得反向定义            |
| 依赖与阻塞                  | GitHub issue body、linked issue、subissue          | baseline 记录实现输入中的依赖                        |
| `G1` 冻结输入               | 本地 baseline                                      | issue comment 链接 baseline 并摘要冻结结论           |
| `G3` review evidence        | PR body、review thread、CI / local validation      | tracker / progress 可摘要，不承载完整审阅证据        |
| `G4` closeout               | issue checklist、closeout comment、closing PR      | tracker / progress 回写，生命周期产物归档            |
| 公共 route / DTO / DDL SSOT | 本地 ADR、route inventory、design / reference docs | GitHub issue 只能链接，不作为权威契约                |
| 已完成切片生命周期产物      | `docs/design/archive/slices/`                      | 根层只保留当前仍作为输入的 active 设计 / tracker     |
| 执行看板                    | GitHub issue                                       | `phase2-development-execution-tracker.md` 过渡期镜像 |

## 3. 第一阶段生命周期

### G0

1. 确认 GitHub parent issue 与 child issue。
2. 确认 child issue 的最小交付边界、依赖、验收 checklist 和 owner。
3. 确认本地 tracker 是否已有对应行；若没有，补 transitional row。
4. 如果只有本地 tracker 行而没有 GitHub issue，新建或补齐 issue 后再进入 G1。

### G1

1. 在本地新增或更新 implementation baseline。
2. 在 GitHub issue 添加 `G1 已冻结` comment，链接 baseline。
3. Issue body 的 checklist 应反映冻结范围、依赖和验收标准。
4. tracker 备注只保留摘要，不重复整份 baseline。

### G2

1. 从 issue 和 baseline 双入口读取任务上下文。
2. 若 issue state / tracker / baseline 之间出现冲突，先同步治理状态，不直接编码。
3. PR 分支应围绕 child issue 创建，避免用父 issue 标题承载部分交付。

### G3

1. PR body 承载 `G3` 证据：范围、输入、验证、例外、漂移分类。
2. GitHub issue 链接 PR，并在必要时添加 `G3 Ready for Review` comment。
3. Copilot / reviewer comment 必须在 PR thread 内解决；不把未解决审查风险只写到本地 tracker。
4. tracker 和 progress 可记录 `G3` 摘要，但不得比 PR 更乐观。

### G4

1. PR 已 merge，且 closing reference 正确指向 child issue。
2. GitHub issue checklist 已完成，issue 已关闭或明确说明为什么保持 open。
3. 添加 `G4 已完成` closeout comment，记录 PR、merge commit、验证、未包含范围、下游解锁。
4. tracker row 更新为 `Done / G4`。
5. progress 添加一条最终收口记录。
6. 已完成切片 lifecycle docs 迁移到 `docs/design/archive/slices/`。

## 4. Closeout Checklist

一个 issue-backed child slice 进入 `Done` 前必须满足：

- GitHub child issue state 与 checklist 已反映完成事实。
- PR 已 merge，且 issue / PR 互相可追溯。
- 本地 tracker 不再停留在 `Doing`、`G3` 或等待审阅。
- `poms-design-progress.md` 已记录最终收口。
- 已完成 lifecycle docs 已归档。
- 父 issue 只在全部 child issue 完成后关闭。

## 5. 当前过渡例外

1. `phase2-development-execution-tracker.md` 在第一阶段仍保留为 transitional index，直到 issue-first 流程稳定后再决定退役方式。
2. 迁移前已存在的 GitHub issue 允许补写 `G1 / G3 / G4` comment，不要求重开历史 PR。
3. 迁移前已经 `G4` 的本地切片，如果 lifecycle docs 仍在 `docs/design/` 根层，应在下一次相关治理变更中归档。
4. 对没有 GitHub issue 的历史已完成切片，不强制补建 issue；但未来新增或继续开发的切片必须以 issue-backed 方式推进。

## 6. 禁止事项

- 不允许只更新本地 tracker 而让 GitHub issue checklist 过期。
- 不允许 child issue 已关闭但 tracker 仍是 `Doing`。
- 不允许 PR 已合并但本地 baseline 仍留在根层且没有归档例外。
- 不允许把 GitHub issue body 当作 public route、DTO、DDL 或权限契约的权威来源。
- 不允许用父 issue 的关闭来替代子切片 `G4` closeout。
