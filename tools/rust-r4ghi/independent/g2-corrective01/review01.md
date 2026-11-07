# G2 限定静态预审 01

结论：捕获版本有 **1 P1、1 P2** 待修；**不签 G3**。scope提案SHA-256 `673a1d159f4a021061f353325b5977523c827f2cee91601fb962cdaede1584b5`，尚未应用；完整固定输入见`input-manifest02.json`。

1. **G2S-01 / P1：旧缺ownerOrg的owner被授FullProject。** scope699–708只按owner UUID设置owner_read，756直接变full；775–845的经营/提成/详情读授完整scope。反例为真实owner、ownerOrg=NULL、无D关系、具finance permission；即使无active membership也能构造经营读access set。冻结OwnerRead明确仅允许有限非敏感锚点。须将该legacy关系与full OwnerRead分开，保护完整经营/提成读取。
2. **G2S-02 / P2：schema.rs137–178漏实现not。** completed请求附合法completionConditions违反冻结allOf/else/not，却会通过当前形状层和可选Vec字段反序列化。`reference-check01.json`已证明冻结schema精确拒绝该反例；未声称下游SQL会写坏。

actor/physicalTX、跨部门真实D职责、creator永久消费、own-condition双UUID、DB错误传播和raw数值规范化已作限定静态阅读；具体正向观察见JSON，不等于实际验收。Root D桥复用sources::fresh。期末是否推进live-current仍Pending。未统一编译、未跑产品/SQL/DB，未Git/GitHub写入；#115未复测。
