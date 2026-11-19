# 纠正 362：六生产叶与两数据叶代码交付

本记录交付[联合代码冻结](runtime121-corrective362-code-input.md)及[固定角色数据追加](runtime121-corrective362-apps-ABI-addendum.md)的统一候选和具体源更新请求。六个运行生产叶和两个现有数据适配器已分别及整体独审；尚未实际更新 Root 运行源码、签署本次 Root source approval 或执行任何 Native/业务模式。

## 最终统一候选

`corrective362-code-combined01/manifest-production6.json` 为 5862 B / `cd75747f43d6f49cecf6c04bc5234176f39a4436f01622f1fada44b4fe7082d1`，完整八源映射为 11642 B / `2a39bc3a43acdeb2f93e058b2ad4bdc087c425c777209b60e27a835e2f42f498`。它固定 HOT03 proof/wire/effects 与 control02 Native/Core/publisher，数据两叶沿用独立批准的 50a8 manifest；所有 before、candidate、六份原像及284成员映射均核验。

- 热路径去除 getter 隐含全检，同一 checkpoint 保留完整 Tax body 与一次最终 Native/reference；原 standalone 与完整退出校验保持。真实权限和会话 SQL 位于所有 bulk 与 pending 持久化之后，SQL前单调计时保守扣除整个间隔，保持两秒阈值和 ACK-first。
- 受限 view 投影既有两个固定 app 角色。最终 proof 拒绝缺失、外来、代理、访问器、尾洞及非枚举角色；合法冻结数组可正确克隆，无引用外泄。actor 权限、GRANT 和控制 SQL 不扩面。
- v3 保存三阶段历史、原API启动事实和完整 eb4a ownership 前缀，状态 handoff 只允许 lease/history+1/退活动失败Tax槽。publisher在最终handoff前再次强读 immutable snapshot 与 canonical ownership，拒绝 temp 写入后的漂移；旧1/2路径保持。

HOT03独立27完整函数、整wire/install/remove与4真实FD案例通过。control/data原1361项独立源码、producer、IO及文件夹具检查后，control02仅新增32项完整publisher/pureCore回归闭合末次CAS。统一候选另有44项映射检查；Node24静态链接50个真实源模块成功，0模块执行，11-key reference ABI逐字段一致。六叶整体审件为14988 B / `715fd5e2d59de7e617915bbd0b62c434c5d75dd79e510d59ab76e3c261febaaf`；data2审件为9397 B / `a435353c233e6345af0e5a4c4bc89f83178f3798de8a3beb02f2455f43bf71ba`。

原HOT01/HOT02及control01 NOTREADY和反例保持；最终代码、原始审件、反例和具体请求逐字保全在 `tools/rust-r4ghi/runtime-recovery121/corrective362-source-request01/`，不含私有state、ownership、env或auth HTTP正文。

## 实际源请求与边界

Root metadata helper于2026-11-12 21:54:46至21:54:57 UTC单次退出0、stderr0，真实只读preflight核对当前284/八源before、e0d9/eb4a/13/14、原件及当前API PID/start/cwd/boot；未执行 source promotion 或写canonical。

nonce `a6e8e1ed-787a-4ab2-9595-eec42b617bfd` 的 request 为2906 B / `8fa4a37af84f31d11d30023b995dafa2b5cda879f8626ee321ea038d4f7e30da`，input为1120 B / `997a96b45647140bb604427534ef52002155977ba5708230c177151424e31224`，eight-source-plan为7779 B / `dc227898c5dffa39ae675105bd5472a07e51fca6f70046b7257f36e51d53dbca`。预计Root approval为1463 B / `f05d03d841ecaf19f370f674c378c552ecb7cd51a13eb40a308dbaedb2199d56`，本记录时该文件尚不存在。

具体请求仍须独立 exact8 Source G2。只有具体 peer 与 Root approval 均满足后，Root 才会单次执行已审 sourceOperator03（16037/af6e），并独立读回真正的八叶变更、284/278关系、状态与ownership守恒。之后分别处理v3 plan/inspect/FS发布/私有entry快照、新current8载体、metadata/prepare-only G2及实际K/full67读回。源码提升不等同于状态续接或业务验收。

当前真实会话配置只读观测I900/A28800/T60；完整FI67预算模型至少618个 checkpoint，逻辑读量模型和计数都不是实测时延。实际prepare及完整FI的idle/absolute窗口仍须测量，不延长TTL、不拆造prefix、不自动relogin或重放旧调用。

Rust240、R4 67/95、32 candidate、新增认证0、业务G3/G4 false；#57/#116保持 OPEN，#119历史 CLOSED。
