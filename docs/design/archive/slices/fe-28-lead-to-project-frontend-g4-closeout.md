# FE-28 从有效线索创建项目的前端转化体验 G4 Close-out

- Gate Status: `Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G4 Date: `2026-04-25`
- Runtime Commit: `ff81c11 feat(lead): 完善线索转项目前端闭环`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-28`

## 1. Delivered Boundary

- `LeadStore.convertLeadToProject` 已消费 generated client `LeadApi.leadControllerConvertToProject`。
- `/leads` 列表和详情均提供有效线索的“转入项目”动作。
- 转项目弹窗提交 `projectCode`、可选 `projectName` 和可选 `plannedSignAt`。
- 转化成功后跳转返回的项目详情。
- 项目列表正式入口已从“新建项目”改为“从线索创建项目”。
- 项目详情展示 `sourceLeadSummary`，解释项目来源线索。

## 2. Validation Evidence

| Check                | Evidence                                                              | Result                       |
| -------------------- | --------------------------------------------------------------------- | ---------------------------- |
| Runtime commit       | `ff81c11`                                                             | Pass                         |
| Focused admin tests  | `lead-list.spec.ts`, `project-list.spec.ts`, `project-detail.spec.ts` | Pass                         |
| Full admin tests     | `corepack pnpm nx test poms-admin --runInBand`                        | Pass, `20 suites / 90 tests` |
| Admin lint           | `corepack pnpm nx lint poms-admin`                                    | Pass                         |
| Data-access lint     | `corepack pnpm nx lint admin-data-access`                             | Pass                         |
| Admin build          | `corepack pnpm nx build poms-admin`                                   | Pass                         |
| Browser verification | `POMS_E2E_PORT_SEED=530 ... lead-bootstrap.journey.spec.ts`           | Pass, `3 tests`              |

## 3. Exceptions

| ID                                         | G4 Decision            | Notes                                                                            |
| ------------------------------------------ | ---------------------- | -------------------------------------------------------------------------------- |
| `FE28-E1-LEGACY-PROJECT-CREATE-ROUTE-OPEN` | Closed for frontend UX | 正式前端用户入口不再暴露直接 Project create；后端 legacy/dev/test route 仍保留。 |
| `FE28-E2-BROWSER-JOURNEY-DEFERRED`         | Closed by `FE-29`      | 浏览器矩阵已覆盖菜单、项目页按钮、直接 URL、viewer 和 anonymous。                |
| `FE27-E1-NO-CONVERT-ACTION`                | Closed by `FE-28`      | 本片实现转项目动作。                                                             |

## 4. G4 Decision

- `FE-28` delivered boundary matches its G1 baseline.
- `POST /projects` 的后端 legacy route 继续存在，但已不再作为正式前端入口；该口径由 `FE-29` 浏览器证据支持。
- `FE-28` may be marked `Done`.
