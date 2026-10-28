# RUST-R2D 纠偏记录

- 当前状态：运行验证及最终81run清理完成；完整非作者G3 Pass、未关闭P1/P2为0，实现`9302fd7149257aa40584fc500fd76dd0c766b80d`已集成推送，归档前静态检查实跑通过；G4随归档提交推送与Issue同步生效。下文保留各发现时点的Pending状态，最终结果见末节及收口记录。
- Slice：[#71](https://github.com/illusion-tech/poms/issues/71)；[冻结基线](rust-r2d-users-profile-baseline.md)限定11个既有用户、owner-reference 与 profile 操作。
- 起点：`a22cba7360346242cb7709740b7eb954b92d1fd4`。本记录追加实际发现，不改写 G1 原件和当时的 Pending 矩阵。
- 纠偏 owner：主代理；产品契约 A、持久化 B、非产品作者审查 C。最终交付仍限定本子片，父 #67/#57 保持打开。

## 原 Nest 观察与创建行为

按冻结计划实际采集73项原 Nest 观察：创建7项、核心31项、校验后删除 role/org 各1项、补充33项。五份原报告仍保持 `observed-partial`，分别为 `nest-create-witness01.json`、`nest-behavior-core01.json`、`nest-behavior-role-delete01.json`、`nest-behavior-org-delete01.json` 和 `nest-remaining-remaining02.json`。C 的 `c-nest73-coverage-review03.json` 独立核对了73个唯一 case、原 SQL 事件、来源原件、同进程身份、构建哈希及二次零残留；这只证明原行为见证完整，不替代 Rust 差分或 G3。

`POST /api/platform/users` 无初始关系时实际返回201，完整 OpenAPI 原声明仍为200，分类为 `existing-baseline-drift`。原 service 不写密码或 `local_credential`；新建用户无凭据，不增加密码接口。带 primary org 或初始角色时，原实体在首次 flush 前尚无数据库生成的用户 ID，实际先插入用户、随后在关系 SQL 前失败并回滚。Rust 保留该已观察的失败边界，不预先补 UUID 使原来失败的请求成功。

## flush、版本与失败提交边界

空 patch 仍写审计；没有字段变化时不人为增加用户版本。待刷新的 session 版本由原首个 managed flush 消费。重复启用或停用不改变用户版本；自停用的当前请求可以200，下一次认证访问才拒绝。重新启用不复活已经被认证路径撤销的 session，也不新增全部会话的主动批量撤销。

角色和组织替换先独立提交 `nativeDelete`，后续插入及用户/session CAS 属于另一 flush；audit 又是随后 flush。重复关系、校验后引用删除或晚期 CAS 失败不会恢复前面已删除的关系。合法的 lone-surrogate 输入可以先提交用户变化，再因 JSONB audit 编码失败返回500；NUL 输入则在业务写入阶段失败。Rust 没有把这些分段提交改成整体事务、额外锁或自动重试。

SQLx 的 NUL 错误实际为 `22021`，原 `pg` 驱动见证为 `08P01`。这是内部驱动差异，单独记录为 `accepted-db-specific-difference`，不能称内部 SQLSTATE 相同；公开错误和业务/审计/session 提交边界由双端 HTTP 与数据库事实继续验收。

## 请求快照、别名与查询

认证已读取 caller 用户和角色，后续 controller/service 查询使用请求内快照。原 ORM 对非 null 字段刷新和旧非 null/新 null 的 hydration 有区别；self 与 other target、审计旧值和响应刷新值分开验证。Rust 仅在请求内携带和合并这些原始快照，不使用全局用户缓存。

路径 UUID 的 uppercase/compact 形式保留 PostgreSQL cast 行为和审计 raw target ID；body 中 UUID 与 JS Map/Set 比较仍保留原字符串严格语义。不能全局小写化，也不新增路径校验改变原400/404/500顺序。

用户列表保持 PostgreSQL `created_at DESC` 微秒排序；完全相同时间的相对顺序和未指定 ORDER BY 的关系数组不被提升为跨所有物理布局的保证。membership 的未知类型、inactive org/role、fallback primary 与重复角色显示名按原查询保留。owner-reference 只输出原最小字段，不泄漏联系方式或凭据。

## 取证工具纠偏与失败保全

早期并发创建已提交新用户，工具却在 journal adoption 之前读取事实，被所有权守卫拒绝；该轮保留不完整状态，修正为先登记精确 slot/用户名绑定后再读事实。W01 的旧 selection 是完整 case 对象，后续四份报告的 selection 才是 ID 数组；比较工具分别逐字核对两种原有 schema，不通过宽泛类型转换掩盖差异。

非作者审查修复了新建行 `updated_at` 越过请求窗口、首次观察中的历史时间落在未来、followup 网络失败导致主业务 after-facts 漏采等问题。捕获主 HTTP、followup、最终数据库事实和 session 时分别保留错误；主请求可能已经提交时仍尝试最终取证。审查、纯测试和实际运行是不同证据，旧 Block/失败原件全部保留。

`http-linux-nest-final01` 在第90项 `dto:CreatePlatformUserRequest:null` 停止，原响应为400且由严格JSON body parser产生，尚未进入Zod。工具原先把所有失败schema语料一律当成DTO错误，需分别验证解析器入口与实际DTO入口；不得改变原请求使其绕过parser，也不得把759项源schema、753个可JSON wire候选、566项顺序HTTP和16项并发合并计数。该失败轮次已清理并独立再核0/0，owner同进程、二进制和来源未变且已停止，原90项记录保留为fail。

`http-linux-nest-final02` 在第78项 CSRF 场景停止；实际403与预期一致，失败来自历史审计快照比较。stdout传输按每个Buffer分别解码UTF-8，把跨块的一个emoji变成两个U+FFFD，导致同一历史字段从128个emoji变为127个emoji及两个替换字符，UTF-16长度仍为256。A/C与主代理分别离线定位此损坏；118份旧来源保存在`http-decoder-pre-correction02-sources`。修正仅令stdout流使用状态化UTF-8解码，保留完整历史审计、凭据与协议断言，并补真实子进程分块反例。第78项和该轮overall仍为fail；owner存活/来源/退出核验通过不改写整体失败，清理及再次0/0独立记录。修正后须以新来源重新实际验收。

第一轮真实 PG 服务测试9项均通过，但汇总脚本漏读带测试名前缀的准备记录，整体回执仍为 fail。修正解析后按新11项源码重新编译并实际执行，`pg-final11-01/receipt.json` 为11 passed、0 failed、0 ignored，另1项纯守卫被过滤；11个独立 run 均清理后再独立验证0/0。C 的 `c-pg11-evidence-review.json` 核对实际日志、91份来源原件与二次清理，仍不替代完整 G3。

`http-linux-{nest,rust}-final03` 均在第526项 `head:profile:two-trailing-slashes` 停止。两端实际均为404、HEAD空body、`text/html`、HEAD声明158字节；同端真实GET返回157字节的完整finalhandler HTML。未匹配路由的错误页包含请求方法，`Cannot HEAD` 比 `Cannot GET` 多一字节，不能把此类HEAD的声明长度直接等同GET。这是验收工具的错误假设，分类为 `tool-noise`，产品未改。修正规则只适用于原计划八个明确未匹配HEAD：仍验证同端真实GET完整HTML及字节长度，再按唯一方法前缀计算HEAD对应表示长度；其余已匹配HEAD保留原GET等长断言。两份526项失败原件、来源、owner退出及二次0/0保持，不重标为Pass；修正后另起新轮完整验证。

## 原页面与 Windows 夹具

`final04` 两端各566项顺序HTTP与16项并发均完整采集，合法URI补例却在第3项PATCH后停止：两端实际都是200，工具错误要求`updated_by`变为admin，而原服务没有该赋值。补例改为严格保留before的`updated_by`，原用户版本、真实变化字段及audit actor仍逐项验证；新增null/既有actor保留及非法actor/版本变化反例。两份补例与owner的失败标签保留，不能用已完成的HTTP/并发片段宣称本轮正式通过。

该轮离线检查另确认两个测试环境差异。第一，Nest监听未指定host，Rust绑定IPv4，导致原始session/security-event的loopback文字分别为`::ffff:127.0.0.1`与`127.0.0.1`。下一轮两种测试transport均固定发送`X-Forwarded-For: 192.0.2.25`，由两端现行来源IP逻辑真实入库，比较器继续严格检查全部IP字段；不删除IP或增加通用归一化。该选择只固定本轮测试输入，不证明未带来源头的跨listener表示相同。第二，两库原seed用户的`created_at`在各自库内完全同微秒，原`created_at DESC`在并列行间没有次级排序；完整内容与原始PG微秒值须先核实，不能泛化排序数组掩盖非并列行的次序或字段差异。

逐项检查还发现`parser:safe-ignored`实际为`GET /api/platform/users`，旧计划却标为profile，导致该项没有采集列表用户的PG事实。修正仅把operation改为list并重导出计划/来源元数据；方法、路径、raw body、566数量与schema语料不变。旧final04该项缺失的PG事实不从邻近请求补造，必须新轮实际采集。

精确并列比较只应用于成功的list/owner-reference GET及HEAD的独立真实GET引用。先核原wire ID次序与全部PG观察行逐项对应、无重复，并验证原始微秒值降序；然后仅在比较副本中整理连续且完全同微秒的组。完整字段、逻辑ID与组边界仍参与比较，一微秒拆组、非并列换位、字段变化和其他关系数组乱序仍被拒绝，原响应数组不修改。

上述错误假设分类为`tool-noise`；补脚本旧原件与final04完整119份来源保存在独立目录，原报告/失败owner不改写。A/B/C对最终七文件增量及固定来源头四文件分别完成复核，修正后工具纯测试184项通过，原181项保留为旧版本证据。仍须新轮完整采集和正式比较后才可形成差分结论。

初轮页面断言误将角色显示名当成 role key，另一次编辑按钮的精确可访问名称遗漏图标；依据原页面和冻结输出修正 locator/断言，不改原产品页面。Windows 浏览器首次运行缺少固定 Chromium1243，保留启动前失败，后在本片 `tmp/rust-r2d/windows-browser-cache` 安装隔离浏览器缓存。

Windows 夹具经 WSL/Podman 运行，单次 Podman 元数据读取实测约6秒；旧脚本10次连续元数据调用和一次启动在部分请求超过60秒，造成取证或清理失败。新 `fixture.sh` 将同一容器的 image/port/scope/data-volume 字段及两份 secret 名称/标签批量读取，保留原全部身份守卫，增加 running 与精确 builder image 校验；没有延长60秒 deadline或弱化 PG15/database/marker/所有权检查。两次同一已清理 run 的零残留 smoke 用时15092ms与13902ms。

`ui-win32-nest-02` 在旧夹具下已失败，后续部分观测可能使用修正后的夹具，整轮只保留为失败，不作为最终页面验收。`foundation-win32-rust-01` 的13项认证本体通过，但清理超时使整轮仍为 fail；其恢复回执单独记录两次0/0，不改写原失败。最终页面与认证选择必须绑定固定来源和成功清理的独立新轮次。

`ui-linux-rust-01` 的桌面与零权限用例通过，390px 用例第二次角色替换未发出请求：截图显示 multiselect 仍 expanded，挡住保存按钮。原测试向页面当前焦点发送 Escape，改为向该 multiselect 的实际 combobox 发送并等待 `aria-expanded=false`；角色及组织副组织两处一致处理。该失败轮次三项均完成二次0/0清理，新来源四组合另行重跑，不通过增加 HTTP 超时或修改产品页面掩盖失败。

`ui-win32-rust-01` 的桌面和390px用例通过，第三项在prepare夹具阶段超时，没有产生观测或成功夹具回执；整轮保留fail。对应run `9743fb16-65ab-4074-a89e-3b8f2a7c6997` 未发现journal，显式cleanup回执仍为fail，不伪造0/0。需通过精确journal不存在、源码先持久化再写库的次序，以及独立只读全表精确run扫描确认是否未初始化；核验和重新执行第四组合各自记录。

`ui-win32-rust-02` 同样整轮失败：desktop的初始prepare超过60秒，run `8c1e7c3e-8d12-4096-89bc-1759f4d36173` 没有成功event、业务请求或cleanup回执；另两项通过不能补成完整组合。两失败run分别采用固定target脚本、两个独立连接、repeatable-read/read-only事务逐表扫描107表及270个来源绑定的精确标识，各表0匹配，journal在前后均不存在，事务rollback且连接关闭。C分别核对原件和当次来源后确认`not-initialized-readonly-confirmed`，不把它写成cleanup二次0/0，也不把原UI轮次改为Pass。第一个只读工具的01/02轮因ambient环境守卫拒绝而失败，仍保留；后续调用采用明确env allowlist，未弱化守卫或改SQL。第三轮完整Windows/Rust页面验收仍待执行。

## 有限URI覆盖与继承差异

独立审查补查两种非法动态路径。真实无cookie `GET /api/platform/users/%FF` 和末尾裸 `%` 在Nest均返回400 `Failed to decode param`，Rust均先返回401 `session_missing`。原件为 `bad-path-observation01.json`；其他方法和认证情形尚未实际验证。R2D复用R2B/C已有的guard后动态段解析次序，共享auth/router未改；C将其列为已知P3继承边界，不列本片新增P1/P2。不能声称全URI等价，后续由#67/R2M的共享HTTP兼容工作统一覆盖解码顺序及错误payload，最迟在R2M阶段验收前定案。

合法编码UUID和query按G1另补少量真实GET/HEAD/PATCH与viewer403的独立场景，保持原566顺序计划计数，补轮也必须具有owner身份、来源、完整数据库事实和二次清理证据。

## Schema 与完成门槛

两份新库均为107表、1778列、515约束、504索引、92迁移、0用户 trigger。实际 `migration:check` 均 exit1，`schema:update --dump` 均 exit0；前后 catalog、来源及安装 CLI 均未变。168个建议 CHECK 与既有同名约束、低权 CHECK introspection 可见性及 `lead_score_override.status` 注释差异匹配历史基线，分类为 `existing-baseline-drift`；没有逐一证明所有 CHECK 表达式语义等价，未执行任何建议 DDL。

调用锁定的 MikroORM7.0.11 CLI，验证原 Nx target 的命令/参数后直接执行相同 CLI 操作；本轮不声称运行了 Nx/corepack/pnpm 启动层。owner 仅作目标/可见性观测，CLI 用 `poms_r2d_app`，所有连接及子进程强制 read-only。原 schema 工具的失败回执曾在 after-catalog 出错时漏挂已完成 CLI 的元数据；已改为每阶段立即保留，失败时仍独立尝试来源和 CLI 身份复核。

最终 G3 仍须取得完整双端顺序 HTTP、受控并发、四组合页面与认证、适用静态回归、全部失败 run 的最终清理和非作者产品/证据审查。通过后才提交推送和集成检查；G4 另归档基线、本记录、收口记录并同步 GitHub，仅关闭 #71。PG17 实例和数据保留，本片只允许服务元数据观测，无部署或产品 DDL。

## 2026-10-28 最终运行验证

新final05两端各566项顺序HTTP、16项受控并发、4项合法URI补例均完整采集，三项正式严格比较均Pass；两份owner均真实Pass，原PID/startTicks、二进制和来源前后一致，服务已停止。safe-ignored本轮已有18行完整PG用户事实。pure06为184/184、0skip，119来源保持。C final05分项独审Pass，未关闭P1/P2为0；这不将final04或更早失败升级为Pass。

原页面最终四组合各3通过（Windows/Rust最终采用03），基础认证四组合各13通过；此前未初始化的两个run仍按只读证明单列。最终全run审计final01实际核81个登记run，各连续两次cleanup matched/changed为0，1374来源bytes/modes及81journal listing/bytes/modes前后不变。Windows/Debian四测试端口无listener，PG17服务Running/Auto，仅观测服务元数据。

完整证据汇总、G3裁定、提交集成及G4以[收口记录](rust-r2d-closeout.md)和最终机器验收为准。保留G1原字节和完整G3受审原件；归档前先按完整来源union执行集成检查，G4路径迁移单列映射，不改写历史运行来源。
