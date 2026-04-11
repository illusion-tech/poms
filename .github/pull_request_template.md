# PR 治理检查清单

参考：`docs/design/implementation-governance-gates.md`、`docs/reference/implementation-baseline-package-template.md`、`docs/reference/implementation-governance-checks.md`。

## 范围

- Task / Slice ID:
- Slice Type:
  - [ ] docs-only / process-only
  - [ ] refactor-only
  - [ ] query-only
  - [ ] frontend-only
  - [ ] api / command
  - [ ] persistence
  - [ ] cross-layer-high-risk
- 实施基线包 / 正式输入链接:
- 本 PR 明确不覆盖:

## Gate 证据

- [ ] 若本 PR 涉及工程实现边界，`G1 = Pass` 已记录在实施基线包中，或已在下方记录 grandfathering / exception。
- [ ] 下方 `G3` 证据与所选切片类型匹配。
- [ ] 如果本 PR 只交付子切片，没有把父任务错误标记为 `Done`。

## 通用证据

- [ ] 已链接正式输入文档。
- [ ] 代码变更与声明的切片范围一致。
- [ ] 已记录已运行测试、未运行测试和覆盖缺口。
- [ ] 已记录例外与已知风险；如无，已明确写无。

## 风险分层证据

不适用的章节请写 `N/A` 并给出简短原因。

### docs-only / process-only

- 影响的当前入口文档:
- 行为变更: `none` / 说明:

### refactor-only

- 外部行为是否不变: `yes` / 说明:
- 回归验证:

### query-only / frontend-only

- Query / view / page 边界证据:
- OpenAPI client 或序列化影响: `none` / 说明:
- 是否需要 E2E: `yes` / `no`，原因:

### api / command

| Route / Controller | Command / Service | Request DTO / Contract | Response DTO / Contract | Design source | Result |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

### persistence

| Table / Migration | Entity / Mapping | DDL / Freeze Source | Shared Contract / OpenAPI | Check Result |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

| Field | Design Type / Meaning | Migration / DDL | Entity | Contract / OpenAPI | Result |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

- `migration-check` result:
- Drift 归类:
  - [ ] no drift
  - [ ] existing baseline drift, no new drift introduced
  - [ ] acceptable database-specific difference, documented
  - [ ] real drift fixed in this PR
  - [ ] unresolved drift, exception recorded

### cross-layer-high-risk

- 端到端用户或业务路径:
- Guard / permission / approval / sensitive-data 证据:
- 是否需要 E2E: `yes` / `no`，原因:

## 自动化

列出实际运行的命令。若必需命令无法运行，记录原因。

- Build:
- Unit tests:
- API / integration tests:
- E2E:
- OpenAPI generation / client check:
- Migration / schema check:

## 例外

| Exception ID | Level | Approved By | Cleanup Owner | Cleanup Due | Link / Notes |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## Done 边界

- [ ] 已包含文档回写，或已说明不需要回写。
- [ ] 已包含 tracker 状态更新，或已说明延期原因。
- [ ] 下游切片可以安全依赖本次交付范围。
