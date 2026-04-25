# FE-27 线索登记与线索列表前端入口 G4 Close-out

- Gate Status: `Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G4 Date: `2026-04-25`
- Runtime Commit: `ff81c11 feat(lead): 完善线索转项目前端闭环`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-27`

## 1. Delivered Boundary

- `/leads` 路由已接入 `permissionGuard`，使用 `lead:read`。
- 线索列表、登记、确认有效、关闭和详情查看已落地。
- `LeadStore` 已进入 `admin-data-access`，并消费 generated client。
- 动态导航新增 `nav:leads:view`，开发角色 / 权限枚举 / generated client 已同步。
- 项目列表提供正式线索入口。

## 2. Validation Evidence

| Check                   | Evidence                                                                             | Result                                      |
| ----------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- |
| Runtime commit          | `ff81c11`                                                                            | Pass                                        |
| Focused admin tests     | `lead-list.spec.ts`, `app.routes.spec.ts`, `project-list.spec.ts` focused runs       | Pass                                        |
| Full admin tests        | `corepack pnpm nx test poms-admin --runInBand`                                       | Pass, `20 suites / 90 tests` in final batch |
| Admin lint / build      | `corepack pnpm nx lint poms-admin`; `corepack pnpm nx build poms-admin`              | Pass                                        |
| Data-access lint        | `corepack pnpm nx lint admin-data-access`                                            | Pass                                        |
| API / navigation checks | `poms-api` lint/build, navigation focused tests, OpenAPI generation and client check | Pass                                        |
| Browser journey         | `FE-29` `lead-bootstrap.journey.spec.ts`                                             | Pass, closes deferred journey               |

## 3. Exceptions

| ID                                             | G4 Decision       | Notes                                                                     |
| ---------------------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| `FE27-E1-NO-CONVERT-ACTION`                    | Closed by `FE-28` | 转项目动作已在 `FE-28` 实现。                                             |
| `FE27-E2-BROWSER-JOURNEY-DEFERRED`             | Closed by `FE-29` | 菜单、项目入口、直接 URL、viewer / anonymous 浏览器矩阵已验证。           |
| `FE27-D1-OPENAPI-GENERATOR-PROPERTYNAMES-WARN` | Closed tool-noise | OpenAPI generator `propertyNames` warning 不影响 generated client check。 |

## 4. G4 Decision

- `FE-27` delivered boundary matches its G1 baseline.
- All G3 deferrals have explicit downstream closure evidence.
- `FE-27` may be marked `Done`.
