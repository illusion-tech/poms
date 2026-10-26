# R2B 原权威导出与排序数据

`export-roles.mjs` 只从冻结的原 TypeScript service、shared Zod schema 和完整 OpenAPI 单向生成权限字典、系统角色最低集合、六路径八操作的规范子集以及 schema oracle。它同时检查 working tree、index 和受保护路径的 untracked 文件；不连接数据库。

```sh
node tools/rust-r2b/export-roles.mjs
node tools/rust-r2b/export-roles.mjs --check
node --test tools/rust-r2b/export-roles.test.mjs
node tools/rust-r2b/verify-openapi.mjs tmp/rust-r2b/rust-subset-openapi-final.json
```

`verify-openapi.mjs` 核对最终 Rust `--openapi` 导出的 16 路径 18 操作；角色六路径八操作的完整 metadata 和 11 个可达 schema 必须等同原完整规范。剥离角色部分后，它递归调用原 R2A、R1C、R1A 校验器继续验证继承十操作，并检查原完整规范与 579 个客户端文件在 working tree、index、untracked 三轴保持不变。它不改写规范或客户端，也不替代运行验收。

`export-roles-collation.mjs` 绑定 ICU4X revision `38a49da495248dd1ded84cf306e4ca42e64d5bb3`（实际 package 2.1.1）与官方 ICU 78.1rc 的 Unihan Root/Jamo 两份原始 TOML。`collation-export/` 使用独立 Cargo.lock，以安全的 typed provider API 读取这些本地源文件并导出数据；运行时同时替换两份有关联权重的 payload，其他七个 markers 使用同 revision 的 Baked 数据。`collation/source.json` 记录原始 archive、输入、producer、lock 和输出的 SHA256。

`collation/root.json` 与 `collation/jamo.json` 必须保持 opaque bytes，禁止 JSON.parse/stringify、通用 JSON 格式化或手改权重。Root 含有不能由 JavaScript Number 无损表示的 u64。仓库 LF 策略也适用于 producer 和本地 TOML 源文件。

准备好 Rust 1.99.1 及锁内依赖缓存后，可以离线逐字节复演：

```sh
node tools/rust-r2b/export-roles-collation.mjs --check --replay
```

去掉 `--replay` 仅核对现有文件与 Node oracle，不执行 Rust producer。去掉 `--check` 会按实际 Node 24 / ICU 78.3 / CLDR 48 的显式 `en-US` 重新生成有限样本 oracle 与来源 manifest。合法权限键从 `roles-authority.json` 读取，`collation/cases.json` 只保存混合 Unicode 测试输入。

排序验收以 Linux 原 Node 默认 `en-US` 为运行基准。484 个字符串的 234,256 次 pair 比较与 stable sort 覆盖是有限证据，不代表所有 Unicode 字符或不同默认 locale 都相同。真实 Nest HTTP、数据库与浏览器证据由 R2B 验收工具独立产生。

## 最小验证命令

纯验证无需数据库或服务：

```sh
cargo test --locked --offline --manifest-path apps/poms-api-rust/Cargo.toml
cargo clippy --locked --offline --manifest-path apps/poms-api-rust/Cargo.toml --all-targets -- -D warnings
node --experimental-vm-modules node_modules/jest/bin/jest.js --config apps/poms-api/jest.config.js --runInBand --runTestsByPath apps/poms-api/src/app/features/platform/platform.controller.spec.ts apps/poms-api/src/app/features/platform/platform.service.spec.ts
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false NX_DAEMON=false node node_modules/nx/dist/bin/nx.js build poms-admin --configuration=production --skip-nx-cache --outputStyle=static --outputPath=tmp/rust-r2b/angular-production-a
```

真实 HTTP 命令在已核验的 R2B 专用 runner 中执行。runner 须提供对应后端的 `POMS_ENV_FILE`、`POMS_ADMIN_PORT_SEED=800`，以及 Rust 的 `POMS_RUST_API_BINARY`；fixture 与环境工具会继续校验数据库标记、权限、来源与清理边界。它们会运行受控 fixture SQL 和自有后端进程。已有输出必须先按 epoch 保留，工具拒绝覆盖。

```sh
POMS_E2E_ENV_PROFILE=r2b POMS_E2E_MODE=managed-nest node tools/rust-r2b/http-scenarios.mjs nest
POMS_E2E_ENV_PROFILE=r2b POMS_E2E_MODE=managed-rust node tools/rust-r2b/http-scenarios.mjs rust
node tools/rust-r2b/compare-http.mjs linux
node tools/rust-r2b/id-alias-witness.mjs nest
node tools/rust-r2b/id-alias-witness.mjs rust
node tools/rust-r2b/uri-witness.mjs nest
node tools/rust-r2b/uri-witness.mjs rust
```

两个窄 witness 也使用同一受控 runner 和 run-owned main。`id-alias-witness` 观察三种 UUID 写法的六个请求；`uri-witness` 观察本片八操作的 51 个大小写、尾斜杠、编码与原始安全事件路径场景。它们保留完整原响应和审计/状态快照；URI 规范化只处理本片受支持方法与静态段，保留动态 UUID、query 和 OriginalUri，不扩展旧十操作或解码未知路径。

179-case HTTP runner 覆盖八操作的响应、完整错误体、权限/CSRF、DTO、持久化、历史关系、审计与 session 变化。此处记录运行入口；最终修正 epoch 的 HTTP、受控 PG 与四组合 UI 结果以正式 G3 验收报告为准，未完成项保留待执行状态。
