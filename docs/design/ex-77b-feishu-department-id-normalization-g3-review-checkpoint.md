# EX-77B / BUG-13 飞书候选部门 ID 类型纠偏 G3 评审 Checkpoint

- Checkpoint Status: `Pass`
- Parent: GitHub issue `#33`
- Owner: `Codex`
- Slice Type: `query-only`
- G3 Reviewer: `Pending PR review`
- Checkpoint Date: `2026-07-13`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-77B / BUG-13`

## 1. 触发背景与范围

- 触发原因: PR `#32` 部署后的测试环境真实用户绑定搜索回归。飞书 `search/v1/user` 与 user batch 成功，但将搜索命中的 `department_ids` 传入要求 `open_department_id` 的 department batch 后，provider 返回 `400 / 99992357`。
- 本次目标: 将候选部门 ID 的唯一来源收口到 `GET /contact/v3/users/batch` 在 `department_id_type=open_department_id` 下返回的 `department_ids`，使 department batch 只接收类型已确定的 ID。
- 本次明确不做: 不改 B13 route、DTO、OpenAPI、generated client、migration、权限 key、OAuth scope package、Admin UI、绑定写命令、grant 生命周期或其他 adapter。
- 可恢复的可信边界: 搜索命中只负责主体发现；候选部门名称、邮箱和手机号均由受控的 user batch 资料补全链路产生。

## 2. 运行时复现与修复结论

| Concern        | Readonly runtime evidence                                 | Corrective rule                                                                      | Result |
| -------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------ |
| 搜索命中       | `wangzishi` / `王子实` 的 search 与 user batch 均返回成功 | 不消费 search hit 的部门 ID 作为批量查询键                                           | Pass   |
| 部门查询 ID    | search hit ID 调用 department batch 返回 `400 / 99992357` | 仅采集 user batch 中 `department_id_type=open_department_id` 对应的 `department_ids` | Pass   |
| 用户详情缺失   | 有效 search hit 可能不返回 user batch detail              | 保留既有 `not-returned` 语义，不回退使用无类型的 search hit ID                       | Pass   |
| Public surface | B13 现有候选查询 API 正被 Admin 消费                      | 保持 route、DTO、OpenAPI、generated client 和 UI 不变                                | Pass   |

## 3. 实现结果

- `FeishuIdentityProviderAdapter.searchExternalUsers` 仅从 `detailsBySubjectId` 汇总部门 ID，再调用 department batch。
- `toExternalUserSearchHit` 不再保存 search payload 中未声明类型的部门字段。
- `resolveDepartments` 只读取 user detail；detail 缺失或字段未返回时返回既有 `not-returned` 状态。
- 回归测试构造“search hit 为不兼容 ID、user detail 为 `od-` ID”的场景，验证 department batch 仅接收 detail ID；同时覆盖 detail 未返回部门时不发部门请求。

## 4. 测试与校验

| Check                         | Required | Command / Evidence                                                                                              | Result  | Gap / Reason                                     |
| ----------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------ |
| Focused adapter tests         | Yes      | `corepack pnpm nx test poms-api --runInBand --skip-nx-cache --testPathPatterns=feishu-identity-provider`        | Pass    | 1 suite, 7 tests。                               |
| Identity-provider regression  | Yes      | `corepack pnpm nx test poms-api --runInBand --skip-nx-cache --testPathPatterns=identity-provider`               | Pass    | 5 suites, 72 tests。                             |
| API lint                      | Yes      | `corepack pnpm nx lint poms-api`                                                                                | Pass    | No new warnings.                                 |
| API build                     | Yes      | `corepack pnpm nx build poms-api`                                                                               | Pass    | Production build passed.                         |
| Markdown / diff               | Yes      | `pnpm run format:md:check`; `git diff --check`                                                                  | Pass    | No formatting or whitespace error.               |
| Migration / schema            | No       | No persistence change                                                                                           | N/A     | Not required.                                    |
| Test-environment user journey | Yes      | Deploy after merge, authorize an active administrator, search `wangzishi` and `王子实`, verify department names | Pending | Must run against the corrected deployed adapter. |

## 5. G3 结论

- Current Gate: `G3 / Ready for review`
- Blocking findings: 无本地实现、契约、lint、build 或测试阻断。
- Remaining condition: 合并并部署后，测试环境必须完成真实授权用户的两次候选搜索验收。
- Review focus:
  1. department batch 的输入是否完全来自 typed user detail；
  2. detail 缺失时是否保持可诊断的 `not-returned`，而非引入 search-hit 回退；
  3. 是否保持 B13 的 public surface 和授权边界不变。
