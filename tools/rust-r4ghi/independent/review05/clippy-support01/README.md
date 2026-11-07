# 非common clippy 支持候选01

按Root分工，仅在本目录准备9份完整候选，针对clippy03指定范围24条诊断；Root产品未写入。before原字节、candidate原字节、SHA、完整patch与诊断原文均已保存。`manifest01.json`中的base hash必须在Root采用前精确相符。

修正范围：移除unused json import；保留未用查询并传播其原错误、仅命名_links；保留private scope marker、授权wrapper、AuthService Arc和旧UUID helper，使用明确下划线名称；never_loop改为第一元素if-let，保持原来首项成功/拒绝即返回；折叠条件保留短路顺序和所有exact-K/Scope/锁参数；冗余into_iter移除；原SQL六元组起类型别名。无blanket allow，无授权/物理事务/purpose调用删除。

VerifiedProjectStageFact改为在完整provenance验证后缓存已验证typed IDs/stage/hash，getter不再expect；原来源加载、sequence、sourceRef和全部实际校验保留。OpenAPI静态invariant用显式match/let-else保持原panic拒绝，parse错误保留Debug详情，没有默认空文档或吞错。

固定Rust1.99.1 rustfmt解析/格式化已在candidate路径实际通过；私有下划线保留项另用rustc1.99.1 -Ddead_code小探针通过。所有`.await?`数量保持，除已说明getter/static-panic文字，SQL/audit/业务字符串逐文件一致。未执行整crate clippy，须Root独立审查并合并common/G/H修复后统一真实运行；本候选不是独立证书或G3/G4。
