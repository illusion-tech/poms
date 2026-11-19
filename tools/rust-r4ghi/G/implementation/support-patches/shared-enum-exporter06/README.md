本提案保持 TypeScript 为 wire 的来源，不直接修改 shared/generated.rs 或 R0 原件。Root 产品文件尚未改动。

现况已实读：旧 exporter 的 SOURCE_HEAD 是 4f78bd486ca2118e4700bae560cb25ff08c4b47d（其 README 记为 R4ABC S3），working/index/untracked 三项 guard 仍生效。它只读取单一 shared 模块，第一行新 canonical import 就使实际 analyzeShared 拒绝；该拒绝正确，不能靠换 HEAD 或放宽所有 import 消除。当前八个 enum helper 的声明 hash 也与旧 pin 不同，需逐项审查，不能将源码格式或语义变动静默承认。

已实现并实际执行的是封闭三模块候选分析器：index.ts → shared-contracts.ts → rust-r4ghi-contracts.generated.ts，只开放现成 Zod 外部依赖。各文件规范化 hash、全部声明及其顺序、函数 hash 和 import/export 边逐项登记；未知模块、修改 wire、新 host 函数及未知 class 的四个内存反例均拒绝。只有明确的 z.lazy schema 构造器回调可含 enum；普通函数或不透明回调隐藏 enum 会拒绝。实际原 TS 在受限 VM 运行，并比较 enum 参数及顶层 Zod options。

Node 24.19.0、TypeScript 6.0.3、Zod 4.6.1 的纯诊断通过且 sourceStable=true。默认 Node26 首次调用被原版本 guard 拒绝，未放宽版本要求。三模块分别 1/1922/266 个声明，0/195/124 个 enum occurrence；实际 public ProjectStage 为11值。原 TS 的 ProjectListQuery 接受 conditional-completed、拒绝未知值，CreateProject 只接受 assessment。该结果独立说明 core list 消费旧类型及复用 assessment-only helper 的缺陷，consumer 小修补另见 ../query-stage06/。

R0 仍逐字保留 normalized SHA 3d126e07d5abf2c56f41c35fc25b78a13dbe094450b470e8bb4c950ce8a2986c，原455常量/224 occurrence 不改。当前319 occurrence不能直接套旧的“历史224全部仍同位置同payload + 4已登记新增”的算法：有 schema 从 legacy 模块迁至 canonical 模块，出现顶层 inline enum、原数组不再直接参与本模块 z.enum、以及 domain type 从新模块重导出。必须逐项记录历史保留/受审替换/迁移/新增，以 nominal source identity 关联数组与 canonical schema，不能仅因值相等便合并类型。

export-shared-inspection-seam06.patch 为旧工具新增一个可审查的分析接缝。它继续先执行原 source guard，再核已获 Root 独立审查的 registry 与固定 sourceHead；SOURCE_SCOPE 只扩展不缩小，新增 canonical 文件及 registry 纳入 source inputs。该候选不修改旧 buildManifest/compareR0，也不自动更新 SOURCE_HEAD。Root 需要先审查、固定源引用和 registry，再接入 full data/family renderer 与历史迁移记录。

本提案不是 whole exporter 升级通过。尚未执行带 Git 的旧 --check/--write，未刷新 neutral manifest、Rust generated 或 generated tests。未实现的完整历史 remap/nominal alias 映射明确列在 integration-proposal06.json；不能把纯模块分析或当前 core query bridge 当成旧工具全量验收。
