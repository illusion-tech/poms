# RUST-R3A/B 首批收口记录

本批客户/别名8项与项目基础6项已按独立G4关闭前许可完成实际线上收口，#86/#87 Closed；当前交付 **14/58**，父#85/#57保持Open。实现 `df0d99decffbe974c988e85eea97767331044cbe`、原件归档及主线集成已完成；[非作者实际G4终审](rust-r3ab/evidence/C/g4-independent-actual-review01.json)已Pass，只认证本批14项。

## 实际交付与原件

- [联合验收](rust-r3ab/acceptance-evidence01.json)：主验收 Native/Rust 各263次 HTTP/34项观察，严格对照差异0；每端7项外部并发/回滚加3项补齐故障，原 Angular 四组合全部完成。客户真实 Rust HTTP 产物先于项目实际创建/修改/lookup 消费，prepared 事实没有替代该链。
- [独立 G3](rust-r3ab/g3-independent-review01.json) 与[固定提交复核](rust-r3ab/fixed-commit-review01.json)均 Pass；15项已验收生产/测试源、12份正式输入、872项 Native 来源及归档原件匹配。主区/远端 main 与固定实现一致，[集成后证据](rust-r3ab/evidence/governance/main-integration-proof01.json)确认原字节、只读 API 重放及主区 diff/Markdown 检查通过。
- Rust232通过、54 ignored，fmt/clippy/release 通过；Native863/74 suites、admin UTC368/56 suites、lint 与全新 UI 构建通过。原 JST367+1失败、schema check1/dump0、168既有 CHECK/1既有 comment、QA marker 工具差异和其他历史失败/partial均按原标签保留。
- 9个验收 cohort 加1个 Native witness 均清理，两库107张种子表逐行原 JSON 精确恢复，故障 ACL 全部归还。06完成后观察到外部 WSL boot 变化；原运行随旧 boot 结束，未跨 boot kill。只恢复本轮 PG15 完成 marker/行清理后再次停止，保留卷与 private journal。旧 PG17、旧环境、原隔离例外保留。

原[联合 baseline](rust-r3ab-customer-project-baseline.md)、[编号 corrective](rust-r3ab-numbering-corrective-checkpoint.md)及[G3 checkpoint](rust-r3ab-g3-checkpoint.md)移动后原字节不改。[来源映射](rust-r3ab/archive-origin-map.json)解析历史逻辑路径；冻结原件中的签署前 Pending 和历史相对链接保持原样，可按固定实现的原路径或该映射复核，不是当前 Gate 状态。机器输入的 regular 同字节副本仅为旧 producer/manifest 兼容保留，E1 owner、复核日期和移除条件见映射。

主区 ignored 先保全732文件/211083968B，全 hash 一致；后续 C、固定提交、main 和 G4 收据按独立增量保全，不覆盖首份快照。主区15个既有 CRLF 文件已先保存原件，再恢复固定提交的 LF 字节；index tree 未变，无产品/Git内容变化。

## 关闭条件与未完成范围

本次只允许 #86/#87 自身 G4 后关闭并计14/58。父 #85 与总体 #57 保持 Open；余44操作、完整非 HTTP/审批/副作用生产链及 R3 阶段验收仍待后续切片。R4–R7、正式部署/切流、真实云租户接管和性能认证不在本批。

当前线上状态与独立G4决定见追加原件和[当前交付状态](../../rust-r3ab-delivery-status.json)，本批完成不改变父阶段未完成边界。


## 实际线上回执

- [客户 #86 G4](https://github.com/illusion-tech/poms/issues/86#issuecomment-6567020630)、[项目 #87 G4](https://github.com/illusion-tech/poms/issues/87#issuecomment-6567024053)；[原始线上回执](rust-r3ab/evidence/online/g4-online-receipt01.json)、[父85现状](rust-r3ab/evidence/online/issue-85-after-g4.json)、[总体57现状](rust-r3ab/evidence/online/issue-57-after-g4.json)。
- [独立关闭许可](rust-r3ab/evidence/C/g4-closeout-preflight01.json)已批准且仅批准86/87；E1兼容副本的独立approver/owner/日期/退出条件完整。
- [当前交付状态](../../rust-r3ab-delivery-status.json)只对本批14条标记交付，余44及全R3阶段Gate继续未认证；后续最终独立终审和保全收据另附。

当前子项正文以[客户 current02](rust-r3ab/evidence/online/issue-86-after-g4-current02.json)、[项目 current02](rust-r3ab/evidence/online/issue-87-after-g4-current02.json)为准：已移除未注明历史的旧 Doing 状态句，并明确独立池编号/业务事务边界；[更正记录](rust-r3ab/evidence/online/g4-current-body-correction02.json)只替代当前正文，原01关闭当时快照与回执保留原字节。


## 独立实际 G4 完成

[实际终审原件](rust-r3ab/evidence/C/g4-independent-actual-review01.json)为13475B，SHA256 `920d490a5ed120b22d9bc6f94fadccdae19b7b0940ee448fbab0a58b116d2e72`，仅认证#86/#87共14/58。[最新当前线上索引03](rust-r3ab/evidence/online/g4-current-online-index03.json)确认父85/57仍Open；current02正文修正和原01关闭快照分列保留。新C收据与最后元数据按增量03保全，最后只读核当前提交/状态，不再扩大业务验收。
