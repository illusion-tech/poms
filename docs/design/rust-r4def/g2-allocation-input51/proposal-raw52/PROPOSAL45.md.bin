# F46 所选金额层优先纠偏提案

用户已明确选择“所选金额层优先”。本目录只为 Root 冻结 / 独审准备，不修改 F25、旧证据、shared、DDL或环境。reference45.py 是独立整数数学模型及测试输入，不是生产替身或PG/HTTP通过证据。产品新版F46需另交清单。

## 明确的金额语义

measurementBasis 是优先分配和客户端 allocatedAmount 校验的主金额层。allocationRatio 仍为精确权重占总权重的六位 HALF_UP 展示值，不反算金额。主层先按精确权重做整数分 Hamilton / 最大余数分配，余数并列按项目UUID字节升序。输入权重非负、总和严格正，币种一致，所选来源层必须已知；不隐式换汇，不纳入经营成本。

- gross主层：先分gross，得到每项目不可改的gross容量。net已知时，在各gross容量约束下按原权重分net；net和tax均已知时，tax_i=gross_i-net_i。源net+tax必须等于源gross，因此tax总额自动守恒，且每项目tax非负。
- net主层：先按权重分net。tax已知时也按精确权重独立做最大余数分配；当源三层均已知，gross_i=net_i+tax_i。此时gross不是主预算，不承诺它恰等于独立分gross的结果。
- tax主层：先按权重分tax，再按相同规则独立分已知net；三层齐全时gross=sum。选择tax不表示自行推导税务可抵扣 / 经营纳入口径。

反例固定为net0.11/tax0.01/gross0.12、1:1：gross主层必须gross0.06/0.06；net按UUID并列尾差分0.06/0.05，tax补集0.00/0.01。net或tax主层时组件独立，net0.06/0.05、tax0.01/0.00、gross0.07/0.05。差异由明确选择的主层解释，不能共用含糊的“50:50含税分配”标签。

## gross容量约束的整数算法

用分为单位，排序后的权重w_i，总权重W；已分主gross容量g_i。net总额N已证明0≤N≤G。

1. 计算精确商余(q_i,r_i)=divmod(N*w_i,W)，以q_i为net初值。由于N≤G且gross按最大余数分配，q_i≤floor(G*w_i/W)≤g_i，初值不会超gross容量。
2. 尚需补R=N-sum(q_i)分，0≤R<项目数。每次仅从仍有gross容量的项目里选择最大剩余精确应得值(q_i-current_i,r_i)，按这个整数/余数二元组比较；同值选UUID较小者。加一分后该项目剩余整数应得值减一，不能无视容量，也不能一直向同一项目填钱。
3. 每一步总剩余gross容量至少等于待补net，所以必有候选。最多R次修正，与金额大小无关。随后仅在net、tax都已证实时设置tax补集；完整层sum及每行identity必须再核验。

此算法是容量约束下的最大剩余配额法：精确地优先使结果接近权重配额，容量满的项目被排除。无需浮点，不把目标净额截断后丢失；不得只独立分net再把超gross部分静默挪到别处。参考测试还用小整数穷举可行分配的平方配额偏差，对照该规则，避免只证明自身实现一致。

比较使用(q_i-current_i,r_i)而非再次乘current_i*W，减少大数溢出面。生产Rust仍需所有总额 / 权重求和、乘积和gross=sum使用checked整数；18,2金额上限为9999999999999999.99，weight保留18,6，E的费率15,4 / 数量10,2不变。不得使用f64或舍入后的ratio算钱。

## unknown必须保持null

| 已知层                                  | 主层     | 处理                                                                                  |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| net/tax/gross全知                       | gross    | 固定gross→受gross容量分net→tax补集                                                    |
| net/tax/gross全知                       | net或tax | 主component及另component各按权重分，gross=sum                                         |
| gross与net知、tax未知                   | gross    | 固定gross，受容量分net；tax保持null                                                   |
| gross与tax知、net未知                   | gross    | 固定gross，受容量分tax；net保持null                                                   |
| gross知、两component未知                | gross    | 仅分gross，net/tax皆null                                                              |
| 主component与gross知、另一component未知 | net或tax | 固定主component；gross按权重、以下界=该component份额作受约束分配；未知component仍null |
| net/tax知而gross未知                    | net或tax | 两component各分；gross保持null，不把数学和伪装成已证来源gross                         |
| 仅主层已知                              | 对应主层 | 仅分已知层，其余null                                                                  |
| 所选主层未知                            | 任意     | 拒绝，不能COALESCE其它层                                                              |

部分层同时已知时，已知非负component总额不得大于已知gross。主component固定而需分已知gross的下界分配，同样以精确商余为配额，把初值clamp至该下界，按最大剩余配额补 / 按最大过额减；相同过额优先从UUID较大者减，保留升序UUID优先得到分币的确定性。该下界来自另一个按相同权重分出的较小总额，最多只把gross floor配额提高一分，因此修正次数仍不超过项目数。一般任意上下界不作为公共输入接受。

只有完整已知的三层才断言每项目gross=net+tax；未知层不发布隐式差额。所有已知层的项目sum都必须等于各自已证明来源总额。源层混合aggregate时沿现有Option传播，不能只加已知子集后冒称整个层已知。

## 版本与整批替代

Root明确本次不改公开DTO或DDL。现有列allocation_algorithm仍取`largest-remainder-cents-v1`，仅作既有整数舍入family标识，不能再用该列单独断言层优先政策。basis不可变evidence和每个result不可变evidence都必须增加同一显式私有标识：

```json
{
  "allocationPolicy": {
    "id": "selected-measurement-first",
    "version": 2,
    "measurementBasis": "including-tax",
    "grossComponents": "gross-cap-net-tax-complement",
    "tieBreak": "project-uuid-bytes-ascending",
    "secondaryQuota": "bounded-largest-deficit"
  }
}
```

measurementBasis写实际主层；net/tax主层的grossComponents写`independent-components-gross-sum`。每个result与所属basis的policy必须完全相同并纳入原canonical payload hash。新confirm及整批replace一律绑定该v2 policy，不从旧basis继承旧口径。只在JSONB私有证据内扩展，不加公有response字段、路由或物理列；既有schema/DTO维持。

F25已有basis/result/evidence原字节和旧算法标签保持；缺少新policy字段的旧证据按原组件口径保留，不补写v2标识、不通过新算法重算历史、不重新解释原金额。v1旧批→v2新批必须走显式完整替代，继任链接真实旧basis/result，守原cost/source CAS、逐源占用、排序锁及同事务evidence/audit/pending-auth。governance_schema_version=1仍表示兼容payload结构，不冒充政策版本。

residualMinorUnits的新policy语义统一为所选主金额Hamilton分配相对floor的额外分币（每项目0或1），不再在gross主层叠加net/tax两次尾差。现DDL允许0..2无需修改；旧v1结果中的2仍原样可读，新policy的0/1由私有标识明确解释。Root写G2纠偏、独审提案通过后才授权产品修改。

验收新增：1:1反例以主层选择区分、MAX18,2、零tax、零权重、非负容量、全部known/null组合、权重/输入排列不变、两/三项目并列余数、明确算法标签和整批replace沿同规则；CAP不能只测gross.sum，还须验证每行net≤gross/tax≥0及全部源层sum。F44可继续列无歧义1:2→1:4、gross-only及MAX真实C→E→F链为not-run；歧义反例待本提案冻结后才新增实际认证。
