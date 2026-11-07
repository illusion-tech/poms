# Whole exporter09 独立工具C准入审查12

**允许精确G2工具C提交，并在C提交且metadata干净后执行真实`--s5 --write/check`。** 这不授产品G3/G4、main或Issue收口；作者文档的工具“B”在本批称C，不是SDK工具B `f072f7d…`。

唯一handoff SHA256 `b10cc254cafa349606274931d03f29c6095d0d60c26cd6f9c1ead4348ac58490`。21份作者冻结原件和11份root-proposal目标hash均独立核符。固定Node24.19.0下，独立从Root旧历史manifest和A真实源重建identity/registry/whole manifest，逐项与候选完全相等：338 enum occurrences、330 families、1159 values；224=197+27、455=446+9、114新来源、209旧family保留。37组同wire不同family仍独立，无按值自动合并。九项常量变更均为ProjectStage/OperatingSignal/OperatingRisk三组定义、Value、数组，来自当前原始TS；历史身份文件不提供当前wire值。

已直接执行真实只读A source guard：固定A `883f88fdf4fd609bb8b0725b28bda011d408d6ee`的路径存在性、consumed raw Git blob、working/index/untracked均通过。实际输入是已commit的414 manifest及其六个固定snapshot、直接A spec/R0；live六逻辑源前后须原字节相等，不是“允许任意dirty”。C工具/identity/registry另需tracked且相对HEAD干净与精确hash；HEAD只用于工具干净度，不成为sourceHead。旧exporter仅增加显式--s5 dispatch及await，原SOURCE_HEAD/legacy strict guards/renderer未变。

八项独立负例均拒绝：null pins、候选registry、伪造reader、未知逻辑source、未知module、computed enum、函数隐藏enum和未知helper。最初未限定node命令解析到26，被原runtime guard正确拒绝；保留失败后改用Root固定Node24重跑，没有放宽版本。

`reviewed-C12/`提供可直接复核的最终metadata字节：registry只改reviewStatus/sourceHead两个字段，normalized SHA `0c0d873ac31398cc916a1a21e7ed0b63544c08484c610cb41dc76558972fc806`；review.mjs为固定A、该registry、identity、manifest02和六工具hash的完整非null pins。Root可在应用11目标时消费这些精确候选，不能把任意新字节填成“已审”。旧209名义身份及完整注册规则的实际构造仍须通过匹配，未知alias不自动合并。

C之后仍须真实metadata-clean guard、portable probes、真实write/check、三产物diff、generated Rust测试和当前整crate验证。本轮未写产品生成产物，也未把作者43纯探针/standalone1test升为Root产物或PG/HTTP/UI。工具边界未见新增P1/P2；整体产品G3/G4仍false。
