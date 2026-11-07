此为审阅者编写的单文件类型桥候选，未改 Root 产品。新增 apps/poms-api/src/types/mikro-orm-schema.d.ts；exact SHA、完整 patch 与证明见 manifest26.json、candidate26.patch、proof26.json。

根因是实际 app 使用 CommonJS + moduleResolution=Node10。MikroORM7 的公开 @mikro-orm/core/schema 只通过 package exports 指向 utils/AbstractSchemaGenerator.js，磁盘没有 core/schema 路径；Node10 不读取这个映射。库内 SqlSchemaGenerator.d.ts 的继承 base 因而解析不到，既有 skipLibCheck 隐藏了库内导入错误，产品中表现为零参数 constructor 和缺少 config/platform。没有找到仓库 ambient stub 覆盖。之前独立探针使用 root bundler 配置，未复现完整 app 环境，不能当该 app 检查通过。

候选仅把该公开模块的 value typeof 和 generic instance type 转发到它真实的声明文件，完全复用实际 library constructor/protected fields/泛型签名。没有手写伪 fields、any、unchecked cast、修改模块模式或改变 skipLibCheck。声明文件不产生运行时 JS；公开模块的真实运行时 export 仍由 Node package exports 加载。

完整 app tsconfig VFS 重跑：363 原 roots / 402 实际非声明源复现同一 6 个错误；加此声明后 364 roots，诊断 0，Module/CommonJS、Node10、所有既有 options 保持相同，三次程序的 402 源 pin 全同。TypeChecker 明确确认 constructor 参数为实际 SQL driver 或 SQL entity manager，config=真实 Configuration，platform=AbstractSqlPlatform，三者均不是 any。错误 string ctor 和缺失参数负例分别被真实类型检查拒绝为 TS2345/TS2554，证明没有靠失去类型绕过。

原首轮 proof 的 sourceCount=0 是 Windows 路径分隔符收集错误，保存于 first-probe26；已修正路径规范化并重跑完整 baseline/candidate/negative，编译结果本身不变。Root 精确应用后仍应运行实际 api tsc/lint/build/test。本候选不授整体 G3/G4。
