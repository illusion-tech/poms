# EX-54 线索评分历史与人工覆盖治理收口

- Task ID: `EX-54`
- Slice type: `governance`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-54`
- Baseline: `docs/design/ex-54-lead-scoring-history-override-governance-baseline.md`
- Status: `G4`
- Closed At: 2026-05-06

## 1. Delivered

1. 冻结系统评分、人工覆盖评分和当前有效评分三者的语义关系。
2. 冻结评分历史快照、公式版本、快照去重、覆盖 lifecycle、审批 / 撤销和 supersede 规则。
3. 明确评分和人工覆盖不补齐确认有效 / 转项目硬闸口缺口。
4. 冻结 `lead.score/rating` 继续表示系统 deterministic 评分, 有效评分以后续显式字段投影。
5. 在 API route inventory 登记评分历史和人工覆盖 planned routes。
6. 在执行板新增 `EX-54A` 后端运行时与 `FE-56` 前端入口后续切片。

## 2. Validation

| Check                                  | Result | Notes                                 |
| -------------------------------------- | ------ | ------------------------------------- |
| Runtime code change                    | N/A    | 本片为治理基线, 不修改运行时代码。    |
| Migration / OpenAPI / generated client | N/A    | 后续由 `EX-54A` 实施。                |
| Markdown format check                  | Pass   | `corepack pnpm run format:md:check`。 |
| `git diff --check`                     | Pass   | `git diff --check`。                  |

## 3. Follow-up

| Slice    | Purpose                                                                           |
| -------- | --------------------------------------------------------------------------------- |
| `EX-54A` | 落地评分历史、人工覆盖命令、持久化、权限、OpenAPI / generated client 和后端测试。 |
| `FE-56`  | 在线索列表 / 详情中接入有效评分、评分历史、覆盖提交、审批和撤销入口。             |
| `EX-55`  | 评估 AI、OCR、附件内容解析和跟进画像对评分的增强边界; 不直接写运行时代码。        |

## 4. Remaining Risks

- 若后续实现把 `lead.score/rating` 从系统评分静默改成有效评分, 会破坏 EX-47 兼容语义。
- 若前端只展示高有效评分而隐藏硬闸口缺口, 会误导用户以为覆盖可以直接转项目。
- 若 EX-55 绕过本片直接引入 AI / 外部画像输入, 会失去可解释性、权限和审计边界。
