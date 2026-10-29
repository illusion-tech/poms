# RUST-R2I/J 同次 G3 纠偏增量01

- 初始[实际验收](../../rust-r2ij-validation.json) SHA-256 `2751c07cdbd71cf4958015b2dccf9923b7a76cb88bbff2b59ec4be2803aee3a4`保持原字节；本记录不把旧候选改标通过，也不声明G4。
- 新增两项已证P2均在同一managed self-read机制：enabled AUTO后的clean text归一化；初始v1/后读v2时的dirty保护、clean字段及CAS版本刷新。旧enabled19/cas21原件保留。
- 最终仅`attachment_storage/service.rs`改变；不新增SQL/事务或期望版本二次校验，不改变公开路由/DTO/原TS/Angular/DDL。原audit-before仍v1，nullable原非null优先规则与dirty raw字符串保持。
- 实际同1调度两端200/Requested/defaulttrue/v3，原before1false→after3true；4类UTF16边界每端5HTTP严格一致。critical17与auth11加2race当前复验通过。Rust当前186 passed/0 failed/54 ignored，严格Clippy/release通过。其余无影响组按[机器增量](../../rust-r2ij-g3-delta01.json)明确复用，不冒称全部新二进制重跑。
- 最终83 backend/run全部journal cleaned/故障恢复，完整引用扫描0残留、0 DML、local0；API/OBS正常停止、source/binary保留不变，新PG15停止且五端口释放。原private/volume和PG17保留。

待非作者审查本增量及最终公开证据封印，再提交集成与G4。当前仍74/108，父#67/#57保持Open；生产OBS/R3完整业务页与性能均未认证。
