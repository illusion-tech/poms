# GOV-15 nestjs-zod 根自引用补丁解 zod pin 实施基线（含阻断收口）

- Gate Status: `Block`（方案 2 被证据否决，见第 11 节；仓库已回退稳态）
- Parent: N/A
- Owner: Codex
- Slice Type: `process-only`（依赖解 pin 尝试，最终交付为阻断证据与稳态维持）
- G1 Reviewer: Codex
- G1 Date: 2026-09-11
- GitHub Issue: `#48`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `GOV-15`

## 1. 范围（最终状态）

- 本次目标（G1 冻结版）：以 pnpm `patchedDependencies` 单点补丁（`generateJsonSchema` 根自引用内联）解除 zod pin（`4.3.6` → `^4.6.1`）。
- 实际交付：**阻断证据固化 + 回退稳态**。根自引用内联补丁确实修复了 GOV-13 记录的两个断裂点（query 参数退化为 `root`、AuditLogList 自引用碰撞），但暴露第三层断裂（第 11 节），证明 nestjs-zod 5.5.0 的转换层整体未适配 zod >=4.4，单点补丁路线不成立。
- 最终仓库状态：zod 精确 pin `4.3.6`（GOV13-E1 延续）、nestjs-zod `^5.5.0`、无补丁——与 GOV-13 收口时字节一致（package.json / pnpm-workspace.yaml / pnpm-lock.yaml 零 diff，openapi + shared-api-client:check 复验通过）。
- 明确不做（维持）：不 fork、不改业务 schema、不动 mikro-orm、不部署测试环境。

## 2. 正式输入

| Input Type                      | Document / Source                            | Section / Anchor                  | Status | Notes                                                                                                                                                                                                                                                                                |
| ------------------------------- | -------------------------------------------- | --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Business design                 | GitHub issue `#48`                           | 背景 / G0 边界                    | Pass   | 方案 2 授权记录。                                                                                                                                                                                                                                                                    |
| 根因证据（4.3.6 vs >=4.4 形态） | 最小复现（2026-09-11）                       | `z.toJSONSchema` 根内联 vs 根提升 | Pass   | 补丁设计依据。                                                                                                                                                                                                                                                                       |
| 第三断点证据                    | 本切片三轮插桩（2026-09-11，issue #48 评论） | R1/R2 dump、GEN dump、改名 MAP    | Pass   | `SanitizedUserWithOrgUnits` 碰撞：defs 路径 `phone: {type:["string","null"]}`（正确）vs DTO 路径 `phone: {type:"array",items:{type:"string"}}`（错误，仓库无任何 phone 数组定义）；mangling 位于 nestjs-zod 转换层内部，DTO 根转换甚至未按预期路径经过 `generateJsonSchema` 产出口。 |
| 稳态复验                        | 回退后矩阵（2026-09-11）                     | openapi / client check            | Pass   | 全绿、零 diff、node_modules 无插桩残留。                                                                                                                                                                                                                                             |

## 3. 本次 SSOT

| Concern                     | SSOT                                        | Implementation Rule                                           |
| --------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| OpenAPI 契约语义            | HEAD 的 `libs/shared/api-spec/openapi.json` | 回退后重生成零 diff。                                         |
| 依赖版本                    | package.json                                | zod 精确 `4.3.6`、nestjs-zod `^5.5.0`（与 GOV-13 收口一致）。 |
| Public route canonical path | N/A                                         | 不触及 public route。                                         |

## 4-6. 命令 / 读侧 / 持久化边界

N/A——最终未产生任何代码、契约或 schema 变更。

## 7. 一致性结论

- OpenAPI / generated client：回退后重生成零 diff、`shared-api-client:check` 通过。
- 断裂根因定性：zod >=4.4 的序列化变化（根提升 + defs 语义）与 nestjs-zod 5.5.0 转换层的适配缺口为**多点、结构性**，非单点缺陷。
- 其余边界 N/A。

## 8. 测试与校验（回退稳态复验）

| Check                     | Required | Result       | Notes                                                |
| ------------------------- | -------- | ------------ | ---------------------------------------------------- |
| OpenAPI generation        | 是       | 通过         | 重生成零 diff。                                      |
| Client diff               | 是       | 通过         | `shared-api-client:check` 零类型变化。               |
| node_modules 残留         | 是       | 无残留       | 插桩与补丁标记 grep 为零，pnpm install 全量恢复。    |
| Lint / Build / Unit tests | 否       | not required | 仓库状态与 GOV-13 收口字节一致，其矩阵结论延续有效。 |

## 9. 例外与风险

| Exception ID       | Level  | Scope                | Approved By             | Cleanup Owner                | Cleanup Due | Notes                                    |
| ------------------ | ------ | -------------------- | ----------------------- | ---------------------------- | ----------- | ---------------------------------------- |
| GOV15-E1（已解除） | —      | 补丁载体             | —                       | —                            | —           | 补丁已随回退移除，无遗留。               |
| GOV13-E1（延续）   | medium | zod 精确 pin `4.3.6` | 用户（方案 2 尝试授权） | 上游适配或 fork/上游 PR 切片 | 待排期      | 解封条件升级为"转换层适配"，见第 11 节。 |

## 10. G1 结论（修订）

- Gate Status: `Block`（对"解 zod pin"这一目标）；对"证据固化 + 稳态维持"这一实际交付为 `Pass`
- Approved By: Codex（用户方案 2 授权；停止依据 = 基线 G1 条件"补丁仅限根自引用内联一处"被第三断点突破）
- Approved At: 2026-09-11
- Conditions: zod 解 pin 仅可通过上游适配版或 fork 切片重启；重启时本基线第 11 节为必读输入。

## 11. G2 纠偏（corrective checkpoint）：方案 2 被证据否决

实施与证伪过程（三轮插桩，dump 全文见 issue #48 评论）：

1. **补丁一（根自引用内联）有效**：落地后 GOV-13 的两个断裂点消失——query DTO 恢复按字段拆分（`EntityAuditLogListQuery` 等参数恢复 `from/to/eventType/...` 形态）、`AuditLogList` 不再触发自引用碰撞。
2. **第三断点出现**：`cleanupOpenApiDoc` 报 `SanitizedUserWithOrgUnits` 同名碰撞。深度 diff 两个碰撞方：
   - defs 路径（正确）：`phone: {"type":["string","null"]}`，与仓库定义 `z.string().nullable()` 一致；
   - DTO 路径（错误）：`phone: {"type":"array","items":{"type":"string"}}`——仓库中不存在任何 phone 为字符串数组的定义，属转换层 mangling。
3. **定位失败于库内深层**：唯一 `toJSONSchema` 调用点已补丁且最小复现证明 zod 4.6.1 对该 schema 输出正确（def 内 phone 为可空字符串）；但插桩显示 DTO 根的转换产物中甚至观察不到含 phone 的根对象（12 次观测全部为引用它的 session schema），说明 mangling 发生在 nestjs-zod 转换层的其它路径（swagger 集成/explorer 的逐属性转换），补丁面继续扩大。
4. **决策**：连续三个"再补一处"循环 + 错误类型值证明失败模式会污染契约产物（而非仅阻断导出），继续补丁的风险收益比不可接受。按基线 G1 条件停止，回退稳态。

**重启路径建议**（按优先级）：
1. 上游适配（方案 1 升级版）：向 nestjs-zod 提交"zod >=4.4 转换层适配"的 issue + 复现（本基线三组 dump 现成）；其 5.5.0 发布于 2026-07，维护者活跃。
2. fork（方案 3）：若上游节奏不满足，fork 后按"转换层适配"立项而非逐点补丁；发布为 scoped 包，持续向上游对齐。GOV-15 的根内联补丁语义（第 1 步已验证）可作为 fork 的第一个 commit。
