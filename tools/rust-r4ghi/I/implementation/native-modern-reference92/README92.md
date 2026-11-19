这是 Root 可审的 Native17 边界方案与4个新增工具候选。作者只做 FS 静审、纯测试与语法检查；未启动 Native/PG/listener，未发 SQL/HTTP，未改 Root 或既有67/90/23审件。当前 NativeHTTP 仍为0，候选不代表验收通过。

当前17项为16个现代写命令加supportC。inventory92.json从当前Native controller AST逐项核对canonical路由与方法级guard，权限集合只有commission:assignments:manage、contract:finance:manage、project:write。现有全局SessionAuth→CSRF→Permissions先执行，随后Native protocol guard，再到pipes/legacy DTO/handler。显式inputVersion属性就返回专用422；新execution/acceptance/condition-close更是无条件unsupported。因此需要真实Native账号/会话/权限/CSRF，不需要Native项目、合同、移交或金融producer。

每个测试只发合法JSON对象 `{inputVersion:"server-derived-v1"}`，路由参数为明确的、在S0两库所有PK中不存在的UUID语法锚。它们不是项目/金融事实，没有SQL插入，不声称完整现代业务DTO有效。必须收到完整422、精确code及protocol-guard reason，不能用晚到legacy shape错误、401/403/404、transport失败充数。旧冻结schema/status只保留静态reference标签，不发送旧业务请求，不把Native当Rust验收或bug对齐标准。

已有资源可复用但有前置条件。原private/native.env（df58276d…）的owned DB谓词均匹配，PORT不符31442；显式POMS_ENV_FILE会override进程变量。prepare-native-env92只在新私有目录逐字复制、只改PORT，原文件不动，所有credential值均不输出。Native DB app password不是HTTP用户密码。真实HTTP登录输入须由Root从已合法Native seed的bootstrap credential来源写入新私有JSON并pin；不得猜密码、重置凭据、SQL造用户/项目/财务authority。S0必须确认所选原Native user真实active；登录/current-session200再验证真实ID及全部三权限。账号原行是只读借用，没有last_login/row_version mutable allowlist。

Root的新build-binding103（ea852699…）已独立重核：build04 exit0/sourceStable、2838源叶与5dist叶当前完全一致，main仍b070474f…。旧map的sourcesContent是TSC后JS，原本不能直接和TS做raw SHA等价；现在以真实fresh binding认证可复用，不靠map猜测。Native root/TS/Shared/M97均不改。实际运行仍必须重新核该binding、完整当前business helper闭包、preload/Node/env/process pins；若当前叶变化则停下重新审准，不能静默重绑。

Native main虽有HOST配置，却只调用app.listen(port)。本候选用独立task-only Node preload处理：仅修改本Native进程net.Server.listen，唯一允许31442，host缺省补127.0.0.1，已有host必须已经是127；pipe/fd/其它host/port拒绝。不改socket.connect、HTTP字节、middlewares、guard、DB配置或clock。preload先只读验证新私有env路径/SHA/nonce及有效owned Native连接参数，包含可能继承的DATABASE_URL，拒绝默认真实DB，然后才允许main载入。Root主main.js字节原封。运行时还必须由/proc证明实际owned PID/start/exe/argv/cwd/nonce，以及该PID socket inode确实监听IPv4 loopback31442；不能把HOST字面值当真实绑定。

唯一允许的实际顺序如下；须先结束当前Rust/UI driver，Root显式进入Native-only阶段，全程不并行Rust HTTP/工具改字节。

1. Root私有保存当前Rust state的真实原始副本和finished/closed receipt，原Rust state不改；新plan填全部真实pins，frozenState不得指向mutable state.json，并且其SHA须与当前state逐字一致。不得复制带凭据state进repo。捕获完整helper闭包，生成新nonce、私有env与凭据输入，审核完整plan。模板含null，不可直接执行。
2. Root调用baseline模式，在Native独立state目录捕获S0：双库各139表所有row SHA+xmin、catalog/OID/ACL/functions/triggers/roles/sequence及双对象目录。连接只复用原namespace/provision/OID guard；完全不调用Rust createContext、不写Rust state/owned/borrowed，不放宽原双库守恒规则。
3. Root自己启动精确Node，参数只有 `--require <pinned native-bind-loopback92.cjs> <original full main.js>`；cwd是Root，私有stdout/stderr；子环境必须显式POMS_ENV_FILE、POMS_R4GHI_NATIVE_ENV_SHA256、POMS_R4GHI_NATIVE_REFERENCE_RUN，取自reviewed plan。记录真实pid/start ticks/exe/startedAt/plan/env/preload。工具不启动、不停止进程。错误启动也应保留日志、S1和真实effects，不默认seed无副作用。
4. Root以真实process record调用run。先捕获startup-after并与S0全量相等，任何seed/init/原行或xmin变化即blocked-startup，尚不登录。通过后真实GET csrf、POST password session、GET current-session。预期只新增cookie-token-hash与原Native用户精确对应的一个auth_session；原admin及其它所有行含xmin仍须不变。然后顺序17次modern-tag POST，每次实际before/after与完整ledger。只允许该新owned session的精确raw touch；必要审计预期集合为空（当前成功auth及protocol guard源没有success审计），若实际出现audit/security仍按唯一request ID+真实新PK/hash记账并阻断，不吞掉、不扩成任意mutable表。
5. 缺ACK、错误status/reason、异常原行/对象/catalog/sequence变化均保留partial与已提交auth effects，不重POST、不清blocked假恢复。Native独立driver.lock防同phase并行；ctx.own只容实际新auth_session或本请求的audit/security，不容业务事实。未知审计、原user修改、启动seed、cleanup未知commit必须Root另做精确对账，没有通用原行/xmin伪恢复。
6. 17正常完成后Root只停止经PID/start/exe/argv/env/nonce验证的自有Native进程，不按端口或名称kill。cleanup模式只接受完成phase、原进程已消失/不再是该start identity，核唯一session实际cookie birth、beforeAbsent、最新SHA/xmin及无入向FK后，借owned Native DB事务锁住该行并精确DELETE新owned PK。随后全量after必须与S0原rows+xmin/meta/seq/objects一致，再做两次fresh noop。这样Native临时认证数据完全移除，Root Rust ctx的双库守恒仍成立。出现任何额外owned audit或partial时不套此单session cleanup，先另审具体必要清单。

CLI仅Root晋升后、审核真实plan后执行：prepare-native-env92 --input/--input-sha/--execute；native-modern92 --mode baseline|run|cleanup --plan/--plan-sha [run时--process/--process-sha] --execute。`--help`无私有输入/SQL/HTTP/启动副作用。Root需提供的未填项：实际boundary-state副本/finished receipt、私有HTTP credential input与真实原Native user ID、新env回执、nonce、Linux Node pin、全当前helper/source pins、真实process record。已知seed/provision/build/source/private路径pin和变量名在inventory92.json；没有任何secret值进repo或public结果。

纯测试覆盖17方法映射与专用reason、PORT唯一改写、default/foreign DB拒绝、原Native user/Rust行/xmin守恒、session唯一birth/raw-only约束、task preload的Nest callback/backlog/options保真及拒绝wildcard/fd/继承外部DATABASE_URL。preload只在VM fake net上测试，真实Node net未patch、无listener；另核真实HTTP.Server继承net.listen。完整Root Native运行与清理尚待Root执行。Source12/M97的实际结果保留原版本；以后M98仅可经明确impact复核复用，绝不预标Source13。
