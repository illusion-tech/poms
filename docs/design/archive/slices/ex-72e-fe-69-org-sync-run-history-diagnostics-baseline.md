# EX-72E / FE-69 同步运行历史与诊断详情实施基线

- Gate Status: `G4 Done`
- Parent: `#8`
- GitHub Issue: `#12`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: 2026-06-17
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-72E/FE-69`

## 1. 范围

- 本次目标:
  - 让管理员在外部组织同步工作台追溯同步预览 / 应用运行历史，不再只依赖当前 toast 和当前预览表格。
  - 新增按同步源查询运行历史的 B18 route，并复用既有 run detail 与 diff items route 展示详情。
  - 运行列表和详情必须区分 `previewing`、`previewed`、`failed`、`cancelled`、`applying`、`applied`，避免把失败、取消或未完成误解为“无差异”。
  - 失败运行必须展示可行动诊断：错误摘要、adapter 状态、provider code、HTTP status、建议动作和可复制诊断文本。
  - Admin 工作台增加“当前预览 / 运行历史”视图切换，并提供运行详情抽屉。
- 本次明确不做:
  - 不新增持久化表、不修改 `OrgSyncRun` / `OrgSyncDiffItem` DDL，不新增 migration。
  - 不实现 DingTalk / WeCom adapter、用户同步、权限同步或自动权限申请。
  - 不实现部门映射冲突处理、忽略 / 恢复和 per-row mapping command；这些继续由 `#10` 承接。
  - 不实现长期保留策略、归档任务或全局诊断中心；历史读取基于现有 run 表。
- 下游可依赖的交付边界:
  - `GET /platform/external-org-sources/{sourceId}/org-sync-runs` 是 source 下运行历史列表的 canonical route。
  - `OrgSyncRunSummary.diagnosticSummary` 是 Admin 展示诊断摘要和复制诊断的 typed read model；旧数据没有结构化诊断时可为空或回退到 `errorSummary`。
  - 运行详情抽屉可用既有 `GET /platform/org-sync-runs/{id}` 和 `GET /platform/org-sync-runs/{id}/diff-items` 补充明细。
- 不允许下游依赖的留白:
  - 不应依赖前端从错误文案正则提取 provider code 或 HTTP status。
  - 不应依赖本片提供跨 source 的全局运行搜索。
  - 不应依赖本片清理历史记录或改变 run / diff 生命周期。

## 2. 正式输入

| Input Type                | Document / Source                                                                                | Section / Anchor                 | Status | Notes                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------- | ------ | ------------------------------------------------------ |
| Business design           | GitHub issue `#12`                                                                               | Scope / acceptance criteria      | Pass   | 明确运行历史、详情诊断、状态文案和复制诊断。           |
| Parent program            | GitHub issue `#8`                                                                                | Platform UX closure              | Pass   | #12 是外部组织同步体验闭环第三个实施切片。             |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                                   | B18 External Organization Sync   | Rework | 需新增 list runs by source 查询 route。                |
| Prior API baseline        | `docs/design/archive/slices/ex-72c-external-org-sync-api-baseline.md`                            | run / diff route surface         | Pass   | 复用现有 run detail、diff items 和 apply route。       |
| Runtime baseline          | `docs/design/archive/slices/ex-72d-external-org-sync-runtime-baseline.md`                        | preview / apply workflow         | Pass   | 运行历史读取现有 `OrgSyncRun` 表。                     |
| Preview diagnostics       | `docs/design/archive/slices/ex-73c-external-org-sync-preview-diagnostics-baseline.md`            | failed preview diagnostics       | Pass   | 失败预览已写入 `errorSummary`，本片补历史化展示。      |
| Readiness diagnostics     | `docs/design/archive/slices/ex-73d-identity-provider-org-sync-diagnostics-baseline.md`           | structured checks / next actions | Pass   | next actions 文案口径沿用诊断型结果。                  |
| Admin workbench baseline  | `docs/design/archive/slices/fe-67-external-org-sync-workbench-baseline.md`                       | workbench / store                | Pass   | 复用 `/platform/external-org-sync` 页面和 store。      |
| Wizard baseline           | `docs/design/archive/slices/fe-68-external-org-sync-configuration-wizard-baseline.md`            | current preview limitation       | Pass   | 明确运行历史由 #12 承接。                              |
| Current implementation    | `OrgSyncRun` entity / `ExternalOrgSyncController` / `external-org-sync-workbench.ts` / contracts | source-scoped run route missing  | Pass   | 当前只有 create/get/diff/apply，没有 source run list。 |

## 3. 本次 SSOT

| Concern                     | SSOT                                          | Implementation Rule                                                                                      |
| --------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Business semantics          | `#12` + 本基线                                | 运行历史是同步源工作台的一部分，不是企业协同接入诊断中心。                                               |
| Public route canonical path | B18 route inventory                           | 新增 `GET /platform/external-org-sources/{sourceId}/org-sync-runs`。                                     |
| Route / query naming        | `listOrgSyncRuns`                             | query 支持 `status`、`limit`；默认 limit `20`，最大 `100`；排序固定为 `startedAt DESC, createdAt DESC`。 |
| DTO / contract naming       | `@poms/shared-contracts`                      | 新增 `OrgSyncRunListQuery`、`OrgSyncRunList`、`OrgSyncRunDiagnosticSummary`。                            |
| Table / column naming       | Existing `org_sync_run`                       | 不改 DDL；按 `sourceId` 查询现有 run。                                                                   |
| Date / time semantics       | `startedAt` / `finishedAt` / derived duration | 列表和详情均显示开始、结束和耗时；进行中运行结束时间为空。                                               |
| Identifier semantics        | Existing UUID / external ids                  | route sourceId 是 POMS UUID；provider code 是外部系统返回码字符串。                                      |
| Money / decimal semantics   | N/A                                           | 不涉及金额。                                                                                             |
| Status machine              | `OrgSyncRunStatus`                            | 不新增状态；UI 按已有状态精确文案化。                                                                    |

## 4. 命令与接口边界

| Route / Controller                                             | Command / Query          | Request DTO / Contract     | Response DTO / Contract | Guard / Permission                                       | Result    |
| -------------------------------------------------------------- | ------------------------ | -------------------------- | ----------------------- | -------------------------------------------------------- | --------- |
| `GET /platform/external-org-sources/{sourceId}/org-sync-runs`  | `listOrgSyncRuns()`      | `OrgSyncRunListQuery`      | `OrgSyncRunList`        | `platform:org-units:manage` + `platform:org-sync:manage` | delivered |
| `GET /platform/org-sync-runs/{id}`                             | `getOrgSyncRun()`        | unchanged                  | `OrgSyncRunDetail`      | same                                                     | reused    |
| `GET /platform/org-sync-runs/{id}/diff-items`                  | `listOrgSyncDiffItems()` | `OrgSyncDiffItemListQuery` | `OrgSyncDiffItemList`   | same                                                     | reused    |
| `POST /platform/external-org-sources/{sourceId}/org-sync-runs` | `createOrgSyncRun()`     | `CreateOrgSyncRunRequest`  | `OrgSyncRunDetail`      | same                                                     | reused    |
| `POST /platform/org-sync-runs/{id}:apply`                      | `applyOrgSyncRun()`      | `ApplyOrgSyncRunRequest`   | `OrgSyncRunDetail`      | same                                                     | reused    |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `GET /platform/external-org-sources/{sourceId}/org-sync-runs`
- Current implemented route(s): `GET /platform/external-org-sources/{sourceId}/org-sync-runs`
- Inventory status: `aligned`
- Route governance source: `ADR-015` + `EX-72A/C` + `#12`
- Blocker / exception: none.

## 5. 读模型与诊断边界

| Read Model                     | Source                              | Fields                                                                                                    | Notes                                                           |
| ------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `OrgSyncRunList`               | `org_sync_run`                      | `OrgSyncRunSummary[]`                                                                                     | 列表不分页计总数，首版以 `limit` 限制最近记录；按 source 隔离。 |
| `OrgSyncRunDiagnosticSummary`  | run fields + adapter error          | `message`、`adapterStatus`、`providerCode`、`httpStatus`、`providerMessage`、`nextActions`、`generatedAt` | 由后端派生；UI 只消费 typed 字段，不解析错误文案。              |
| Run detail drawer              | `OrgSyncRunDetail` + diff item list | status、duration、counts、error summary、diagnostic summary、safe JSON snapshots、diff items              | 可复制诊断文本由 UI 从 typed fields 和 safe snapshots 拼接。    |
| Current preview vs run history | Admin store                         | `activeRun`、`diffItems`、`runHistory`、`selectedRunDetail`                                               | 当前预览仍优先显示最新操作结果；历史列表支持回看任意 run。      |

### 5.1 诊断展示原则

- `message` 是面向管理员的首要错误描述，优先来自 adapter error 的诊断文案，其次回退 `errorSummary`。
- `providerCode` / `httpStatus` 只展示后端明确捕获的结构化值；不得从自由文本中猜测。
- `nextActions` 使用可行动短句，例如检查飞书应用身份权限、重新保存 secret、确认应用已发布。
- 复制诊断只包含安全字段：run id、source id、status、startedAt、finishedAt、errorSummary、diagnosticSummary、requestSnapshot/resultSummary 中已脱敏摘要。
- 不展示 client secret、tenant access token、user access token、OAuth code 或 Authorization header。

## 6. 持久化边界

| Table                | Migration | Entity / Repository | DDL / Freeze Source | Check Result              |
| -------------------- | --------- | ------------------- | ------------------- | ------------------------- |
| `org_sync_run`       | No        | `OrgSyncRun`        | EX-72B migration    | reuse existing run table  |
| `org_sync_diff_item` | No        | `OrgSyncDiffItem`   | EX-72B migration    | reuse existing diff table |

| Field / Shape                                | Design Type / Meaning                  | Migration / DDL | Entity        | Shared Contract / OpenAPI   | Result                        |
| -------------------------------------------- | -------------------------------------- | --------------- | ------------- | --------------------------- | ----------------------------- |
| `OrgSyncRun.diagnosticSummary`               | derived typed read model               | N/A             | N/A           | new optional response       | computed from existing fields |
| `OrgSyncRun.resultSummary.diagnosticSummary` | safe JSON persistence for new failures | N/A             | existing JSON | surfaced through read model | no DDL change                 |

## 7. UI 与交互边界

| Area                    | FE-69 Behavior                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Workbench layout        | 当前预览卡片增加“当前预览 / 运行历史”视图切换；历史列表不挤占同步源和映射主流程。          |
| Run history list        | 展示状态、开始时间、耗时、差异数、失败数、错误摘要；点击行打开详情抽屉。                   |
| Detail drawer           | 展示运行状态、时间、统计、错误摘要、诊断摘要、可复制诊断、diff items 摘要和安全 JSON。     |
| Failed run              | 明确标识失败，不显示“暂无预览差异”；提供复制诊断和修复指引。                               |
| No diff run             | 仅当 status 是 `previewed/applied` 且 diff count 为 0 时显示“没有发现需要同步的组织差异”。 |
| In-progress / cancelled | 使用 `runStatusLabel()` 给出“预览中 / 应用中 / 已取消”提示，不进入 apply 操作。            |
| Refresh                 | 刷新同步源时同步刷新当前 source 的运行历史；生成预览后把新 run 插入历史。                  |

## 8. 一致性结论

- Document -> code: 本基线冻结 `#12` 的 route、contract、read model 和 Admin 行为。
- ADR-015 inventory -> route: B18 新增 source-scoped run list route，运行实现后必须改为 `aligned`。
- Migration -> entity: 不改 schema；历史能力完全基于现有 run / diff 表。
- Entity -> contract: 新增 typed read model，不新增 entity 字段。
- Route -> query: `listOrgSyncRuns` 是读侧 query；不触发外部平台请求，不创建 run。
- Query -> view: Admin store 维护 current preview 与 history 两组状态，避免失败历史覆盖当前预览。
- Guard / permission: 沿用外部组织同步工作台权限，不新增 permission key。
- OpenAPI / generated client: 需要同步生成并检查，因为新增 route 和 response 字段。

## 9. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                      | Result | Gap / Reason                                                                                    |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| API focused tests                | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=external-org-sync --skip-nx-cache`                       | Pass   | 27 tests，覆盖 list runs、diagnostic summary、文本 / actions contract 裁剪和 controller。       |
| Admin focused tests              | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=external-org-sync-workbench --skip-nx-cache`           | Pass   | 35 tests，覆盖历史列表、详情抽屉、失败 / 无差异文案和详情加载态。                               |
| Admin data-access lint           | Yes      | `corepack pnpm nx lint admin-data-access --skip-nx-cache`                                                               | Pass   | store 新状态和 API 方法通过 lint。                                                              |
| API lint / build                 | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache` / `corepack pnpm nx build poms-api --skip-nx-cache`                    | Pass   | controller/service/contract 编译通过。                                                          |
| Admin lint / build               | Yes      | `corepack pnpm nx lint poms-admin --skip-nx-cache` / `corepack pnpm nx build poms-admin --skip-nx-cache`                | Pass   | Angular template / PrimeNG 编译通过；仍有既有 initial bundle budget warning，本次超出 1.93 kB。 |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi` / `corepack pnpm nx run shared-api-client:generate` / `shared-api-client:check` | Pass   | 新 route 和 contract 字段已同步到 OpenAPI 与 generated client。                                 |
| Migration / schema check         | No       | N/A                                                                                                                     | N/A    | 不改 persistence。                                                                              |
| Markdown / diff sanity           | Yes      | `corepack pnpm run format:md:check` / `git diff --check`                                                                | Pass   | 文档格式和 whitespace 检查通过。                                                                |

## 10. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes      |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 暂无例外。 |

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-17
- Conditions:
  - 运行历史列表必须是 source-scoped query，不新增跨 source 聚合。
  - 诊断详情必须由 typed read model 承载，不允许前端正则解析错误文案。
  - 不新增 DDL / migration；新失败运行如需结构化诊断，写入既有 `resultSummary` JSON。
  - route inventory 在 runtime 实现后必须从 `planned` 更新为 `aligned`。

## 12. G3 结论

- Gate Status: `Ready for Review`
- Reviewed By: `Codex`
- Reviewed At: 2026-06-17
- Delivered:
  - B18 `GET /platform/external-org-sources/{sourceId}/org-sync-runs` 已实现，支持 `status` / `limit` query，按 `startedAt DESC, createdAt DESC` 返回最近运行历史。
  - `OrgSyncRunSummary` / `OrgSyncRunDetail` 已新增 `diagnosticSummary` typed read model；失败预览会将结构化诊断写入既有 `resultSummary` JSON，旧数据回退 `errorSummary`。
  - Feishu adapter error 已携带 provider code、HTTP status、provider message 和 next actions；后端输出前统一脱敏 token / secret / bearer。
  - Admin 外部组织同步工作台已增加“当前预览 / 运行历史”切换、历史表格、运行详情弹窗、失败诊断展示和复制诊断。
  - OpenAPI、generated client、Admin data-access store 和 focused tests 已同步。
- Deferred:
  - 部门映射冲突处理、忽略 / 恢复和 per-row mapping command 继续由 `#10` 承接。
  - DingTalk / WeCom adapter、用户同步、权限同步、跨 source 搜索和历史保留策略不在本片范围内。

## 13. G4 结论

- Gate Status: `Done`
- Closed By: `Codex`
- Closed At: 2026-06-17
- PR: `#16`
- Merge: `5051bb77`
- GitHub Issue: `#12` 已关闭；父 issue `#8` 保持打开。
- Delivered:
  - B18 `GET /platform/external-org-sources/{sourceId}/org-sync-runs` 已合并到 `main`，支持 source-scoped 运行历史查询。
  - `OrgSyncRunDiagnosticSummary` typed read model 已稳定输出，包含脱敏后的错误描述、provider code、HTTP status、provider message 和 next actions。
  - Review 修复已收紧 `nextActions`、`message`、`providerMessage` 的 shared contract 上限，并稳定 Admin 运行历史刷新、详情加载和 loading 状态。
  - Admin 外部组织同步工作台已提供当前预览 / 运行历史切换、运行详情弹窗、复制诊断和失败 / 无差异 / 未完成状态文案。
- Validation:
  - `corepack pnpm nx test poms-api --runInBand --testPathPatterns=external-org-sync --skip-nx-cache`：Pass，27 tests。
  - `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=external-org-sync-workbench --skip-nx-cache`：Pass，35 tests。
  - `corepack pnpm nx lint poms-api --skip-nx-cache`：Pass。
  - `corepack pnpm nx lint poms-admin --skip-nx-cache`：Pass。
  - `corepack pnpm nx lint admin-data-access --skip-nx-cache`：Pass。
  - `corepack pnpm nx build poms-api --skip-nx-cache`：Pass。
  - `corepack pnpm nx build poms-admin --skip-nx-cache`：Pass；仍有既有 initial bundle budget warning，本次超出 1.93 kB。
  - `corepack pnpm nx build admin-data-access --skip-nx-cache`：Pass。
  - `corepack pnpm nx run poms-api:openapi`：Pass。
  - `corepack pnpm nx run shared-api-client:generate`：Pass。
  - `corepack pnpm nx run shared-api-client:check`：Pass。
  - `corepack pnpm run format:md:check`：Pass。
  - `git diff --check` / `git diff --cached --check`：Pass。
- Local docs:
  - 本 baseline 已归档到 `docs/design/archive/slices/`。
  - `phase2-development-execution-tracker.md` 已同步为 `Done / G4`。
  - `poms-design-progress.md` 已追加 G4 closeout 记录。
- Downstream:
  - `#10` 部门映射与冲突处理体验增强已由 `#12` 解除阻塞，可进入 G1 baseline。
  - 父 issue `#8` 继续保持打开，等待 `#10` 和测试环境端到端冒烟收口。
