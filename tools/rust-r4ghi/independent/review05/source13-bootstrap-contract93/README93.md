先产 bootstrap candidate、再 mint schema3 的方向成立；现有 85+02 要求候选已经带最终 registry，因此需要两个不同的新 Source13 原件。

1. Root 冻结最终产品/代码、G2 审批、正常 M98 实证、真实 Root/mirror build 与新 API136 进程。用 `sourcePins()` 做纯 FS 枚举即可，不调用 `createContext`。保留 source/进程/binary/build 输入前后稳定及真实 readiness200 原件。新 priv 可先 mkdir；不得创建 state、调用 ctx.next、登录或复制旧 candidate。
2. 在 `private/business/g2-business13/main01/` 以非计数器新文件名、`wx` 写 B0。B0 包含新 epoch/run、完整 sourcePins/digest/count、独立 process JSON 的 pin+record、readiness=200及其真实原件、新 build 关联；不含 registry、consumerAdmission 或新 baseline。
3. 108-02 plan 绑定 B0：`candidateSourceDigestPointer=/sourcePinsSHA256`；`candidateBinaryHashPointer=/process/record/binarySha256`。同一个 sourcePins JSON、process pin、binary SHA、helper H0、retention/M98/impact 原件进入 plan。批准最终 plan raw SHA 后，由 CLI 的 `createContext(admissionBootstrap)` 首次创建 state，再读取 M98 fresh、mint R3。目录已有 B0/plan/证据而没有 state 是现有代码支持的形态。
4. R3 成功后另产 B1（admitted candidate），仍在同一新 ctx.priv，使用真实新 Source13 source/process/readiness。B1 带 `consumerAdmission` 原值及 R3 registry pin；供 85 的 current.candidate 使用。R3.consumer.candidateReceipt 继续引用 B0，绝不回写成 B1。85 没要求两 pin 相等，因此这一顺序无循环。
5. 完成 85 runtime bindings 后，单独冻结 H1 和显式阶段 refreeze 收据，证明 H0→H1 只有已审 runtime binding 数据变化，代码/产品/source/process/retention/registry 未变。H0 是 108 实际消费的 bootstrap helper 图，H1 是 Tax 实际消费的最终图；不得改 R3、plan 或把 H0 称 H1。该收据位于私有业务目录，不能放进 business helpers 产生自引用。最终运行前由 Root/非作者核其完整新图与配置 SHA。
6. B1 不放最终 H1（或包含自身/85 binding hash的图）；85 bindings.current.helperSources 保持完整代码图且按既定规则排除 bindings 自身，再由 H1 从外部 pin 其实际字节。若要求 admission 时 helper 图从此绝不再变，则需另审把后置 runtime bindings 移出 helper 图的明确工具增量，不能假造 registry 提前填 B0。

Pin 的准确形状：108.consumer.apiProcess 读取的是独立 process JSON。建议它使用 `{file,rawBytesSha256}`；state 会经 pinOnly 去掉 bytes。候选的 process 应是这两个字段加同文件解析的 record。若 plan process pin 带 bytes，则 B1.process 必须从 registry.consumer.apiProcess 补齐实际 bytes，不能只 copy 已去 bytes 的 state.process，否则 85 的 samePinTax13 会误断。registry/retention/producerState 等被 deepEqual 消费的 pin，应原样 copy 各自最终来源，不能统一去 bytes。

G2 JSON、source/helper manifests、B0、plan、R3、B1、H1 之间只单向引用。特别是 sourcePins 已包含 G2 JSON时，G2 JSON不能再包含该完整 source digest、B0/plan/R3 的 hash。真实 source-to-binary 必须来自实际 Root/mirror Source13 build 的完整输入比对和 binary SHA，不以旧535提案编译收据或 readiness 常量代替。

这只是 FS 契约审查；真实 Source13 inputs 全为 null。原 capture-candidate12 依赖已准入 state、旧406/noop字段，不能直接拿来做首次 bootstrap。原 85/108/136/所有实际 Source12 证据不改，不给 M98、Source13 或 G3/G4 通过结论。
