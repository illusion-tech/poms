# EX-37 敏感字段后端投影与访问审计治理 G4 Close-out

- Task ID: `EX-37`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend governance / sensitive visibility baseline
- Baseline: `docs/design/archive/slices/ex-37-sensitive-field-projection-audit-governance-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/ex-37-sensitive-field-projection-audit-governance-g3-checkpoint.md`
- Governance Commit: `9713ce3 docs(governance): 完成 EX-37 敏感字段投影审计治理基线与 checkpoint`

---

## 1. G4 结论

`EX-37` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. 本片只完成敏感字段后端投影与访问审计治理冻结，不改运行时代码。
2. 第一批字段包已冻结为：
   - `contract-finance`
   - `operating-finance`
   - `commission-compensation`
   - `labor-cost-rate`
   - `exception-approval-opinion`
3. 后端投影模式已冻结为 `full` / `summary` / `masked` / `denied`。
4. `masked` / `denied` 读取的第一刀审计归口已冻结为现有 `security_event`。
5. `FE42-R1-FRONTEND-MASKING-LIMITED` 已从前端开放边界重分类为后端实施队列承接项。

---

## 2. 提交证据

| Evidence          | Result                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| Governance commit | `9713ce3 docs(governance): 完成 EX-37 敏感字段投影审计治理基线与 checkpoint`                         |
| Governance files  | EX-37 baseline、EX-37 G3 checkpoint、tracker、progress                                               |
| Runtime files     | No change                                                                                            |
| Tracker update    | 本 close-out 后将 `EX-37` 标记为 `Done / G4`；`EX-37A`、`EX-37B`、`FE-43`、`EX-37C` 保持 `Todo / G0` |

---

## 3. G3 验证回放

G3 已在本地 checkpoint 记录，结果如下：

| Check                               | Result |
| ----------------------------------- | ------ |
| `corepack pnpm run format:md:check` | Pass   |
| `git diff --check`                  | Pass   |

backend lint / test、frontend lint / build / E2E、`shared-api-client:check` 与 `migration-check` 不适用：本片未修改 runtime code、shared contracts、OpenAPI、generated client 或 DDL。

---

## 4. Drift 与例外

| Item                                 | Status            | Decision                                                                                      |
| ------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------- |
| `FE42-R1-FRONTEND-MASKING-LIMITED`   | Reclassified      | 不再作为前端开放例外扩展；由 `EX-37A / EX-37B / FE-43 / EX-37C` 分段承接。                    |
| `EX37-R1-MANAGE-AS-READ-SENSITIVE`   | Open downstream   | `contract:finance:manage` 只能作为第一刀兼容输入；`EX-37A` 必须冻结专用敏感读权限或正式豁免。 |
| `EX37-R2-EXPORT-REVEAL-OUT-OF-SCOPE` | Accepted boundary | 导出申请、短时揭示和审批摘要裁剪不进入第一批 query projection，保留给后续增强切片。           |
| API / DTO / permission / persistence | No change         | 未发现本片新增 public contract、权限 key 或持久化 drift。                                     |

---

## 5. 下游承接

`EX-37` 关闭后，下游执行顺序固定为：

1. `EX-37A`：先做 shared sensitive projection primitive、字段包权限、后端投影 helper 和安全事件 helper。
2. `EX-37B`：再切合同 / 项目经营金额后端投影。
3. `FE-43`：前端消费后端 sensitive projection，移除本地完整值推断。
4. `EX-37C`：扩展 `L4` / `L5` 经营与提成敏感字段包。

`EX-37A` 可在本 close-out 提交后进入 `G1`；未完成 `EX-37A` 前，不应直接改业务查询 DTO。
