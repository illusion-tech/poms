# POMS 导航-路由对照表

**文档状态**: Review
**最后更新**: 2026-03-10
**适用范围**: `POMS` 第一阶段平台治理域中的导航与前端路由收敛
**关联文档**:

- 上游设计:
  - `platform-governance-design.md`
  - `navigation-design.md`
- 相关 ADR:
  - `../../adr/003-navigation-single-source-of-truth.md`
  - `../../adr/009-platform-navigation-group-visibility-rule.md`
  - `../../adr/010-platform-user-management-route-bridging-status.md`

---

## 1. 文档目标

本文档用于作为第一阶段导航启用、路由迁移和前端收敛的正式基线，明确每个导航键对应的目标链接、当前前端现状、迁移状态和处理策略，避免后端导航、前端真实路由和页面承载之间继续漂移。

---

## 2. 维护原则

- 后端导航 `link` 必须与前端真实路由保持一致
- 路由未收敛完成前，不应把导航项视为已正式可用
- 每次新增、迁移或启用平台导航节点时，都应同步更新本表
- 本表是 `navigation-design.md` 的正式配套输出物，而不是临时讨论附件

---

## 3. 状态定义

| 状态          | 含义                                                             |
| ------------- | ---------------------------------------------------------------- |
| `implemented` | 目标导航链接已有真实页面承载，可按正式链接启用                   |
| `bridged`     | 目标链接与当前前端现状暂不完全一致，但已有兼容跳转或迁移桥接方案 |
| `planned`     | 目标链接已确定，但页面尚未就位，不应正式启用                     |

---

## 4. 第一阶段对照表

| 导航键                | 目标导航链接           | 当前前端现状                  | 状态          | 第一阶段处理建议                                   |
| --------------------- | ---------------------- | ----------------------------- | ------------- | -------------------------------------------------- |
| `dashboard`           | `/dashboard`           | 当前首页仍以 `/` 为主         | `bridged`     | 在路由侧补收敛或建立兼容跳转后再完全收口           |
| `projects`            | `/projects`            | 当前未见稳定业务页            | `planned`     | 页面就位并与权限、导航联调后再正式启用             |
| `platform.users`      | `/platform/users`      | 当前用户管理仍在 `/profile/*` | `planned`     | 页面就位并完成导航、守卫与必要桥接验证后再正式启用 |
| `platform.roles`      | `/platform/roles`      | 当前未见稳定业务页            | `planned`     | 页面就位后再正式启用                               |
| `platform.org-units`  | `/platform/org-units`  | 当前未见稳定业务页            | `planned`     | 页面就位后再正式启用                               |
| `platform.navigation` | `/platform/navigation` | 当前未见稳定业务页            | `planned`     | 页面就位后再正式启用                               |
| `my_profile`          | `/profile`             | 当前已有 `/profile/*` 体系    | `implemented` | 可保留为当前阶段正式入口                           |

---

## 5. 变更要求

- 任一导航键的目标链接变更，必须同步更新本表和后端导航定义
- 任一状态从 `planned` 进入 `bridged` 或 `implemented`，都应补充对应页面承载与守卫验证
- 当旧路径被完全淘汰时，应在本表中删除桥接说明，而不是长期保留双轨口径
