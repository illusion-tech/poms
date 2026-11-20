# #121 Root操作边界提案（待联合G1冻结）

采用同Source15、显式typed append-runtime/process lease。重启不等于源码epoch变化；旧Reg5/B1/process、已闭合prepare及所有失败仍是各自原时点事实。此提案不授实际效果。

Root独占下列外置操作工具候选路径，均位于 `tools/rust-r4ghi/runtime-recovery121/root/`：

- `hold-runtime121.mjs`：任务内前台寿命owner，仅保活和记录真实Linux PID/start/boot/exe/source；不启动API/PG、不自动重启，不铸业务ctx。
- `start-holder121.ps1`：用隐藏的Windows `wsl.exe` 前台会话运行固定holder，记录真实Windows PID/creation/exe及原日志。无全局WSL配置、计划任务或系统服务修改；只按真实所有权显式停止。
- `resume-original-pg121.mjs`：只启动原ID、原image、原卷/挂载/端口/OID目录完全匹配的stopped容器；独立实际G2，先intent、一次start、真实readiness，失败保留不重试。
- `observe-conservation121.mjs`：独立PG-owner只读取证，不调用/模拟旧ctx。固定namespace/marker/OIDs/角色权限、M98/139表/版本/端口/时区，以只读事务取得双库完整raw/xmin/meta/sequence/object，与真实prepare末尾原快照逐项核对，差异阻断。不将OID目录存在说成逻辑数据守恒。
- `start-api121.mjs`：独立实际G2后一次启动已核原Rust二进制；新boot/PID/start/exe/dev/ino/socket/readiness/配置原件另留，不改旧记录或复用旧PID。原420/528/ELF实际全等可复用旧编译证据，新的文件/进程身份事实必须新取。无自动restart/stop。
- `prepare121.mjs`：各阶段仅从真实前驱生成具体输入和未签审批体；未来原件/pin不预造，缺前驱即拒，唯一新运行目录/nonce由新协议显式约束。
- `dispatch121.mjs`：各固定mode/entry/真实argv及整个Root审批体逐项核对；非作者exactG2后才写真实Root审批、原stdout/stderr及单次派发。原件缺席或未知停止，禁动态callback/entry注入。
- `facts121.mjs`：固定输入/真实文件和进程元数据的纯解析与比较；不接收可执行reader/guard/ctx，不自行授信或执行效果。

验证文件与冻结清单在联合G1列名，不计为业务生产叶；此操作层不改Rust、SDK、Admin或HTTP合同，不写H3和Tax/#120算法。

阶段顺序为holder→原PG恢复→双库完整只读守恒→真实新API/readiness→I负责的原生append admission及原子发布→真实constructor技术验收→H负责的typed retained-preparation continuation→后续新FI输入。每个实际mode单独exactG2，未满足的前驱不得用bool或mock填充。

新current authority的接口由I/H共同明确后再联合冻结。原失败7f75只有da94及原件证明的0HTTP/control可显式作为历史保留；任何unknown、已dispatch或ACK仍须停止。08e3/body0f92/full67及全部物理来源/CAS新鲜同值，才能延续，不重选body、裁target或回填旧exit。最终真实C/S/F必须区分旧prepare时代和新lease时代，不把历史事实改写为当前事实。

恢复子片新增业务操作0；真实全部依赖满足且独立G3/G4后才可收口#121，#118/#120及本批业务继续独立验收，#57与完整R5 #116保持开放。
