# RUST-R2G＋R2H 身份与组织目录 G4 收口

- 日期：2026-10-29 Asia/Tokyo；实现提交：`91cda75f8379a4085a37c14fc1fd25bde0a731dc`，来源基线：`126ede22bb4b379ae656ccde9cee9d82da383be4`。
- 工作流：独立 worktree / solo checkpoint。实现已推送 main，集成核验通过；G4 随本归档提交推送及 #74/#75 在线核对生效。精确归档提交可由本文件的新增 Git commit 或在线 G4 回执定位，避免提交内容自引用自身 SHA。
- 仅关闭 [G #74](https://github.com/illusion-tech/poms/issues/74) / [H #75](https://github.com/illusion-tech/poms/issues/75)。父 [#67](https://github.com/illusion-tech/poms/issues/67) / [#57](https://github.com/illusion-tech/poms/issues/57) 保持 Open，I–M 与 #61 不变。

## 交付与实际证据

本批交付 G 身份提供商、管理员授权、绑定及外部登录16个既有操作，H组织源、目录预览、mapping/diff/apply18个既有操作。R2A–H累计 **74/108**，剩余I–L的 **34个操作** 以及 **R2M阶段验收**。无新增公开route、产品DDL、原TS/Zod/Angular产品改动、生产部署或性能结论。

[联合基线](rust-r2gh-identity-directory-baseline.md)和[纠偏记录](rust-r2gh-corrective-checkpoint.md)保留具体语义。最终candidate05实际严格比较每端137 captured-case HTTP（完整G/H128＋坏密文setup5/负例4），每端3组真实竞争/6并发响应，transport20、两库4个逻辑外引拒绝反例0 DML、受影响纯工具23、Rust162 Pass/54 ignored分别计数。native约束原先两库各12另列，不与HTTP或纯检查相加。

最终Rust在Windows/Linux原Angular各2条再次通过；最终接受页面矩阵8条由同字节原Nest两平台与最终Rust两平台组成。基础认证52保留未改动路径及原候选标签，不冒称新二进制全四组合重跑。72个backend/run生命周期、144份journal最后全量两轮0/0，本批owner正常停止且source/binary不变，5700/5701/5800/5900释放。旧失败、late recovery、初审Block和ignored保持原状态。

## G3、集成与原件

- [初始验收](../../rust-r2gh-validation.json)与[首审Block](../../rust-r2gh-review.json)保持原字节。
- [集中纠偏增量02](../../rust-r2gh-g3-delta02.json)与[同次最终review02](../../rust-r2gh-review02.json)独立；最终未关闭P0/P1/P2/P3均为0，review02 SHA-256 `993ff5175907a39bb5c2e4eadf213ad3cfa62a993d6ee71d0048a90cafb0f615`。
- [完整受审清单](../../rust-r2gh-source-manifest.json)是3,479项frozen source/evidence union的原字节副本，保留docs/tmp来源。
- [集成后8步核验](../../rust-r2gh-post-integration.json)和[3479项来源快照](../../rust-r2gh-post-integration-sources.json)证明134个实现commit blob逐字匹配、来源前后相等；仅声明的8件Gate元数据相对C2变化，产品/运行工具未变。
- [独立集成核验](../../rust-r2gh-integration-review.json) Pass，134个blob与8份日志由非作者再次核等。没有新增DB/HTTP/UI运行声明；仓库没有Actions workflow、远端checks/statuses均无条目，未声称CI绿色。
- [G4附加元数据与路径/hash映射](../../rust-r2gh-g4-closure.json)解释受审旧路径、实现commit与当前归档路径，不重写旧JSON的path/hash或Pending/Block时点。

Linux旧3,040份/418,309,784 bytes和新增1,179份/241,191,624 bytes均本地raw manifest＋一次tar批量转移后逐项核验，旧文件0覆盖；Windows原件另存。公开验收证据还须保全到primary的`tmp/rust-r2gh`并由最终回执核等，私有env/key/journal与内部工作记录不进入公开证据。原检出实施阶段没有直接修改primary；最终仅允许干净main按已确认流程快进，不覆盖未提交状态。

## 保留边界

schema结果仍为Failed-with-classification，catalog前后不变、92迁移名一致，生成DDL未执行。54 ignored不算实跑；原H预flush UUID关联、G state/ticket分段提交及best-effort apply等原行为见纠偏。受控HTTP/TLS/代理集成不等于真实Feishu租户认证，不访问外部目录写入。PG17仅服务元数据，旧PG15环境、实例、缓存和数据保留。父Rust迁移与R2阶段均未完成。
