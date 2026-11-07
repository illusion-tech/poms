这是 Root OpenAPI export02 的独立纠偏候选；没有修改产品、原 shared-g2 候选、业务 schema 或 duplicate guard。

同一个 canonical `AcceptanceRecordSummarySchema` 在两个路径的元数据不相同：

- Swagger `SchemaObjectFactory.extractPropertiesFromType` 删除显式声明 combinator 旁的 `type`。UUID/日期的双正则产生 `allOf`，直接 DTO 的 string 约束被删；List 的 `$defs` 不经过该属性路径，仍保留 string。
- Zod passthrough 发出 `additionalProperties: {}`，vendor 只转运 boolean，因此直接 DTO 丢失该字段，嵌套 `$defs` 保留。

三文件最小 delta 为显式 combinator 类型加临时内部 marker，在 cleanup 恢复；additionalProperties 转运支持 schema 对象。query 参数也清理和恢复 marker。业务约束不变，真实不一致的同名定义仍抛错。

`proposed/` 保留原换行，`manifest.json` 列三文件原始/候选 SHA。Windows diff 工具若不支持原 CRLF，可按 manifest 验 originalSHA 后拷贝 proposed 字节；不要绕过原始哈希。

实际离线验证：Node24.19.0，实际 Root canonical129、实际 Nest Swagger 和 vendor。全 api-contracts 导出385 DTO 进入真实 SchemaObjectFactory，cleanup 生成706 schemas 无同名冲突；7项断言覆盖直接/嵌套等值、string 约束、schema-valued additionalProperties、query marker 清理、真实冲突仍失败。独立 vendor TypeScript 检查0诊断。没有启动 Nest、HTTP、数据库或完整 OpenAPI exporter；完整导出由 Root 复验。

复现：`diagnose.cjs --all` 观察原件失败；`diagnose.cjs --candidate --all` 使用虚拟候选 overlay；`check-types.cjs` 类型检查。
