# #118 性能候选02纠正输入

用户已指示开始非作者审查、慢路径组件基准及必要修复。本纠正只准隔离候选02和离线资格，不准安装或任何真实SQL/HTTP/Auth/新快照/探针。原01提交72275c80、完整285图、失败及原284执行文件保持。

独立审查者 `/root/performance118_independent_review01` 对01真实自有I/O/完整模块控制流模型已复现：观测收尾错误替换主失败/已成功返回facts；读中增长超过初始尺寸才在事后SHA失败；Root真实R组件还发现目录Dirents→names模式切换被缓存断言拒绝。01因此不能安装，正向组件基准失败不改作成功。

02范围限定于内部观测模块、Native内部静态清单/当前脚本角色、wire诊断时钟及对应资格测试；其余01模块按原字节继承，完整图仍实际枚举。代码输出为 `tools/rust-r4ghi/runtime118-performance-candidate02`；自有模型/输入和运行原件在R/tmp本轮专属目录。不得改01、原284、P、I；不运行pnpm，不启动Debian，不清理/重启或盲重试。

冻结修复：

1. 计量begin/end、时钟/RSS采样故障只使profile失去健康性，不替换body原异常、成功结果或close facts。主流程仍执行一次，不补close。profile改为schema2，显式metricsHealthy及固定种类的失败计数；未知区间为null，不伪造0。phase契约错误仍可拒绝，原预算守卫和单调计费不改。

   wire的新增诊断时钟必须同样故障隔离，尤其catch中的时钟不能替换transport主失败。只有budget分支采样，普通六模式不增添诊断时钟；最终SQL单调锚/期限扣时仍用原强时钟，不转为可选采样。post-ACK记录跨度仍保留真实ticket校验，不吞掉资格/身份错误。
2. snapshot对直接子跨度单遍累计，保持parent/self归属；缺失或重叠跨度标未知/不健康，避免原逐行filter的平方复杂度。
3. 三个内容路径（首次收集、末尾SHA封口、未缓存Buffer读取）统一按初始尺寸逐块限制；至多多读1字节探EOF，增长立即停止。声明bytes与初始stat不符时读前拒绝。单原件最大512MiB，返回Buffer最大64MiB，缓存按原字节计费合计64MiB，超限停止保留，不自行提高阈值；已知390MB ELF仍可流式校验。真实私有输入全体尚未核完，若超限需新精确审查，不能声称本上限已覆盖它们。
4. 目录统一采集冻结typed条目，按请求派生names或Dirents，完整SHA/目录书挡及原角色谓词保持。枚举按条目数/名字节限额逐项读取，不用完整readdir数组先无限分配；同scope目录条目与文件/目录依赖合计最多20000，缓存目录名与内容/解析合计计费64MiB。封口仍重新完整枚举。
5. 保留14个checkpoint、6份双139快照、full37/I900/A28800/T60/SQL锚/ceil/严格>2秒、当前身份复核、scope不跨await/persist和最终Native fresh。只复用已验JSON解析，不启用未闭合历史依赖的跨边界纯结论缓存。

6. 根据独立[限定设计意见](E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime118-performance-review01/static-metadata-design-opinion02.md)，只允许真实Native ticket下由brand.facts生成并冻结的source/compile/helper/execution精确路径+SHA名单，在同一个scope中共享首次已验静态metadata。每次仍验证descriptor/新增角色谓词，封口仍逐原件完整lstat/realpath/FD/SHA及所有角色；不声称与旧逐调用时间点等价或连续性。未知默认fresh，目录metadata仍fresh；driver.lock/current state/ownership/可变对象/proc/socket/current executable/Windows系统角色不启用该静态优化。singleLink:false或明确freshIdentity角色优先于名单，当前holder脚本显式走freshIdentity，保留现时路径/FD书挡。不得跨await/persist/代码装载/业务效果。该意见是设计条件，不是02代码READY。

独立缓存压力组件另测得01在1036B JSON/64B缓存/4消费者下读6次，超过参考4次；02应让首个内容消费者在同一次有界读取中得到临时内容，避免先验一次再额外获取一次。缓存不能容纳时仍不超限保留，末尾完整SHA封口不减；因此不承诺此类压力组件优于参考读取量。

必要验收为独立01原反例在02重测、同大小篡改、目录names/Dirents双向互访与变更、读中增长三路径及资源上限、主失败/成功facts在观测故障下保全、完整Native控制流模型、线性snapshot归属及原61项。模型不能冒真实准入，Linux/私有完整历史与真实四阶段/整体预算继续UNKNOWN，直到实际证据满足。

慢路径组件使用现存R420源码/528编译输入/229helper/284图。重建的两清单分别68385B/4f20c984…和83968B/3197f243…，与既有描述符精确匹配，但不是原P文件Full3身份。只测R文件段，不能把Windows模型耗时换算为完整113秒CP或630秒close。

Root负责修复，非作者负责独立结论。作者不自签独审READY；#118/#57保持开放，旧STOPPED_PRESERVE及全部UNKNOWN不变。
