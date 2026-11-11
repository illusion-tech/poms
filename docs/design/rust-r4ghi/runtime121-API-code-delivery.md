# #121 启动器与三个组件代码交付

Root8、I03、H03 三个组件均获非作者 `approved-bounded-step-only`：Root `687b6a`、I `274f4e`、H `8816ac`。原件与逐项 before/after/pointer 记录保留在 `tools/rust-r4ghi/independent/runtime121-components03-steps/`。Root8 相对原始源码基线的八项 ADD 包含原七项 A 工具和新启动器一项；本轮只新增启动器，A 七项字节不变。

Root 实际封件 `f83e1e` 包含源码前后书挡、55 项隔离测试、三项语法检查和有限未绑定/声明类检查零发现。独立重跑 55＋9 项也通过；早期审阅夹具缺依赖和 DrvFS 权限两次首停保留。I 独立 49＋17 项和 12 项语法检查通过，H 六处纠偏与边界组合获独审。其它 TypeScript 诊断按原件保留，不宣称完整 typecheck 通过。

本提交不启动 API、不推广 33 项候选、不产生实际 Native 权限，也不认证完整 229/55 运行图或业务 G3/G4。后继依赖具体 SourceSafety、实际图度量、API 启动 G2 与真实进程读回。

计数澄清：Native 的 `baseKeys121`、`parentShape121` 和原冻结模板列举的是 18 项。早期提案叙述中的“base19”仅是文字计数误差，以真实闭集为准；不增加第十九键，新增两项依赖补档仍只由 composition 绑定。启动器直接调用该真实校验器，不自行扩大 base 形状。

E1 例外：`git diff --cached --check` 实际退出 2，仅报告冻结日志 `independent/runtime121-components03-steps/Root8/independent-original-55-attempt02.stdout.log` 第 70、72 行的空白。该 5,666 字节原件 SHA 为 `6ac241873507711435659b54e7f610e2d8f4e146ac3496645ac02ee659aacb09`，属于已保留的审阅夹具失败；不能为检查通过改写原始字节。批准人与清理责任人为 Root，处理期限 2026-11-30：随本批 G4 将例外及原件一并归档，保留字节与历史标签。源码和文档无此项诊断，不将该次整体 diff 检查记为通过。

二进制身份纠偏：真实旧计划使用历史 stat 六键容器，新 current 仍要求严格 Pin。Root 比较已验历史身份投影，当前文件使用独立 byte/stat 观测，允许真实编译输出的两项 hardlink；旧 stat 不改写为当前。新 `aeb02a` 封件 58 项隔离回归和独立 58＋9 项通过，非作者代码 step 为 `577ef5`。前一新增测试的跨 Realm 对象原型比较误差导致的 57/58 失败原件保留；该冻结 `sealed-API-code02/command-4-stdout.log` 第 347、352 行空白也纳入同一 E1（11,158 字节，SHA `95ea5b3fcb921499a50fdd4a71d3492133026b53a23f2c37ad9d865aebdefa16`），仅原件保全，不改源码检查规则。Source33/旧284仅保其实际执行时点，新 Native 与 Root8 组合必须重新度量后才可用于后继输入。
