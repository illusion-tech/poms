# 完整共享枚举导出

当前固定来源为 S6 输入提交 `2cd1be6029cf1b14ebfb1fc4530af894507a4c5a`，原字节清单为 `tools/openapi/checkpoints/r4ghi-s6/input-manifest01.json`（420项）。原 S4/S5 检查点和 s3 nominal identity 不改写。历史 S5 为330族/338次枚举，当前 S6 仅增加 ProjectInitialOwnership，预期331族/339次；旧族 values 与 aliases 已逐一核对。

保留现有 `node tools/rust-r1b/export-shared.mjs --s5 --write|--check` 入口；目录和参数中的 s5 是兼容名称，实际来源由独立审定的 sourceHead、registry、review.mjs 及新检查点共同固定。新输入不放宽 AST 构造、模块图或原始字节校验。

A 输入与 B 工具/登记分开提交。A 的全部物理检查点路径必须已提交，实际消费 blob 用 git cat-file 校验；working/index/untracked 均与固定 A 比较。六项 live 逻辑源必须在生成前后逐字等于快照。B 的工具和元数据必须 tracked 且相对 HEAD 干净，并匹配独立固定哈希；HEAD 只检查 B 干净，不能替代 A。

历史身份来自 s3 已固定的原对象，禁止拿新生成清单重建历史；相同 wire 列表仍保留不同 nominal 类型。完整生成仍产生 shared-manifest、Rust enums 与完整 generated tests。纯探针、真实 write/check、整 crate 检查和 PG/HTTP 业务验收分开记录；本工具登记不认证产品 G3/G4。
