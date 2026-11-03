# EX-21 ContractTermSnapshot 核心条款可信源纠偏 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `EX-05` / `EX-20`
- Owner: `Kimi`
- Slice Type: `cross-layer-high-risk`
- G3 Reviewer: `Solo worktree checkpoint`
- Checkpoint Date: `2026-04-23`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-21`

---

## 1. 触发背景与范围

- 触发原因: 合同详情页需要展示税率、回款条件、质保期等核心条款，但实现只暴露 `currentSnapshotId`，`ContractTermSnapshot` 缺少结构化核心字段、内容查询端点和前端消费链。
- 本次目标: 按 `contract-finance-design.md` 的可信源规则，把核心条款字段落到商业放行基线、签约就绪初始化链和当前有效 `ContractTermSnapshot`，并提供详情页可消费的查询契约。
- 本次明确不做: 不实现合同补充协议驱动的新快照替代链，不重做正式 `ReceivablePlan` 初始化，不补浏览器级合同详情 E2E。
- 本次纠偏后可恢复的可信边界: 已生效合同的核心条款展示和下游计算输入可以消费当前有效 `ContractTermSnapshot`，不再从合同主表草稿字段或前端本地拼装。
- 仍不允许下游依赖的留白: 未生效合同仍只能展示待生效状态；未来合同变更导致的快照 supersede 仍需独立切片冻结。

---

## 2. 正式输入

| Input Type                | Document / Source                           | Section / Anchor  | Status   | Notes                                                                 |
| ------------------------- | ------------------------------------------- | ----------------- | -------- | --------------------------------------------------------------------- |
| Business design           | `contract-finance-design.md`                | `9`, `12.2`, `15` | Accepted | `ContractTermSnapshot` 是合同关键条款可信源，必须来自结构化承接链     |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`           | 合同资金域        | Accepted | 详情视图和快照 summary 通过 shared contract / OpenAPI 对外输出        |
| Query boundary            | `query-view-boundary-design.md`             | `5.2`             | Accepted | `ContractDetailView` 应包含当前有效条款快照摘要，且与草稿字段分区展示 |
| Data model / table freeze | `contract-finance-design.md`                | `12.2`            | Accepted | 快照字段包含金额包、税率、首付比例、质保金比例和付款条款              |
| Route inventory           | `api-route-canonical-inventory.md`          | `contract` rows   | Accepted | `GET /contract-term-snapshots/{id}` 为独立 canonical route            |
| ADR                       | `../adr/015-api-route-canonical-grammar.md` | Decision          | Accepted | 快照查询使用 resource-first 独立资源，不挂在 `/contracts` 前缀下      |
| Governance                | `implementation-governance-gates.md`        | `G3`, `G4`        | Accepted | 已开工后发现 contract / route / migration drift，使用 corrective 记录 |

---

## 3. Drift 清单与本次 SSOT

| Concern                   | Drift / SSOT                                                                                   | Corrective Rule                                                                |       |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----- |
| Business semantics        | 核心条款原先未结构化落地，详情页只能显示快照 ID                                                | 当前有效 `ContractTermSnapshot` 是税率、金额包、付款条件包和质保期的展示可信源 |       |
| Route / command naming    | 快照查询曾挂到 `ContractController` 下，实际路径变成 `/contracts/contract-term-snapshots/{id}` | 独立 `ContractTermSnapshotController` 挂载 `GET /contract-term-snapshots/{id}` |       |
| DTO / contract naming     | `ContractDetailView.currentTermSnapshot` nullable 语义曾在 generated client 中丢失             | shared contract、OpenAPI、generated client 保持 `ContractTermSnapshotSummary \ | null` |
| Table / column naming     | `source_readiness_id`、`source_baseline_id` 只有索引，缺少强引用                               | migration 补 FK，快照来源链必须可审计                                          |       |
| Identifier semantics      | 普通合同 create/update 曾允许写入 `currentSnapshotId`                                          | 移除普通写入口，激活只接受 readiness package 初始化出的 snapshot identity      |       |
| Money / decimal semantics | 金额、税率、首付款比例、质保金比例缺少统一落点                                                 | 从商业放行基线复制到 active snapshot；缺失时阻断激活                           |       |
| Immutability              | `ensureActiveSnapshot` 可覆盖任意已有快照                                                      | 改为 create-if-absent / immutable payload 校验，拒绝跨合同或已生效快照改写     |       |
| Tooling                   | OpenAPI 生成链存在 Java 17 位置硬编码和 trailing whitespace tool-noise                         | `ensure-java17.ps1` 和 normalize 脚本收口生成环境与空白                        |       |

---

## 4. 当前阻断结论

- Current Gate: `G3 = Pass`
- Blocking Findings:
  1. 已解除。快照查询路由已与 inventory 对齐为 `GET /contract-term-snapshots/{id}`。
  2. 已解除。active snapshot 不再由普通合同写接口控制，且不允许跨合同覆盖。
  3. 已解除。激活时会校验商业放行基线与核心条款字段，缺失核心条款不再静默生成 active snapshot。
  4. 已解除。migration-check、generated client sync 和 diff whitespace 检查均已恢复通过。
- Why parent task cannot be closed:
  1. 本片本身可关闭；未来合同变更快照替代链、正式应收计划初始化和合同详情浏览器 E2E 属于后续独立范围。

---

## 5. 本次纠偏范围与修复结果

- 本批修复范围:
  1. 扩展商业放行基线和 `ContractTermSnapshot` 核心条款字段及来源 FK。
  2. 收紧合同激活路径，只从 readiness package 和 commercial baseline 生成 active snapshot。
  3. 新增独立快照查询端点，并在 `ContractDetailView` 内联 `currentTermSnapshot`。
  4. 前端合同详情页展示核心条款卡片，并通过 store 消费详情视图。
  5. 修复 generated client nullable 语义、trailing whitespace 检查和 Java 17 生成环境探测。
- 本批未修复范围:
  1. 合同补充协议生效后的新快照版本链。
  2. `ReceivablePlan` 正式初始化对核心条款快照的全量消费。
  3. 浏览器级合同详情 E2E。

| Concern          | Before                                    | After                                                         | Result |
| ---------------- | ----------------------------------------- | ------------------------------------------------------------- | ------ |
| 核心条款落库     | 快照仅有 `retentionDueDate`               | 快照包含金额包、税率、首付比例、质保金比例、付款条款和来源链  | Done   |
| 快照身份来源     | 普通合同写接口可写 `currentSnapshotId`    | `currentSnapshotId` 只由 readiness 初始化和 activate 链路确定 | Done   |
| 快照查询         | 无内容查询端点，详情页只显示 UUID         | 独立端点 + `ContractDetailView.currentTermSnapshot`           | Done   |
| 前端展示         | 合同详情缺少核心条款区域                  | 详情页展示税率、回款条件、质保期、首付和质保金比例            | Done   |
| OpenAPI / client | nullable、空白和 Java 17 环境存在生成漂移 | generated client check 通过，生成脚本可自动定位 Java 17       | Done   |

---

## 6. 测试与校验

| Check                            | Required | Command / Evidence                                                                       | Result | Gap / Reason                         |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------- | ------ | ------------------------------------ |
| Diff / whitespace check          | Yes      | `git diff --check`                                                                       | Pass   | 2026-04-23 已执行                    |
| API unit tests                   | Yes      | `corepack pnpm nx test poms-api --runInBand --testPathPatterns=contract.service.spec.ts` | Pass   | 12 tests passed                      |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run shared-api-client:check`                                           | Pass   | 生成器 warning 为既有 schema 噪声    |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-check`                                          | Pass   | No changes required                  |
| API build / lint                 | Yes      | `poms-api` build / lint                                                                  | Pass   | 已在本轮实现复核中通过               |
| Admin build / lint               | Yes      | `poms-admin` build / lint                                                                | Pass   | 已在本轮实现复核中通过               |
| E2E                              | No       | N/A                                                                                      | N/A    | 本片关闭可信源和详情展示，不新建 E2E |

---

## 7. 残余阻断与后续切片

- 已解除的阻断:
  1. 合同详情页可展示当前有效快照的核心条款内容。
  2. 合同激活不再允许缺失核心条款时静默生成 active snapshot。
  3. 快照来源链具备 readiness / baseline FK，可支撑审计追溯。
- 仍存在的阻断:
  1. 无。本片 G3/G4 可通过。
- 后续子切片:
  1. 合同补充协议生效后的 `ContractTermSnapshot` supersede 链。
  2. 正式 `ReceivablePlan` 初始化消费当前有效 `ContractTermSnapshot` 的完整链路。
  3. 合同详情页浏览器级 smoke / journey 覆盖。

---

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----- |
| 无           | -     | -     | -           | -             | -           | -     |

---

## 9. G3 Checkpoint 结论

- Checkpoint Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-23`
- Conditions:
  1. 后续任何合同条款变更不得通过普通合同更新接口直接改写 active snapshot。
  2. 新的合同条款展示或跨域计算必须消费 `ContractTermSnapshot` 或由其派生的正式 query view。
  3. 涉及 public route surface 的后续扩展必须先回写 `api-route-canonical-inventory.md`。
