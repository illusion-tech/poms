# Root 单写接入候选

这些产物仅为待审补丁材料，不是已应用实现，也不构成 G3/G4 证据。

1. `prepare-shared-native.py` 只向自身目录输出。其唯一现代输入为有效 v2 的 128 个公开 schema；保留必填的 literal null，以严格对象、结构联合和条件断言生成 Zod，并用 `z.infer` 导出精确 TS 类型。未识别构造、外部 ref 或环形依赖会停止。金额保持 string；Rust 继续对原始 JSON weight token 做 millionths 校验，生成器不取代此 authority。
2. Root 应使用 TS AST 把现代声明接入 canonical `shared-contracts.ts` 或独立 generated 模块；被替代的同名声明只能保留一个。枚举的 `Value` / 中文 Label / Severity 仍由 Root 补齐，明确 normal/unknown。不能直接 `export *` 两个冲突版本，也不能重命名公开类型绕过精确契约。
3. `candidate9e-shared-contracts.ts` 是 `git show 9e010077...:libs/shared/contracts/src/lib/shared-contracts.ts` 的原始 UTF-8 字节。Root 以独立私有 alias（例如 `@poms/legacy-reference-contracts`）供原 Node business service/controller 的旧返回值和旧业务输入类型使用。`shared-native-candidate.json` 列出实际引用现代重名类型的服务/控制器位置；不改 ORM/entity 的现代持久化 authority、不改客户端 canonical export、不使用 as-cast 或 optional/null 填空使旧 producer 看似支持现代协议。
4. `modern-reference-guard.ts` 是待 Root 放置的真实 Nest method guard。对冻结 operation-map 的现代写 DTO 及 C 回款 basis 协议，保留原 session/permission/CSRF guards，并在 Zod pipe 之前显式拒绝现代 tag，HTTP 422。旧未带 tag 输入仍走冻结旧校验与旧 producer。新增的三个 Rust canonical 动作无旧 producer；Native 如登记参考分支，只能在同等认证 guard 后显式 422。
5. 不把原 Node 隐式 201 批量改为 200。`Create/replace/void archive` 与 R5 create 等原分支继续记录 legacy 201 / modern Rust 200；其余状态漂移按冻结 operation-map 独立分类。
6. Root 接入后才统一生成 DTO/OpenAPI/client，并逐个检查 128 schema required/null/联合/条件语义、HTTP operation 唯一计数、新路由 registry、现代 422 不落旧 producer。必须实际运行 Native/shared/admin lint/build/tests 和真实四组合 HTTP/UI，当前生成文件不能替代这些检查。

H UI 接入使用 `ProjectOperatingReview` 的 typed inputs 和 outputs。Root 用现有 client 执行两个 POST，成功后同时重载 signal/overview/accounting/feedback；阶段选择先 GET 该绑定 detail。子组件不会编金额、成熟度或证据 ID，也不会从空 allowedActions 得出可发放结论。
