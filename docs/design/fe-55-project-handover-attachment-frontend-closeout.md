# FE-55 项目移交附件清单与批量下载前端入口 G3 / G4 Closeout

- Gate Status: `Pass`
- Date: `2026-05-05`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Tracker Row: `FE-55`

## 1. 交付范围

- 在项目合同承接 / 正式移交页面新增附件移交清单区块。
- 从 `ProjectHandoverDetailView.handoverId` 读取 EX-52A 附件移交清单。
- 展示清单总数、已纳入、敏感排除、可下载、缺失、版本过期和排除统计。
- 展示附件名、分类、安全级别、状态、来源、排除 / 纳入说明。
- 支持刷新扫描。
- 支持从后端已纳入且可下载的清单项中选择本次下载包范围。
- 支持创建短期下载包，并提交 selection version expectation。
- 支持展示最近下载包状态、纳入 / 排除数量、过期时间和失败原因。
- 支持通过 authenticated blob 下载短期 zip 包。
- `ProjectWorkspaceStore` 新增 EX-52A generated client 消费方法和 blob 下载方法。

## 2. 明确不做

- 不新增后端 public API route。
- 不修改 EX-52A 契约、OpenAPI、generated client 或 migration。
- 不做敏感导出审批流。
- 不允许前端绕过 `sensitive-excluded` 或 `downloadEligible=false`。
- 不做对象存储迁移、长期外链、网盘式目录树、Office 在线预览、OCR 或全文检索。
- 不新增一级菜单或全局附件中心能力。

## 3. 关键一致性结论

| Edge                       | Result | Evidence                                                                              |
| -------------------------- | ------ | ------------------------------------------------------------------------------------- |
| Document -> code           | Pass   | 实现边界与 `fe-55-project-handover-attachment-frontend-baseline.md` 一致。            |
| Runtime input -> frontend  | Pass   | 只消费 `AttachmentHandoverApi` 和 `ProjectHandoverDetailView.handoverId`。            |
| Route surface              | Pass   | 未新增、修改或删除 public API route；EX-52A route inventory 保持 `aligned`。          |
| Security exclusion -> view | Pass   | `sensitive-excluded` 和不可下载项只展示解释，不进入可选下载包范围。                   |
| Download behavior          | Pass   | 下载包通过 HttpClient authenticated blob 获取，不拼长期外链。                         |
| Query -> view              | Pass   | 清单来源、final/latest、敏感排除和 version expectation 均以后端返回为准，前端不重算。 |

## 4. 验证结果

| Check                  | Command                                                                                     | Result | Notes                      |
| ---------------------- | ------------------------------------------------------------------------------------------- | ------ | -------------------------- |
| Component focused test | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-contract-handover` | Pass   | 1 suite / 4 tests。        |
| Store focused test     | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-workspace.store`   | Pass   | 1 suite / 28 tests。       |
| Admin lint             | `corepack pnpm nx lint poms-admin`                                                          | Pass   | No lint errors.            |
| Admin build            | `corepack pnpm nx build poms-admin --skip-nx-cache`                                         | Pass   | No initial bundle warning. |
| Admin full tests       | `corepack pnpm nx test poms-admin --runInBand --skip-nx-cache`                              | Pass   | 33 suites / 183 tests。    |
| Markdown               | `corepack pnpm run format:md:check`; `git diff --check`                                     | Pass   | Final verification passed. |

## 5. 风险与处理

| Risk ID                       | Status | Notes                                                                    |
| ----------------------------- | ------ | ------------------------------------------------------------------------ |
| `FE55-R1-HANDOVER-ID-ABSENT`  | Closed | `handoverId` 为空时显示“暂无项目移交记录”，不调用清单接口。              |
| `FE55-R2-DOWNLOAD-BLOB-AUTH`  | Closed | store 使用 HttpClient blob 下载受控 zip，避免生成长期 URL。              |
| `FE55-R3-SENSITIVE-EXCLUSION` | Closed | checkbox 只允许 included + downloadEligible + selectionId + rowVersion。 |

## 6. G4 结论

- `FE-55`: `Done / G4`
- 前端入口已完成，后端仍以 EX-52A 为唯一事实源。
- 后续若要处理敏感附件导出审批，需要另拆新切片，不在 FE-55 中追加。
