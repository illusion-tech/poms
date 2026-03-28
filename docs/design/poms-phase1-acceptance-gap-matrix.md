# POMS 第一阶段承诺-实现-验证缺口矩阵

**文档状态**: Active
**最后更新**: 2026-03-28
**适用范围**: `POMS` 第一阶段收口评估，优先覆盖平台治理域、平台导航治理与统一运行时审计基线

---

## 1. 文档目标

本文档用于把“设计承诺”“当前实现”“已有验证”“确认缺口”和“后续待办”放到同一张矩阵里，避免再以“功能已写完”替代“阶段已验收”。

---

## 2. 审查口径

本轮审查采用以下固定口径：

1. 以路线图中的第一阶段承诺为主口径。
2. 设计文档只用于解释承诺边界，不单独扩大范围。
3. `Done` 需要同时具备实现证据和验收证据。
4. 若只具备实现证据、不具备域级验证证据，应降为 `In Review` 或 `Reopened`。

---

## 3. 平台治理域矩阵

| 切片 / 承诺                                              | 当前实现                                                                            | 已有验证                                                                                     | 当前判断 | 确认缺口                                                                                     | 待办 |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- | ---- |
| `P1-S08` 登录与 `profile` 来自真实平台主数据             | 已实现真实登录、真实 `profile`、真实用户/角色/组织管理接口                          | 单测、API 壳层 e2e、`platform-governance.e2e-spec.ts`、前端构建                              | `Done`   | 域级 API 证据已补齐；浏览器层登录态 smoke 另由 `P1-T23` 覆盖                                 | `—`  |
| `P1-S08` 平台管理页已接真实 API                          | `/platform/users`、`/platform/roles`、`/platform/org-units` 页面与真实 store 已落地 | 单测、构建通过、`permission.guard.spec.ts`、`platform-governance.smoke.spec.ts`              | `Done`   | 已补浏览器层 smoke 与真实组织创建提交；页面可达、只读不可见/不可进页与最小写侧提交证据已具备 | `—`  |
| 角色 / 权限变化后导航与接口同步收敛                      | 后端权限校验和导航过滤已实现                                                        | `navigation.service.spec.ts`、`authorization.e2e-spec.ts`、`platform-governance.e2e-spec.ts` | `Done`   | 已补“先赋权再剥权”后的域级 API e2e 证据                                                      | `—`  |
| 用户停用后会话与登录失效                                 | 后端登录走真实 `is_active` 用户查询                                                 | 单测、repository / service 支撑、`platform-governance.e2e-spec.ts`                           | `Done`   | 已补“停用后既有会话失效且重新登录被拒”的真实 API e2e；浏览器层 smoke 另由 `P1-T23` 覆盖      | `—`  |
| 平台治理域至少具备用户、角色、组织、导航四类管理查询视图 | 用户 / 角色 / 组织 / 导航四类管理查询视图均已具备；导航为只读治理入口               | 单测、构建通过、`platform-governance.smoke.spec.ts`、接口存在                                | `Done`   | 查询与入口层缺口已全部收口                                                                   | `—`  |

---

## 4. 平台导航治理矩阵

| 切片 / 承诺                                           | 当前实现                                                                                                       | 已有验证                                                                                                                                                                       | 当前判断 | 确认缺口                                                      | 待办 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------- | ---- |
| 不同权限用户返回不同导航树                            | 已实现                                                                                                         | `navigation.service.spec.ts`、`auth-shell.e2e-spec.ts`、`platform-governance.e2e-spec.ts`                                                                                      | `Done`   | 已补平台治理变更前后导航树即时变化的域级 e2e                  | `—`  |
| 导航 `link` 与真实路由一致                            | `/platform/users`、`/platform/roles`、`/platform/org-units`、`/platform/navigation` 均有真实路由               | 前端路由存在、`platform-governance.smoke.spec.ts`                                                                                                                              | `Done`   | 路由对照文档已同步到当前真实状态                              | `—`  |
| 未授权用户直接输入 URL 时，页面守卫与接口授权同时生效 | 后端接口鉴权与前端权限路由守卫均已实现                                                                         | API `HasPermissions`、`permission.guard.spec.ts`、`platform-governance.smoke.spec.ts`                                                                                          | `Done`   | 已补“未授权直输 URL 被前端拒绝并保留 returnUrl”的浏览器层证据 | `—`  |
| `/platform/navigation` 已有真实页面或受控治理入口     | 已有只读治理页，消费 `GET /platform/navigation` 并展示导航树与路由对齐结果                                     | API / OpenAPI、构建通过、`platform-governance.smoke.spec.ts`                                                                                                                   | `Done`   | 页面落点、最小受控治理入口与同步审计入口已收口                | `—`  |
| 导航治理具备最小维护与审计路径                        | 已明确第一阶段采用受控代码/seed 维护导航事实源，并新增显式 `sync` 命令把当前导航 SSOT 快照写入统一 `audit_log` | `navigation-design.md`、`platform-governance-design.md`、`platform.service.spec.ts`、`GET /audit-logs`、`platform-governance.e2e-spec.ts`、`platform-governance.smoke.spec.ts` | `Done`   | 导航事实源同步审计、操作者上下文与查询证据已补齐              | `—`  |

---

## 5. 统一运行时审计与安全事件矩阵

| 切片 / 承诺                                        | 当前实现                                                                                                                                                                                                              | 已有验证                                                                                                                                                                                                                             | 当前判断 | 确认缺口                                                                 | 待办 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------ | ---- |
| 第一阶段存在统一 `audit_log` 运行时持久化模型      | 已实现 `audit_log` entity、repository、writer service、global module 与 migration                                                                                                                                     | `runtime-audit.service.spec.ts`、`pnpm nx build poms-api`、migration `20260328120000`                                                                                                                                                | `Done`   | `—`                                                                      | `—`  |
| 第一阶段存在统一 `security_event` 结构化持久化模型 | 已实现 `security_event` entity、repository、writer service、global module 与 migration                                                                                                                                | `runtime-audit.service.spec.ts`、`pnpm nx build poms-api`、migration `20260328120000`                                                                                                                                                | `Done`   | `—`                                                                      | `—`  |
| 平台治理高敏动作写入统一 `audit_log`               | 用户/角色/组织高敏命令已在 `platform.service.ts` 写入统一 `audit_log`；导航同步也已通过显式 `POST /platform/navigation/sync` 写入统一 `audit_log`                                                                     | `platform.service.spec.ts`、`GET /audit-logs`、`pnpm nx test poms-api --runInBand`、`pnpm nx run poms-api-e2e:e2e --runInBand --testPathPattern=platform-governance.e2e-spec.ts`                                                     | `Done`   | 平台治理域统一审计已覆盖用户/角色/组织/导航四类高敏动作                  | `—`  |
| 登录失败、无效令牌、权限拒绝写入 `security_event`  | `auth.controller.ts`、`permissions.guard.ts`、`jwt.strategy.ts`、`jwt-auth.guard.ts` 与前端 `permission.guard.ts` 已写入登录失败、接口权限拒绝、“令牌主体已失效/不存在”拒绝、通用无效/过期 JWT 拒绝与前端路由拒绝事件 | `auth.controller.spec.ts`、`permissions.guard.spec.ts`、`jwt.strategy.spec.ts`、`jwt-auth.guard.spec.ts`、`permission.guard.spec.ts`、`GET /security-events`、`platform-governance.e2e-spec.ts`、`platform-governance.smoke.spec.ts` | `Done`   | 第一阶段最小安全事件基线已覆盖登录失败、令牌拒绝、接口拒绝与前端路由拒绝 | `—`  |
| 审计与安全事件具备最小查询出口                     | 已提供 `GET /audit-logs`、`GET /security-events` 最小查询接口，并补齐共享契约与 API DTO                                                                                                                               | `runtime-audit.service.spec.ts`、`platform-governance.e2e-spec.ts`、`pnpm nx build poms-api`                                                                                                                                         | `Done`   | `—`                                                                      | `—`  |

---

## 6. 结论

本轮审查确认：

1. `P1-S08` 的主体实现与阶段验收证据已收口，可维持 `Done`。
2. `P1-S09` 的页面、路由、受控维护路径与运行时审计证据已收口，可恢复为 `Done`。
3. 当前平台治理域与统一运行时审计 / 安全事件基线的功能性缺口已关闭；下一步只剩 `P1-T20` 的阶段级最终探活与验收快照。

---

## 7. 本轮新增待办映射

- `P1-T21`: 固化第一阶段承诺-实现-验证缺口矩阵
- `P1-T22`: 补齐平台治理域 API e2e（已完成）
- `P1-T23`: 建立前端平台治理 smoke e2e 与权限路由守卫（已完成）
- `P1-T24`: 收口平台导航治理缺口并同步路由对照文档（已完成）
- `P1-T25`: 复核平台导航治理的审计要求与第一阶段验收口径（已完成）
- `P1-T26`: 冻结统一运行时审计落库与安全事件结构化留痕的最小设计基线
- `P1-T27`: 实现 `audit_log` / `security_event` 持久化模型与写入基础设施（已完成）
- `P1-T28`: 接入平台治理高敏动作与关键安全事件（已完成）
- `P1-T29`: 补齐查询出口与自动化验收证据（已完成）
