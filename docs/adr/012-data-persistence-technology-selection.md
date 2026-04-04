# ADR-012: 数据持久层技术选型

**状态**: 已接受 (Accepted)
**日期**: 2026-03-19

---

## 1. 背景 (Context)

当前 `POMS` 已完成以下与数据持久层强相关的前置收敛：

- `poms-hld.md` 已固定后端模块边界与关键数据可信源
- `interface-openapi-dto-design.md` 已固定写侧接口合同边界
- `query-view-boundary-design.md` 已固定读侧查询视图边界
- `table-structure-freeze-design.md` 已固定逻辑表职责与关系边界
- `schema-ddl-design.md` 已固定命名规则、主外键、唯一约束与索引基线

同时，工程现状已经表明：

- 后端框架采用 `NestJS` + `Nx`
- 当前尚未引入正式 ORM 或数据库迁移方案
- 下一步将进入真实迁移脚本或 ORM schema 编写阶段

在这一阶段，如果不先完成持久层技术选型，后续会在以下方面反复返工：

- 真实数据库产品能力假设
- 条件唯一约束、索引能力与事务策略
- 迁移脚本的组织方式
- 应用层 repository / query 层实现风格

当前用户已明确表示：

- 对 `PostgreSQL` 没有异议
- 对 `TypeORM` 仍有疑问
- 应把 `MikroORM` 纳入同层比较
- 持久层选型需要更重视“类型安全”和“现代化”体验

因此，本 ADR 需要把“数据库产品”和“应用层 ORM”拆开决策，并在完成比较后正式收口为单一路线。

---

## 2. 决策驱动因素 (Decision Drivers)

- **关系模型适配度 (Relational Fit)**: 当前核心模型明显是强关系型、强事务型业务模型，而不是文档型存储模型
- **复杂约束能力 (Constraint Power)**: 第一阶段已明确需要版本唯一、当前生效唯一、强外键、弱引用并存等复杂约束
- **迁移可控性 (Migration Control)**: 建表与演进必须可审阅、可回滚、可精确控制，而不是完全交给 ORM 自动推断
- **NestJS 适配度 (Framework Fit)**: 需要与现有 `NestJS` 模块化后端保持一致
- **查询复杂度 (Query Complexity)**: 经营看板、统一待办、审批追溯、版本链追溯都需要较强 SQL 表达能力
- **团队可维护性 (Team Maintainability)**: 第一阶段应优先选择成熟、常见、与现有 TypeScript 后端生态兼容的方案
- **类型体验 (Type Safety)**: 实体、查询条件、返回结果和仓储接口应具备尽可能强的 TypeScript 类型约束
- **现代化程度 (Modern DX)**: 应考虑现代 TypeScript 生态下的开发体验、API 设计一致性与长期维护感受

---

## 3. 候选方案 (Considered Options)

### 方案 A: PostgreSQL + SQL-first migration + TypeORM
- **描述**: 数据库使用 `PostgreSQL`；数据库 schema 以手写 migration SQL 为单一可信源；应用层使用 `TypeORM` 的 repository / query builder 能力，但关闭自动同步。
- **优点**:
  - 支持部分索引、条件唯一索引、强事务和丰富查询能力
  - `NestJS` 生态成熟，模块化接入成本低
  - 可以同时获得 SQL 精确控制能力和应用层映射便利
  - 适合当前“结构复杂、约束明确、后续仍会演进”的场景
- **缺点**:
  - 需要同时维护 SQL migration 与实体映射，治理要求更高
  - 需要明确禁止 `synchronize = true`，否则容易引入 schema 漂移
  - 类型体验和现代 API 设计口碑并不是当前 TypeScript ORM 里最强的一档
  - 历史包袱较重，部分开发者会质疑其长期一致性与现代化程度

### 方案 B: PostgreSQL + SQL-first migration + MikroORM
- **描述**: 数据库使用 `PostgreSQL`；数据库 schema 以手写 migration SQL 为单一可信源；应用层使用 `MikroORM` 的 entity manager / repository / query builder，但关闭自动 schema 管理。
- **优点**:
  - TypeScript 体验通常优于传统 decorator-heavy ORM，类型推导和 API 一致性更现代
  - 对 DDD / Unit of Work / identity map 这类模型支持更完整
  - 在 `NestJS` 中也有成熟集成方式，适合模块化后端
  - 若数据库结构仍由 SQL-first 管控，可以只把 ORM 用作应用层映射与事务封装
- **缺点**:
  - 团队熟悉度通常低于 `TypeORM`
  - 生态资料、现成示例和招聘市场通用度通常略弱于 `TypeORM`
  - 若团队主要诉求只是简单 CRUD，初期心智负担可能略高

### 方案 C: PostgreSQL + Prisma + Prisma migration
- **描述**: 数据库使用 `PostgreSQL`；以 `Prisma schema` 和 Prisma migration 作为主入口。
- **优点**:
  - 类型体验较好，开发上手快
  - 代码生成和基础 CRUD 体验较好
- **缺点**:
  - 对部分索引、条件唯一约束、多态弱引用这类复杂数据库能力表达不够直接
  - 一旦大量高级约束仍需回落原生 SQL，其“schema 作为唯一入口”的优势会明显下降
  - 当前模型读写分层明显，未必适合让 ORM schema 承担全部数据库设计语义

### 方案 D: MySQL + TypeORM + migration
- **描述**: 数据库使用 `MySQL`，应用侧采用 `TypeORM`。
- **优点**:
  - 生态成熟，常见度高
  - 对基础事务和关系模型足够可用
- **缺点**:
  - 对部分索引、条件唯一约束等能力不如 `PostgreSQL` 直接
  - 当前版本化与“同一主体仅一条当前有效记录”等约束实现成本更高

### 方案 E: SQL Server + TypeORM + migration
- **描述**: 数据库使用 `SQL Server`，应用侧采用 `TypeORM`。
- **优点**:
  - 企业级事务与约束能力强
  - 若组织已有 SQL Server 体系，运维一致性较好
- **缺点**:
  - 当前仓库和前端 / Node 生态没有任何 SQL Server 既有沉淀
  - 本地开发、CI 与跨环境脚本兼容复杂度通常高于 `PostgreSQL`
  - 在未确认组织级数据库标准之前，先选 `SQL Server` 风险偏高

### 方案 F: PostgreSQL + 纯原生 SQL + 不引入 ORM
- **描述**: 数据库使用 `PostgreSQL`；所有持久层操作通过手写 SQL 与数据库驱动完成。
- **优点**:
  - 数据库控制能力最强
  - 没有 ORM 映射漂移问题
- **缺点**:
  - 应用层样板代码明显增多
  - 对标准 CRUD、事务封装、模块化 repository 的开发成本较高
  - 对第一阶段快速建立稳定后端不够经济

---

## 4. 决策 (Decision)

本 ADR 已接受以下完整技术路线：

- 第一阶段数据库产品选用 `PostgreSQL`
- 第一阶段数据库结构演进以 **手写 migration SQL** 为单一可信源
- 第一阶段应用层持久化实现选用 `MikroORM`
- 明确禁止依赖 ORM 自动建表或自动同步数据库结构

进一步约束如下：

1. 最终入选 ORM 只负责实体映射、repository、事务组织和 query builder，不负责成为 schema 权威源。
2. 真实数据库结构以 migration SQL 为准，而不是以 entity decorator 反推。
3. 所有生产环境与测试环境均应关闭自动 schema 同步。
4. 复杂约束，例如部分唯一索引、条件唯一索引、复杂 check 约束、特定索引策略，应直接写入 SQL migration。

---

## 5. PostgreSQL 已接受的原因

### 5.1 为什么数据库选 PostgreSQL

- 当前模型需要强事务、复杂查询和较强索引能力
- 版本表的 `is_current` 约束、历史追溯、跨域列表与经营视图都更适合 `PostgreSQL`
- `PostgreSQL` 对部分索引、表达式索引、JSON 扩展能力更成熟，能给后续演进预留空间
- 对当前 TypeScript / Node.js 生态而言，社区经验和工具链都较成熟

### 5.2 为什么迁移采用 SQL-first

- 当前模型已经先有清晰的逻辑表、约束和索引设计，不适合再反过来交给 ORM 自动推断
- 第一阶段最关键的是“结构可控”，不是“少写几行 schema DSL”
- 条件唯一索引、复杂外键与弱引用并存、后续可能的派生汇总表，都更适合直接用 SQL 精确表达

## 6. TypeORM 与 MikroORM 的最终比较结论

当前真正需要收口的，不是数据库产品，而是 `TypeORM` 和 `MikroORM` 谁更适合第一阶段。

### 6.1 TypeORM 更占优的点

- `NestJS` 集成成熟，模块化接入成本最低
- repository 与 query builder 能较好承接当前分模块设计
- 对标准 CRUD、事务包裹和按模块拆仓储足够实用
- 相比完全手写 SQL，能降低第一阶段应用层样板代码成本

### 6.2 MikroORM 更占优的点

- 类型体验通常更强，API 设计更现代
- 对 entity manager、unit of work、identity map 的模型表达更完整
- 若你更重视“现代化 + 类型一致性”，`MikroORM` 比 `TypeORM` 更值得认真比较，而不是被跳过
- 在 SQL-first 前提下，`MikroORM` 不需要承担 schema 权威源角色，可以专注于应用层映射

### 6.3 最终判断

在“数据库已定为 PostgreSQL、schema 权威源已定为 SQL-first migration”的前提下：

- 如果优先级是“团队通用度、资料成熟度、接入阻力最低”，则 `TypeORM` 更稳妥
- 如果优先级是“类型、现代化、长期 API 体验”，则 `MikroORM` 更值得优先考虑

基于用户已明确强调“类型、现代化”，并结合当前 `POMS` 的版本化、快照化、动作留痕、复杂读写分层和事务边界要求，最终选择 `MikroORM` 作为第一阶段应用层持久化实现。

### 6.4 选择 MikroORM 而不是 TypeORM 的直接原因

1. `MikroORM` 的类型表达更强，更符合当前对类型安全的要求。
2. `MikroORM` 的 API 风格更现代，更符合当前对现代化开发体验的要求。
3. 在 `SQL-first migration` 前提下，`MikroORM` 不需要承担 schema 权威源角色，其强项能够集中体现在应用层映射、事务和实体管理上。
4. `POMS` 不是简单 CRUD 项目，`MikroORM` 的 unit of work、identity map 与 entity manager 模型更适合复杂业务命令和多对象事务协同。

### 6.5 为什么不选 Prisma 作为第一阶段主方案

- 当前数据库设计明显需要优先落地数据库原生能力，而不是优先落地 ORM schema DSL
- 若最终大量能力仍需手写 SQL，Prisma 作为 schema 主入口的收益会被削弱
- 对多态弱引用、复杂索引与细粒度 DDL 控制，Prisma 不是当前最稳妥的主方案

---

## 7. 对现有设计文档的影响 (Consequences)

接受该决策后，后续设计与实现应统一遵循以下口径：

- `schema-ddl-design.md` 默认以 `PostgreSQL` 能力作为第一阶段数据库能力假设
- 条件唯一索引与部分索引在设计层可以正式采用 `PostgreSQL` 语义表达
- `poms-design-progress.md` 中应改为“数据库、migration 路线与 ORM 已定，准备进入工程接入与迁移脚本落地”
- 后续若编写 ORM entity，必须服从已接受的 DDL 设计，而不是反向驱动 DDL
- `SQL-first migration` 不等于允许 ORM metadata 长期漂移；entity / mapping 仍需维持到可解释、可校验的一致程度

---

## 8. 落地约束 (Implementation Constraints)

第一阶段建议进一步固定以下落地约束：

1. 使用 `PostgreSQL 16+` 作为默认目标版本。
2. migration 文件采用时间序列或递增编号管理，确保可回放、可回滚、可审阅。
3. migration SQL 中明确区分：表定义、外键、唯一约束、索引、种子数据。
4. `MikroORM` 配置中明确：
  - 禁止自动 schema 同步
  - migration 不由 ORM 自动推断数据库权威结构
  - 禁止生产环境自动 schema 修改
5. 每个涉及持久化结构的切片都应执行 metadata / DDL 一致性检查；若存在 schema diff，必须区分是真实遗漏、可接受的数据库特性差异，还是低价值工具噪声，而不是直接忽略。
6. 当前仓库若存在全局历史 drift，应单独建立基线治理任务清理；在基线清理完成前，`migration-check` 至少是必跑诊断项，在基线稳定后应升级为 CI 门禁。
7. 复杂查询场景优先使用 query builder 或受控原生 SQL，不强求所有查询都通过实体关系加载完成。

---

## 9. 后续动作 (Next Steps)

接受本 ADR 后，建议按以下顺序继续：

1. 在 `schema-ddl-design.md` 中把“数据库产品待定”改为 `PostgreSQL` 基线
2. 在工程中补入 `MikroORM` 与 `pg` 依赖及基础配置
3. 明确 `MikroORM` 的 entity 组织方式、request context 和事务边界约定
4. 优先为 `project`、`contract`、`approval_record`、`todo_item` 等核心表编写第一批 migration
5. 最后按 `MikroORM` 逐步补实体映射与 repository
6. 在第一轮工程切片后尽快完成一次全局 drift 基线治理，把历史 migration、entity metadata 与 `migration-check` 校验口径对齐

---

## 10. 当前结论

`POMS` 第一阶段的数据持久层技术路线现已固定为：

- **数据库**: `PostgreSQL`
- **Schema 权威源**: `SQL-first migration`
- **应用层持久化实现**: `MikroORM`

这意味着后续不再需要讨论“数据库用什么 / ORM 用什么”，而应直接进入 `MikroORM` 工程接入、migration 组织方式和第一批核心表落地。
