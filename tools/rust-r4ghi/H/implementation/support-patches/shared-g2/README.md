# Shared / Native G2 接入候选

只供 Root 审查后单写应用。此目录不改产品、不生成或覆盖正式 OpenAPI/client、不执行 HTTP/DB，也不自签 Gate。

`build-shared-g2.py` 以有效 v2 的 128 schema 加 Root `g2-public-delta01.json` 生成 129 schema，新增 `LegacyOwnerAnchorView` 第三严格分支和 required `OperatingPreparation.proposedAffectedTargets`。上一轮 128-schema 产物、生成工具和已跑隔离证据保持原件；输入原字节另存 `inputs/`。

`prepare-canonical.cjs` 用 AST 删除 canonical shared 中 136 个旧类型/Schema 声明，改由独立 generated 模块导入并在本地重导出；所有原内部 helper 保留对相同公开名称的引用。生成模块不回引 canonical 文件，避免循环。原 enum definition framework 追加 normal/unknown 的中文 Label/Severity 与 conditional-completed；Value、values、labels、options 仍由原 helper 派生。独立编译已验证原内部引用，不通过 any、cast 或 optional 化绕过。

`rust-r4ghi-frozen-native-reference.ts` 是 candidate9e 完整原始 Shared 的逐字节私有副本，SHA256 为 `d962b8267030c8277f760b8bd6471e62491ee7fbd6353226f6291d3ff3a18db1`，只给旧 Node 服务/控制器使用，绝不从公共 shared index 导出。九个实际 import 位点已改私有引用。DTO 仍读现代 canonical；legacy `@Body` 采用旧 schema 验证、旧类型注解，并显式用 `@ApiBody` 保留现代 DTO，使全局 Zod pipe 不先错误套用现代 required 字段。

新增 method guard 保留原全局 SessionAuth/CSRF/Permissions guards；随后在任何 Zod pipe 前拒绝带 inputVersion 的显式协议。三个新 I 方法使用相同 guard 并在方法体再次显式 422，无伪 producer。F 的 `project-stage-record` 仍是 free string evidence sourceType，guard 对实际 attributionEvidence/sourceReferences 分支显式拒绝，没有扩 DTO enum。原 R5 create、archive create/replace/void 的隐式 201 未改。

由于 ORM 已正确扩展了 stage/risk 及 nullable 税额，旧服务有 74 个真实读取边界不能直接当旧枚举/旧非空值使用；候选用私有冻结 schema 逐值验证，遇新语义显式 422，不改实体、不填零、不伪造 source。三个严格 union DTO 使用具有精确 schema/constructor 类型的 `createZodDto` 值并固定 Swagger 名称，避免 TypeScript 禁止的 extends-union；未降低联合分支或必填字段。

Zod 的 JSON-schema renderer 不保留所有 runtime refinement 的 allOf/oneOf。已提供同一次生成的 `public-contracts.g2-129.schema.json` 作为精确源。当前正式 spec 是 OpenAPI 3.0.0，而源是 JSON Schema2020-12；Root 仍须在统一生成时做版本明确的语义/nullable/const 规范化和客户端验证。附带的原始 overlay 纯函数只允许显式 OAS3.1，拒绝在现有3.0文件中静默植入2020-12关键字；它不是现有3.0流程的直接写入器，不改变规范版本、path、operation 或正式 spec。

独立实际结果见 manifest：canonical shared+原内部 helper tsc 通过；包含 Root 当前真实 ORM 与旧服务的 Native overlay tsc 通过；真实 Zod/Nest/vendor DTO parser、guard 和 metadata 单元检查通过。没有把它们算作实际四组合 HTTP、全 app lint/build/tests、OpenAPI/client 或 Gate 通过。

重新准备顺序：build-shared-g2.py → prepare-canonical.cjs → prepare-native.cjs → prepare-legacy-boundaries.cjs → check-overlay.cjs（再加 --native）→ check-runtime.cjs → finalize-candidate.py。使用 Root 已有 Node24.19.0 完整路径和已有依赖，不安装或改变环境。Root 应先核源 SHA，再按 manifest 校验 proposed 字节单写应用；审查 patch 不能代替当前源字节核对。

pnpm-lock 的只读 diff 仅为 `@pnpm/exe@12.3.4` 的包管理器自举记录及平台 snapshots 共 19 新行，没有业务依赖改变；与先前 pnpm shim 引导现象相符，但 diff 本身不能证明操作者。该文件保持原状，不纳入提案，不恢复或清理。
