# POMS 个人中心自助编辑资料设计

**文档状态**: Review
**最后更新**: 2026-04-21
**适用范围**: `POMS` 平台治理域中“当前登录用户自助编辑个人资料”的命令、契约、前端交互与审计边界冻结
**关联文档**:

- 上游设计:
  - `platform-governance-design.md`
  - `user-management-design.md`
  - `navigation-design.md`
- 同级设计:
  - `../interface-command-design.md`
  - `../interface-openapi-dto-design.md`
  - `../query-view-boundary-design.md`
  - `../business-authorization-matrix.md`
  - `../api-route-canonical-inventory.md`
- 相关 ADR:
  - `../../adr/008-current-user-profile-output-contract.md`
  - `../../adr/015-api-route-canonical-grammar.md`

---

## 1. 文档目标

本文档用于冻结“个人中心自助编辑资料”这条后续实现切片的正式输入，明确：

- 当前登录用户可以自助修改哪些资料，哪些字段继续只读
- 自助编辑是否复用平台管理员用户管理接口
- 正式 route、DTO、query、guard 与 audit 边界是什么
- `/profile` 页面的前端交互应如何与 `auth/profile` 的当前用户上下文保持一致

本文档不负责实现代码，也不替代 `User` 主数据设计或平台管理员用户管理设计。

---

## 2. 设计范围

### 2.1 本次纳入范围

- 当前登录用户在 `/profile` 页面发起“编辑资料”
- 当前用户自助维护以下字段：
  - `displayName`
  - `email`
  - `phone`
- 当前用户资料更新后的返回契约、前端回显和顶部身份区同步
- 联系方式更新后的验证标记语义
- 当前用户自助编辑的 guard、审计与最小测试边界

### 2.2 本次明确不做

- 用户名修改
- 密码修改、重置密码、自助找回密码
- 角色、权限、主责组织、附属组织的自助维护
- `avatarUrl` 的自助维护
- 二进制头像上传、图片裁剪、对象存储接入
- 邮箱 / 手机验证码发送与验证闭环
- 面向他人的用户资料代填或平台管理员 impersonation

---

## 3. 上游约束

本专题继承以下已固定结论：

- `/profile` 只承接个人中心语义，不再混用为平台用户管理入口
- `auth/profile` 是当前登录用户资料的正式读侧入口，返回 `SanitizedUserWithOrgUnits`
- 平台管理员维护他人资料的正式入口是 `PATCH /platform/users/{id}`，不应被当前用户自助编辑复用为同一路由能力
- `ADR-015` 要求新公共 route 按 canonical inventory 先冻结后实现
- 普通资料维护优先使用 `PATCH` 资源语义，不把普通字段修改误提升为高敏命令

---

## 4. 当前实现现状与缺口

当前仓库现实如下：

- `/profile` 已收口为独立个人中心页，并直接消费 `GET /auth/profile`
- 前端 `AuthStore.currentUser`、顶部用户菜单和个人中心页都依赖同一份当前用户聚合输出
- 平台管理员已有 `PATCH /platform/users/{id}`，但该接口受 `platform:users:manage` 保护，语义是“管理员维护他人主数据”
- 当前不存在“当前登录用户自助编辑资料”的正式写侧 route、DTO、OpenAPI 和前端交互

当前缺口判断：

- 若直接复用 `PATCH /platform/users/{id}`，会把“自助编辑本人资料”和“管理员维护他人资料”混成一个权限与审计边界
- 若前端自行拼接本地状态而不拉通正式写侧，顶部身份区、`AuthStore.currentUser` 与 `/profile` 页面会再次漂移
- 若不先固定联系方式变更后的 `emailVerified / phoneVerified` 语义，后端与前端会各自写出不同口径

---

## 5. 冻结结论

### 5.1 业务语义

- “个人中心自助编辑资料”是**当前登录用户对自身基础展示资料的普通更新能力**
- 它不是平台治理高敏关系维护命令，不承担用户启停、角色分配、组织绑定或认证凭证管理
- 它也不是平台管理员用户管理接口的权限放宽版本

### 5.2 Route / command 边界

| Capability                 | Canonical Route       | 语义                         | 结论               |
| -------------------------- | --------------------- | ---------------------------- | ------------------ |
| `getCurrentUserProfile`    | `GET /auth/profile`   | 当前登录用户资料查询         | 保持现有正式入口   |
| `updateCurrentUserProfile` | `PATCH /auth/profile` | 当前登录用户自助更新自身资料 | 作为新写侧入口冻结 |

选择 `PATCH /auth/profile` 的理由：

- 当前读侧已经稳定在 `GET /auth/profile`，沿用同一路径簇最利于当前用户资源的一致心智
- 本次目标是给现有个人中心补齐写侧，而不是借机迁移读侧到新的 `/me/profile`
- 新能力是普通字段更新，不应引入 `colon-action`

显式拒绝以下方案：

- `PATCH /platform/users/{id}` 直接给当前用户开放自助修改
- `POST /auth/profile:update`
- 新增 `/profile/edit` 页面型前端路由再由页面本地状态伪写回

### 5.3 请求 / 响应契约

新增独立请求契约：`UpdateCurrentUserProfileRequest`

建议字段：

| 字段          | 类型             | 规则                       | 说明         |
| ------------- | ---------------- | -------------------------- | ------------ |
| `displayName` | `string`         | `trim + min(1) + max(128)` | 展示姓名     |
| `email`       | `string \| null` | `email`                    | 邮箱，可清空 |
| `phone`       | `string \| null` | `max(64)`                  | 手机，可清空 |

契约冻结规则：

- `UpdateCurrentUserProfileRequest` **不复用** `UpdatePlatformUserRequest` 类型名，即使局部字段与平台管理员普通更新存在重叠
- 这样可以避免未来把“管理员维护他人资料”与“当前用户自助编辑自己资料”长期绑成同一契约演进节奏
- 首版自助编辑字段范围冻结为 `displayName / email / phone`，`avatarUrl` 虽存在于当前用户读侧，但暂不纳入自助写侧
- 首版响应直接返回最新 `SanitizedUserWithOrgUnits`，用于前端立即刷新当前用户上下文和顶部身份区

### 5.4 字段可编辑边界

| 字段            | 当前用户自助编辑 | 平台管理员维护他人 | 备注                 |
| --------------- | ---------------- | ------------------ | -------------------- |
| `displayName`   | 允许             | 允许               | 普通展示字段         |
| `email`         | 允许             | 允许               | 联系方式             |
| `phone`         | 允许             | 允许               | 联系方式             |
| `avatarUrl`     | 不允许           | 允许               | 当前仅允许管理员维护 |
| `username`      | 不允许           | 不允许             | 登录标识，另起专题   |
| `isActive`      | 不允许           | 通过独立命令维护   | 不得混入 PATCH       |
| `roles`         | 不允许           | 通过独立命令维护   | 不得混入 PATCH       |
| `orgUnits`      | 不允许           | 通过独立命令维护   | 不得混入 PATCH       |
| `permissions`   | 不允许           | 不直接写           | 派生事实             |
| `emailVerified` | 不允许直接写     | 不允许直接写       | 随联系方式语义变化   |
| `phoneVerified` | 不允许直接写     | 不允许直接写       | 随联系方式语义变化   |

### 5.5 联系方式与验证标记语义

- 若 `email` 的新值与旧值不同，则写侧必须把 `emailVerified` 重置为 `false`
- 若 `phone` 的新值与旧值不同，则写侧必须把 `phoneVerified` 重置为 `false`
- 若提交值与当前值相同，则不得无故重置对应验证标记
- 首版不负责新增验证流程；因此验证标记在当前阶段只表达“当前联系方式是否已被历史验证”，不表达“修改后一定会马上补验证”

为避免语义分叉，建议 `PATCH /platform/users/{id}` 与 `PATCH /auth/profile` 最终共用同一套字段归一化 helper，使管理员维护与自助编辑在联系方式变更上的规则一致。

### 5.6 Guard / permission 边界

- `PATCH /auth/profile` 只要求 `Authenticated()`
- 不新增独立 `PermissionKey`
- 写侧的目标用户由 JWT `sub` 唯一决定，不接受 path `id`、body `userId` 或 query override
- 若当前 token 对应的真实平台用户不存在或已失效，则请求应失败，不接受把 fixture fallback 账户视作正式可编辑主体

### 5.7 审计边界

当前用户自助编辑必须写入统一 `audit_log`，建议冻结如下：

- `eventType`: `platform.user.self-updated`
- `targetType`: `PlatformUser`
- `targetId`: 当前用户 `id`
- `operatorId`: 当前用户 `id`
- `result`: `success`
- `beforeSnapshot` / `afterSnapshot`: 只包含本次允许自助编辑的字段与可能被动变化的 `emailVerified`、`phoneVerified`
- `details.changedFields`: 显式列出本次变更字段名集合

该审计事件必须能与平台管理员的 `platform.user.updated` 区分开。

---

## 6. 读侧边界

自助编辑不新增新的个人中心读侧 query，继续沿用 `SanitizedUserWithOrgUnits`。

新增 / 固定的读侧结论如下：

- `CurrentUserProfileView` 以 `GET /auth/profile` 为唯一正式来源
- `/profile` 页面、顶部身份区与登录后的 `AuthStore.currentUser` 必须共享同一份最新响应
- 前端不得在保存成功后只局部改页面字段而不刷新 `AuthStore.currentUser`

---

## 7. 前端交互冻结

### 7.1 页面交互

- `/profile` 保持为个人中心唯一入口
- 在“账户信息”区域增加“编辑资料”入口
- 首版采用单页内 modal / drawer 编辑，不新增新的前端叶子路由

### 7.2 表单范围

表单只开放以下字段：

- `displayName`
- `email`
- `phone`

以下信息继续只读展示：

- `username`
- `avatarUrl`
- 当前角色
- 当前权限摘要
- 主责 / 附属组织
- `isActive`
- `lastLoginAt`
- `emailVerified`
- `phoneVerified`

### 7.3 保存后的前端行为

- 成功后以接口返回的最新 `SanitizedUserWithOrgUnits` 覆盖 `AuthStore.currentUser`
- 顶部菜单中的显示姓名与主组织提示必须即时同步
- `/profile` 页面停留在当前页，不做额外跳转
- 若后端返回字段校验错误，表单原位展示

### 7.4 首版不做的前端增强

- `avatarUrl` 文本 URL 自助编辑
- 二进制头像上传
- 表单草稿自动保存
- 验证码发送
- “修改密码”页签

---

## 8. 实现切片建议

后续建议拆为两个实现切片：

1. `EX-16`：当前用户自助资料更新命令与契约落地
   - shared contract
   - controller / service
   - OpenAPI / generated client
   - audit
   - backend tests
2. `FE-15`：个人中心自助编辑资料前端实现
   - `/profile` 编辑交互
   - `AuthStore.currentUser` 刷新
   - 顶部身份区同步
   - frontend tests / smoke

---

## 9. 测试与验收要点

后续实现至少应覆盖：

- 当前用户成功修改 `displayName`
- 当前用户成功修改 `email` 后 `emailVerified=false`
- 当前用户成功修改 `phone` 后 `phoneVerified=false`
- 未修改联系方式时，不误清验证标记
- 当前用户不能通过该接口修改 `username`、角色、组织、启停状态
- `PATCH /auth/profile` 成功后，前端顶部身份区与 `/profile` 页面同步更新
- 无 `platform:users:manage` 的普通业务账号也可自助维护自己的资料
- 当前用户不能通过该接口越权修改他人资料

---

## 10. 后续议题

本设计故意留给后续专题的内容：

- 修改密码 / 重置密码
- 邮箱 / 手机验证闭环
- 头像上传与媒体存储
- 更完整的个人偏好设置
