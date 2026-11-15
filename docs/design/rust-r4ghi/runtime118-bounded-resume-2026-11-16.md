# #118 有界恢复与一次预算探针：2026-11-16

本件接续[原交接](runtime118-resume-handoff-2026-11-16.md)，实际工作树为 R，Root 唯一执行，`/root/runtime118_actual_reviewer` 真实独立验收。有界恢复、不可变 Y 快照、Tax 元数据及具体 Root/peer 均已完成；唯一预算探针因 `close-coverage` 实际退出1，结果 `STOPPED_PRESERVE`。真实独立停止读回、有限保真证据包G3及交付后实际G4均已通过；完整预算观察未通过，预算 G3 阻断、G4不满足，两类gate不得混淆。

## 已完成的真实链

| 原件             |      尺寸 | SHA256 前缀      | 边界                                               |
| ---------------- | --------: | ---------------- | -------------------------------------------------- |
| C10              |     3485B | e1caca7200df690d | 原成功 prepare 的完整恢复完成件                    |
| R8               |     1074B | b58763a3ff269574 | 非作者实际全链/current X/live 验收                 |
| B5               |      945B | 4f57347f990ee351 | 只消费现存 C10 与真实 R8                           |
| S4 schema4       |     3093B | d659643bfe602ae9 | B5 之后的纯数据 handoff；composition 仍为 SC371    |
| Native plan5     |    78746B | 722300ce11b35972 | 原 X/1da、当前进程和完整 284 源码                  |
| Native peer7     |    63871B | 167fd288908ec3cd | 独立重建完整 plan/wrappers/scope/current           |
| Native Root12    |     1729B | 94b8b6981704f351 | 仅本次 FS 发布；API/PG/Tax 效果均 false            |
| 实际 FS complete |     1829B | 5f3b3514ddede499 | 唯一退出0，stderr0，未构造 context 或执行 SQL/HTTP |
| 实际 Y 接受      |     3933B | 51700d24f08f6bbe | 完整 registry/candidate/adoption/Y 原字节重建      |
| 不可变 Y 快照    | 15047609B | 565d2d321f63adc2 | 原字节 wx；不同 inode、uid1000/mode0600/nlink1     |
| 快照接受         |     1853B | c04720a31b89230b | 真实捕获与 canonical/ownership 全部 FD 书挡        |

现存 X 为 15044967B/81680879f4dda35f…，不再以原6c作为 canonical。Native 仅改 `runtimeAdmission121` 与 `runtimeHistory121` 两个 top key，history 3→4 且完整前缀不变；换回两字段逐字还原 X。seq65、14 actors、原 Tax 成功 record、K847、state13/14、ownership13016/1da 的字节和身份均保全。FS 外层实测 417.5257942 秒，只是本次 FS 命令区间，不是 CP 或完整 FI 预算。

Tax 的 `expectedEntryState` 使用已存在并已独审的私有 `runtime118-Native-Y-snapshots/a33cd930-aa4c-4f04-b94f-67ff8eb8a2cc/state-after.json`，不使用 canonical 路径。新 Tax8 carrier 为8473B/851d4e8d758c6778…，真实采用现存完整八叶资格谱系与当前私有 c2db 图、Source c11及80ea，6+2闭包重新计算；未冒称新执行旧normal/FI兼容测试。Tax metadata complete3518B/06d779c2459cae51…及 Tax34 input7632B/b16a851b725b75e3…均由已资格工厂首次真实生成，nonce `a7831b49-b5cf-4943-845b-89289debc4c7`；未调用 context/Auth/prepare/SQLHTTP。原 prepare、Source、API 和 rebind 均未重跑；Source 的 `--prepare-handoff` 只生成数据。

真实 exact-budget peer2347B/323f11af19b49fea…独立重建 Tax34、runtime 外层6/current17、完整37权限、request/complete及 Root9 既存预期字节；私有值仅内存比较，current/source/live/FD/锁书挡通过。Root 随后实际签 Root9 1136B/507654ba27073235…，原字节精确等于已审预期，mode仅 `budget-probe`，FI/normal为false。Root 才启动这份输入和 nonce 的唯一实际预算命令。

## 唯一预算探针的实际停止结果

原外层命令于2026-11-15 19:16:20.456—20:05:36.700 UTC（东京2026-11-16 04:16:20.456—05:05:36.700）实际执行，退出1/signal null/stderr189B，natural EOF=true；外层单调计时2956.2438991秒。没有重试、追加登录、补 close 或清理。

样本15656B/65ff7ff50c4d665f…记录 Auth3数量3、actorBefore/After均VERIFIED，完整 baseCP 返回，实际区间113436174201ns，即113.436174201秒，start/end差值重算一致。唯一 close 返回且 Native 验证通过，区间629800944921ns，即629.800944921秒；exit guard6213B/fb76a3067a7741fa…与closed journal13224B/bead6ccf36e14cca…真实存在。

收尾覆盖按最后 actor SQL前anchor至 close 返回的实际区间向上取整629881ms，idle charged remaining=-81965ms，absolute charged remaining=27448673ms。两者必须严格大于2000ms的谓词未满足，故 report4307B/2107ba6865d48a14…真实记 `sessionCoverage=UNKNOWN`、`probeOutcome=STOPPED_PRESERVE`、`failure.phase=close-coverage`、checkpointReturned=true、writeFailures=[]。partial2738B/f4db056703b77785…保留；没有外层complete。close本身通过，整体 idle 覆盖未通过，两项事实分别保留。

直接记录的 CP 样本数为1，完整观察通过数为0；完整67 FI/至少618 checkpoint及DDL、注入、回滚、等待、coflush、完整capture/final67等未覆盖成本仍为UNKNOWN。113.436秒单CP不能证明全批预算，也不能忽略629.801秒收尾。原 report/sample/partial 和 HTTP/SQL/capture 原件留在私有 P；公有报告只保控制描述符、计时、计数、哈希和布尔，凭据、Env及DBrows不公开。

[真实独立停止读回](../../../tools/rust-r4ghi/runtime118-resume-actual01/budget-stopped-review.json)4320B/84a91a533ab0e6ab…和[完整控制证据](../../../tools/rust-r4ghi/runtime118-resume-actual01/budget-stopped-evidence.json)25237B/434bc7ae47760c09…核实三次200、6份Auth完整双139捕获与2份既存postRO、全部raw/xmin/meta/sequence/object、单CP、actor SQL前monotonic+ceil和strict point守卫、唯一close及外层失败归因。内层journal为closed-verified/exit failed=false，外层coverage失败，两种原标签分别保留。

仅新owned auth_session birth1/update1，精确四列及已钉Rust语义/IP检查通过；oldOwned0变化、borrowed不变。状态只变manager.cookies、sequence65→78、新nonce journal和Auth配置证据，旧Tax成功record/K/history/13/14及旧失败保全；ownership完整1da前缀后只追加两条精确Auth证明。当前canonical为post-probe15065879B/cddedbd760cb2a2f…，ownership14912B/8211dee8cf3fc171…；Y只保留为不可变entry原件，不能再当当前或还原它。无driver锁、lock-cleanup-failure或外层complete，partial保留。独审未运行SQL/HTTP/快照/效果；只认证现存捕获点，不认证连续数据库或会话活性。

## 失败与证据限制

C10 独审01漏两条真实 ELF 只读路径；Native peer 独审01漏一条原 H121 独审原件路径。两次均为审计适配路径遗漏，原失败和捕获保留，没有效果尝试或产品失败结论。Root 收到精确诊断后，只批准一次精确修订的只读02，完整 diff/原因及最终真实审件保留。普通证据单链接规则未放宽，也未以 public 副本替代原消费 Full3 身份。

Root 数据助手首次组装 Tax options 时，误把真实 `FS complete.input` 的 Full2 按 Full3 读取，真实退出1，停在读阶段，尚无 Tax nonce、Tax34、Tax 工厂调用或私有输出。原助手、请求与1257B/8745aacc… stderr 完整保留。`root02` 只将这一处改为实测现存 plan、比较原 Full2 的 path/SHA，再强读实测 Full3；其他字节不变，未放宽生产合同。具体诊断后的纯数据02退出0，随后才首次调用已资格 Tax 元数据工厂。这是已纠正的 Root 辅助实现错误，不是预算重试或 Tax/Native 产品失败。

正式 stopped-readback 审计01误设 Auth session仅允许两列更新而退出1。真实唯一变更行的四列为 `idle_expires_at/last_seen_at/row_version/updated_at`，与已钉 Rust `auth/store.rs`22695B/14ba9d8e…的223–227行及service21730B/3f216c2b…调用语义相符；它们fresh绑定同420源码、528编译输入与API record2/ELF。只读诊断已逐项核版本恰增1、updated_at等于last_seen_at、idle为now+900s与absolute的min、throttle≥60s、active/期限和actualIP关系及余列不变。Root仅批准将该单一错误断言替换为精确四列加这些Rust谓词的一次只读02，其他完整守恒断言不变，01/诊断/diff全部保留，不修改Rust应用、实际行、生产合同或probe停止标签。

原 holder 捕获 `naturalEOF=false`、精确 wrapper 退出时刻 UNKNOWN 保持；本轮新命令的真实自然 EOF 单独记录。数据库守恒消费既有完整 baseline/pre/post 原件，没有重采样，不主张跨库原子性。rename 的因果证据来自已资格 producer、真实执行捕获与最终字节/身份；没有伪造 syscall trace。

## 授权与交付边界

本轮只允许一份具体预算输入后的 Auth3、完整 base CP、唯一 close 和 outer report。完整67 FI/618成本、正常 Tax201、Main、完整业务收口不在授权内。任何未覆盖成本保持 UNKNOWN，不延长 TTL，不追加登录或自动重登录、重启、清理、回滚或盲重试。

Rust正式240、R4交付67/95、本批32candidate、业务新增认证0、业务 G3/G4 未签保持。#118/#57/#114/#120/完整R5 #116 保持开放；#119/#121 历史技术 G4/CLOSED 保持。原私有输入、原件、失败、捕获和运行资源继续由 Root 在父 #114 下保管。未运行 pnpm，未触碰 I 的其他脏改动，未 merge、入队或部署。

## 校验与 Gate

本次交付类型为 runtime E2E/过程与证据，不修改应用、公共 route、DTO、DDL、迁移或生成客户端。原80ea明确这些应用 lint/build/OpenAPI/migration 不适用；没有重跑无关测试，也不冒称原代码模型资格为新实际运行。文档采用缓存 Deno，最终精确 staged whitespace 与公有保真包校验在落盘后执行。

Root 当前判断为预算 `G3 = Block`、`G4 = Not satisfied`，原因是既定 through-close 谓词未满足；生产合同、TTL及严格守卫保持。一次有界执行取得了真实负面成本证据，不把 `STOPPED_PRESERVE` 改成预算通过。完成恢复、正面样本事实和失败预算结论分别由真实独立审件约束。后续预算方案或再次实际效果不在本轮授权内；不为完成 gate 而自动重试。

有限停止尝试的[evidence-only实际G3](../../../tools/rust-r4ghi/runtime118-resume-G3-actual01/review-actual-limited-stopped-package-G3.json)2956B/f27e1947ffe4e775…与[实际审计证据](../../../tools/rust-r4ghi/runtime118-resume-G3-actual01/evidence-actual-limited-stopped-package-G3.json)33774B/699e3ae702b64df9…已通过。它只批准已认证54个Added文件的证据提交：41对原件/不同物理副本、原消费身份、全部indexed bytes、隐私边界、冻结报告、原失败和STOPPED标签及必要当前书挡都经两侧真实复核；独立whitespace与三MD的缓存Deno均0。预算ObservationComplete/G3/G4仍未满足，118/57不可Done。

精确54文件已提交并发布为 `2d893c4c25c12ddcba00ede0515fc389e1a06181`，7项治理更新为 `eb154d57adca51175f6ab67f8869f25d6462e482`，两者remote readback exact/nonforce。GitHub[#118](https://github.com/illusion-tech/poms/issues/118#issuecomment-6901372407)与[#57](https://github.com/illusion-tech/poms/issues/57#issuecomment-6901374500)正文/评论均精确读回、保持Open；[本地G3镜像](runtime118-bounded-resume-online-g3.json)保留原时点。

仅限停止尝试证据交付的[实际G4审件](../../../tools/rust-r4ghi/runtime118-resume-G4-actual01/review-actual-limited-stopped-delivery-G4.json)5400B/90584d929610efb0…与[先存真实证据](../../../tools/rust-r4ghi/runtime118-resume-G4-actual01/evidence-actual-limited-stopped-delivery-G4.json)18446B/94b535658b131ce8…已通过，覆盖两实际已发布commit、线上/本地镜像、原身份/失败保真、必要current/live与Root→114保管。Windows审计0；Linux01取错review层级的entryGuard，TypeError原件保留，经Root精确授权仅改为实存sample.entryGuard的一次只读02后0，原断言和预算结论保持。证书不预签其自身未来提交或随后Issue标记；后续仅保真发布签件、同步标记和只读核验，不增加runtime授权。[有限交付生命周期归档](../archive/slices/rust-r4ghi-runtime118-bounded-attempt-20261116/delivery-G4.md)记录相同边界。
