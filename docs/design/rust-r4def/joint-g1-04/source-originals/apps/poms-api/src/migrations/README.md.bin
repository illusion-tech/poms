# POMS API Migrations

本目录用于存放 `POMS API` 第一阶段的手写 migration。

当前约束：

- 以 `schema-ddl-design.md` 为结构基线
- 以 `ADR-012` 为持久层技术路线依据
- 优先编写显式、可审阅、可回滚的 migration，而不是依赖 ORM 自动建表作为权威来源

建议命名：

- `MigrationYYYYMMDDHHmmss_xxx.ts`

建议先落地：

- `Project` 主对象核心表
- 合同资金域首批主表
- 审批支撑最小表集

推荐校验流程：

- `pnpm nx run poms-api:migration-check`
- `pnpm nx run poms-api:migration-up`
- `pnpm nx run poms-api:seeder-run`
