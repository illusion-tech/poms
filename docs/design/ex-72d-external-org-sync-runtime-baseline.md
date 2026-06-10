# EX-72D 外部组织同步 Adapter 与应用工作流基线

- Gate Status: `G4 Pass`
- Parent: `EX-72`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: 2026-06-10
- G4 Reviewer: `Codex`
- G4 Date: 2026-06-10
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-72D`

## 1. 范围

- 本次目标:
  - 消费 `EX-72A` 的组织同步治理规则、`EX-72B` 的持久化模型和 `EX-72C` 的 B18 API 壳层。
  - 新增外部组织目录 adapter 抽象和 Feishu adapter 第一版。
  - 将 `createOrgSyncRun` 从空 preview shell 改为真实拉取外部部门快照、更新 mapping last-seen 信息并生成 `OrgSyncDiffItem`。
  - 将 `applyOrgSyncRun` 从固定 `409` 改为按管理员批准的 diff items 创建 / 更新 / 移动 / 停用 `OrgUnit`，并更新 mapping、diff item、run 状态和 runtime audit。
- 本次明确不做:
  - 不新增或修改 public route、DTO、OpenAPI 或 generated client。
  - 不新增 migration；只消费 `EX-72B` 已提交表结构。
  - 不实现 DingTalk / WeCom adapter；这些 provider 继续返回不支持同步预览。
  - 不同步用户、不创建用户、不改变用户组织归属、不自动赋权。
  - 不向飞书回写 POMS 组织结构。
  - 不新增 Admin UI；`FE-67` 继续承接外部组织同步工作台。

## 2. 正式输入

| Input Type            | Document / Source                                                                                                 | Section / Anchor                       | Status | Notes                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| Governance input      | `ex-72a-external-org-sync-governance-baseline.md`                                                                 | 4 / 5 / 8 / 12                         | Pass   | 冻结 POMS 是组织事实源、外部 OA 是候选数据源、preview -> apply 不可绕过。            |
| Persistence input     | `ex-72b-external-org-sync-persistence-baseline.md`                                                                | 4 / 7 / 9                              | Pass   | 四张表、entity、状态枚举和权限已经交付。                                             |
| API shell input       | `ex-72c-external-org-sync-api-baseline.md`                                                                        | 4 / 8 / 9                              | Pass   | B18 route 已 aligned，本片只补齐 adapter-backed runtime behavior。                   |
| Feishu token API      | `https://open.feishu.cn/document/server-docs/authentication-management/access-token/tenant_access_token_internal` | `tenant_access_token/internal`         | Pass   | 自建应用通过 `app_id` / `app_secret` 获取 `tenant_access_token`，有效期约 2 小时。   |
| Feishu department API | `https://open.feishu.cn/document/server-docs/contact-v3/department/children`                                      | `contact/v3/departments/{id}/children` | Pass   | 使用 `tenant_access_token`、`department_id_type=open_department_id` 拉取子部门列表。 |
| OrgUnit runtime       | `platform.service.ts` / `org-unit.entity.ts`                                                                      | OrgUnit create/update/move/disable     | Reuse  | 本片复用现有 OrgUnit 不变量；批量 apply 在 external-org-sync 内部事务完成。          |
| Identity provider     | `identity-provider-config.entity.ts` / `SecretCipherService`                                                      | provider config / encrypted secret     | Reuse  | Feishu org adapter 复用企业协同接入配置中的 app id / encrypted secret。              |

## 3. 本次 SSOT

| Concern            | SSOT                  | Implementation Rule                                                                   |
| ------------------ | --------------------- | ------------------------------------------------------------------------------------- |
| Route surface      | `EX-72C`              | 不改 B18 public route；OpenAPI / generated client 不应变化。                          |
| Provider support   | 本基线                | 第一版真实 adapter 只支持 `feishu`；`dingtalk` / `wecom` 明确返回 unsupported。       |
| Feishu external ID | 飞书通讯录部门 API    | 使用 `open_department_id` 作为 `externalDepartmentId`，根部门默认 `0`。               |
| Root mapping       | 本基线                | `source.externalRootDepartmentId` 映射到 `source.authoritativeOrgUnitId` 或 POMS 根。 |
| Preview semantics  | `OrgSyncRun` / diff   | preview 只生成候选，不写 `OrgUnit`；会更新 mapping 的外部快照和 lastSeenAt。          |
| Apply semantics    | `OrgSyncDiffItem`     | apply 只处理 approved/pending 且非 conflict diff；失败项独立记录，不回滚整次 run。    |
| Audit              | Runtime audit service | preview / apply 成功、失败和跳过均记录 runtime audit，secret / token 不进入日志。     |

## 4. Adapter 与同步边界

| Provider | Result in EX-72D                                                                    |
| -------- | ----------------------------------------------------------------------------------- |
| Feishu   | 通过 provider config 的 app id / secret 获取 tenant token，分页拉取部门树并归一化。 |
| DingTalk | adapter registry 存在 provider 判断，但 runtime 返回不支持真实同步。                |
| WeCom    | adapter registry 存在 provider 判断，但 runtime 返回不支持真实同步。                |

## 5. Preview Diff 规则

| Input State                                       | Diff Action                 | Rule                                                                                         |
| ------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| 外部部门存在，mapping 不存在或未映射              | `create_org_unit`           | 候选创建 POMS 组织；parent 使用已映射父部门、同 run 新建父部门或 source authoritative root。 |
| 外部部门存在，mapping 已映射且名称变化            | `update_org_unit`           | 候选更新 `OrgUnit.name`；code 不随外部变化自动变更。                                         |
| 外部部门存在，mapping 已映射且父部门变化          | `move_org_unit`             | 候选移动 `OrgUnit.parentId`；避免移动到自身或后代。                                          |
| 外部部门消失，mapping 已映射且未 ignored          | `disable_org_unit`          | 候选停用该组织及其子树，复用平台既有停用语义。                                               |
| mapping 为 `ignored`                              | `ignore` / no runtime write | preview 默认不生成写入候选，保留 lastSeenAt / external snapshot。                            |
| 父部门无法解析、名称冲突、mapped org 不存在等风险 | `conflict`                  | 不允许 apply；管理员需要调整 mapping 或跳过。                                                |

## 6. Apply 规则

- `approvedDiffItemIds` 不为空时只应用该集合；为空时默认应用全部 `pending` 且非 `conflict` / `ignore` 的 diff item。
- `skippedDiffItemIds` 永远优先生效，相关 diff item 标记为 `skipped`。
- apply 按父子依赖排序：先 `create_org_unit`，再 update / move / disable。
- create 成功后将 mapping 置为 `mapped` 并写入新 `orgUnitId`。
- update / move / disable 只处理仍存在的 mapped `OrgUnit`；找不到时该 diff item 标记 `failed`。
- run 最终状态:
  - 无 failed item -> `applied`
  - 至少一个 failed item -> `failed`
  - skipped 不视为失败。

## 7. 测试与校验计划

| Check                         | Required | Command / Evidence                                                                | Result | Gap / Reason                                     |
| ----------------------------- | -------- | --------------------------------------------------------------------------------- | ------ | ------------------------------------------------ |
| Feishu adapter focused tests  | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=external-org-sync` | Pass   | mock axios tenant token / department children。  |
| Preview / apply service tests | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=external-org-sync` | Pass   | 3 suites / 9 tests passed。                      |
| API lint                      | Yes      | `corepack pnpm nx lint poms-api --skip-nx-cache`                                  | Pass   | 无新增 lint failure。                            |
| API build                     | Yes      | `corepack pnpm nx build poms-api --skip-nx-cache`                                 | Pass   | Nest DI、MikroORM typings 和 shared build 通过。 |
| OpenAPI generation            | No       | `N/A`                                                                             | N/A    | 不改 route / DTO / decorators。                  |
| Generated client check        | No       | `N/A`                                                                             | N/A    | 不改 OpenAPI。                                   |
| Migration check               | Yes      | `corepack pnpm nx run poms-api:migration-check --skip-nx-cache`                   | Pass   | 使用本地 `edb_v2`，schema up-to-date。           |
| Markdown format               | Yes      | `corepack pnpm run format:md:check`                                               | Pass   | 本片新增 Markdown 已格式化。                     |
| Diff sanity                   | Yes      | `git diff --check`                                                                | Pass   | 无 whitespace error。                            |

## 8. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-10
- Conditions:
  - 不扩大 route / OpenAPI surface。
  - 不把用户同步、授权同步或 Admin UI 混入本片。
  - Feishu adapter secret / token 不进入 audit snapshot、run snapshot 或 error message。
  - apply 失败项独立记录，不能用一次失败掩盖已成功应用的 diff item。

## 9. G3 Drift Classification

| Drift                                       | Classification      | Resolution                                                                                            |
| ------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `createOrgSyncRun` 不再返回空 preview shell | `accepted-boundary` | 这是 EX-72C 明确 defer 到 EX-72D 的行为补齐，route / DTO / OpenAPI surface 不变。                     |
| `applyOrgSyncRun` 不再固定返回 `409`        | `accepted-boundary` | 这是 EX-72C 明确 defer 到 EX-72D 的行为补齐，仍受 run status / rowVersion / approved diff item 约束。 |
| `migration-check`                           | `accepted-boundary` | 未发现 DDL drift；本片无 migration。                                                                  |
| OpenAPI / generated client                  | `accepted-boundary` | 本片不改 controller decorator 或 shared contract，未触发 OpenAPI / generated client 更新。            |

## 10. G4 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-06-10
- Delivered Boundary:
  - 已交付外部组织目录 adapter 抽象、Feishu adapter、adapter registry 和 identity provider secret 复用常量。
  - `createOrgSyncRun` 已从空壳改为 adapter-backed preview：拉取 Feishu 部门树、更新 mapping 快照、生成 create / update / move / disable / conflict diff。
  - `applyOrgSyncRun` 已从固定 `409` 改为按 approved / skipped diff items 应用到 `OrgUnit`，并更新 mapping、diff item、run 与 runtime audit。
- Deferred Boundary:
  - DingTalk / WeCom adapter、用户同步、权限同步、Admin 工作台 UI、OpenAPI surface 扩展和 E2E closeout 继续由后续切片承接。
