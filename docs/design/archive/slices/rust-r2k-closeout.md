# K 五业务与 R4 两参数 G4 收口

状态：G4 Pass；#78/#83 已实际关闭，R2 已交付104/108，剩余L四公开操作及R2M阶段验收。

K #78 的五项真实业务、四类最小 facts 及 #83 的两个 {id} 参数同步已通过联合 G3。实现 889d6f79d51640cb9dbf5a9b10e41e6554ebe1be、尾部空行独立修正后候选 9e5d23c2a591ed934595f9c9dfe278bad5af821d 已经固定提交复核并快进推送 main，S2 永久祖先保留。

- [冻结验收](../../rust-r2k-validation.json)、[34 次运行分类增量](../../rust-r2k-validation-delta01.json)、[独立 G3](../../rust-r2k-g3-review01.json)与[固定候选复核](../../rust-r2k-integration-review01.json)分列实际时点。Rust211通过、54历史ignored；共享129套1185tests；K43 captured HTTP/端与独立ZIP、并发、分段失败、受控OBS、原K section八步UI及取消清理均保留有限边界。
- [保全锚点](../../rust-r2k-preservation.json)绑定49605件初始文件及一份完整tar；[来源补证](../../rust-r2k-source-supplement01.json)补齐3个Rust根文件，907件来源覆盖已独立闭合。54个旧literal输入为当前原来源补证，不能补称C6当时独立快照。初始tar、冻结验收和旧失败/partial/uncertified原件均未改写。
- [生命周期映射](../../rust-r2k-lifecycle-path-map.json)记录10件原件/归档路径、raw/LF与机械相对链接变化；[提交表示](../../rust-r2k-commit-representation01.json)保留两旧L1的明确换行映射；[单字节EOF修正](../../rust-r2k-commit-whitespace-delta01.json)另列，保留原889d提交和失败检查。
- schema check的既有CHECK可见性/注释差异仍分类失败，readonly dump通过且未执行建议SQL。OBS断连后Native等待peer截止、Rust沿既有共享层及时取消的生命周期差异如实保留；peer owner仅证明ACK/拥有进程停止/端口释放。无真实云租户、性能或整个Rust R4写链认证。
- 最终34组backend/run的登记数据与local对象归零、完整107表引用预检及两个借用定义原字节不变。新PG15已停止，五端口释放，Windows PG17与旧环境保留；未执行部署。

本批仅 #78 与 #83 已按实际 G4 关闭，R2 从99推进至104/108。L四操作、真实R3–R5 handler、R2M、两业务号lookup及父#61/#67/#57继续未完成。当前长期[机器收口](../../rust-r2k-closeout.json)与后续小增量记录在线完成状态。

[在线完成回执](../../rust-r2k-online-g4.json)与[完整小增量索引](../../rust-r2k-evidence-index.json)绑定实际Issue状态、父项保持Open、源路径与提交表示。归档准备提交 `33882f3f598048f837e4053653271646240f9eda` 保留在线回写前时点；最终元数据提交与远端读回由后续独立回执绑定，不产生自身hash循环。
