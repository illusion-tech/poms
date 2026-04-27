# EX-37A 敏感字段投影 primitive、字段包权限与安全事件 helper 实施基线包

- Task ID: `EX-37A`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend foundation / shared contract / runtime audit helper
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-37A`
- Upstream: `EX-37`

---

## 1. 背景

`EX-37` 已关闭为 `Done / G4`，冻结了后端字段级投影的第一批字段包、投影模式和审计归口。`EX-37A` 是 runtime implementation 的第一刀，但它仍然不切任何业务查询 DTO。

本片只建立可被 `EX-37B / EX-37C` 复用的基础设施：

1. shared contract 中的严格字面量 primitive。
2. 字段包到专用敏感读权限的映射。
3. 后端 query service 可调用的投影 helper / service。
4. `masked` / `denied` 安全事件记录 helper。

---

## 2. G1 范围

### In Scope

1. 在 `@poms/shared-contracts` 增加严格字面量类型：
   - `SensitiveFieldPackageKey`
   - `SensitiveProjectionMode`
   - `SensitiveProjectionReasonCode`
   - `SensitiveStringFieldProjection`
2. 增加专用敏感读权限 key：
   - `contract:finance:sensitive:read`
   - `operating:finance:sensitive:read`
   - `commission:amount:sensitive:read`
   - `labor-cost-rate:sensitive:read`
   - `exception-approval-opinion:sensitive:read`
3. 固定字段包到权限 key 的唯一映射。
4. 在 API 后端增加可复用敏感字段投影 service / helper：
   - 根据用户权限、字段包、值与场景生成 `full` / `masked` / `denied` 投影。
   - 对 `masked` / `denied` 调用 `RuntimeAuditService.recordSecurityEvent`。
5. 增加 focused unit tests：
   - contract/schema strict literal coverage。
   - permission package mapping coverage。
   - `full` 不记录安全事件。
   - `masked` / `denied` 记录 `sensitive_field.masked` / `sensitive_field.denied`。
6. 按需要补 API contracts DTO export，使后续 business DTO 可以直接引用该 primitive。

### Out Of Scope

1. 不改合同列表 / 详情、项目详情、合同承接、`L4`、`L5` 的业务查询 DTO。
2. 不新增 public API route。
3. 不修改 `api-route-canonical-inventory.md`。
4. 不改 OpenAPI route surface；若生成结果只有 schema 或无变化，应在 G3 记录。
5. 不改 DDL、migration、entity 或 repository。
6. 不做前端消费；前端改造属于 `FE-43`。
7. 不实现导出申请、短时揭示、审批摘要裁剪或字段包维护后台。

---

## 3. 正式输入

| 输入                 | 文件 / 证据                                                           | 当前事实                                                                                      | EX-37A 使用方式                                   |
| -------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Governance baseline  | `ex-37-sensitive-field-projection-audit-governance-baseline.md`       | 已冻结第一批字段包、投影模式、审计归口和下游顺序。                                            | 作为本片 G1 主输入。                              |
| G4 close-out         | `ex-37-sensitive-field-projection-audit-governance-g3-g4-closeout.md` | `EX-37` 已关闭，`EX-37A` 可进入 G1。                                                          | 确认前置已满足。                                  |
| Shared contracts     | `libs/shared/contracts/src/lib/shared-contracts.ts`                   | `PERMISSION_KEYS` 是权限 key SSOT；当前没有 sensitive projection primitive。                  | 新增严格字面量类型、schema 和权限 key。           |
| API contracts        | `libs/api/contracts/src/lib/*/*.dto.ts`                               | DTO wrapper 通过 `createZodDto` 暴露 shared schemas。                                         | 如需复用，新增 sensitive projection DTO wrapper。 |
| Runtime audit        | `RuntimeAuditService.recordSecurityEvent`                             | 已可记录 `eventType`、`severity`、`permissionKey`、`details`，无新增表需求。                  | 作为 masked / denied 读侧事件 sink。              |
| Existing auth guard  | `PermissionsGuard`                                                    | 已记录 `authz.permission.denied`，但只覆盖 route/action permission，不覆盖字段级 query 投影。 | 本片不改 guard，只新增 query helper。             |
| Interface DTO design | `interface-openapi-dto-design.md`                                     | 已提示查询响应可使用 `VisibilityProjectedFieldDto`，不得复用为命令请求 DTO。                  | 收敛为本片 primitive 命名与约束。                 |

---

## 4. Contract 冻结

### 4.1 字段包

`SensitiveFieldPackageKey` 只允许以下字面量：

```ts
const SENSITIVE_FIELD_PACKAGE_KEYS = [
    'contract-finance',
    'operating-finance',
    'commission-compensation',
    'labor-cost-rate',
    'exception-approval-opinion'
] as const;
```

不得使用任意字符串字段包。后续新增字段包必须先新增治理切片或在对应切片 G1 中冻结。

### 4.2 投影模式

`SensitiveProjectionMode` 只允许：

```ts
type SensitiveProjectionMode = 'full' | 'summary' | 'masked' | 'denied';
```

首版 helper 只必须实现 `full`、`masked`、`denied`。`summary` 作为 contract mode 先冻结，实际摘要投影由后续业务切片按场景使用。

### 4.3 原因码

`SensitiveProjectionReasonCode` 只允许：

```ts
type SensitiveProjectionReasonCode =
    | 'allowed'
    | 'summary-only'
    | 'missing-sensitive-read-permission'
    | 'field-package-not-applicable';
```

`masked` / `denied` 不得返回空 reason code。

### 4.4 字符串投影 primitive

首版只冻结 scalar string projection，避免把 public contract 放宽成 arbitrary JSON：

```ts
type SensitiveStringFieldProjection = {
    fieldPackageKey: SensitiveFieldPackageKey;
    mode: SensitiveProjectionMode;
    value: string | null;
    displayText: string;
    reasonCode: SensitiveProjectionReasonCode;
};
```

约束：

1. `mode = 'full'` 时，`value` 可以为原始 string 或业务空值 `null`；`displayText` 为前端可展示文本。
2. `mode = 'summary'` 时，`value` 可以为摘要值或 `null`；不得承载精确金额 / 比例。
3. `mode = 'masked' | 'denied'` 时，`value` 必须为 `null`。
4. `displayText` 必须存在，前端不再自行拼遮罩文案。
5. 金额币种、比例单位、业务状态等非敏感上下文保留在外层 DTO；本 primitive 不把货币结构硬编码进去。

---

## 5. 权限映射

本片关闭 `EX37-R1-MANAGE-AS-READ-SENSITIVE` 的前置条件是引入专用敏感读权限，而不是继续把 `manage` 语义当作完整值读取语义。

| Field Package Key            | Required Permission                         | 临时兼容说明                                                        |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `contract-finance`           | `contract:finance:sensitive:read`           | `contract:finance:manage` 保留为写 / 管理能力，不再作为长期读语义。 |
| `operating-finance`          | `operating:finance:sensitive:read`          | 首批只冻结 key，业务查询切换在 `EX-37C`。                           |
| `commission-compensation`    | `commission:amount:sensitive:read`          | 首批只冻结 key，业务查询切换在 `EX-37C`。                           |
| `labor-cost-rate`            | `labor-cost-rate:sensitive:read`            | 后续独立切片消费。                                                  |
| `exception-approval-opinion` | `exception-approval-opinion:sensitive:read` | 后续审批摘要 / 例外查看切片消费。                                   |

Role / fixture 更新边界：

1. `platform-admin` 继续通过 `PERMISSION_KEYS` 全量获得新增 key。
2. 财务类 role 默认获得 `contract-finance`、`operating-finance`、`commission-compensation` 对应敏感读权限。
3. 项目 viewer 不获得任何新增敏感读权限。
4. 不删除或重命名既有权限 key，避免把本片变成授权模型破坏性改造。

---

## 6. 后端 helper 边界

推荐新增 API 内部模块：

```text
apps/poms-api/src/app/core/sensitive-field-projection/
```

最低实现：

1. `SensitiveFieldProjectionService`
   - `projectStringField(input): Promise<SensitiveStringFieldProjection>`
   - 输入包含 `fieldPackageKey`、`rawValue`、`displayTextWhenFull`、`user`、`targetType`、`targetId`、`requestContext`、`modeWhenUnauthorized`。
2. `SensitiveFieldProjectionPolicy`
   - 字段包到 required permission 的纯映射。
   - `canReadFullValue(userPermissions, fieldPackageKey)`。
3. `recordSensitiveProjectionSecurityEvent`
   - 对 `masked` 记录 `sensitive_field.masked`。
   - 对 `denied` 记录 `sensitive_field.denied`。
   - `full` 与首版未使用的 `summary` 不记录安全事件。

安全事件 details 至少包含：

```ts
{
    fieldPackageKey: SensitiveFieldPackageKey;
    projectionMode: 'masked' | 'denied';
    targetType: string;
    targetId: string;
    reasonCode: SensitiveProjectionReasonCode;
}
```

---

## 7. Public Interface 与 Route 判断

| 项目                 | G1 判断                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Public route surface | 不新增、不修改、不删除 public API route。                                                   |
| Route inventory      | 不更新 `api-route-canonical-inventory.md`。                                                 |
| Shared contract      | 会新增 shared schemas / types / permission keys。                                           |
| API DTO wrapper      | 可新增 `SensitiveStringFieldProjectionDto`；若未被 route 引用，OpenAPI 可能无 schema diff。 |
| Generated client     | 必须运行 `shared-api-client:check`；若无 diff，G3 记录为 no generated change。              |
| Runtime persistence  | 不改 DDL / entity / repository。                                                            |

---

## 8. 预期文件范围

Expected runtime / contract files:

1. `libs/shared/contracts/src/lib/shared-contracts.ts`
2. `libs/api/contracts/src/lib/sensitive-field-projection/sensitive-field-projection.dto.ts`
3. `libs/api/contracts/src/index.ts`
4. `apps/poms-api/src/app/core/sensitive-field-projection/*`
5. Focused tests for shared contracts and API helper.
6. `apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts`

Expected generated / check outputs:

1. `libs/shared/api-spec/openapi.json` only if generated schema output changes.
2. `libs/shared/api-client/**` only if generated client output changes.

Expected docs:

1. This baseline.
2. `EX-37A` G3 checkpoint.
3. `phase2-development-execution-tracker.md`
4. `poms-design-progress.md`

---

## 9. 测试计划

Required at G3:

1. `git diff --check`
2. `corepack pnpm run format:md:check`
3. Focused shared-contract tests if existing shared contract test harness is available; otherwise cover schema parsing through API/core unit tests and record rationale.
4. Focused backend tests for `SensitiveFieldProjectionService` / policy.
5. `corepack pnpm nx lint poms-api`
6. `corepack pnpm nx test poms-api --testFile=<focused sensitive projection specs>`
7. `corepack pnpm nx run poms-api:openapi`
8. `corepack pnpm nx run shared-api-client:check`

Not required unless implementation unexpectedly touches the corresponding layer:

1. `corepack pnpm nx build poms-admin`
2. `corepack pnpm nx test poms-admin`
3. Playwright E2E
4. `migration-check`

---

## 10. 例外与风险

| ID                                     | Level  | Scope              | Owner | Cleanup Due | Decision                                                                                            |
| -------------------------------------- | ------ | ------------------ | ----- | ----------- | --------------------------------------------------------------------------------------------------- |
| `EX37-R1-MANAGE-AS-READ-SENSITIVE`     | Medium | Permission model   | Codex | `EX-37A`    | 本片必须通过新增专用敏感读权限和字段包映射关闭；不得继续把 `contract:finance:manage` 当长期读语义。 |
| `EX37A-R1-SCHEMA-NOT-ROUTE-REFERENCED` | Low    | OpenAPI generation | Codex | `EX-37B`    | 若 primitive 未被 route DTO 引用，OpenAPI / generated client 可能无 diff；必须在 G3 明确记录。      |

---

## 11. G1 结论

`EX-37A` 可以进入 implementation。

冻结条件：

1. 只能新增 foundation primitive、权限映射和 helper，不切业务查询 DTO。
2. 字段包、投影模式、原因码必须使用严格字面量；不得用 loose string。
3. `masked` / `denied` 的 `value` 必须为 `null`，且必须记录安全事件。
4. 不新增 public route；若 implementation 发现必须新增 route，立即停止并先做 route-governance 子切片。
5. `EX37-R1` 必须在本片 G3 中关闭或重新写明豁免原因。
