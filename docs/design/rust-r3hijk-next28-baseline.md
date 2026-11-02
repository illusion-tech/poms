# RUST-R3H/I/J/K 联合实施基线

- Gate Status：Pending，等待非作者C联合G1签署及线上冻结；不能据本包开始产品实现。
- Parent：#85；总体#57。子项#93/#94/#95/#96，14+10+2+2=28。
- Base：`7f970c992291c61477eb9bd83a48cec19a769d88`；分支`codex/poms-r3hijk-next28`。
- 类型：cross-layer-high-risk；solo worktree，独立G1/G3/fixed-commit/G4，不降低标准。
- Owner：Root公共集成/实际执行/治理；A Lead14；B情报10；D讨论2+工作区2；C非作者审查。子代理显式gpt-6.1-sol/max，Fast无独立控制证据，未核实。

## 范围与正式输入

完整范围、三线依赖及留白见[范围](rust-r3hijk-scope-and-dependencies.md)。当前已交付30/58，本批G4前不计入新增交付，#85/#57保持Open。新增生产者和读取机制仅服务本批28个现有原生操作，不实施R4审批/完成/归档写侧或完整阶段验收。

[正式输入清单](rust-r3hijk/g1-input-manifest02.json)及[原字节映射](rust-r3hijk/g1-original-origin-map01.json)绑定A/B/D原始审阅、验收定义、递归source pin、原Native/Zod实际观察、失败/partial原件、生产器源码和本批E1复审。D02替代有缺陷的D01长度结论；D01继续原字节保存。A44/B89/D56需求为定义，不能宣称全部实际执行。

## SSOT 与路由/命令/DTO

1373份原Native/UI/contracts/client文件及206份既有Rust源/Cargo输入由[admission](rust-r3hijk/preflight-native-source-manifest01.json)逐个原字节复核；G1前不得修改产品。命令、DTO、guard、query、响应字段及类型使用当前原controller/service/repository/entity及锁定Zod4.6.1契约；详细28行及权限、canonical行号、OpenAPI请求/响应映射保存在originals/root/g0-issue-registration.json。全部route inventory为aligned，不新造公共路径。历史R0路径不覆盖当前canonical。

原Native237路径/291操作/585schemas、client579、migrations92不变；既有Rust145操作/116路径，本批完整实施后应173操作/138路径/585schemas。新增OpenAPI仅投影既有28项；完整原contract/client/migrations不重生成改义。

日期date/datetime、金额number/decimal、nullable UUID和Missing/Null/Value、状态/版本链逐项依A/B/D source矩阵。UUID输入原拼写用于原JS严格比较，不能先canonicalize。原路径未经UUID pipe校验者保留数据库错误500。Zod长度按Unicode code points；显式业务JS.length/audit字段保持UTF16，wire和数据库替换分开，无全局Unicode规范化。

## 共享架构与持久化

[共享边界](rust-r3hijk/shared-boundaries01.json)为跨作者接口SSOT，明确LeadRef/CompetitorRef、销售事实七bool、Root Contact/FollowUp桥、既有Customer/Project读取；所有只读桥借用调用连接，不另开事务、flush或加资格过滤。D本域保留user/org/snapshot投影。附件转换内部最小SQL归A的leads/store，禁止改旧附件API。

既有92个migration、entity/DDL及107张seed表不变，不新增migration；schema diff须证明两个自有PG15库与原Native相容。表/字段映射直接由三作者source-manifest及其完整需求矩阵约束，Lead/override/snapshot/assignment、三类情报、讨论thread/comment及project只使用现有列/约束。并发、审计、session和中途flush严格按[实际Native裁决](rust-r3hijk/native-decisions02.json)与SQL authority03/时间窗补证，不把bulk更新强化为CAS、不将分段提交包成新大事务。

## 原Native实际观察与校验要求

Root已重建原Native，artifact SHA256 0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4；54组/193次HTTP和18项独立schema向量仅用于G1风险裁决。失败01/04/05/07及authority01/02误分类均保留真实标签；phase10缺begin明确注明，126条原SQL时间窗补证不伪造marker。附件cut仅prepared metadata，不能冒充实际upload生产者。

G2/G3必须完成：Rust fmt/clippy/build/有效单测及真实DB/HTTP；原Native与Rust同义比较全部28操作并回归旧30；原始错误/状态、permission/CSRF/validation、钱/日期/UUID/Unicode、单CAS和weak bulk并发、故障注入下计数器/审计/主状态/快照/附件完整终态；真实Customer→Lead/I情报/Contact/FollowUp/attachment upload→转换→J/K生产链；Linux/Windows Native与Rust四组合UI关键业务路径；OpenAPI/客户端原字节和现有migration/schema、Native保护源复核；受影响lint/构建/测试及docs格式/diff检查。预期检查须记录实际通过、失败、N/A理由或明确阻塞，不用定义/继承预览替代执行。

## 漂移、例外与资源

已识别tool-noise：早期counter列名/HTTP201误期望、capture碰撞、旧RETURNING误判CAS及错误全runtime来源；新版本纠正且不改原件。lone-surrogate数据库替换等是原Native可接受DB行为；不能据此修原合同或正则化业务。其余真实行为漂移阻断G3。

本批C已明确复审既有五机器输入兼容副本E1：5文件419264B、22个直接消费者仍依赖，Root负责，清理期限2026-11-09不延长；下一后续R3 G1或原期限较早者复核，不能继承旧批准。详见originals/c-review/e1-compatibility-rereview01.json。不镜像旧大树，不批量改写历史消费工具。

环境独占poms-r3hijk：PG15 22433、Native12400/Rust12500/WindowsNative12410/UI12600；双库poms_r3hijk_nest/rust。已清理G1自有382行，107seed表原JSON精确、428权限还原，Native已停止、12400释放，自有PG15和private/volume保留供G2；不触旧PG17或旧批private。密钥/原cookies只在本批private，不进入仓库。

## G1 结论

本包提交时为Pending；签署后的当前Gate以独立C原件、线上冻结回执和交付状态为准，不改写本包原字节。只有C对本包、共享语义及原件签署Pass，并将同一freeze发布到#93–96后，Root才启动三线G2。G3及G4须独立审查；最终仅关闭本批四子项，#85/#57始终保留Open。
