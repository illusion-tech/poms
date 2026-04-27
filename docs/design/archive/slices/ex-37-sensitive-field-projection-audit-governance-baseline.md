# EX-37 敏感字段后端投影与访问审计治理基线

- Task ID: `EX-37`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend governance / sensitive visibility baseline
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-37`
- Upstream: `FE-42`、`phase2-data-permission-and-sensitive-visibility-design.md`、`business-authorization-matrix.md`

---

## 1. 背景

`FE-42` 已完成正式前端入口、权限矩阵与敏感字段前端遮罩回归，但 `FE42-R1-FRONTEND-MASKING-LIMITED` 仍然成立：前端遮罩只能控制用户界面，不等于后端 DTO 不泄露原始字段。

本切片只做治理冻结，不写运行时代码。目标是把后端字段级投影与访问审计拆成可实施队列，避免继续用页面级 helper 扩大前端补丁。

---

## 2. G1 范围

### In Scope

1. 冻结第一批敏感字段包与字段归属。
2. 冻结后端查询投影模式与 DTO 表达原则。
3. 冻结权限输入与现有 `contract:finance:manage` 的临时边界。
4. 冻结敏感字段读取被遮罩 / 拒绝时的审计归口。
5. 在 tracker 中创建后续 runtime 与 frontend consumption 切片。
6. 回写 `poms-design-progress.md`。

### Out Of Scope

1. 不新增后端 API、DTO、generated client、permission key 或 DDL。
2. 不修改 `Contract`、`Project`、`L4`、`L5` 查询服务。
3. 不修改前端页面、store、E2E 或遮罩 helper。
4. 不实现敏感字段短时揭示、导出申请、审批摘要裁剪或完整字段包维护后台。

---

## 3. 正式输入

| 输入                     | 文件 / 证据                                                 | 当前事实                                                                                    | EX-37 使用方式                 |
| ------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------ |
| FE close-out             | `fe-42-frontend-permission-visibility-g3-g4-closeout.md`    | 前端已用 `contract:finance:manage` 对合同 / 项目经营金额做 UI 遮罩。                        | 定义后端安全边界缺口。         |
| Data permission design   | `phase2-data-permission-and-sensitive-visibility-design.md` | 已冻结四层权限、字段敏感权限、字段包、遮罩等级和安全事件留痕原则。                          | 作为字段包与投影模式输入。     |
| Authorization matrix     | `business-authorization-matrix.md`                          | 合同金额包、付款条件包、提成金额包等高敏字段组已被识别。                                    | 作为字段清单与动作边界输入。   |
| Data model prerequisites | `data-model-prerequisites.md`                               | `SensitiveDataExport*`、`SensitiveFieldReveal*` 与 `FieldVisibilityPolicySource` 仍是前提。 | 标记为后续增强，不纳入第一刀。 |
| Runtime audit            | `RuntimeAuditService` / `security_event`                    | 已有 `recordSecurityEvent`、`audit_log`、`security_event`，但当前只公开 route denied 入口。 | 第一刀优先复用内部 service。   |
| Shared contracts         | `shared-contracts.ts`                                       | 当前业务 DTO 直接返回金额 / 比例字符串，尚无统一 sensitive field projection primitive。     | 后续 `EX-37A` 的契约输入。     |

---

## 4. 第一批敏感字段包

| Field Package Key            | 典型字段 / DTO surface                                                                                                                              | 默认完整值条件                                                                                 | 首批处理切片 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------ |
| `contract-finance`           | `Contract.signedAmount`、`ProjectDetailView.currentContractSummary.signedAmount`、合同承接摘要合同额、`ContractTermSnapshot` 金额 / 税率 / 付款条款 | 具备合同资金敏感读权限；`contract:finance:manage` 只作为当前系统的临时映射输入，不作为长期语义 | `EX-37B`     |
| `operating-finance`          | `CommercialReleaseBaselineSummary` 金额 / 税率 / 毛利 / 回款条件、`BusinessAccountingFeedbackView` 精确金额 / 毛利 / 税务影响                       | 具备经营财务敏感读权限                                                                         | `EX-37C`     |
| `commission-compensation`    | `CommissionCalculation.commissionPool`、`CommissionPayout` 档位金额 / 批准金额、`CommissionAdjustment` 调整金额 / 影响说明                          | 具备提成金额敏感读权限                                                                         | `EX-37C`     |
| `labor-cost-rate`            | `internalCostRate`、`rateVersionId`、人员 / 角色级人工成本率与人工成本明细                                                                          | 具备人力成本率敏感读权限                                                                       | 后续切片     |
| `exception-approval-opinion` | 例外理由、保留意见、反对意见、风险备注                                                                                                              | 审批链相关角色或被显式授权角色                                                                 | 后续切片     |

字段包的约束：

1. 字段包是最小授权粒度，页面不得自行拆散。
2. 同一 record 可以可见，但字段包返回 `masked` 或 `denied`。
3. 平台管理员权限不自动等于业务敏感字段完整值可见。
4. 前端只能消费后端投影结果，不再通过业务权限自行推导字段级完整值。

---

## 5. 投影模式

后续实现统一采用后端 query projection，而不是 controller 后再补丁遮罩：

| Mode      | 语义                       | 返回约束                                                  | 审计要求                       |
| --------- | -------------------------- | --------------------------------------------------------- | ------------------------------ |
| `full`    | 用户可看完整值             | 返回原始值和标准展示文本                                  | 不要求每次记录安全事件         |
| `summary` | 用户可看摘要但不能看精确值 | 返回区间、状态、风险信号或判断结论，不返回精确金额 / 比例 | 摘要裁剪由后续审批摘要切片细化 |
| `masked`  | record 可见但字段包不可见  | 不返回原始值；返回统一遮罩文案、字段包 key 和 reason code | 记录 `sensitive_field.masked`  |
| `denied`  | 字段包或场景完全不可见     | 不返回原始值；必要时可拒绝请求或返回不可见投影            | 记录 `sensitive_field.denied`  |

推荐契约 primitive：

```ts
type SensitiveProjectionMode = 'full' | 'summary' | 'masked' | 'denied';

type SensitiveFieldProjection<T> = {
    fieldPackageKey: string;
    mode: SensitiveProjectionMode;
    value: T | null;
    displayText: string;
    reasonCode: string | null;
};
```

`EX-37A` 必须把最终 primitive 固化到 shared contracts；字段值不得再以“原字段直接返回、前端自行遮罩”为默认实现。

---

## 6. 权限与审计边界

### 权限边界

1. `contract:finance:manage` 是当前系统中唯一可复用的合同资金能力，允许作为第一刀实现的兼容输入。
2. 长期语义不应把 `manage` 直接当作字段完整值读权限；`EX-37A` 应引入或冻结专用敏感读权限，例如：
   - `contract:finance:sensitive:read`
   - `operating:finance:sensitive:read`
   - `commission:amount:sensitive:read`
   - `labor-cost-rate:sensitive:read`
3. 若 `EX-37A` 选择不新增专用权限，必须在 G1 写明原因、风险边界和替代清理时间，不得口头沿用。

### 审计边界

1. 第一刀优先复用现有 `RuntimeAuditService.recordSecurityEvent`，不新增独立审计表。
2. `masked` 与 `denied` 读取均记录 `security_event`：
   - `eventType`: `sensitive_field.masked` / `sensitive_field.denied`
   - `severity`: `info` / `warning`
   - `result`: `blocked`
   - `permissionKey`: 触发字段包完整值所需的权限
   - `details`: `fieldPackageKey`、`targetType`、`targetId`、`projectionMode`、`reasonCode`
3. `audit_log` 继续用于业务动作成功 / 拒绝留痕；敏感字段读侧遮罩 / 拒绝优先进入 `security_event`。
4. 导出申请、短时揭示和审批摘要裁剪仍属于后续增强，不阻塞第一批 query projection。

---

## 7. 后续切片队列

| Task ID  | 类型               | 范围                                                                                  | 进入条件               |
| -------- | ------------------ | ------------------------------------------------------------------------------------- | ---------------------- |
| `EX-37A` | backend foundation | shared sensitive projection primitive、字段包权限、后端投影 helper、安全事件 helper。 | `EX-37` G4 后进入 G1。 |
| `EX-37B` | backend runtime    | 合同列表 / 详情、项目详情、合同承接摘要的 `contract-finance` 后端投影切换。           | `EX-37A` G4。          |
| `FE-43`  | frontend runtime   | 前端消费后端 sensitive projection，移除本地字段级完整值推断。                         | `EX-37B` G4。          |
| `EX-37C` | backend runtime    | `L4` 经营视图与 `L5` 提成金额字段包扩展到同一投影 / 审计 primitive。                  | `EX-37A` G4。          |

---

## 8. G1 决策

`EX-37` 可以进入 docs-only governance execution。

冻结条件：

1. 后端字段级投影必须在 query / DTO 边界完成，不能继续依赖前端遮罩作为安全控制。
2. 第一批先处理 `contract-finance`，再扩展 `operating-finance` 与 `commission-compensation`。
3. 当前 `contract:finance:manage` 只是临时输入；长期应收敛为专用敏感读权限或在后续 G1 中正式豁免。
4. `masked` / `denied` 必须进入 `security_event`，否则不能宣称完成敏感字段后端治理。
5. 本切片不写 runtime code；实际实现必须从 `EX-37A` 开始。
