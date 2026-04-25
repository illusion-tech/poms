# EX-35 业务编号系统生成治理 G3/G4 收口

- Gate Status: `G4 = Pass`
- Slice Type: `docs-only / cross-layer governance baseline`
- Owner: `Codex`
- Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-35`

## 1. 交付范围

本次完成:

1. 确认 `EX-35` G1 baseline 已冻结系统生成业务编号原则。
2. 将后续运行时实现拆分为 `EX-35A` 后端 / 契约 / migration 与 `FE-30` 前端表单收口。
3. 明确开发期不保留旧编号 DTO / UI 兼容层。
4. 保留 POMS 内部编号与客户 / 甲方外部编号的字段边界。

本次未做:

1. 未修改运行时代码。
2. 未新增业务编号 sequence migration 或服务。
3. 未修改前端表单。
4. 未运行 API / frontend build，因为本片仅回写治理与 tracker。

## 2. 冻结结论

| Area             | Decision                                                                          |
| ---------------- | --------------------------------------------------------------------------------- |
| Lead             | `leadCode` 收敛为系统生成 `leadNo`，格式 `LD-{YYYY}-{000000}`。                   |
| Project          | `projectCode` 收敛为系统生成 `projectNo`，格式 `PRJ-{YYYY}-{000000}`。            |
| Contract         | `contractNo` 表示 POMS 内部合同号，系统生成；客户合同号另设 optional 字段。       |
| Actual cost      | `ProjectActualCostRecord.recordNo` 按成本来源类型生成 `AC-*` 编号。               |
| External numbers | 客户项目编号、招标编号、标段 / 包件编号、客户合同编号均为 optional 外部编号字段。 |
| Not generated    | 发票号、平台配置编码、权限 key、规则编码、rate key、source ref 不纳入系统流水号。 |

## 3. 一致性判断

| Checkpoint                 | Result | Notes                                                         |
| -------------------------- | ------ | ------------------------------------------------------------- |
| Document -> code           | Pass   | 当前 runtime 仍为旧命名；后续 `EX-35A` 负责 direct cutover。  |
| ADR-015 inventory -> route | N/A    | 默认不新增 public route；如改 lookup route 需另补 inventory。 |
| Migration -> entity        | N/A    | docs-only；由 `EX-35A` 执行。                                 |
| Entity -> contract/OpenAPI | N/A    | docs-only；由 `EX-35A` 执行。                                 |
| Query -> view              | Pass   | FE 只展示后端返回编号，不前端生成。                           |
| Guard / permission         | Pass   | 不改变既有创建 / 查询权限边界。                               |

## 4. 后续切片

| Slice    | Type                    | Purpose                                                                                                       |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `EX-35A` | `cross-layer-high-risk` | 交付 sequence table/service、后端生成编号、字段收敛、外部编号字段、DTO/OpenAPI/generated client 与 API 测试。 |
| `FE-30`  | `frontend-only`         | 移除 POMS 编号输入，增加 optional 外部编号输入，展示系统生成编号，并补前端验证。                              |

## 5. 验证

| Command                             | Required | Result                  |
| ----------------------------------- | -------- | ----------------------- |
| `corepack pnpm run format:md`       | Yes      | Passed                  |
| `corepack pnpm run format:md:check` | Yes      | Passed                  |
| `git diff --check`                  | Yes      | Passed                  |
| API lint/build/test                 | No       | docs-only; not required |
| Admin lint/build/test               | No       | docs-only; not required |
| OpenAPI / generated client          | No       | docs-only; not required |
| Migration check                     | No       | docs-only; not required |

## 6. 例外

| Exception ID                         | Status   | Closure / Follow-up                                                                                                         |
| ------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `EX35-E1-DEV-NO-HISTORY-COMPAT`      | Open     | 由 `EX-35A` G4 关闭；系统仍在开发期，按最终模型 direct cutover。                                                            |
| `EX35-E2-UNNUMBERED-FINANCE-RECORDS` | Accepted | 作为当前设计边界接受；receipt / payable / payment 当前无用户可见业务编号字段，未来 finance 编号需求出现时重新从 `G0` 立项。 |

## 7. G4 结论

- `EX-35` 作为治理基线可标记 `Done`。
- 下游实施不得继续要求用户填写 POMS 内部线索 / 项目 / 合同编号。
- 运行时实现必须从 `EX-35A` 和 `FE-30` 进入正式 gate。
