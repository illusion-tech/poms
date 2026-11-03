# R4 完整生成输入检查点 S3 候选

当前为 **Pending / input-only**，不是整批G3、交付或合并许可。联合G1已明确授权37入口的DTO/读模型/必要UI变化；此检查点只处理旧完整client生成输入冻结与新契约的显式差异。

实际 `contract-generation01` 已导出237 paths /291 operations /595 schemas，原Native585全部保留，新增10schema、修改21个既有schema，method/path/operationId三元组完全相同。随后client write被原保护拒绝：`.gitattributes`（G1新raw binary保全规则）与新spec不同于旧frozen sourceHead。失败原件保留，当前client未生成或认证。

`generator-checkpoint02/candidate02.json`列明原件、来源、schema增量和10个输入文件逐件pin。595是新的**完整**schema数，不能设为Rust subset或动态下限。生成器唯一拟修改是loadBaseline的完整schema精确count585→595；原六项保护（Git working/index/untracked、源指纹、固定generator/JAR/config、完整path/method/operationId/schema集合）全部保留。Generator7.20.0、JAR SHA、wrapper/config/metadata路径和其余四份protected input不变。

执行顺序：先非作者复核此输入变更和实际导出/Native编译/Shared边界测试；再在本batch分支创建永久保留的S3输入提交，**不合main、不关闭Issue、不表示新生命周期已验收**；将client-baseline.sourceHead与六protected指纹/完整595 inventory显式冻结到该固定提交；再运行原guarded write/check。保留旧baseline/spec/generator原件与首次保护拒绝，不重写旧S2或其它历史证据。

新Native只做已声明编译适配，实际业务参考继续独立1730f304检出；完整新contract由Rust及更新后的UI验收。C为Shared候选作者，Root单一实际产品写入/运行，非作者reviewer只读；本批实际HTTP/PG/UI/fault/race、最终G3/fixed/main/G4仍待完成，101/57保持Open。
