# POMS API Seeders

本目录用于存放 `POMS API` 第一阶段的初始化 seeders。

当前约束：

- seeder 只用于初始化开发或测试所需的最小基础数据
- 业务权威结构仍以手写 migration 为准
- seeder 不应替代 migration，也不应隐式修复 schema

当前已实现：

- 幂等写入 `Project` 样例数据
- 幂等写入 `Contract` 样例数据
- 复用开发期登录用户与组织样例，保证本地联调口径一致

当前仍保留为开发期 fixture 的内容：

- 登录账号、角色、组织与导航仍由应用内 fixture 提供，待平台治理表结构落地后再迁入数据库

建议后续继续补入：

- 平台治理域真实表结构对应的 seed 数据
- 审批与统一待办最小样例数据
