Tax245的方向已独立核定：服务器返回5个targets，工具date-only断言得到2个。差异来自产品把一条已替换成本的历史Stage误当成隐式晚到根；不是Tax-only漏了真实共享批，也不是GET没有携带纠正根。本轮没有Tax FI/正常POST，不签G3/G4，243原seal不改。

固定server packet SHA `8ef9a466d181ff75d9f10f3825be956921f3ac212afa88633c5ac79b706cf020`。7份真实GET均核了请求query与响应：initial无显式根；primary及5个target请求均携真实Tax7ff… ExpectedRef，且各返回5项。

独立按冻结Source13源码与snapshot79重建10类inferred候选Catalog，共27行；14条可与public refs交叉的factual hash全相等。相对604f冻结members有7个changed candidates：旧Cost、两basis、两Receiver share和一Stage均为replaced/superseded，被现守卫排除；唯一漏过的是Stage57f… active v1。其真实父Costc253…为replaced v3，successor814…明确supersedes c253，当前有效Stage是855a…。57f在11月7日22:50已存在，早于全部5个终端的knowledge cutoff，且5个终端均未冻结它/其旧父链。这是正确保留的历史节点，不是应改写的数据。

| 反向图种子 | 固定关系 | 影响日 | affected结果 |
|---|---|---|---|
| 显式Tax7ff | 真实证据→Costc941→完整basis e37f及两份share | 11-08 | 仅Receiver604f、Main3d0f，共2 |
| 隐式历史Stage57f | replaced Costc253→旧basis4464；slot非current、basis/results均superseded | 11-07 | 5个终端，consumed member命中全为0，由同project/in-window分支选入 |
| 两根union | scope_roots无条件将inferred并入selected | 两日 | 精确等于实际server5 |

额外3个旧终端的snapshot窗口和context.business_cutoff均为11-07，knowledge在11-08 06:26，早于新Cost/Tax在06:33出生；它们不含Tax这五个因果成员，packet均missing-evidence / operating_cost_outside_cutoff。不能强迫旧7日节点有效化。

GET与POST共用同一缺陷：preparation.rs:40–61调用scope_roots/affected_states；service.rs:97–106、117–124和collector.rs:25、51–59、217从实际body重建同样roots并核完整targets。本批Tax body没有其它producer correction或分类决定，selected根仍仅TaxRef；同一固定状态下POST静态也会要求5。未实际发送POST，不能宣称已观察到某个POST错误码，更不能仅在客户端删3项或把断言2改成5。

最小修边界是implicit Stage资格：Stage.active必须依附真正当前、未replaced且实际指向该attribution的Cost事实；父缺失要受控拒绝，不能悄悄放宽。不要改写旧Stage/Cost/context。保留all-history batch追踪和same-project/day晚到发现分支，它们对真实治理纠正/真实新晚到源仍必要；也不要对Tax加必须有live Cost parent的对称政策，独立manual-finance Tax合同不属于本缺陷。无需为这个具体历史Stage误选另向用户裁决；explicit/implicit模式是否作更广重设计超出此修复。

固定79且没有新事实时，Stage修正后的FS预期是initial空selected→0 targets/无适用变化；后续显式Tax primary/target→2。initial只取真实ref，工具并不要求它可执行。未来有新period/真实晚到源时目标数必须重新按因果集合发现，不能硬编码2。

Source14影响/最小兼容验收见 impact14-preparation245.json：新digest/count/binary/process/admission均未知，保持null；须独立审过的same-M98 retained admission，不热换Source13任何pin。原M97 baseline、M98 canonical receipt/108登记、R3/B0/B1原身份保留。Main242的Source13实际201不重POST；Tax245失败标签、无FI/POST不变。H46当前是Root明示的Source13运行（sequence117、独立项目d30c…），最终原件应保Source13 epoch，不预读活动目录、不重标Source14执行。

最低兼容集合：准确Stage-only差分及真实late Stage/历史批/独立Tax反例；新候选完整Rust必要检查与冻结图；新API实际initial/explicit GET和POST discovery/CAS同源；新鲜完整targets的实际必要族FI整体回滚、一次同体正常Tax修正及G/H读取；对新增输出重备H49/H47及必要审计范围。旧H46是否可按影响保留须等精确Source14图再独审，不自动当14执行。206真实期末、219 live+period整批2:1→1:1、222 legacy races和owned收口仍按既定范围交证，没有本轮豁免。
