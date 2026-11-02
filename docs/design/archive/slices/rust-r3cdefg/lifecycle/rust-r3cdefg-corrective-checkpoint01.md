# RUST-R3C–G 实现纠偏 Checkpoint

- Checkpoint Status: `Pending`；当前仍为 G2，独立 G3/G4 未签署。
- Parent: #88/#89/#90/#91/#92 属于 #85；总体 #57 保持 Open。
- Owner: Root；A 修成本/报价内部类型与校验，Root 修 F HTTP 接线。非作者 C 只审查。
- Slice Type: `cross-layer-high-risk`；日期 2026-11-02。

## 输入与阻断

联合 G1 的未改主基线、active manifest02、C02 Pass 和五子项同源线上冻结继续有效。此记录纠正实现偏差，不重写 G1 或实际失败原件。原 Native controller/service、Zod 4.6.1、原 92 迁移及真实 HTTP 原件仍为权威；237/291/585、579 client 与原枚举保持不变。

发现五项 `new-real-drift`，修后全部验收和独立 G3 通过前禁止收口：

1. 成本 `costItems` 非数组但有 length 时，Rust 漏了 Zod 在类型错误后的最小长度错误累计。C 预审与实际 1124 响应比较均确认。A 已补完整 JS length/coercion/错误顺序；candidate ca128ec 的 1124 完整 body 比较及双端各 129 极值请求通过。
2. 成本/报价原 DB i32 version 直接加一可导致 debug panic 或 release 回绕。A 改内部新行使用 i64，原公共 DB Row 仍为 i32，由首个原 parent INSERT 的 PG int4 边界拒绝越界。两端实际 version=2147483647 后 POST500、旧 parent/children 保持不变已取证，不增加 DTO400 或 DDL。
3. F 的动态 POST transport 对未注册命令自行返回 JSON404，与原 Express HTML404 不同。完整 boundary 比较定位 `path.encoded-command`；随后双方各 20 个实际 URI/方法 probe 证明普通未知 suffix、编码 colon/literal 均应复用已有全局 HTML fallback。Root 将 F 的手工拒绝接到现有 `http::not_found`，不改全局错误或已注册命令，补真实 oracle 回归并重新绑定最终产物验收。
4. year `0000` 通过原 DTO，但原 MikroSQL 在请求日期的实际 INSERT 中内联 ISO 文本并被 PG 拒绝500；SQLx 二进制 DateTime 可写1BC，出现三个域意外201。原生/1346892e各84个时间请求留存。A/B/D仅把报价条件、竞标材料/时间线、F记录及Todo请求日期改绑毫秒 ISO 文本并在原 SQL 位置显式转 timestamptz；NULL、DTO、Row读和服务生成时间不变，不提前假报500。最终产物须重新验证错误位置/回滚及其它合法年份/精度。
5. C 的45组独立SQL深比发现 void 无新行路径实际为旧Todo UPDATE→session UPDATE→旧F UPDATE，03候选错误复用了创建/替换的 session→旧Todo顺序。D仅在 `new.is_none()` 的void路径先写全部旧Todo，再flush session及F CAS；有新行的创建/替换、后置审计独立事务不变。最终当前候选还须实际SQL强验。

## 原件与验收要求

- 原件位于 `tmp/rust-r3cdefg` 的 coverage compare01/02/03、edges/business/boundaries compare、routing-probe、C g2-static-prereview01 与 g2-coverage-gap01；原失败和 partial 保留，不改成通过。
- 基础工具曾遇到未导出 HTTP module、clippy 大 Err、静态状态码/Bearer 假设、fixture 名称/长度及 UI selector/datepicker/观察范围问题，均是 `tool-noise`；真实结果按实际状态保留。原入口只认 Cookie，Bearer-only401，与四 UI 平台组合分开验收。
- 原生第二版 C/D/G 500、F 业务提交后的审计失败面继续标 `existing-baseline-drift`，不在此片修成另一套行为。
- 当前无 forwarded header 的 Native `::ffff:127.0.0.1` / Rust `127.0.0.1` 表示差异延续已归档 R3AB `ip-context-original.json` 的明确 `existing-baseline-drift`；保留原值，不做全局IP重写。C已独立核对记录，不将生成ID/时间规则用于抹除IP。
- 合法历史和 pricing FK 图只作明确 prepared 只读/引用事实，不冒 HTTP 第二版成功、真实审批处理器或完整阶段交付。权限、锚点/owner、故障/CAS、公开 Todo 生产与 UI 继续实际补验。
- Root 完成当前源码 fmt/clippy/test/release、双端完整响应/精确 PG/原始 wire、四平台 UI 与补片、全部 owned 终态后，再提交独立 G3。仅五子项各自实际 G4 后关闭；#85/#57、余28及完整 R3 阶段验收仍开放。
