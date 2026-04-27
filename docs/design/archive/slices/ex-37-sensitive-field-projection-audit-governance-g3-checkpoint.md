# EX-37 敏感字段后端投影与访问审计治理 G3 Checkpoint

- Task ID: `EX-37`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend governance / sensitive visibility baseline
- Baseline: `docs/design/archive/slices/ex-37-sensitive-field-projection-audit-governance-baseline.md`

---

## 1. 本地交付

`EX-37` 已按 G1 范围完成 docs-only governance：

1. 新增后端敏感字段投影与访问审计基线。
2. 冻结第一批字段包：
   - `contract-finance`
   - `operating-finance`
   - `commission-compensation`
   - `labor-cost-rate`
   - `exception-approval-opinion`
3. 冻结投影模式：`full` / `summary` / `masked` / `denied`。
4. 冻结第一刀审计归口：`masked` / `denied` 读侧事件优先写入现有 `security_event`。
5. 在执行板新增后续任务：
   - `EX-37A`
   - `EX-37B`
   - `FE-43`
   - `EX-37C`
6. 回写 `poms-design-progress.md`。

---

## 2. 文件范围

| Area       | Files                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Baseline   | `docs/design/archive/slices/ex-37-sensitive-field-projection-audit-governance-baseline.md`      |
| Checkpoint | `docs/design/archive/slices/ex-37-sensitive-field-projection-audit-governance-g3-checkpoint.md` |
| Tracker    | `docs/design/phase2-development-execution-tracker.md`                                           |
| Progress   | `docs/design/poms-design-progress.md`                                                           |
| Runtime    | No change                                                                                       |

---

## 3. 验证结果

| Check                               | Result | Reason                                   |
| ----------------------------------- | ------ | ---------------------------------------- |
| `corepack pnpm run format:md:check` | Pass   | docs-only 切片，必须验证 Markdown 表格。 |
| `git diff --check`                  | Pass   | 防止空白与行尾漂移。                     |
| backend lint / test                 | N/A    | 不改 runtime code。                      |
| frontend lint / build / E2E         | N/A    | 不改前端代码。                           |
| `shared-api-client:check`           | N/A    | 不改 shared contracts / OpenAPI。        |
| `migration-check`                   | N/A    | 不改 DDL。                               |

---

## 4. Drift 判断

| Edge                    | Result    | Notes                                                                                 |
| ----------------------- | --------- | ------------------------------------------------------------------------------------- |
| FE-42 -> backend gap    | Pass      | `FE42-R1` 已被承接为 `EX-37A / EX-37B / FE-43 / EX-37C` 队列。                        |
| Design -> tracker       | Pass      | 字段包、投影模式、审计归口和后续切片均已进入执行板。                                  |
| Runtime behavior        | No change | 本片不改 API、DTO、generated client、guard、query service 或 DDL。                    |
| Security event strategy | Pass      | 第一刀冻结为复用 `RuntimeAuditService.recordSecurityEvent`，后续短时揭示 / 导出另切。 |

---

## 5. 例外与风险

| ID                                   | Status            | Decision                                                                                      |
| ------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------- |
| `FE42-R1-FRONTEND-MASKING-LIMITED`   | Reclassified      | 不再作为前端开放例外扩展；由 `EX-37A / EX-37B / FE-43 / EX-37C` 分段承接。                    |
| `EX37-R1-MANAGE-AS-READ-SENSITIVE`   | Open downstream   | `contract:finance:manage` 只能作为第一刀兼容输入；`EX-37A` 必须冻结专用敏感读权限或正式豁免。 |
| `EX37-R2-EXPORT-REVEAL-OUT-OF-SCOPE` | Accepted boundary | 导出申请、短时揭示和审批摘要裁剪不进入第一批 query projection，保留给后续增强切片。           |

---

## 6. G3 结论

`EX-37` 满足本地 G3。提交后可进入 G4 close-out；下一片应进入 `EX-37A`，先做 shared projection primitive、字段包权限和安全事件 helper，再切业务查询。
