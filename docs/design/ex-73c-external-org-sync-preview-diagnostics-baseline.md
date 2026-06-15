# EX-73C 外部组织同步预览诊断收口基线

- Gate Status: `G4 Pass`
- Parent: `EX-73`
- Owner: `Codex`
- Slice Type: `cross-layer-corrective`
- G1 Reviewer: `Codex`
- G1 Date: 2026-06-16
- G4 Reviewer: `Codex`
- G4 Date: 2026-06-16
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-73C`

## 1. 范围

- 本次目标:
  - 修正 Feishu 部门子级接口分页参数，避免上线后因 `page_size` 超过飞书限制导致预览失败。
  - 将 Feishu / HTTP 调用失败归一化为可排查的 `ExternalOrgDirectoryAdapterError`，让 `OrgSyncRun.errorSummary` 保留外部平台 code / message 和 POMS 侧诊断。
  - Admin 外部组织同步工作台必须把 `OrgSyncRun.status=failed` 视为预览失败，而不是展示“发现 0 条差异”的成功反馈。
  - 在同步预览区展示最近失败原因、开始 / 结束时间和明确空状态，降低管理员在企业协同接入与组织同步之间来回猜测的成本。
- 本次明确不做:
  - 不新增或修改 public route、DTO、OpenAPI、generated client 或 migration。
  - 不新增独立“诊断中心”或 provider 健康检查 route。
  - 不实现 DingTalk / WeCom adapter、用户同步、权限同步或飞书回写。
  - 不重构企业协同接入页面的信息架构；本片只改外部组织同步工作台的预览反馈闭环。

## 2. 正式输入

| Input Type          | Document / Source                                     | Section / Anchor              | Status | Notes                                                                     |
| ------------------- | ----------------------------------------------------- | ----------------------------- | ------ | ------------------------------------------------------------------------- |
| Runtime baseline    | `ex-72d-external-org-sync-runtime-baseline.md`        | 4 / 5 / 7                     | Pass   | Feishu adapter 和 preview / apply 工作流已交付，本片只做诊断收口。        |
| Workbench baseline  | `fe-67-external-org-sync-workbench-baseline.md`       | 4 / 6                         | Pass   | 工作台已消费既有 API，本片不新增前端 route 或权限。                       |
| Readiness baseline  | `EX-73A` tracker / progress                           | provider config readiness     | Pass   | 企业协同接入可用性已经收口，本片处理“预览运行时失败后如何理解”。          |
| Route inventory     | `api-route-canonical-inventory.md`                    | B18 `createOrgSyncRun`        | Pass   | 使用既有 `POST /platform/external-org-sources/{sourceId}/org-sync-runs`。 |
| Production feedback | poms-test external org sync browser / Feishu open API | preview failure investigation | Active | 线上配置权限后，用户仍无法从界面判断预览失败原因。                        |

## 3. 本次 SSOT

| Concern          | SSOT             | Implementation Rule                                                                  |
| ---------------- | ---------------- | ------------------------------------------------------------------------------------ |
| Route surface    | EX-72C / B18     | 不开新 route；失败诊断随现有 run status / errorSummary 返回。                        |
| Feishu page size | Feishu API limit | 部门 children 查询默认和上限均为 50；环境变量只允许调小或设为 1..50。                |
| Adapter errors   | Adapter boundary | Feishu API / HTTP 异常统一包装为 `ExternalOrgDirectoryAdapterError`，不泄露 secret。 |
| Run semantics    | `OrgSyncRun`     | `status=failed` 是预览失败，不等价于成功预览 0 条 diff。                             |
| Admin UX         | Workbench page   | Toast、预览区 banner 和空状态必须给出一致、可行动的失败原因。                        |

## 4. 交付边界

| Layer       | Change                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------- |
| API adapter | `FeishuExternalOrgDirectoryAdapter` 限制 `page_size<=50`，归一化 Feishu code / message。            |
| API service | 保持 `createOrgSyncRun` 返回 failed run 的既有语义，补充 adapter failure focused coverage。         |
| Admin UI    | `createPreviewRun()` 检查 returned run status；failed 时清空选择、显示错误 toast 和预览区失败提示。 |
| Admin tests | 覆盖 failed run 不再显示成功 toast、不再自动勾选 diff、空状态文案可区分未生成 / 失败 / 0 差异。     |
| Docs        | tracker / progress 记录本片边界和验证结论。                                                         |

## 5. 测试与校验计划

| Check                  | Required | Command / Evidence                                                                            | Result | Gap / Reason                                  |
| ---------------------- | -------- | --------------------------------------------------------------------------------------------- | ------ | --------------------------------------------- |
| Feishu adapter tests   | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=feishu-external-org-directory` | Pass   | 覆盖 page size 50 和 Feishu error normalize。 |
| External org service   | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=external-org-sync.service`     | Pass   | 覆盖 adapter failed run status / summary。    |
| Admin focused tests    | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=external-org-sync-workbench` | Pass   | 覆盖 failed preview UX。                      |
| API lint/build         | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache` / `corepack pnpm nx build poms-api`          | Pass   | 无 route / schema 变更。                      |
| Admin lint/build       | Yes      | `corepack pnpm nx lint poms-admin --skip-nx-cache` / `corepack pnpm nx build poms-admin`      | Pass   | 验证模板编译和样式 class。                    |
| OpenAPI / client       | No       | `N/A`                                                                                         | N/A    | 不改 public contract。                        |
| Migration check        | No       | `N/A`                                                                                         | N/A    | 不改 schema。                                 |
| Markdown / diff sanity | Yes      | `corepack pnpm run format:md:check` / `git diff --check`                                      | Pass   | 文档表格格式化后检查通过。                    |

## 6. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-16
- Conditions:
  - 错误信息可以包含 Feishu code / message，但不得包含 app secret、tenant token 或用户 token。
  - 不通过新增 route 绕过当前 B18 preview 命令链；诊断先沉到 run 结果和工作台展示。
  - Admin 不在前端重复实现 diff 规则，只区分 run lifecycle 和错误展示。

## 7. G3 Drift Classification

| Drift                      | Classification        | Resolution                                                                                  |
| -------------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| Feishu page size `100->50` | `production-feedback` | 线上联调证明飞书部门 children 接口拒绝 `page_size>50`；本片按 provider 限制修正默认和上限。 |
| Admin failed run handling  | `ux-corrective`       | 既有 UI 把 failed run 当成功 toast；本片不改契约，只按 run lifecycle 正确展示。             |
| OpenAPI / generated client | `accepted-boundary`   | 不改 public DTO；继续消费 `OrgSyncRun.status/errorSummary` 既有字段。                       |

## 8. G4 结论

- Gate Status: `Pass`
- Completed By: `Codex`
- Completed At: 2026-06-16
- Delivered:
  - Feishu 部门 children 查询默认和上限均收口到 50，避免再次触发 provider `page_size` 限制。
  - Feishu HTTP / API 错误在 adapter 边界归一化为 `ExternalOrgDirectoryAdapterError`，失败 run 能保存可排查的 `errorSummary`。
  - Admin 外部组织同步工作台按 `OrgSyncRun.status` 区分预览成功、失败、未完成和无差异，不再把失败展示成“发现 0 条差异”。
- Deferred:
  - 更完整的 provider 诊断中心、权限自动检测、DingTalk / WeCom adapter 和 E2E closeout 继续后续切片评估。
