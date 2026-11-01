# UI4 上传按钮纯文本定位微增量

仅原 UI4 upload 一次调用由 exact accessibleName 改为
`dialog.locator('button').filter({hasText:/^上传$/})`，仍调用原 click 与原网络等待/断言。
不依 p-button host label attr，也不依 CSS pseudo icon 的 accessibleName。
原 global button helper、等待时间、页面/产品、上传 body/API/字节均不变。
uin4c01b 的旧 timeout/正常关闭报告保留，不将可能的 pseudo name 原因写成已证产品故障。

新纯测从实际 await 表达式 AST 取调用，在受控 inert Fake label 上证明纯 label
可与 pseudo accessibleName 区分，错文字/实际icon文字/重复/hidden/disabled 不获点击；
这不是实际浏览器或 UI 成功。完整 original browser 反向一替换等旧字节。
helper 只联动 browser 原/派生 SHA，原 ui-runtime-sources 完全不改。

仍为97件 intended c01 union、33件 journal profile；95件字节不变，仅 browser
和其固定 hash guard 两件变更，三输入保留 uiSources passthrough。三件完整
env-literal/pin 映射可逐字节 inverse 等各 original，新 runtime candidate 未安装。
新 sourceSet 为93873b97...；旧 b journal db575 只能用原源恢复。
Root 必须先完成 b69/0/完整107恢复，再用新 run/new cap/new C review/admission
安装本三件和执行，两旧失败/回执均保留；不让 Rust 重复旧 locator。

62纯测含4个新 locator/完整字节与派生证明，加既有51受控Max64 helper及7真实
callback Fake 测试。另按原8个只读语义 test-name pattern 运行，旧epoch专属
getByRole locator测试原件不改，新4项替代该旧来源覆盖。7文件syntax/lexical
均0。首次static配置遗漏标准TextDecoder的工具错误已记录；只改检查配置，
没有因此修改runtime。无private/env/DB/HTTP/应用进程/浏览器实际运行，无新表/G3/G4。
