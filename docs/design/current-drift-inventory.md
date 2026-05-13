# POMS Current Drift Inventory

**文档状态**: Active
**最后更新**: 2026-05-13
**适用范围**: 当前工作区发现的实现 / 测试 / 文档生命周期漂移盘点

## 1. 维护规则

- 只记录仍影响当前工程判断、测试可信度或设计资产生命周期的 drift。
- 已关闭 drift 保留最近处置记录, 作为本轮归档和提交说明依据。
- 新增 public route / contract / migration drift 时, 必须同步回到对应治理切片或 `api-route-canonical-inventory.md`。

## 2. 当前漂移

| Drift ID         | Classification               | Status | Owner | Evidence                                                                                                         | Handling                                                                                                                                    |
| ---------------- | ---------------------------- | ------ | ----- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `D-20260507-001` | `existing-baseline-drift`    | Closed | Codex | `EX-55A-R` 实现已提交, tracker 仍停在 `Doing / G3`。                                                             | 新增 `EX-55A-R` G4 closeout, tracker 推进 `Done / G4`, 并归档生命周期产物。                                                                 |
| `D-20260507-002` | `tool/date-test-drift`       | Closed | Codex | `sales-follow-up.repository.spec.ts` 使用固定 `2026-05-06` 到期日, 未冻结系统时间, 真实日期推进后期望失效。      | 在 spec 中使用 Jest fake timers 固定当前时间, 消除日期敏感测试漂移。                                                                        |
| `D-20260507-003` | `governance-lifecycle-drift` | Closed | Codex | 多个 `Done / G4` 切片 lifecycle artifacts 仍停留在 `docs/design/` 根层。                                         | 将已完成切片的 baseline / closeout / checkpoint 迁移至 `docs/design/archive/slices/`。                                                      |
| `D-20260507-004` | `accepted-open-slice`        | Open   | Codex | `FE-57` 已有 G3 closeout, 但 tracker 仍是 `Doing / G3`, 且记录 `FE57-R1-BROWSER-UX-REVIEW`。                     | 保持根层不归档；需完成浏览器 UX 复核后才能进入 `G4 / Done`。                                                                                |
| `D-20260511-001` | `existing-baseline-drift`    | Closed | Codex | `EX-65` 本地环境无真实 Huawei OBS 租户凭据, 只能使用 mocked SigV4 / provider tests 证明 OBS S3-compatible 路径。 | `EX-65E` closeout 固化生产启用前真实 `testConnection`、presigned PUT、complete 和受控下载烟测；代码侧不保留 public route / contract drift。 |
| `D-20260513-001` | `planned-contract-drift`     | Open   | Codex | `api-route-canonical-inventory.md` `B15` 登记 `POST /auth/sessions`，当前实现仍是 `POST /auth/login` 返回 JWT。  | `EX-66C` direct cutover 清退 Admin Web `POST /auth/login` / `accessToken`，改为 Cookie session；产品未上线，不保留兼容 alias。              |

## 3. 本轮结论

- 当前开放 public route / contract drift 只有 `D-20260513-001`：它来自已接受的 `ADR-017` 和 `EX-66A` G1 baseline，按计划由 `EX-66C` 关闭。
- 当前可自动修复的测试漂移已关闭。
- 当前仍开放的事项是 `FE-57` 的人工 UX 复核, 不属于实现漂移；真实 OBS 租户验证属于生产启用前运维证据, 已在 `EX-65E` closeout 记录。
