# RUST-R3A/B 首批收口记录

当前为 **G4 关闭前就绪**：客户/别名8项与项目基础6项已实现、验收，通过独立 G3 和固定提交复核；实现 `df0d99decffbe974c988e85eea97767331044cbe` 已 FF 并推送 main。线上 G4 与最终独立复核尚待完成，当前不关闭 #86/#87，正式交付暂0/58。

## 实际交付与原件

- [联合验收](rust-r3ab/acceptance-evidence01.json)：主验收 Native/Rust 各263次 HTTP/34项观察，严格对照差异0；每端7项外部并发/回滚加3项补齐故障，原 Angular 四组合全部完成。客户真实 Rust HTTP 产物先于项目实际创建/修改/lookup 消费，prepared 事实没有替代该链。
- [独立 G3](rust-r3ab/g3-independent-review01.json) 与[固定提交复核](rust-r3ab/fixed-commit-review01.json)均 Pass；15项已验收生产/测试源、12份正式输入、872项 Native 来源及归档原件匹配。主区/远端 main 与固定实现一致，[集成后证据](rust-r3ab/evidence/governance/main-integration-proof01.json)确认原字节、只读 API 重放及主区 diff/Markdown 检查通过。
- Rust232通过、54 ignored，fmt/clippy/release 通过；Native863/74 suites、admin UTC368/56 suites、lint 与全新 UI 构建通过。原 JST367+1失败、schema check1/dump0、168既有 CHECK/1既有 comment、QA marker 工具差异和其他历史失败/partial均按原标签保留。
- 9个验收 cohort 加1个 Native witness 均清理，两库107张种子表逐行原 JSON 精确恢复，故障 ACL 全部归还。06完成后观察到外部 WSL boot 变化；原运行随旧 boot 结束，未跨 boot kill。只恢复本轮 PG15 完成 marker/行清理后再次停止，保留卷与 private journal。旧 PG17、旧环境、原隔离例外保留。

原[联合 baseline](rust-r3ab-customer-project-baseline.md)、[编号 corrective](rust-r3ab-numbering-corrective-checkpoint.md)及[G3 checkpoint](rust-r3ab-g3-checkpoint.md)移动后原字节不改。[来源映射](rust-r3ab/archive-origin-map.json)解析历史逻辑路径；冻结原件中的签署前 Pending 和历史相对链接保持原样，可按固定实现的原路径或该映射复核，不是当前 Gate 状态。机器输入的 regular 同字节副本仅为旧 producer/manifest 兼容保留，E1 owner、复核日期和移除条件见映射。

主区 ignored 先保全732文件/211083968B，全 hash 一致；后续 C、固定提交、main 和 G4 收据按独立增量保全，不覆盖首份快照。主区15个既有 CRLF 文件已先保存原件，再恢复固定提交的 LF 字节；index tree 未变，无产品/Git内容变化。

## 关闭条件与未完成范围

本次只允许 #86/#87 自身 G4 后关闭并计14/58。父 #85 与总体 #57 保持 Open；余44操作、完整非 HTTP/审批/副作用生产链及 R3 阶段验收仍待后续切片。R4–R7、正式部署/切流、真实云租户接管和性能认证不在本批。

后续在线回执、实际状态和独立 G4 决定以归档目录中的增量原件及当前 `rust-r3ab-delivery-status.json` 为准；本段不预签尚未发生的结果。
