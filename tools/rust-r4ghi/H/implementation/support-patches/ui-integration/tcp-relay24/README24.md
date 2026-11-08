# 临时双 TCP 字节桥24（Root-only候选）

不修改原20、Linux HTTP server、请求/响应内容、业务ledger或Windows/WSL网络配置。只新增4个business工具文件，现有full source closure会自动收齐。作者没有启动listener、浏览器、HTTP/DB或WSL子进程。

Root已读实际NAT eth0为172.22.207.203/20。新plan的relay24显式固定：Linux **eth0:44552→127.0.0.1:44551**；Windows **127.0.0.1:44551→该eth0:44552**。Linux启动时重新读os.networkInterfaces核eth0，拒绝lo/10.255.255.254或IP变化；不自动换地址、不调整.wslconfig/防火墙。

两个bridge只有socket.pipe双向字节流，没有HTTP parser、header/body改写、重试或packet/cookie日志。记录的只有PID/start/exe/helper/plan/nonce、endpoint、连接/字节计数和错误code。新private relay目录采用22 pinned PS7 ACL（Windows）/0700（Linux），与原UI profile目录分离，旧02不重用。

Root将 `relay24.plan-fragment.json` 合入全新的03或更后plan，选择workerKind runtime14/role18/expense18/gh18/lifecycle18，paths用本包pure函数relayPaths24(uiRun)精确生成，再按旧prepare16捕获完整工具/source/dist/actors/binding。Windows PS7、Node、Linux Node、wsl.exe、4helper及原worker字节全部由plan/full closure固定。此fragment含占位paths，本身不可执行。

Root在新闭包/plan/binding审核后，Windows入口为：

```text
node tools/rust-r4ghi/business/ui-relay-run24.mjs --plan ACTUAL_WINDOWS_PLAN --approved-plan-sha ACTUAL_RAW_PLAN_SHA --approved-binding-sha ACTUAL_BINDING_SHA --execute
```

wrapper先启动Linux bridge并核其ready实际PID/start/exe/hash/nonce，然后Windows bridge并核其owned ChildProcess PID；两者监听就绪后才调用原14/18 Windows入口。原入口仍负责Linux HTTP、localhost真实index SHA/run nonce核对、GUI动作和业务证据。wrapper自身不把relay ready算DOM验收。

正常结束用带plan/nonce/PID的私有stop文件，两桥close并销毁其自有连接、写done，然后等待owned子进程退出。超时仅向实际owned Windows ChildProcess发送SIGTERM；Linux fallback只在实际/proc PID start/exe/hash与本run私有record完全匹配后发SIGTERM，不按port/process-name杀服务。无ready时保留starting process record；没有可验证身份则等启动期限并报fail，不猜PID。桥另有30秒startup和plan≤3900秒lifetime边界。

任何旧文件/监听端口占用、IP变化、ready/teardown失败都fail，不占用或清理别人的进程。原worker缺ACK仍由原observer保存实际效果，bridge从不代其推断回滚/重放。root仍需实际验证Windows到eth0路径；本工具不承诺宿主NAT/firewall可达。

只作7项纯参数/边界回归及4模块语法检查，不冒称网络、进程或DOM通过。safe Role23普通命令实现暂后；已停止SQL窗口探针不恢复。
