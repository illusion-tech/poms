# EX-30 Lead 主对象 route governance 与 EX17-E2 执行基线 G3/G4 Close-out

- Gate Status: `G4 = Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `process-only / route-governance`
- Date: `2026-04-25`
- Baseline: `docs/design/archive/slices/ex-30-lead-route-governance-baseline.md`
- Tracker: `docs/design/phase2-development-execution-tracker.md` / `EX-30`

## 1. Delivered Scope

- 已冻结 `Lead` 最小状态机:
  - `registered`
  - `qualified`
  - `converted`
  - `closed`
- 已冻结 `Lead` 最小 route surface:
  - `POST /leads`
  - `GET /leads`
  - `GET /leads/{id}`
  - `PATCH /leads/{id}`
  - `POST /leads/{id}:qualify`
  - `POST /leads/{id}:close`
  - `POST /leads/{id}:convertToProject`
- 已在 authoritative API inventory 新增 `EX-30 Lead / Project Bootstrap Closure` 批次行。
- 已把当前 `POST /projects` 记录为 `convertLeadToProject` 的 `implementation-drift`，由 `EX-32` 关闭。
- 已明确 `EX-31`、`EX-32`、`FE-27`、`FE-28`、`FE-29` 的下游输入边界。

## 2. Out Of Scope

- 未写运行时代码。
- 未新增 migration、entity、controller、contract、OpenAPI 或 generated client。
- 未修改当前 `POST /projects` 行为。
- 未关闭 `EX17-E2-LEAD-BOOTSTRAP`；该例外必须等 `FE-29` 完成端到端验证后关闭。

## 3. Drift 判断

| Area                       | Result                       | Notes                                                                      |
| -------------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| Document -> code           | `known implementation-drift` | 当前代码无 `Lead` 主对象，且 `POST /projects` 仍可无 Lead 创建 Project。   |
| ADR-015 inventory -> route | `Pass`                       | `Lead` planned routes 和 `convertLeadToProject` drift 行已写入 inventory。 |
| Migration -> entity        | `Not required`               | 本片不写 DDL；`EX-31/32` 实施。                                            |
| Entity -> contract         | `Not required`               | 本片不写 contract；`EX-31/32` 实施。                                       |
| Route -> command           | `Pass for governance`        | 正式目标命令已冻结为 `POST /leads/{id}:convertToProject`。                 |
| OpenAPI / generated client | `Not required`               | 本片只做 route governance。                                                |

## 4. Validation

| Check           | Result         | Evidence                            |
| --------------- | -------------- | ----------------------------------- |
| Runtime tests   | `Not required` | 本片不改运行时代码。                |
| OpenAPI/client  | `Not required` | 本片只冻结 planned routes。         |
| Migration       | `Not required` | 本片不改 persistence。              |
| Markdown format | `Pass`         | `corepack pnpm run format:md:check` |
| Diff hygiene    | `Pass`         | `git diff --check`                  |

## 5. G4 Conclusion

- `EX-30` delivered boundary matches the tracker row and G1 baseline.
- `EX-31` can now enter G1 using this package as direct input.
- `EX17-E2-LEAD-BOOTSTRAP` remains open by design until `EX-31/32` and `FE-27~29` complete.
