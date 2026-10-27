# R2C 组织树与组织命令验收及收口

- 切片：`RUST-R2C` / [#70](https://github.com/illusion-tech/poms/issues/70)；父[R2 #67](https://github.com/illusion-tech/poms/issues/67)，总体[#57](https://github.com/illusion-tech/poms/issues/57)。
- 类型：`cross-layer-high-risk`；独立managed worktree与Linux checkout，solo worktree checkpoint。
- 来源：`705973835d4c823ae8aa3988976e8d6a13b31dfe`；正式输入为[冻结基线](rust-r2c-org-units-baseline.md)、[R2范围](../../rust-r2-scope-and-dependencies.md)与[108操作归属](../../rust-r2-operation-slices.json)。
- 当前Gate：G1 Pass；产品源码独立检查Pass；完整运行矩阵与最终清理已通过，完整非作者G3 Pass，未关闭P1/P2为0；实现已集成推送，集成检查Pass；G4随本归档提交推送和Issue同步生效。
- 主代理负责环境、公共接线、真实验收与治理；A负责契约/HTTP/排序，B负责持久化/事务/PG，C为非产品作者。C编写的并发比较工具另经B独立复核。

## 1. 交付边界

Rust新增八个既有组织操作：树、平铺列表、详情、创建、修改、启用、级联停用与移动，累计22路径、26操作。继续使用原认证、CSRF与`platform:org-units:manage`守卫。没有组织删除API、产品DDL、部署、外部组织同步、用户组织写入、正式写入权转移或性能验收。

原TypeScript单向拥有契约、完整OpenAPI和579个生成客户端编辑权。四类原schema机械执行得到268项oracle，其中265项可表达为HTTP JSON、3项为JavaScript own-undefined边界；新增八操作的10个可达schema以及继承18操作metadata递归校验通过。创建运行201而规范200、未知键剥离与被接受但未采用的expectedVersion等现行行为按原样保留。

flat列表保留PG微秒排序，tree按JS毫秒后zh-CN比较；不为原查询追加排序键。固定ICU4X revision和配对NodeData依赖上，804项语料含802项well-formed字符串，每locale643204对，zh-CN/en-US合计1286408对；另817项上下文小写。该结论限于冻结的Linux Node/ICU/CLDR及有限语料，不代表全Unicode或Windows默认locale一致。两项孤立surrogate不属于PG组织名称可达输入，其比较差异保留。

组织命令保留严格字符串入口与数据库UUID cast入口、请求局部nullable合并、成员逐行计数和原batch弱竞争窗口。业务flush与审计flush为两个独立事务；业务可已提交而审计失败。完整原行为、失败轮次及工具修正见[纠偏记录](rust-r2c-corrective-checkpoint.md)。

## 2. 实际验证

| 检查               | 实际结果及边界                                                                                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rust候选3          | 固定Rust1.99.1；fmt、单独locked/offline check all-targets、clippy all-targets零warning、119普通测试及release通过。默认运行另有39 ignored；其中本片7项PG另显式执行并单列。不可变二进制SHA256为53a52b58884392f223058d9e285e6aae39c6327445c072f7549aa13e688bdeb8。 |
| 本片真实PG         | 7项org service测试全部通过，7个run第二次清理0/0；含真实列表/find/共享生产hydration及stale CAS。nullable覆盖不冒称HTTP两个普通MVCC SELECT间的row-lock barrier。                                                                                                  |
| 原Nest见证         | 69项与补充49项实际observed，完整SQL配对及失败修正原件保留；仅证明原行为，不与Rust差分合并计数。                                                                                                                                                                 |
| 双端HTTP           | final03两端各354项全部observed，独立owner均Pass；完整计划、字段、版本、审计与日期关系严格比较Pass，零缺项。                                                                                                                                                     |
| 受控HTTP并发       | final03两端各6调度、五类row-lock可证明场景全部observed及严格比较Pass；code/name竞争、canonical/alias组织CAS、mixed cascade回滚、late managed session CAS均含锁与SQL时序证据。                                                                                   |
| 原页面             | Windows/Linux × Nest/Rust各3通过，共12，零skip/flaky；桌面与390px真实创建、搜索祖先、编辑、移动、级联停启及同session权限撤销恢复。                                                                                                                              |
| 基础认证           | 四组合各13通过，共52；Windows Rust由Linux独立owner持有，测试后同PID/startTicks、二进制与来源未变，再由owner停止。                                                                                                                                               |
| 原TS与构建         | platform controller/service两suite共79项通过；原Angular main.ts生产target及依赖构建通过，1886份保护源含579client前后未变。                                                                                                                                      |
| 工具与静态         | 最终固定Linux候选173项纯测试通过、零skip，83份来源前后及当前一致、ESLint零warning、浏览器TypeScript通过。Windows额外全套运行167通过/1项locale guard拒绝，保留失败标签，不改变主机locale。                                                                       |
| schema             | 两库实际migration-check均exit1、只读dump exit0，已分类既有差异；107表/1778列/515约束/504索引/92迁移/0用户trigger前后一致且匹配R2B。提议SQL未执行。                                                                                                              |
| 独立审查与最终清理 | 产品静态审查无P1/P2；52个run最终连续两次清理0/0，journal与来源不变。完整非作者G3 Pass，未关闭P1/P2为0。                                                                                                                                                         |

HEAD仍为GET的隐式行为，不增加OpenAPI操作；成功HEAD与本端真实GET校验长度。跨端比较保留解码后完整字段、组织/会话版本、审计数组与层级次序，只在完成日期、身份和请求边界验证后处理跨运行生成值，不把JSON Unicode编码字节表示差异认作业务字段差异。

唯一`regression:current-session`的两处权限数组沿用既有R1C-CP07无序集合规则：先验证完整37项、字符串、无重复以及两处原数组逐项一致，再对比较副本排序。原响应顺序保留，其他响应、组织树与审计数组仍保序。

schema保留低权MikroORM CHECK introspection可见性与既有`lead_score_override.status`注释差异。每库168项提议具有同名现存约束，不表示已逐项证明表达式等价。首次migration启动器超时并未进入实际check；早期Angular启动失败和不完整轮次也保留，最终入口替代未安装升级依赖或覆盖供应链策略。

原页面实际截图仍有Invalid PrimeUI License；旧文本检测未识别该提示，以截图为准。390px表格保持内部横滚，层级与操作实测通过，不宣称全站视觉或响应式修复。原R1/R2A/R2B完整历史矩阵未重跑，不与本轮结果加总。

## 3. 来源、证据与环境

[机器验收记录](../../rust-r2c-validation.json)绑定final03的两端354项HTTP、6调度并发、独立owner与严格比较原件；每端111份运行来源相同，最终交付清单152文件。先前失败owner、0调度并发与诊断结果保留原标签，不参与最终Pass计数。

原Angular产品、完整OpenAPI、579个生成客户端与92份产品migration保持不变。候选3的Rust来源、不可变二进制、工具版本和实际报告均以逐文件哈希绑定；工具修正前后的失败原件独立保留。G1历史Pending矩阵不改写为运行成功。

UI/foundation每次原运行回执绑定16个来源文件，前后及当前LF规范化哈希一致；两个额外传递依赖`org-fixture-spec.cjs`与`fixture-matrices.mjs`只记录当前哈希，未包含于历史运行的16文件回执，不扩称18文件均有运行前后证明。

验证仅使用新`poms_r2c_nest`、`poms_r2c_rust`与低权`poms_r2c_app`，沿用受控PG15 cluster及精确marker。fixture先写持久化intent并adopt UUID，清理锁定owned组织、预检所有外部FK，拒绝未知引用及跨run操作；不reseed或全库清空。PG17只读取服务元数据，未执行SQL、seed、reset、迁移、停止或数据复制；旧环境与数据保留。

最终审计覆盖52个已登记run，每run连续两次cleanup均为0/0，journal目录清单、原字节及所审来源前后不变；Windows与受控Linux网络中5300/5301/5400均无监听。PG17仍为Running/Auto/PID7236，与G0服务元数据相同。

## 4. Gate与后续状态

[独立G3](https://github.com/illusion-tech/poms/issues/70#issuecomment-6447641858) Pass；正式回执SHA256为`53559d8e9527448cc87ac87f6cb2efe2464c35dfdf4e9e77cbd35583f83eda94`。受审机器汇总`53413337ddc792172c5760dbf21e965a0c27a221af060c6d190788f752fd7c68`按原字节保全后仅追加Gate与审查元数据。实现`319d5d89977704b9924fc7a401957d46f5d42668`已快进集成并推送main。[集成后检查](https://github.com/illusion-tech/poms/issues/70#issuecomment-6447740498)实际通过24项适配器与7步来源/排序/OpenAPI校验，152文件与验收版本一致；该检查未重跑数据库或浏览器。G4随本归档提交推送和Issue同步生效，最终归档SHA由#70的G4评论绑定。仅关闭#70，R2A/B/C累计交付19个R2操作，剩余89操作及R2M阶段验收未完成；父#67/#57保持Open，R2D–M为Todo，#61不变。

## 5. G4归档与证据保全

三份生命周期MD迁入本目录，长期[机器验收](../../rust-r2c-validation.json)保留设计根。原冻结G1与受审G3汇总按原字节保全；归档仅调整相对链接和交付状态，不改变产品/工具152来源、实际运行版本或失败分类。108操作JSON的operations、sourceManifest与routeDecisions保留原G0快照；当前交付状态由slices拥有，仅更新R2C。

工作树回收前，Windows原始报告、失败轮次、脚本与截图必须逐文件复制并校验至`E:/projects/poms/tmp/rust-r2c`，回执为`evidence-preservation.json`；排除项仅为可再生`windows-browser-cache`。Linux checkout、受控新旧PG15数据库、private journals与二进制保留原位置。PG17只作服务元数据观察，实例与数据保留。
