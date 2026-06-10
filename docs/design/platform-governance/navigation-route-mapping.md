# POMS 导航-路由对照表

**文档状态**: Active
**最后更新**: 2026-06-10
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

| 导航键                                  | 目标导航链接                             | 当前前端现状                                             | 状态          | 第一阶段处理建议                                                                   |
| --------------------------------------- | ---------------------------------------- | -------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------- |
| `dashboard`                             | `/dashboard`                             | 已有真实工作台页                                         | `implemented` | 继续保持为正式首页入口                                                             |
| `customers`                             | `/customers`                             | 已有真实客户管理页                                       | `implemented` | 继续保持启用，并与权限、导航同步校验                                               |
| `leads`                                 | `/leads`                                 | 已有真实线索管理页                                       | `implemented` | 继续保持启用，并与权限、导航同步校验                                               |
| `projects`                              | `/projects`                              | 已有真实项目管理页                                       | `implemented` | 继续保持启用，并与权限、导航同步校验                                               |
| `contracts`                             | `/contracts`                             | 已有真实合同管理页                                       | `implemented` | 继续保持启用，并与权限、导航同步校验                                               |
| `attachments`                           | `/attachments`                           | 已有真实附件中心页                                       | `implemented` | 继续保持启用，并与权限、导航同步校验                                               |
| `platform.users`                        | `/platform/users`                        | 已有真实页面、真实 API 与权限守卫                        | `implemented` | 继续保持为正式入口，并持续用 smoke 覆盖可达性与拦截                                |
| `platform.roles`                        | `/platform/roles`                        | 已有真实页面、真实 API 与权限守卫                        | `implemented` | 继续保持为正式入口                                                                 |
| `platform.org-units`                    | `/platform/org-units`                    | 已有真实页面、真实 API 与权限守卫                        | `implemented` | 以“组织单元”作为用户可见名称启用                                                   |
| `platform.external-org-sync`            | `/platform/external-org-sync`            | 已有真实工作台，消费外部组织同步 API                     | `implemented` | 以“外部组织同步”作为用户可见名称启用；provider 连接配置仍由企业协同接入维护        |
| `platform.dictionaries`                 | `/platform/dictionaries`                 | 已有真实业务字典页与权限守卫                             | `implemented` | 继续保持为正式入口                                                                 |
| `platform.identity-providers`           | `/platform/identity-providers`           | 已有真实企业协同接入配置页与权限守卫                     | `implemented` | 以“企业协同接入”作为用户可见名称启用；保留既有 route path 与权限 key               |
| `platform.attachment-storage-providers` | `/platform/attachment-storage-providers` | 已有真实文件存储接入配置页与权限守卫                     | `implemented` | 以“文件存储接入”作为用户可见名称启用；保留既有 route path 与权限 key               |
| `platform.system-settings`              | `/platform/system-settings`              | 已有真实系统设置页与权限守卫                             | `implemented` | 继续保持为正式入口                                                                 |
| `platform.navigation`                   | `/platform/navigation`                   | 已有只读治理页，可查看导航树与路由对齐结果               | `implemented` | 第一阶段按受控治理入口启用，并通过显式同步命令把导航事实源变化写入统一 `audit_log` |
| `my_profile`                            | `/profile`                               | 已有独立个人中心页，直接消费真实 `auth/profile` 聚合输出 | `implemented` | 保持为当前阶段正式入口；不得再复用平台用户管理页或旧 `/profile/*` 模板流程         |

### 4.1 平台配置容器节点

以下导航 key 是平台配置的信息架构容器，不分配目标导航链接，不进入可跳转路由对照表：

```text
platform.people-access
platform.organization
platform.integrations
platform.business-config
platform.system-governance
```

容器节点只承担展开 / 收起和分组语义，权限可见性由其过滤后的子节点派生。

---

## 5. 与第一阶段缺口补齐计划的衔接

当前阶段，平台导航应分两层理解：

1. **消费层与页面落点已跑通**：当前用户导航树已能通过真实接口下发，前端已支持平台配置中间层 `collapsable` 容器，并已有 `/platform/users`、`/platform/roles`、`/platform/org-units`、`/platform/external-org-sync`、`/platform/dictionaries`、`/platform/identity-providers`、`/platform/attachment-storage-providers`、`/platform/system-settings`、`/platform/navigation` 等平台治理入口。
2. **运行时审计已收口**：`/platform/navigation` 当前除只读治理页外，还具备显式同步命令，可把导航事实源同步结果写入统一 `audit_log`。

因此第一阶段补齐要求如下：

- `platform.users`、`platform.roles`、`platform.org-units`、`platform.external-org-sync`、`platform.dictionaries`、`platform.identity-providers`、`platform.attachment-storage-providers`、`platform.system-settings`、`platform.navigation` 当前均已具备真实落点，可按当前链接正式启用
- `navigation-route-mapping.md` 需继续与真实前端路由同步维护，避免再次漂移
- 平台导航的一级分组和中间层容器不单独承担真实路由，对照表继续只维护可跳转叶子节点

## 6. 变更要求

- 任一导航键的目标链接变更，必须同步更新本表和后端导航定义
- 任一状态从 `planned` 进入 `bridged` 或 `implemented`，都应补充对应页面承载与守卫验证
- 当旧路径被完全淘汰时，应在本表中删除桥接说明，而不是长期保留双轨口径
