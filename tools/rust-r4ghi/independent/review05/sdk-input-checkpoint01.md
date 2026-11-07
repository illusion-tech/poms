# S5 generator-input checkpoint 必要边界

结论：可以用**单独G2 feature输入检查点**解除当前工具锁定；它不是业务G3/main交付。不得改写永久S4，不得把拒绝当前WIP解释成应关闭guard。

当前实测：原S4 SDK基线239paths/293operations/626schemas、6 protected sources、616 client files。真实`assertFrozenSources`拒绝当前WIP spec，未调用generator，目标616文件内容/mtime manifest完全未变，见`sdk-guard-probe01.json`。当前产品spec242/296/688；EO新schema只能在真实export后登记，不能预先pin预测数量。

## 检查点 A：精确输入提交

1. 先完成EO字段/现代共享schema、DTO、Native参考和当前完整OpenAPI export；一向TS→Rust闭合登记必须消费所有新本地module，保持原R0/S4历史与strict helper/callback/import guard。runtime schema组合冲突应有独立封闭处理，不把旧fragment立成第二current wire SSOT。
2. 在单独G2 corrective记录冻结本次完整spec的raw bytes/hash、每个原始export输入的原字节hash/保存位置、exporter及transformer版本/hash、真实导出命令/退出码/原stdout-stderr和完整inventory。保留原G1及失败轮次；必要产品业务测试尚未通过要明确列出。
3. 精确pin六个protected输入：`libs/shared/api-spec/openapi.json`、`tools/openapi/typescript-angular.config.json`、`openapitools.json`、`package.json`、`pnpm-lock.yaml`、`.gitattributes`。同时保存raw SHA256和工具既有CRLF→LF normalized SHA256，两种指纹不混写。除正式spec变化，其余五源若变更必须另审原因，不能随手refresh。
4. 形成只供本次feature使用的不可变输入commit A，tree必须含上述实际protected字节及原源manifest。A以S4为祖先；A的checkpoint明确G3/G4=false、无main/Issue完成/正式计数提升。若其他产品文件仍WIP，应在原源归档中按实标记，不伪造其已提交、已验收。

## 检查点 B：工具基线与SDK

1. 工具基线`sourceHead`只指精确A；完整paths数组、每个method/path/operationId和所有schema数组从已审A的spec冻结。保留旧293操作存在性并审3新增及现代schema变化。准确调整`loadBaseline`固定counts到该冻结数量，不能用当前动态计数、自增、lower bound或Rust subset替代。
2. 保留6源pre/post working-tree、cached-index、untracked guards及生成前后字节snapshot；没有dirty/index例外、任意input/output覆盖或补齐未知schema的机制。S4祖先证据与旧工具/raw基线保留。
3. 固定当前已验证的Java17 executable/version直接调用（既有工具的最低17+约束保留，不借S5更换JDK）、JAR7.20.0及SHA256 `871e0155287a87b579ff31096b2d45b1f95a115edfe631411ec6cff4848d0f03`；固定wrapper2.41.0和angular config。记录真实Java executable/version，维持清除JAVA工具注入环境，不自动下载/换JAR。
4. 保持`project.json`、`tsconfig.json`、`tsconfig.lib.json`三份手管metadata逐字节不变；隔离temp生成、完整FILES/VERSION检查、normalize后完整tree比较。任何生成/校验/guard失败均不覆盖仓库SDK；不可先write再修输入。
5. 真实全量generate→check验证及必要两个并行只读check、失败不覆盖/工作树与index/untracked/metadata突变负例应绑定A/B。随后应用严格验证的全量SDK，再对真正接线后的UI与所有新方法（尤其close的id参数）编译和浏览器验收。工具结果只认工具切片；产品仍另需真实G3/G4。

## Runtime canonical helper 约束

历史R3AB/R3CDEFG/R3HIJK冻结JSON保持原字节。helper只在runtime消费时将其component schemas映射为当前完整canonical map；先拒canonical不存在的旧schema名，拒local/external悬空引用，核route/method/operationId/status及wire metadata一致。securitySchemes等其他components保留严格冲突校验，末端merge仍严格同名相等。已有独立三fragment对照0差异，见`runtime-fragment-comparison01.json`。为未知schema、缺ref、错operationId和故意冲突准备必要负例，runtime272与完整shared296分开认证；修改业务期末选择政策不在此工具checkpoint内。
