# Runtime121 单 Native 推广增量 03

本包是 FS metadata / 一次性执行器的作者候选，没有执行推广或真实 mode，没有运行 Native/helper verifier，没有读取 env 或业务 state 内容，没有向 Root/P 写入。增量02、I04及其未获准状态保持原封。

metadata 的实际前置与02相同：af22/ad98是旧 I03/旧 Root8 的历史实际图；当前 Root 的284文件中283项仍逐 raw/长度等于该图，唯一差项是后来 Root 作者已修的 starter `021cb26b…`。I8、H24、RootA7逐 raw不变，helper目录名仍是229。03重新执行10正+5拒例通过，不把这些metadata检查当作I05代码审批。

唯一未来复制是 `business/runtime-admission121.mjs`，当前 `2ebe24bb…` → I05 `57533215…` /93658B，I05 manifest `bc82216b…`、产品 pointer `/production/1`。相对当前文件是MOD，原227→229注册关系仍是ADD(null→new)。Root starter `021c…` /新Root8 `aeb0…` 只验证不复制，真实新step `577ef592…` 已绑定。Native I05新审件、SourceSafety及RootApproval仍为null。预期helper229只改Native hash，external55只改starter hash，284路径不变；所有未来actual图pin仍null。

上述计划生成后，真实 I05 code-step `86b676a2…` 已到，并已只读逐pin/9条目核对。原计划及首个null模板保持原封；另建 `single-native05-input.with-reviewed-native.template.json` 纳入该真实pin，仍保nonce/operator/output三个未来槽null。该审件只为CodeStep，不是本执行器或实际单文件SourceSafety批准。

`authoring-derivation03.json`列从02 assembler到03的14个精确替换及反向逐字相等；首个克隆尝试在任何目录/产品写入前因重复substring计数失败，保留于 `attempt01-bounded-clone-failed.json`，不是产品执行失败。

## 固定单文件执行器候选

`promote-native05-once.mjs` 只有builtin imports。H未运行其main/mode，也没有正向执行Root namespace。未来Root若采用，须先把该候选逐raw复制到固定路径：

`/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime-recovery121/promote-native05-once.mjs`

实际input严格11键，见 `single-native05-input.null.json`。nonce、NativeCodeReview、operator实际pin、outputDirectory仍null，当前模板立即拒绝。没有任意target、root、fallback、ADD或回滚参数。固定output为 `P/runtime121-native05-source-promotion/<new-v4-nonce>`，固定source锁为 `P/runtime121-native05-source-promotion.lock`。

Root后续顺序必须无环：真实新Native code-step → 构造新input并wx/readback → 纯 `rootApprovalBody05(input,inputPin)` 得到12键完整RootApproval预期body并计算其pin → 非作者具体SourceSafety审件绑定input/pin及预期RootApproval pin/实际operator pin → Root按同一原始字节签发RootApproval → 单次CLI。input不反向引用peer/RootApproval，因此没有自引用hash。Root签发或任何execute都不由本候选授权。

SourceSafety机器字段需为：`kind=non-author-runtime121-single-Native-source-safety-review`，`verdict=approved-once-single-Native-FS-promotion`，`reviewerIsAuthor=false`，不同且非空author/reviewer，完整approvedInput、expectedRootApproval、operator及固定limits。可另有说明/证据字段，但不可改变固定limits。旧274f/687b不能审批新字节。

CLI固定为六个flag/value对加显式execute（13个argv），无隐式执行或重试：

```text
node <fixed-Root-operator> --input <absolute> --input-sha <sha> --peer-review <absolute> --peer-review-sha <sha> --root-approval <absolute> --root-approval-sha <sha> --execute
```

main在任何写入前先核Linux/固定Node24.19.0路径及125989464B/bc17原字节、uid1000、真实cwdRoot、空execArgv/NODE_OPTIONS/NODE_PATH，不读取或打印系统PATH。再逐raw核input/两审批/self及候选/原图/四书挡：`continuation-status355.json` /60c462…仅提供四pin元数据，Root真正执行时opaque核state13、state14、state15、ownership15的原bytes/hash，不parse它们。检查13/14/15的driver.lock、API121 process/env、输出目录、source锁、stage路径都用lstat entry（断链也拒），只读/proc/net/tcp{,6}确认31441没有listener，不打开socket。完整code284与helper229成员逐项核验；helper完整名字集合不先过滤isFile，未知symlink.mjs/json也拒；Root starter仅按577e/021c验证。

批准后才创建新source锁/新私有输出目录；保存fresh旧Native原像和intent，候选只在固定目标同目录wx暂存/核SHA。锁内再次完整核source、四书挡、API/env/port及oldNative2ebe后，仅一次MOD rename。后实测完整229/55/284，必须等于03预期，全actual图与complete使用新wx文件/readback；不把预期数组直接称为实测。source锁仅在complete/readback成功后释放。

失败保source锁、stage/原像/intent及partial，不自动回滚、fallback或重发。任何外层/stdio未知即使发生在成功释放锁之后，也因原输出目录和intent存在而禁止重复nonce；需独立读回/新明确处理。partial和stderr只保存固定非密message+受限name/code和实际phase，不输出原断言文本；原input/审批/intent/原像是分开的原始证据。最终G2、API/lease及业务权限均没有从SourceSafety继承。

已实际运行：metadata组装exit0（10正/5拒）；执行器纯签名/审批/环境拒例20/20；相关Node syntax检查exit0。纯测试的input/review是明确nonactual模型，只调用真实导出的pure函数，不运行main、Native、真实namespace、proc、SQLHTTP或进程。未声称原子推广的Root正向验证已经完成；该code候选和每次真实input仍须Root/Final独立审查。
