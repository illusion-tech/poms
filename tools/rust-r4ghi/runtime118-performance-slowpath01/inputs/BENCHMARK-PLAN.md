# #118 R文件慢路径组件比较（事前边界）

目标输入为现存R420源码、528编译输入、229helper、284执行源码。重建清单仅为离线组件输入副本；420/528清单bytes/SHA已分别精确匹配公开既有描述符，不冒充P中的原Full3文件身份。

读取旧/候选完整模块中的实际函数体，在自有模型中使用严格双向路径桥将唯一Linux R前缀映射到同一Windows R，保留真实lstat/realpath/FD/内容/SHA操作。路径桥不接受M/P、不将副本当准入。候选观测controller只服务该组件模型，不创建Native票据或真正上下文。

比较两个组件：CP的R文件段（旧currentTaxR+treeR，候选加末尾完整treeR复核与SHA封口）；close的R文件段（旧1个currentTaxR+8个treeR，候选1个currentTaxR+3个treeR与SHA封口）。上述次数来自现存调用图，完全不执行close、SQL、HTTP、Auth或新数据库/对象快照。

每个变体预定1个warmup、3个交替串行测量样本，不依据结果追加样本；OS缓存warm/未控制，不清缓存。记录实际内容读取/字节/SHA输入及显式元数据调用/目录枚举，重建与装载不计入组件跨度，仍记录原代码及桥代码哈希。并行审查可能带来宿主噪声，不能用该结果认证完整性能。

未覆盖M、P历史与DBrows、两个ELF、Linux Node、进程/Windows holder、真实Native控制及整个CP/close。历史解析和全close不能合法取得完整现存输入时保持UNKNOWN。不用虚构原件填补。

独立限定设计意见后的02复测：scope只对白名单内的source/compile/helper/execution输入共享静态metadata，名单直接来自同一组已验真实R输入并在模型scope冻结；默认与current角色仍fresh，最后完整SHA/身份/目录封口保持。原01及02未合并metadata的首次结果均保留，不改成通过或删掉退化。模型名单不是实际Native brand清单，不能充当实际准入。
