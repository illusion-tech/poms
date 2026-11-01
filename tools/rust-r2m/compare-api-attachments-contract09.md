# M4 Source09 两个原始 session 的版本差来源

本候选继承 Source08 的完整 M4.1–M4.4 子集比较。原 Native 父报告仍是 mixed seven-case partial；本候选不改原报告、原行值、UUID、HTTP、DTO 或 CAS 版本。Source08 measured08 的 82 处差仍未被实际验收；本包仅供必要源码审查，由 Root 在新 label 离线实际执行。

唯一允许的物理差异位置是原 `m.bootstrap.admin.auth_session.0`、`m.bootstrap.viewer.auth_session.0` 的 `row_version`。必须先把每个原 session 的 final typed admission、真实 birth/outer commit/独立可见、typed user、实际签发的两 cookie 哈希、49 个原请求中 44+1 个带该 cookie 的 M4 请求、58 步的 116 个完整 107 表帧全部逐项绑定。其他 session、DTO/CAS、任何其他列和未知 SQL 仍拒绝。原数字保留，分类不是数字相等，也不产生 ownership。

`createM4AuthSourceProjection` 仅消费原 `r2m-c01-joint01` capsule 的 23 件公有 `storedFile` 字节。原已核启动路径的 child environment 只传 PATH/HOME/LANG，两个 managed allowlist 不容纳 AUTH_SESSION 配置，所以只采用原 900/28800/60 秒默认值；不读当前或私有 env。M4 自己存在 managed flush 路径，本候选不借 M3 Approval.Common 的增量。Rust 本 pair 唯一允许的 +1 必须在原 GET `/api/attachments` 的无 save 调用链、真实 60 秒到期、该请求窗口和原完整前后行上共同成立。

Native SQL helper 完整复用 B 的 Source02 字节，只机械重放原 SQL 的每 PID BEGIN/COMMIT/ROLLBACK TO/RELEASE；两个允许形状分别为 conditional touch 和 managed version coflush。真实 stack 决定 autocommit/explicit-transaction。Root caller 必须以实际 cookie/typed birth/全行帧证明实际 session 归属；原 SQL 捕获没有参数明文，本包明确不声称捕获了参数或从 query ID 得到身份。两次写必须分别有实际 commit 语义、精确时间窗口和完整物理版本历史；Rust 两个固定 Native handover producer 的原 SQL 必须是零 auth 写。

原 pre-certification response 与 final request response 只准原来源明确增加的 `actualWriteOutcome`：原所有 wire/body/header/window 字段逐项严格相等，post-certification 同 context/method/path、前后 ordinal、真实 outcome 全量相等。该边界不等于 whole debug 重构。

Reader 仅新增公有 metadata 的固定 SHA 输入、上述真实来源校验和原 phase-loop 的差异分类。只把已证这两个 physical row_version 差收入 `acceptedDifferences`；原 `facts` 不替值，其他差继续保留。所有 Source08 wire/CRC/STORE/DOS/µs/default/K logical exact-site、完整 mapper/107 列与 R1A 分类均原字节复用。

最终安装由 Root 执行，候选文件 import 保持最终 tools 形状；作者的 `*.pure02.mjs` 仅将这些 import 和被测公有 Reader/Input 路径映射到新 tmp 供纯测试，未导入 Reader 执行私有入口。正常安装后的纯命令为：

```text
node --test tools/rust-r2m/compare-api-attachments-auth.test.mjs tools/rust-r2m/compare-api-attachments-entry.test.mjs
node --test tmp/rust-r2m/m4-session-sql-candidate02/m4-session-sql.test.mjs
```

后者是本包已保留的 B 独立模型测试源；生产 helper 没有该 tmp 依赖。Source08 原 41 纯测试和 portable fixture 继承其既有真实成功记录，不重跑无变化组件。当前新增纯结果不证明原 82 处已被实际接受，不代表 M4/G3/G4 Pass。
