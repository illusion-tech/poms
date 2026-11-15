# #118 新会话接续说明（2026-11-16）

这是用户要求的新会话交接。**旧会话已停止推进，当前没有效果或数据生成命令运行。保留现有 holder、PG、API，不 kill、restart、清理或重跑。旧 worker 的自动执行授权已暂停。** 新会话先只读复核事实，再按用户的继续指令接续。

## 目标和范围

继续 POMS `illusion-tech/poms` 的 #118 有界预算探测：采用已成功的 prepare，完成真实恢复、Source9+2、API、前后完整只读守恒、单字段重绑定、C/R/B/S4、Native FS、Tax 元数据和一次 `budget-probe`，最后完成本范围独立实际 G3/G4及证据/Issue同步。

完整 FI/全67 FI、另一次正常 Tax201、Main 重放、完整业务验收不在本轮授权内。预算探针的一个 base CP 不能证明全部 FI 成本。#118、#57、完整 R5 #116保持开放；#119/#121历史技术 G4保持完成，不能因这次恢复重开或冒作持续活性证明。Rust正式240、R4交付67/95、本批32candidate、业务新增认证0，业务G3/G4尚未签。

用户原则：Rust以业务语义、正确性和合理性为准，不追求与Node后端bug级对齐；真正无法判断的业务歧义才请用户拍板。本次剩余步骤没有待用户裁决的业务问题。

## 工作区及运行约束

- **R：实际执行和交付工作树** `E:/projects/worktrees/poms-r3hijk-next28/poms`。
- **R Linux路径** `/mnt/e/projects/worktrees/poms-r3hijk-next28/poms`。
- **I仓库：实现/独审产物** `E:/projects/worktrees/poms-r4i-lifecycle/poms`。
- 下文 **I** 指 `E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation`，Linux前缀相应为 `/mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation`。
- **P** `/home/wangzishi/.local/share/poms-r4ghi/private`；**D** `P/business/g2-business15/main01`。
- **M** `/home/wangzishi/projects/poms-rust-r4ghi`。
- R分支 `codex/poms-r4ghi-next25`；R HEAD和远端已核均为 `e95aff6708fb5f4151ebf91716a39700841511ad`。
- R已跟踪文件干净；许多本轮和历史未跟踪产物须保留，不要bulk add/clean/reset。
- I HEAD `9e010077e3010ff09447e9d77cb1bf1f7adbf68d`；I的 `apps/poms-api-rust/src/contract_support/mod.rs` 是其他脏改动，**不可触碰或夹带提交**。
- 使用现有工作树，不新建；不merge、入队、部署、关闭父Issue。
- **绝不调用pnpm，连版本查询也不要。** Markdown检查用缓存Deno：`E:/.cargo/bin/deno.exe run --cached-only --allow-read tools/format-md-tables.ts --check <files>`。
- 先读R/I中的POMS implementation/github governance及conventional commits技能；Windows命令遵守PowerShell安全调用。
- Root签新批准，独立审查者真实签peer/R8，执行者不可自签独审。所有效果串行、每个exact nonce只执行一次；UNKNOWN保留进程/锁/partial，不自动kill/restart/restore/retry。

固定Windows Node：`C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe`，92825416B，SHA256 `3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237`。

实际Linux模块只用 `/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node`，125989464B，SHA256 `bc17c508ffeed0ec622934f9b7fa72f8e78da65350e63c3eceb56fa688aa5e12`，cwd必须R，`execArgv=[]`。实际模块不加`-e`或其他exec flags。通过WSL使用：

```text
wsl.exe -d Debian --cd /mnt/e/projects/worktrees/poms-r3hijk-next28/poms
  --exec /usr/bin/env -i
  HOME=/home/wangzishi USER=wangzishi LOGNAME=wangzishi
  PATH=/usr/bin:/bin LANG=C.UTF-8 LC_ALL=C.UTF-8
  <fixed-Linux-Node> <qualified-module> <exact-flags>
```

## 当前停止点：C10已生成，R8尚未开始

**已经实际完成并独立通过**：holder恢复、原PG/卷/readiness、源码前完整RO、Source9+2、API启动、源码后完整RO、仅`apiProcess`重绑定得到X。

**已经实际生成但尚未独立接受**：C10。

**尚未生成或执行**：R8/evidence/partial、B7/B5、S4、Native新发布/Y、Tax本轮元数据、ctx/Auth/baseCP/budget-probe、后半段独立G3/G4。

预算reviewer最后明确：本次R8只浏览了既有控制metadata，**尚无审计进程、session、worker、R8目录、R8原件、evidence或partial；尚未做C10全链/currentX/live独立验收。不能把C10生成0当R8通过。**

现在canonical是 **X，不再是原6c**。现存X已独立验收；切勿把canonical恢复为6c，也不能再次执行已完成rebind。

## 已完成的真实链（路径相对P；SHA均为完整SHA256）

1. Holder E9：`P/runtime118-reentry/holder-start/fef1a0e4-c9c1-4956-a1e0-2797f27ec796/complete.json`，3086B，`fe408fbaeb40c7c47ffc075aa615e5c285e885f71e15dc90e8dcfe2d949602ae`。
2. PG E9：`P/runtime118-reentry/pg-current/51478e58-8d98-4263-952c-e26321e17636/complete.json`，3055B，`065f00027a635f427a7738c502de41ebe1871e60924a77c3b116d191a27a258c`。
3. preRO E9：`P/runtime118-reentry/ro-before/45fac619-136f-4829-b685-c2834dbf2a4b/complete.json`，2758B，`5d49a562ec02feff63a28a91c024b04d2b0f4ecca448c538c21501ae350e2bc1`。
4. Source SC18：`P/runtime118-source-promotion/4acc3fec-a965-4d19-ba89-e4266b70f17a/complete.json`，8491B，`37171dee1176336b372040ec308d76a4f83ce45fc60842d0b2bfab2792eab06c`。
5. API E9：`P/rust-api-reentry/99d82601-d21d-4519-888b-0096932b0ad3/complete.json`，2720B，`c9a62e98c89f854f38843eb6582c7a6f0b249835214c6fafa1a00f0155320b80`。
6. postRO E9：`P/runtime118-reentry/ro-after/be896e61-c02f-4ce1-98f7-004c31bef138/complete.json`，2748B，`448f3e0bb46986270b2558817d3c06a0142c1bbbb84e4e741e6ac6df754bb1c3`。
7. rebind E9：`P/runtime118-reentry/api-rebind/b9765c7b-af25-4f20-aaba-91f2f43ecfb5/complete.json`，2469B，`cd2c73dbe3fe47fd083525edcfece5000a8b57416c1b32760ffa3700e5df7d93`。
8. 不可变X：同rebind目录 `after-state.json`，15044967B，`81680879f4dda35f83e04d9069de1385bf157544be21fb804921d41ad4ed7248`。当前`D/state.json`精确等于该文件。
9. C10：`P/runtime118-reentry-data/complete/5cf2331e-8a8c-4e56-873c-f105845e4bcc/recovery-complete.json`，3485B，`e1caca7200df690d71ec560f98db6c37b2e645dab27636ec4713ca98b7f8bd81`。

Source实际三图同SC目录：

- `actual-helper-pins229.json`，35523B，`fcad054c469e14e4518efc9423ef5b1f20e3c52aee2f3ec140fb4ad66d602834`。
- `actual-external-pins55.json`，8818B，`ce23854096c88025e6b28a07eea64a11dd73df8caad21ba8f28cbcaf2357127b`。
- `actual-execution-sources284.json`，60810B，`c2db02ecad79af973518e5e944e842d32e028bed395a3df4a5eea7480aa7478a`。
- `prepare-origin121.json`，1288B，`0de23e22485fe6646cc2c84fb72e968137bcd5f3851cb814580870f1d43aee77`。
- W4保历史文件名`source-witness13.json`，3371B，`e3ec73be82b57d2b385d721279be154912e768ba41973a23a187fb947b2d5d0d`。

## 独立实际验收原件（I目录，不能用public副本静默替代原Full3身份）

- holder：`runtime118-holder-actual-readback02/review-actual-holder02.json`，13962B，`ee26bb5be7df123d7f590fac3e3e5ba621ac63ef6f05c97b184fd174617393fa`。
- PG：`runtime118-pg-actual-readback01/review-actual-PG01.json`，21316B，`efe81999336291f674d065d2ab4874ee77a2cf38869cc539065724c5d8cc3fa7`。
- preRO：`runtime118-ro-before-actual-readback01/review-actual-RO-before01.json`，19806B，`9777e81bec9430b5e3fdf0d4b45c226f7967cdbf7fb1bb61fa96222356e6292d`。
- Source可消费闭8：`runtime118-source-readback-actual01/review-actual-source-readback01.json`，1047B，`c11c5f3ebbbde981f66094451f50f89dd6b4ed79b72619d5f717052ec7dda73e`。
- Source完整真实Linux消费者：同目录`runtime-sourceHistory-profile-linux03.json`，2606B，`7376dd4d8aa7b5e7085bfbed5b42aab7b1ed30b73565cfcdd9879de6b7fa695d`。完整B377仅增加private export，6524读取/1618文件，284接纳，effects=[]，error=null。
- API：`runtime118-api-actual-readback01/review-actual-API01.json`，14539B，`030b0a11dacb4dc7f5cbcb0cc1f1a43fa2989a5c68de5d7f2588bbdb4de37866`。
- postRO：`runtime118-ro-after-actual-readback01/review-actual-RO-after01.json`，25182B，`a3aaf88a41645f72fad82af194ff31de09333c3b9208b115e3f30e96bcb7fcba`。
- X/rebind：`runtime118-rebind-actual-readback01/review-actual-api-rebind01.json`，10644B，`b685e75835eb791b982f8cf319d8666f212a578183582105840c681fbfcd2cf4`。

postRO实核两个post及两个pre对同一原baseline、locator精确复用、完整raw/xmin/meta/sequence/object均守恒；不能把比较对数当物理表数，也不能宣称跨库原子性。X仅改`apiProcess`，该值是**闭3 `{file,rawBytesSha256,record}`，无bytes**；record来自实际API record2。换回旧字段后逐字还原原6c全部字节；ownership内容及身份、K、state13/14未变。

## 恢复时先只读核验的活性（以下仅为最后验收时点，不保证新会话仍活）

- boot：`f9827a31-8128-425d-ac3e-a24d9dec3ed3`。
- Linux holder PID322/startTime561；Windows WSL PID28132/creationTime `2026-11-14T15:30:17.2546580Z`。
- PG PID954；API PID59619/startTime1558825/socket inode160460。
- 原完整container CID `513925616f4e1c1c988753e385be7f441dc98f6fb490101537498f60e8d5e00f`；image `b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a`；volume `poms-r4ghi-pg15-data`；DB `poms_r4ghi_native`/`poms_r4ghi_rust`，OID16385/16387。

若活性不符，保留原件和真实UNKNOWN，不能重启服务凑旧PID或重跑已完成nonce；须依据现状形成下一具体有界恢复处理。

## 第一件未完成工作：真实独立R8

对现存C10及当前X做真正独立全链/当前绑定验收，核同一个Q9b、holder/PG/preRO/Source/API/postRO/rebind/X/1da/K及现存捕获。不要重跑效果、SQL、HTTP、快照；凭据/Env/DBrows只在必要私有内存校验，不输出到公有报告。审查者必须不是Root执行者或代码作者。

通过后真实写R8闭8：

```text
kind/schemaVersion/recoveryG1/complete/reviewer/reviewerIsExecutor/verdict/evidence
kind = non-author-runtime118-actual-reentry-readback
schemaVersion = 1
complete = 上述现存C10完整Full3
reviewerIsExecutor = false
verdict = approved-actual-source-bound-reentry
evidence = 先已存在的真实独立审计原件Full3
```

**R8现在不存在。** 不能拿C10生成结果、Source读回、执行副手自签或旧R8替代。

## R8以后的有界顺序

1. 真实C10+R8 → B7数据输入 → 已资格runtime `--prepare-data`生成B5。
2. 实际B5 → Source `--prepare-handoff`纯数据生成S4 schema4。不得在Source交付时预造S4，也不得Native FS后倒做S4。
3. S4成立后，Native data options闭5：`apiComplete/compositionComplete/nonce/outputDirectory/successor`；`compositionComplete`仍是真SC371，不是C10。生成plan5后，具体Root批准与独立peer闭合才执行Native FS；X→Y只改lease/history两个top key。
4. Native实际发布与Y独审成立后，按原字节wx保留新的私有不可变Y snapshot。Tax的`expectedEntryState`必须该已存在snapshot，不能canonical路径。不能提前造Y或重放prepare。
5. 按已装Tax metadata数据工厂真实闭6 options及Tax34/Root9合同组输入；entry固定Y。具体Root批准和独立peer后执行一次预算模式的Auth3、完整base CP、close和外层报告。
6. 独立实际验收、记录覆盖/未覆盖成本，完成本步G3/G4及GitHub/本地镜像。一个样本不覆盖全67FI/618完整成本，未覆盖保持UNKNOWN。

各新Root批准须针对已存在可审输入，不自签独审、不造未来API/X/C/R/B/S4/Y/probe pin。C→R→B单向无环；原prepare/原K/旧失败Main201等永不重放或改写。

## 现有数据辅助脚本（不是production工具，不授效果）

- `I/runtime118-execution-orchestration01/prepare-post-api-inputs-data-only01.mjs`，9757B，`50db7e50652a27929a6562d6f9899063b1005282a84936f65e71fbf925f4b1db`。已由主Root读过；模式有`complete-input`、`bundle-input`、`source-handoff-input`，只读既有Full3，wx本副手专属R/tmp输入，不签Root/peer。C9已实际使用。
- `I/runtime118-execution-orchestration01/snapshot-actual-Native-Y-data-only01.mjs`，5825B，`13735e7d7383c18368304c6c94e0914652d8e3d730cfa64b1a29cf926b4b04b0`。仅语法过、未运行，必须实际Y独审后再审读调用；不写canonical/ownership。
- `I/runtime118-post-api-field-contract01/post-api-sequence-fields01.json`，6724B，`3a15b7c919eb39095e8b653c4c4084f7bb15ec82ad90ef7629b6867cc8b9f2e0`。
- 副手旧交接 `I/runtime118-execution-orchestration01/EXECUTION-HANDOFF-C10-02.md`，5442B，`c35b25efeae9bfbd2243748685ad79051ed8084ecf46bb438af40c9eca3b8172`。其自动后续计划已被本次用户停止指令覆盖。

Root实际runtime CLI：

```text
--input FILE --input-sha SHA --root-review FILE --root-review-sha SHA
--peer-review FILE --peer-review-sha SHA --execute
```

pure data：`--prepare-data --input FILE --input-sha SHA`。

Source pure handoff：`--prepare-handoff --input FILE --input-sha SHA`。Source效果CLI另有大小写和顺序：先`--peer-review`，后大写`--Root-review`；本次Source已完成，**不要再跑**。

## 不可变基线与资格

- 冻结G1：`R/tools/rust-r4ghi/budget-probe118-g1-v3/Root-G1-budget-probe118-v3.json`，32283B，`80ea3db59386f935b733e5e29b7b8a4db860c408ccb84f9204b9b5adebac00a1`。
- 图身份/RO纠正：`R/tools/rust-r4ghi/runtime118-graph-RO-corrective01/Root-G3-corrective-runtime118-01.json`，7322B，`56b922e657b4db4b8429aff638fe0f80a8dfa808cf53cb42a4211ccb59aed806`。
- 数据装配纠正：`R/tools/rust-r4ghi/runtime118-data-assembly-corrective01/Root-G3-data-entry-assembly118-01.json`，5660B，`e9009555328ab8377b333751dc403403179c4e0886e1f84e5fb498d1bd3991dc`。
- 当前实际runtime：`R/tools/rust-r4ghi/runtime-recovery121/budget118/reenter-budget118-runtime.mjs`，133531B，`b37708b88543cc4e6f25b9face76887fe5fc1b039f126ff44ba85f0f291dd8d2`。
- 当前Root Source工具：同目录`promote-budget118-source-once.mjs`，42757B，`dd4944818a3876a970cba88703893c01a7313556e905b381a691d3a07d8ee0d3`。
- **唯一稳定Runtime Q11**：`R/tools/rust-r4ghi/runtime118-installed-code-carriers02/runtime-Q11.json`，2953B，`9b631d83d818d2e91b3c63092a2db287c8ed3204c1394f8fe555c3a1a7890235`，所有E9/C/B贯穿同一Q。
- 当前正确Source SQ12：`I/runtime118-source-named-reviewer-adoption03/source-SQ12-named-reviewer03.json`，3349B，`e16225b9e58fe8c82df34c7c072e4587b5aec1156eafba5d64565abf0e710497`。G1要求named reviewer，不能换名伪签。旧SQ02(ac6)因填错reviewer保NOTREADY，不使用。
- 完整候选c56e：`R/tools/rust-r4ghi/runtime118-v3-code-candidate03/combined-manifest.json`，35774B，`c56e0fcb31a19c99deeeafdcdd901b557b8b943d29e571d25bbdfd19d1335b69`。9+2+3资格已通过，实际Source11已交付并提交。
- 原成功prepare birth：`P/runtime121-prepare362-completed01/6458f733-0fe1-4b5e-b2ff-076908543af3/state-after.json`，15045544B，`6c1fabbacebc43fea8636c8fd91afac81dd66e8b6200ca5a769c08ae41401b3b`。
- 原ownership同目录`ownership-after.jsonl`，13016B，`1da85861708f1d1c37389385f6c86741e46a7053d5c0eb034260ff8c01aba517`；D当前ownership仍同字节且身份不变。
- 原K：`D/000065-tax121-prepare-continuation.json`，367950B，`847fe81ffbc4cf4f73b369ac1466e3185e051a6d0d87ca429b444111767115e7`。
- 原P3：`P/runtime121-native-plan-data/2ba18403-1739-4274-8c3e-5e444f2aa6cf/native-plan121.json`，78405B，`f3e56838c28e7006311b6f292b882d8785cb49fd764d4370e60cfa36d9995fef`。原private graph60810/b8fd与public mirror同bytes但不同file身份，不能samePin/alias。

## 已解决问题和必须保留的真实标签

当前真实`C:/Windows/System32/wsl.exe`为212992B、nlink2、SHA `7492f024a0ef1f77d77a930e1681692501422e96a6df99f503b8a71881c8309c`，Microsoft签名Valid。旧冻结97b被启动前拦截；已独审仅三处64字面修订（Native/runtime/PS），其他字节不变。nlink2只限该精确系统角色，其余证据/candidate单链接规则未放宽。

holder外层记录器因继承pipe等不到自然EOF。已真实取得wrapper child exit0/null、完整单一590B成功JSON/stderr0，经独立审查后只关闭本进程两个捕获读端，让原close handler封raw；WSL未重启/杀停。**naturalEOF=false，actual process exit time=UNKNOWN，CMD15 endedAt仅实际close/封口时间，不能据此认证精确退出耗时或后代全部输出。** 临时Inspector已关闭。证据在`R/tools/rust-r4ghi/runtime118-early-actual01`。

Source审计的P2/P3假设错误、Win UNC基础设施失败、Linux02漏放行boot/podman只读路径均按原标签保留，非Source产品失败。最终完整实际Linux消费者已通过，不再重跑旧失败、prepare或Source。

## Git/Issue及未提交数据

已发布提交链包括代码资格/初段恢复/治理镜像和实际Source11，最新e95。当前GitHub #118/#57仍OPEN；最后同步comment为 #118 `6882586812`、#57 `6882588327`，其正文是早期实际恢复通过/Source执行中时点，**后续Source通过、API/postRO/X/C10尚需接续同步维护**。

以下本轮产物未全部提交，须先只读盘点并保留：R中的API数据准备/Root批准、postRO/rebind批准，以及I中的API/postRO/rebind独审、执行编排helper和捕获。不能仅因`git status`不显示tmp就清除。

- R实际未签提议/输入/capture：`R/tmp/rust-r4ghi/root/runtime118-post-api-data-prep01`、`runtime118-delegated-commands01`、`runtime118-api-data-prep`等。
- 副手原始stdout/stderr：`C:/Users/ynh2/.codex/tmp/runtime118-finish`，私人保留，不把可能含私有值的原始捕获公开。
- Root批准rebind：`R/tools/rust-r4ghi/runtime118-rebind-G2-01/Root-approved-api-rebind118.json`，1611B，`72c499cf5df44ada394ae0f3f0e7c94637cf76613f40a7cf4384d23ff54502f5`。
- 真实rebind peer：`I/runtime118-rebind-peer-actual01/peer-api-rebind118-actual01.json`，1932B，`a7c78e64061268850cc7e55ea65ae31f86d8452b5078c3df9443f789f5167567`。
- C9数据输入：`R/tmp/rust-r4ghi/root/runtime118-post-api-data-prep01/5cf2331e-8a8c-4e56-873c-f105845e4bcc/input.json`，3170B，`d77816f2fc8a798edd26ed6dade709c7e45200f9d52fb5949589b3358f7fd727`。
- 完整滚动历史：`R/tmp/rust-r4ghi/root/HANDOFF121.md`，很长；以本文件与实际新原件优先，旧as-of不可当当前状态。

普通Git HTTPS push多次408，已通过GitHub Git object API保持原commit SHA、nonforce及exact remote readback发布；Node HTTPS单连接、TLS最大send fragment1024后传输成功。大tree用精确`base_tree`+变更项避免422。凭据仅`gh auth token`捕获在进程内存，绝不打印/落盘。现有帮助脚本在R/tmp；`prepare-git-transfer-from-template.cjs`可生成后续传输，但先核父ref和HEAD，不盲重放旧operation目录。不需修改全局网络配置。

活动私有输入仍由Root→父#114保管。没有授权消费者退役或本片G4前，不清理P、对象存储、原件、临时捕获或服务。
