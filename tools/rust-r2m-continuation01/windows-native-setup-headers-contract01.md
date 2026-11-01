# Native Windows 准备 HTTP 的单一 header 负责方

原 c04a UI3 在准备请求的 Native RPC guard 阶段失败，0 UI HTTP。旧caller把 user-agent/x-request-id/x-correlation-id，及有body时的content-length塞进headers；原server会自己注入这些字段并明确拒绝caller注入。旧actual/root私有诊断/partial与恢复证据保持原标签，不能将本次纯修订当其实际通过。

唯一生产变化是WindowsNativeUiHttpSession：默认outgoing保留x-forwarded-for，不再填原callee保留的UA/RID/CID；有body时仍按原方法构造完全相同的JSON或Buffer字节、canonical base64和content-type，只不自填content-length。顶层requestId/correlationId保持原值，仍先await实际admitContext，再传给原NativeApp.request；原server严格核requestId等于该context的nativeRequestId，然后自己注入同一UA/RID/CID/host/connection。原server按还原的同一payload字节计算content-length。

明确提供的自定义headers若含server保留六键，caller也拒绝，大小写一致处理；不静默strip。原cookie/set-cookie/authorization拒绝、CRLF检查、cookie jar、CSRF默认/显式/禁用、可用custom headers/content-type、response原SHA/length校验全部保持。没有改server guard、NativeApp decoder、dispatch、context规则、正文、重试、身份权限、fresh/Stop/生命周期或预算。

新增纯测试实际抽取并执行冻结server内部request函数、NativeApp原request解码方法、原context验证/请求ID/producer route构造，再用原dispatch和Fake HTTP连接实际caller。没有启动Native factory、socket、DB或浏览器。覆盖：callee唯一注入保留headers；UTF8 JSON/二进制/空payload的base64/SHA/byte-length/content-type；cookie/CSRF与可用custom header；caller保留键大小写拒绝；不变的callee仍拒绝直接注入、错ID、未admit context；原decoder拒绝响应SHA损坏。Fake内容均显式synthetic，不是实际证书。

候选只在newtmp，正式源包列115 intended（113基线中仅caller一改，新增本说明和测试）；原113snapshot与M3已过46保持原字节。C必要审、Root精确恢复旧run并释放窗口后才能安装，Root再用新epoch/新run实际。未认证实际UI3/4或G3/G4，不引入额外验收门槛。
