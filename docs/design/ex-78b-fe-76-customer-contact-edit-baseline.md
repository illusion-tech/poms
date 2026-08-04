# EX-78B / FE-76 客户联系人编辑更新闭环实施基线包

- Gate Status: `Pass`
- Parent: GitHub issue `#37`; historical slices `EX-61 / FE-54 / EX-62 / EX-63B`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Wang Zishi`
- G1 Date: `2026-08-04`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-78B / FE-76`

## 1. 范围

- 本次目标:
  - 为共享销售情报面板中的客户联系人卡片提供编辑入口，复用已经交付的 `PATCH /customer-contacts/{id}` 和 `SalesIntelligenceStore.updateCustomerContact`。
  - 将现有联系人弹窗收敛为新增 / 编辑双模式；编辑时回填姓名、性别、部门、职务、工作电话、手机、微信、邮箱、备注和状态。
  - 拆分“客户联系人写权限”和“机会事实写权限”，使客户、线索、项目三个宿主页面都只在用户具有 `customer:write` 时展示联系人新增 / 编辑入口。
  - 编辑只提交实际变化字段；成功后由 Store 重新读取联系人列表，失败时保留弹窗、用户输入和可行动错误。
- 本次明确不做:
  - 不新增或变更 public route、shared contract、OpenAPI、generated client、数据库、migration 或权限 key。
  - 不新增客户联系人删除、批量编辑、合并、恢复或私人画像字段。
  - 不实现机会关系人、竞争态势、销售发现记录的编辑入口。
  - 不补 `expectedVersion` 或改变并发契约；现有缺口继续按 `EX63B-E1-EXPECTED-VERSION` 治理。
  - 不修复创建联系人 controller 未透传 `gender` 的既有缺陷；该问题已独立登记为 GitHub issue `#38` / `BUG-14`。
- 下游可依赖的交付边界:
  - 具有 `customer:write` 的用户可在客户、线索或项目上下文中编辑同一客户联系人主档；宿主对象写权限不替代客户写权限。
  - 联系人停用后仍保留历史联系人和既有关联事实，但不再进入新增机会关系人的可选联系人集合；重新启用后恢复为可选。
  - 更新成功继续由后端写入 `customer-contact.updated` 字段级审计；敏感联系方式和备注只记录脱敏摘要。
- 不允许下游依赖的留白:
  - 不承诺并发冲突检测；没有 `expectedVersion` 时，相同字段仍为服务端最后一次有效写入生效。
  - 不承诺在联系人编辑弹窗中维护机会关系人角色；两者属于不同事实对象和权限边界。

## 2. 正式输入

| Input Type                | Document / Source                                                                     | Section / Anchor                    | Status | Notes                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------- | ------ | --------------------------------------------------------------------- |
| Business request          | GitHub issue `#37`                                                                    | 背景、G0 边界、验收清单             | Active | 用户确认客户联系人当前不能编辑并要求开始方案设计。                    |
| Existing backend delivery | `docs/design/archive/slices/ex-61-sales-intelligence-business-discussion-baseline.md` | Customer contact routes             | Active | 联系人 list / create / update 已落地。                                |
| Existing frontend         | `docs/design/archive/slices/fe-54-sales-intelligence-discussion-frontend-baseline.md` | Shared panel / data-access boundary | Active | 共享面板已展示和新增联系人，Store 已包装 update。                     |
| Field contract            | `docs/design/archive/slices/ex-62-customer-contact-gender-baseline.md`                | Contract / Admin UI boundary        | Active | 性别为 `unknown / male / female`，不扩展私人画像。                    |
| Runtime audit             | `docs/design/archive/slices/ex-63b-crm-sales-fact-field-audit-baseline.md`            | `CustomerContact` audit fields      | Active | PATCH 已具备 changedFields、事务内审计和敏感字段脱敏。                |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                        | B10 `updateCustomerContact`         | Frozen | `PATCH /customer-contacts/{id}` 已 aligned，本片不改 public surface。 |
| Shared contract           | `UpdateCustomerContactRequestSchema` / `CustomerContactSummarySchema`                 | existing generated contract         | Active | PATCH 至少一个字段；可编辑字段和 null 语义已冻结。                    |
| Admin implementation      | `apps/poms-admin/src/app/shared/ui/sales-intelligence-panel.ts`                       | contact cards / dialog              | Active | 当前仅有新增入口，弹窗固定 create 模式。                              |
| Admin data access         | `libs/admin/data-access/src/lib/sales-intelligence/sales-intelligence.store.ts`       | `updateCustomerContact`             | Active | 更新后按 customerId 重新加载联系人列表。                              |

## 3. 本次 SSOT

| Concern                     | SSOT                                     | Implementation Rule                                                                                |
| --------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Business semantics          | GitHub issue `#37` + 本基线              | 编辑客户联系人主档，不编辑其机会角色或历史关联。                                                   |
| Public route canonical path | B10 `PATCH /customer-contacts/{id}`      | 复用已有一等资源 item route，不新增嵌套路由。                                                      |
| Component API               | `SalesIntelligencePanel`                 | 新增独立 `canWriteCustomerContact` input；既有 `canWrite` 只控制机会事实写入。                     |
| DTO / contract naming       | `UpdateCustomerContactRequest`           | 前端按现有字段名构造最小 PATCH；空可选文本归一为 `null`。                                          |
| Form source                 | selected `CustomerContactSummary`        | 编辑打开时一次性复制服务端快照；表单不直接改写 Store signal 中的对象。                             |
| Identifier semantics        | `CustomerContactSummary.id`              | 编辑目标固定为打开弹窗时的 contact ID；customerId 只用于成功后的列表 reload。                      |
| Status machine              | `CustomerContactStatusOptions`           | 仅 `active / inactive`；创建固定 active，状态选择器只在编辑模式展示。                              |
| Permission                  | existing `customer:write`                | 联系人新增 / 编辑只由 customer write 控制；lead/project write 仅控制机会关系、竞争态势和销售发现。 |
| Audit                       | existing `customer-contact.updated`      | UI 不直接写审计；只提交实际变化字段，由后端同事务计算 changedFields 并脱敏。                       |
| Concurrency                 | existing PATCH without `expectedVersion` | 本片不伪造乐观锁；最小 PATCH 降低覆盖窗口，保存后以服务端 reload 为准。                            |

## 4. 命令与接口边界

| Route / Controller                  | Command / Store                                | Request DTO / Contract                  | Response DTO / Contract    | Guard / Permission | Design Source              | Result       |
| ----------------------------------- | ---------------------------------------------- | --------------------------------------- | -------------------------- | ------------------ | -------------------------- | ------------ |
| B10 `PATCH /customer-contacts/{id}` | `SalesIntelligenceStore.updateCustomerContact` | `UpdateCustomerContactRequest` 最小字段 | `CustomerContactSummary`   | `customer:write`   | EX-61 / EX-63B / issue #37 | Reuse        |
| no new route                        | shared dialog save dispatcher                  | create or update request                | Store reload after success | component input    | this baseline              | To implement |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route: `PATCH /customer-contacts/{id}`
- Current implemented route: `PATCH /customer-contacts/{id}`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-61` G1 baseline / B10 inventory
- Blocker / exception: 无。本片不得修改 controller、DTO、OpenAPI 或 generated client。

### 4.2 宿主权限矩阵

| Host Page       | Contact Read           | Contact Create / Edit | Opportunity Fact Writes | Required Wiring                                            |
| --------------- | ---------------------- | --------------------- | ----------------------- | ---------------------------------------------------------- |
| Customer detail | existing customer read | `customer:write`      | N/A                     | `canWriteCustomerContact = canWriteCustomer()`             |
| Lead detail     | existing panel read    | `customer:write`      | `lead:write`            | 分别传入 customer write 与既有 `canWriteLead()`            |
| Project detail  | existing panel read    | `customer:write`      | `project:write`         | 分别传入 customer write 与既有 `canWriteProjectFollowUp()` |

## 5. 表单与交互边界

### 5.1 模式与状态

- `editingContact` signal 为 `null` 时是新增模式；非空时是编辑模式，并持有打开弹窗时的原始服务端快照。
- `showContactDialog()` 只处理新增：清空表单，标题为“新增客户联系人”，创建状态固定为 `active`。
- `showContactEditDialog(contact)` 只在 `canWriteCustomerContact` 且 customerId 有效时打开：回填所有可编辑字段，标题为“编辑客户联系人”。
- `resetContactDialog()` 同时清理原始快照、表单尝试态和联系人专用错误；读取列表的全局错误不得被联系人表单覆盖。
- 卡片编辑按钮使用可见“编辑”或包含联系人姓名的可访问名称，不允许只提供无语义图标。

### 5.2 字段矩阵

| Field        | Create                      | Edit                         | Normalize / Validate                          |
| ------------ | --------------------------- | ---------------------------- | --------------------------------------------- |
| `name`       | required                    | required                     | trim；空值阻止提交；max 128                   |
| `gender`     | shared enum，默认 `unknown` | 回填 shared enum             | 只使用 `CustomerContactGenderOptions`         |
| `department` | optional                    | optional / clearable         | trim；空字符串转 `null`；max 128              |
| `title`      | optional                    | optional / clearable         | trim；空字符串转 `null`；max 128              |
| `workPhone`  | optional                    | optional / clearable         | trim；空字符串转 `null`；max 64               |
| `mobile`     | optional                    | optional / clearable         | trim；空字符串转 `null`；max 64               |
| `wechat`     | optional                    | optional / clearable         | trim；空字符串转 `null`；max 128              |
| `email`      | optional                    | optional / clearable         | trim；空字符串转 `null`；非空时须为有效 email |
| `remark`     | optional                    | optional / clearable         | trim；空字符串转 `null`；max 2000             |
| `status`     | 不展示，后端固定 `active`   | required `active / inactive` | 只使用 `CustomerContactStatusOptions`         |

### 5.3 保存状态机

1. 新增模式沿用 create command，提交完整创建表单但不提交 status。
2. 编辑模式将归一化后的表单与 `editingContact` 快照逐字段比较，只把真实变化字段放入 `UpdateCustomerContactRequest`。
3. 无变化时保存按钮禁用，不发送 PATCH，也不制造成功提示或审计记录。
4. 请求进行中复用 `store.saving()` 阻止重复提交，并冻结当前 dialog mode / target ID。
5. 更新成功后 Store 重新读取联系人列表，随后关闭弹窗；卡片、状态标签和机会联系人选择项以 reload 结果为准。
6. 400 / 403 / 404 / 网络错误均不关闭弹窗，不清空用户输入；联系人专用 feedback 给出校验、权限变化、目标不存在或稍后重试提示。
7. 停用联系人不删除任何已有机会关系人；当前 `contactOptions()` 在 reload 后自然排除 inactive，重新启用后恢复。

## 6. 读侧与关联事实边界

| Query / View                   | Consumer                      | Behavior After Edit                                                         | Result    |
| ------------------------------ | ----------------------------- | --------------------------------------------------------------------------- | --------- |
| `GET /customer-contacts`       | shared panel contact cards    | Store 在 PATCH 成功后按 customerId reload，显示服务端标准化结果。           | Reuse     |
| `contactOptions()`             | opportunity stakeholder form  | 只列 active；状态变为 inactive 后不再用于新增关系人。                       | Reuse     |
| existing stakeholder summaries | lead / project decision chain | 既有关系记录不删除、不迁移；后端继续按 contactId 读取当前姓名、部门和职务。 | Unchanged |
| entity audit history           | existing FE-57 entry          | 后端继续记录真实 changedFields；联系方式和备注仅显示脱敏摘要。              | Reuse     |

## 7. 持久化边界

| Table                   | Migration | Entity / Repository               | DDL / Freeze Source | Check Result |
| ----------------------- | --------- | --------------------------------- | ------------------- | ------------ |
| `poms.customer_contact` | N/A       | existing update command           | EX-61 / EX-62       | Reuse        |
| `poms.audit_log`        | N/A       | existing EX-63B transaction audit | EX-63B              | Reuse        |

本片不改表、字段、约束、entity 或 repository。`rowVersion` 已在 summary 中返回，但 update contract 没有 `expectedVersion`；本片不把它伪装成已具备并发保护。

## 8. 一致性结论

- Document -> code: 当前后端和 Store 已交付 update；本片只补齐共享 Admin 编辑交互及权限接线。
- ADR-015 inventory -> route: B10 已 aligned，无 route inventory 变更。
- Migration -> entity: N/A，无 persistence change。
- Entity -> contract: existing `CustomerContactSummary` / `UpdateCustomerContactRequest` 保持不变。
- Route -> command: existing controller -> service -> transaction audit 路径保持不变。
- Query -> view: PATCH 成功后沿用 Store reload，不做乐观本地覆盖。
- Guard / permission: `customer:write` 与联系人入口对齐；lead/project 权限不再误授权联系人写入口。
- OpenAPI / generated client: 无变更；实现 diff 不得出现相关文件。
- Existing drift: create controller 缺少 `gender` 透传已登记 issue `#38`，不与本片混合提交。

## 9. 测试与校验

| Check                           | Required | Command / Evidence                                                                         | Result  | Gap / Reason                                                                                         |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------- |
| Shared component focused tests  | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=sales-intelligence-panel` | Passed  | 1 suite / 8 tests；覆盖编辑显隐、全字段回填、最小 PATCH、无变化、失败保留和权限拆分                  |
| Customer host focused tests     | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-workspace`       | Passed  | 1 suite / 8 tests；customer write 接线                                                               |
| Lead host focused tests         | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list`                | Passed  | 1 suite / 23 tests；customer / lead write 权限拆分                                                   |
| Project host focused tests      | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail`           | Passed  | 1 suite / 24 tests；customer / project write 权限拆分                                                |
| Admin lint                      | Yes      | `corepack pnpm nx lint poms-admin`                                                         | Passed  | All files pass linting                                                                               |
| Admin build                     | Yes      | `corepack pnpm nx build poms-admin`                                                        | Passed  | production bundle generation complete                                                                |
| Deployment                      | Yes      | release `20260804-163850`；build/preflight/migration gate/push/verify                      | Passed  | source commit `cb069d5d`；SHA-256 `AA8E790508B1DDD418ECDB93CEAA424EF65C7744FCC1CEBC009CA802A952650C` |
| Browser verification            | Yes      | 客户页编辑并刷新；停用/启用；无 customer write 时三类宿主均无联系人写入口                  | Blocked | 登录页加载、重定向及 console error 检查通过；内置浏览器无授权登录态，业务写操作待用户验收            |
| OpenAPI / generated client diff | No       | `git diff --name-only` 不得包含 API spec/client                                            | Passed  | 未出现 API、contract、OpenAPI、generated client 或 migration 文件                                    |
| Migration / schema check        | No       | No persistence change                                                                      | N/A     |                                                                                                      |
| Markdown / diff sanity          | Yes      | `pnpm run format:md:check`; `git diff --check`                                             | Passed  | G1 与 G3 均通过                                                                                      |

## 10. 例外与风险

| Exception / Risk ID                | Class                     | Scope                          | Owner                     | Due                                  | Decision                                               |
| ---------------------------------- | ------------------------- | ------------------------------ | ------------------------- | ------------------------------------ | ------------------------------------------------------ |
| `EX63B-E1-EXPECTED-VERSION`        | `existing-baseline-drift` | concurrent contact updates     | future API contract slice | before strict concurrency is claimed | 本片只发送变化字段并 reload，不宣称冲突检测。          |
| `BUG-14-CREATE-GENDER-PROPAGATION` | `existing-baseline-drift` | create controller mapping      | GitHub issue `#38`        | before next contact-create delivery  | 不阻断 PATCH 编辑；不得在本片顺手扩成跨层修复。        |
| `FE76-R1-SHARED-PERMISSION-SPLIT`  | implementation risk       | customer / lead / project host | `EX-78B/FE-76`            | G3                                   | 三类宿主测试必须证明联系人写权限与机会事实写权限独立。 |

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: `Wang Zishi`
- Approved At: `2026-08-04`
- Conditions:
  1. 实现保持 `frontend-only`，不得修改 API、contract、OpenAPI、generated client 或 migration。
  2. 联系人新增 / 编辑入口必须统一收口到 `customer:write`，不可沿用 lead/project write 作为替代权限。
  3. 编辑必须构造最小 PATCH，无变化不得发请求；成功以 Store reload 为准，失败保留输入。
  4. 状态停用不得删除历史机会关系；只影响后续关系人选择。
  5. issue `#38` 的 create gender drift 独立治理，不阻断本片 G2，但 G3 必须确认本片未扩大该 drift。

## 12. G3 结论

- Gate Status: `Pass`
- Reviewed By: `Codex`
- Reviewed At: `2026-08-04`
- Implementation Evidence:
  1. 共享销售情报面板已提供联系人卡片编辑入口和新增 / 编辑双模式弹窗；编辑回填全部既有可编辑字段，并可维护 `active / inactive` 状态。
  2. 更新请求只包含归一化后发生变化的字段；无变化时禁用保存且不发送 PATCH；失败时保留弹窗和用户输入，成功继续使用 Store reload。
  3. 客户、线索、项目三个宿主均独立传入 `customer:write`，不会由 `lead:write` 或 `project:write` 替代联系人写权限。
  4. 四个聚焦测试套件最终共 63 个用例通过；Admin lint、production build、Markdown format check 和 diff check 均通过。
  5. 实现差异保持 `frontend-only`，未修改 API、contract、OpenAPI、generated client、migration 或 issue `#38` 所跟踪的 create gender 路径。
  6. source commit `cb069d5d` 已部署测试环境 release `20260804-163850`；远端 preflight、完整 migration gate、release 激活、PM2 reload 与 `deploy:verify-test` 均通过，目标库无 pending migration。
- Remaining Before G4:
  1. 使用授权业务账号完成有 / 无 `customer:write` 的真实浏览器验收，覆盖编辑刷新、停用和重新启用。
  2. 合并前完成 PR review / CI，并由业务验收确认后再进入 G4 / Done。
