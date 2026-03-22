# POMS API Seeders

本目录用于存放 `POMS API` 第一阶段的初始化 seeders。

当前约束：

- seeder 只用于初始化开发或测试所需的最小基础数据
- 业务权威结构仍以手写 migration 为准
- seeder 不应替代 migration，也不应隐式修复 schema

建议优先在后续补入：

- 基础权限或平台级字典
- 开发环境演示账号
- 最小导航与组织样例数据