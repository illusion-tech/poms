# 完整共享客户端生成

唯一实现为 `shared-api-client.mjs`，Windows / Linux 使用同一组参数和规范化规则。完整 Nest OpenAPI 仍是生成来源；Rust 七操作文档只参与独立契约对照。

```sh
node tools/openapi/shared-api-client.mjs --check
node tools/openapi/shared-api-client.mjs --write
```

默认 `--check`。`--check` 只在唯一临时目录生成，比较全部文件（含隐藏文件）的路径集合与规范化内容，不写仓库 client；不一致返回非零。`--write` 在生成完整、版本与来源复核成功后同步，保留 `project.json`、`tsconfig.json`、`tsconfig.lib.json` 原始字节；不删除 client 根目录，不跟随 symlink/junction。生成器失败时不进行同步。文件系统同步本身不是事务，I/O 失败会返回错误，不能当作完整成功。

Nx `shared-api-client:generate` / `check` 保留 `poms-api:openapi` 上游依赖，后者刷新 `libs/shared/api-spec/openapi.json`。因此整条 Nx check 链会写规范；直接 Node check 只读受审输入和 client。不存在任意 `inputSpec` / output override；子集、缺失/重复 operationId、schema 缺失、外部 `$ref` 和输入漂移都会在同步前拒绝。

`shared-api-client-baseline.json` 是 R1D 的输入保护清单，绑定 `e951b76b` 的完整规范、配置与锁文件，包含 291 条 method/path/operationId 和 585 个 schema 名称。它不复制 schema 结构、不生成产品类型。working tree 与 index 独立检查；生成前后复查来源及三个手管元文件。来源指纹仅做 UTF-8 CRLF→LF，与输出规范化是两回事。后续契约变更需先审阅并显式更新该清单，工具没有自动接受新基线的选项。

生成器固定 `7.20.0`，JAR SHA256 固定为 `871e0155287a87b579ff31096b2d45b1f95a115edfe631411ec6cff4848d0f03`。来源为 [官方 Maven artifact](https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/7.20.0/openapi-generator-cli-7.20.0.jar)，由主运行器预先下载校验；本工具不安装或下载依赖。直接调用该 JAR，保留配置中的 `ngVersion:21.0.0` 和原 `--skip-validate-spec` 参数，不升级模板。

工具位置的优先级：

- JAR：`--jar <路径>` → `POMS_OPENAPI_GENERATOR_JAR` → 仓库 `tmp/rust-r1d/generator/7.20.0.jar` → 已安装 npm wrapper 的 `versions/7.20.0.jar`。相对路径以仓库根为基准。
- Java：`--java <绝对路径>` → `POMS_OPENAPI_JAVA` → `JAVA_HOME/bin/java` → PATH。必须为 Java 17+；显式配置错误不会静默回退。允许 Java 安装自身使用合法符号链接。Java 子进程不继承会改变 JVM 行为的 `JAVA_TOOL_OPTIONS` / `_JAVA_OPTIONS` / `JDK_JAVA_OPTIONS` / `JAVA_OPTS` / `CLASSPATH`。

例如现有 Windows JDK 可用 `--java "C:/Program Files/Java/jdk-17/bin/java.exe"`，无需修改全局环境。结果 JSON 记录 Node/Java/JAR/来源与工具指纹、完整逐文件 SHA256、比较差异及临时目录；临时目录在成功或失败后均清理。`manifestSha256` 是按相对 POSIX 路径排序的 `{file,sha256}` 数组的紧凑 JSON SHA256，便于跨平台比较；不将时间、日志或临时绝对路径混入内容清单。

四个原 PowerShell 入口只委托 Node。独立规范化可用 `node tools/openapi/shared-api-client.mjs --normalize <路径>`；`--java-info` 输出实际 Java 选择，供旧 `Set-Java17Environment` 适配器使用。

## 规范化证据与测试

旧规则按字节保留：含 NUL 的文件跳过；按旧 BOM 检测读取文本；CRLF/裸 CR→LF；仅删除换行前 ASCII 空格/Tab；连续末尾 LF 收为一个但不补缺失的 final LF。文本未变则不重写，保留原始字节、BOM 和 mtime；发生规范化变化时写 UTF-8 无 BOM。Unicode 空白和末尾 U+2028/U+2029 不按空白或最终 LF 清除。

`normalization-oracle.json` 的 21 组输入/输出和重写标记来自实际 Windows PowerShell 5.1 执行原提交中的完整旧脚本。重录器校验原脚本 SHA256；默认 `--check` 不刷新预期。Linux 的 Node tests 直接消费这些已冻结字节，不安装或调用 PowerShell。

```sh
# 跨平台工具与文件系统测试，明确注入 generator double；不作为实际生成通过证据
node --test tools/openapi/shared-api-client.test.mjs

# 固定 Java/JAR 的真实生成、并发 check 与 CLI 负例
node --test tools/openapi/shared-api-client.integration.test.mjs

# Windows 专用：再次执行原旧 PS 脚本，核验已冻结观察
node tools/openapi/capture-normalization-oracle.mjs --check
```

单元测试还覆盖 source/index 抵消、未跟踪输入、生成期间元文件变化、缺失/额外/隐藏文件、坏 JAR/Java、路径越界和 symlink、失败不写目标及唯一临时目录。真实集成测试在 Windows 额外执行旧 PS check/normalize 薄入口；Linux 的矩阵不包含 Windows 适配器。两端实际完整 579 文件必须与仓库一致并有相同内容清单，不能只以生成器 exit code 认证。
