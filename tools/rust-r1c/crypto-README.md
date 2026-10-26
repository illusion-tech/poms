# R1C 密码、token 与 v1 密文兼容

TypeScript 产品来源固定在 `1013afef266602e7c98eb433bd0f14483be3d7fd`。`crypto-oracle.mjs` 直接执行原 `SecretCipherService`、从原 AST 提取的 `createOpaqueToken` / `hashToken`，以及安装的 bcryptjs 3.0.3。没有复制 bcrypt 或 AES 算法作为预期来源。

```bash
node tools/rust-r1c/crypto-oracle.mjs --check
node --test tools/rust-r1c/crypto-oracle.test.mjs
```

`--check` 只比较冻结的 `crypto-golden.json`，不刷新预期。只有经审查的来源或工具变更才显式执行 `--write`。来源工作树、暂存区与 untracked 输入独立检查；Node 24、TypeScript 6.0.3、bcryptjs 3.0.3、Nest 12.0.1、Prettier 3.8.5 均核对实际安装版本。指纹只规范化 CRLF→LF，并保留原 TS、工具、cases、bcryptjs 源文件和 R0F 密文 witness 的来源。

原服务运行在仅提供 Buffer、合成 `process.env` 和白名单 require 的 VM；只允许 Node crypto 和 Nest common，不载入应用/env loader。crypto 仅替换 randomBytes；key、IV、密码、hash 均为公开合成测试材料。普通 `--check` / `--write` 验证 fs/net/child_process import 与未知 lexical 拒绝。运行器自身读取列明源码、依赖与 fixture；未向产品代码提供文件、网络、数据库或真实进程环境入口。

当前新增 193 项观察：119 bcrypt 比较、7 加密、49 解密、9 key/options、4 token 编码、5 token hash。这是输入观察数量，不是 Rust test 数。Rust 另直接消费旧 R0F 13 个 cipher-v1 样本；旧 golden 不修改。

## Rust 接口与现行兼容行为

- `verify_bcryptjs(&[u16], &str)` 保留 JS 码元，标准 pair 编成 UTF-8、孤立 surrogate 编成 WTF-8。库按第 72 字节截断，包括截断于多字节字符内部；不 trim、不 NFC、不将 NUL 当终止符。短 hash 返回 false，坏 prefix/cost/salt 的原异常与 false 分支分别测试。真实 bcrypt 密码运算由锁定 crate 完成；格式适配重算后恒定时间比较文本，避免严格 hash decoder 改变原结果。调用者通过 `spawn_blocking` 运行。
- `create_opaque_token()` 使用 OS 安全随机 32 bytes，再 base64url 无 padding。`hash_token` 为 UTF-8 SHA-256 小写 hex；`verify_csrf_hash` 保留 null 与错 hash 行为。运行时没有固定熵源配置。
- `SecretCipher::from_env` 只接收调用方提供的 map，不自行读取 env 文件。默认首个非空 POMS_SECRET_KEY/JWT_SECRET，不 trim；options 可以替换 key 顺序、fallback 和公开错误文本。`from_key_source` 对 Node Buffer 语义的 UTF-8 做 SHA-256，孤立 surrogate 替换为 U+FFFD。
- 运行时加密固定协议为 12-byte 随机 IV、16-byte tag、AES-256-GCM，无 AAD，标准 Base64 的 `v1:iv:tag:ciphertext`。固定 IV 入口为模块私有函数，仅测试直接调用；它不属于公开运行配置。
- 解密保留原 Node 的宽松 Base64（URL-safe、空白/junk、缺 padding、UTF-16 unit 低字节及 `=` 终止）、1–128 byte IV、4/8/12–16 byte tag、尾部字段忽略、解密 UTF-8 replacement。空 ciphertext 字段拒绝，但非空字段解码为空可以认证成功。错误统一为安全 kind 和原公开 unreadable 文本，不透传 OpenSSL 栈或输入。
- `PasswordBytes`、`SecretCipher` 和错误的 Debug 均脱敏；密码字节/key/解密暂存区用 zeroize 管理。返回的业务明文与 token 仍由调用方控制生命周期和日志。

依赖 API 依据为 [bcrypt raw-byte verify](https://docs.rs/bcrypt/0.19.3/bcrypt/fn.verify.html)、[OpenSSL Crypter](https://docs.rs/openssl/0.10.81/openssl/symm/struct.Crypter.html)。`openssl` 使用 vendored 静态链接；最终目标 ABI 和实际 Rust/OpenSSL 版本由主验收记录绑定，文档说明不能代替构建证据。

## 实际 Rust → 原 TS 解密

在主代理提供的固定 Linux 构建环境中，单独捕获公开测试输出：

```bash
cargo test --locked --test auth_crypto runtime_encrypt_outputs_for_ts -- --exact --nocapture > crypto-rust.log
node tools/rust-r1c/crypto-oracle.mjs --verify-rust crypto-rust.log
```

应从 `apps/poms-api-rust` 运行 cargo，Node 命令从仓库根目录运行并传入同一日志的路径。Node 验证器检查输入只包含已登记的公开 case，再调用原 TS decrypt 处理 Rust 实际随机密文；空明文仍按原服务拒绝。它不修改 fixture，并在读取前拒绝 `.env` / private 路径。Windows 与 Linux 的原实现结果及该双向命令是否通过，均以主代理本轮实际日志为准。

本工具没有验证账户读取、session 持久化/并发、Cookie、HTTP guard/filter、真实密钥生命周期或部署；这些由 R1C 其他验收材料分别证明。它不会连接 PG17、PG15 或 TEST，也不执行 migration/seed。
