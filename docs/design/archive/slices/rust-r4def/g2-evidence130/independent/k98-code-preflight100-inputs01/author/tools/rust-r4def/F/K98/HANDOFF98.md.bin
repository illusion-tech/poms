# K98 Link INSERT真实提交基线纠偏

依据 Root `g2-K98-correction.json`（SHA `e1f2da3e5a8855395f37dba60ca5bd88b4d6a76fcc166d2bb78c4e13f7c405c9`，true），只修改 `attachments/store.rs`。service保持K86 `0fbd8afc…`，registry保持K56 `617f734a…`，handover不改。K56/K86清单、完整product原件和检查证据都保留。

独审 `K86-P1-01` 的真实原因是generic handover autoLink只赋七字段，UUID由数据库生成；旧INSERT拿回ID后，内存original仍只有八字段，缺实际数据库的`unlinked_by`、`unlinked_at`两个NULL。K86新增的严格clean-Link校验正确地比较完整tuple，因而下一audit flush会遇到假冲突。

现在单条Link INSERT与Link insert_group都从实际SQL `RETURNING id,to_jsonb(attachment_link) AS data`拿完整记录。显式ID按实际ID对应；generic未给ID时，只为关联返回行而比较已经赋值的INSERT字段，不构造UUID/default值。批量结果按计划实体回填，不能靠PG返回顺序把实际ID赋给别的实体。完整实际row替换data后，仍保留original=None，只有外层COMMIT ACK才mark_committed，形成完整真实比较基线。

严格tuple/set比较、首次proof、K86 no-dirty意图、pending auth共同事务、unknown poison/保留对象都不放松。缺少完整RETURNING字段、行数不符、重复/错误身份或无法唯一关联都拒绝事务，不把absent当NULL。此处的输入字段投影只用于INSERT结果关联；后续guard继续比较完整实际字段集。

新增6项纯回归覆盖真实稀疏形态→完整提交baseline→下一generic audit guard；真tuple变化仍冲突；缺NULL字段拒绝；DB生成ID的组返回乱序；重复/错误ID与不同来源不能错配。它们是纯返回值fixture，不是PG/HTTP业务成功mock。实际fmt/Clippy/纯测试及附件回归见`author-checks01/receipt.json`，完整单文件及before/after见`delivery98.json`与`product/`。

作者未执行PG/HTTP/对象IO或barrier，不认证G3/G4。Root须在最终新runtime用真正API上传一个尚无handover关联的新附件，再refresh产生真实autoLink，独立核其完整row与necessary audit成功；另执行K86两条真实幂等屏障。K71/92/93/95等旧epoch证据保留原标签，不外推为K98最终实跑。K78候选仍暂停、未封存，不应运行其草稿。
