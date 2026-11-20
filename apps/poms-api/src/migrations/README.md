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

`Migration20261117160000_commission_settlement_unknown_tax`允许最终结算的待闭合税额为NULL，并移除默认0，以保存上游的未知金额。已有值不改写，ORM映射同步nullable。回滚的SET NOT NULL在仍有NULL时会原子失败，不能以回填0代替真实业务处置；本轮只在独立提成测试库应用和验证，目标环境发布需先纳入该迁移。
