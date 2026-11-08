# Source13 真实期末外部验收驱动 206

本目录是待独立审查的工具提案，未应用到 Root，未执行数据库、HTTP、API 进程或活动业务 state 操作。纯文件测试不构成业务验收、G3 或 G4。

范围固定为 Source13/API136/M98 的 Receiver 项目 `4d9e57ad-4890-4f53-80da-c6d224ce576b`、自然结束的香港 `2026-W45`。用户已决定保留真实来源并跨期验收；自动重选历史预算的另一问题仍未批准，驱动不执行该策略。

依赖是实际受审的工具 119 / H1 / B2、完整 416 来源、API136 原进程，以及已完成且逐项回滚验证通过的 Tax 修正。原 R3/H0/B0/B1 及 M97 业务基线保持原身份。

执行文件均位于 `business` 枚举之外。Root 可将 `driver206.mjs` 与 `facts206.mjs` 同目录复制到正式外部工具目录，再为两文件填入实际绝对路径和 SHA。模板所有实际输入均为空，不能执行。

四个模式各使用新的私有输入文件及其原字节 SHA：

1. `prepare`：真实登录及日历查询，实际期末准备 GET；固定空 `costDecisions`，保留真实 public HTTP receipt pin 为 `scope.periodPreparation`。由 205-02 的 GH facts 严核完整原请求、来源和单位集合，再封存源快照、完整必要写清单及实时图，停止交 Root 复核。
2. `fi-only`：复用同一准备原件、请求体、CAS 和哈希。每项必要写必须实际主命中 1、后备命中 0，且完整双库行、xmin、目录、对象及序列恢复。完成后再次停止，不执行正常期末 POST。
3. `commit`：Root 显式绑定完整 FI 原件；只发一次同体正常 POST。成功响应先封存，随后核全部新增期间输出同事务、旧事实不改、实时 current / 四项当前闸门及复核记录不回退，并实际 GET 期间与配对 G 快照。
4. `read-verification`：只允许已有确切正常成功原件，补验后置条件及真实 GET；不会重新 POST。未知提交或未决故障状态必须先由 Root 对原件调和。

nonce 独占锁在构造 context、写活动 state 和 HTTP 前取得。任意失败保留私有 partial；未决请求记录不自动清除，已成功命令不得重发。

Source13 的期间 H 绑定因不发布为 current，持久化状态为 `superseded`；驱动要求这四条绑定存在并保持当前四条旧绑定原行/xmin。内部 `operating_command_receipt.http_status` 按实际 `service::save_receipt` 为 200，实际公开 POST 仍单独要求 201，两者不会改标混同。

成功后输出两真实共享项目的全部期间目标，要求 H47 重新准备完整范围并覆盖新增期间；206 不自称通过期间 Labor 脱敏验收。

待 Root 独立复核后才可按以下形式执行：

```text
node driver206.mjs --input <private.json> --approved-input-sha <rawSHA> --mode prepare|fi-only|commit|read-verification --execute
```

公开 API、DTO、产品 Rust、迁移、原始 H0、原 R3/schema108 均不由本提案修改。
