# uin4c01a 固定 late 恢复 02 增量

仅 Root 执行 `node tools/rust-r2m/recover-late-uin4c01a02.mjs --run`。新输出为 `tmp/rust-r2m-continuation01/recovered-ui-nest-uin4c01a02.json`，新 private 前缀为 `uin4c01a-late-recovery02-`。`--check` 仅检查源，不访问 private、DB、HTTP 或应用进程。

首轮01错误来自工具要求真实事件没有的 source_schema 列。原失败5696ca4f、原01全部源、原快照69a22e7a及PG ac659cf9均保留。没有为旧 UI 作成功或正常关闭认证。

02分别读取固定原 wx ledger 69a22e7a/revision276 与当前 ledger bc38bc9b/revision277，并核 Root 596b06a2 原始字节证明；只有将当前 revision 减1后 JSON.stringify 加换行与原字节完全相等才可继续。原 metadata.refs 仍声明原69a，验证原协议时明确使用原wx数据，不能把当前文件冒成原件。第二次 Fixture.open 前 wx 保存当前bc38；第二次 open 仅允许相对当前再增1。

schema 由冻结7988原 PG 模块真实 SQL/DDL 中 TG_TABLE_SCHEMA=poms、current_database、34条 poms CREATE TRIGGER、原 registration approvedBody/Definition SHA、installedCatalog.relations 的真实 nspname/relkind 与 registered functionOid/prosrc/definition、trigger relname/tgfoid 共同证明。没有虚构 event.source_schema、registration.catalogNamespace 或 trigger.nspname。真正控制30case/完整live事件仍逐字段等原PGjournal，并与既有出生证书逐一核对；成熟reconcile再次要求live完整catalog等原installedCatalog。

其余已审恢复链不变：原false生命周期、69真cert/0pending/0files/0mutation、fresh静默与完整107 sealed相等、原出生集合、新generation成熟restore、lateDrain、成熟69/0双清理与原107 baseline。无adopt/selector修正/重放SDK/业务重试。原01及首轮纯模型失败日志都保留。9项受控纯测和3文件syntax/lexical/--check只证明源，不是实际恢复或G3/G4。
