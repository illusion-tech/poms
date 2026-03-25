# ADR-013: 平台治理域物理 Schema 边界

**状态**: 已接受 (Accepted)
**日期**: 2026-03-25

---

## 1. 背景 (Context)

随着 `POMS` 第一阶段缺口补齐进入真实实施，平台治理域已开始落首批后端实体与 migration：

- `platform_user`
- `role`
- `org_unit`
- 后续还将继续补：
  - `user_role_assignment`
  - `user_org_membership`
  - `role_permission_assignment`

在此过程中，出现了一个需要尽早定案的问题：

**平台治理域的物理数据库 schema 是否应继续落在 `poms`，还是应单独拆到类似 `core` 的独立 schema。**

这是一个值得在当前阶段就明确的决策点，因为：

- 一旦实体、migration、DDL、文档与测试继续扩大，后续再切换 schema 的返工成本会快速上升
- 平台治理域具备“全局基础能力”的特征，天然容易引发是否应物理独立的讨论
- 若不明确，团队可能在代码实现时各自理解，导致 migration、DDL、文档和实现口径漂移

与此同时，当前已有文档现状是：

- `schema-ddl-design.md` 已明确第一阶段建议采用**单一业务 schema**
- 当前逻辑名称建议为 **`poms`**
- 已落地的核心业务表也都位于 `poms` 下
- 当前第一阶段的核心目标是：**以最低成本补齐平台治理域与提成治理域，确保阶段通过**

因此，需要用一个正式 ADR 把这个问题收口，而不是在开发中继续口头判断。

---

## 2. 决策驱动因素 (Decision Drivers)

- **当前改动成本 (Current Change Cost)**: 现在改还是以后改，哪个成本更低
- **阶段目标优先级 (Phase Priority)**: 当前优先是补齐第一阶段能力，而不是重做物理分层
- **一致性 (Consistency)**: 已有 migration、DDL、实体与文档是否需要保持一致
- **可演进性 (Evolvability)**: 未来是否还能平滑演进到独立 schema 或独立基础域
- **复杂度控制 (Complexity Control)**: 是否会引入跨 schema 外键、迁移、种子与测试复杂度
- **事实明确性 (Decision Certainty)**: 现在是否已经有足够明确、稳定的长期目标支撑立即拆 schema

---

## 3. 候选方案 (Considered Options)

### 方案 A: 平台治理域继续使用 `poms` schema
- **描述**: 平台治理域表继续落在 `poms` schema 下，通过表名表达职责边界，例如：
  - `platform_user`
  - `role`
  - `org_unit`
  - `user_role_assignment`
  - `user_org_membership`
  - `role_permission_assignment`
- **优点**:
  - 与现有 `project`、`contract`、`approval_record` 等表保持一致
  - 不引入跨 schema 外键、迁移、seed 和 ORM 配置复杂度
  - 与当前 `schema-ddl-design.md`、`table-structure-freeze-design.md` 等文档结论一致
  - 最有利于当前阶段以最低成本推进第一阶段补齐
- **缺点**:
  - 物理层面无法单独突出平台治理域的“基础域”属性
  - 若未来明确要做共享主数据基础域，后续仍可能发生迁移

### 方案 B: 立即把平台治理域拆到 `core` schema
- **描述**: 平台治理域表改为位于独立 `core` schema，例如：
  - `core.user`
  - `core.role`
  - `core.org_unit`
- **优点**:
  - 物理边界更清晰，更像独立基础域
  - 若未来确实演进为共享主数据中心，物理结构更接近目标形态
- **缺点**:
  - 当前所有文档、DDL、实体与 migration 口径都要同步调整
  - 会增加跨 schema 外键与迁移复杂度
  - 需要先重新定义哪些对象算 `core`，哪些继续属于 `poms`
  - 当前尚未形成稳定、明确的长期“多 schema”架构目标，容易过早优化

### 方案 C: 暂不做正式决策，开发中再看
- **描述**: 当前不形成 ADR，继续边做边看。
- **优点**:
  - 短期看起来决策成本最低
- **缺点**:
  - 最容易导致实现、文档、migration、实体和团队理解漂移
  - 会把低成本决策点拖成高成本返工点

---

## 4. 决策 (Decision)

**最终选择：方案 A —— 第一阶段平台治理域继续使用 `poms` schema，不单独拆分 `core` schema。**

进一步约束如下：

1. 第一阶段平台治理域物理表统一落在 `poms` schema 下。
2. 平台治理域边界通过**表名**与**模块边界**表达，而不是通过第一阶段多 schema 物理拆分表达。
3. 当前已落地与后续待落地平台治理域表，统一采用以下命名方向：
   - `platform_user`
   - `role`
   - `org_unit`
   - `user_role_assignment`
   - `user_org_membership`
   - `role_permission_assignment`
4. 当前阶段不引入 `core`、`platform` 等独立 database schema。
5. 若未来确认平台治理域将长期演进为跨系统共享主数据基础域，再通过新的 ADR 单独评估“从 `poms` 迁移到独立 schema”的收益与成本。

---

## 5. 选择该方案的原因

### 5.1 这是当前阶段最低成本的最佳实践

当前第一阶段的核心目标不是重构数据库物理层，而是：

- 补齐平台治理域
- 补齐提成治理域
- 让第一阶段真正通过验收

在这一目标下，继续使用 `poms` schema 的成本最低、推进最快、与现有实现最一致。

### 5.2 当前并没有足够明确的“更好目标”支撑立即拆 schema

虽然“平台治理域是基础能力，因此应该拆到 `core`”是一个合理方向，但截至当前，以下问题仍未正式收敛：

- `core` 的边界到底是什么
- 横切对象如 `approval_record`、`todo_item`、`attachment`、`audit_log` 是否也应进入 `core`
- 未来是否真的会把平台治理域抽成共享主数据或独立基础服务
- 是否值得为此在第一阶段承担多 schema 的复杂度

因此，`core schema` 当前仍然只是一个**可能的未来演进方向**，还不是一个已经收敛的、足以支持当前立即改造的明确目标。

### 5.3 当前文档与实现都已以单 schema 为前提

已有设计文档已经明确：

- 第一阶段采用单一业务 schema
- 逻辑名称建议为 `poms`
- 不按域拆多个数据库 schema

当前代码和 migration 也已按这一口径开始落地。此时强行切换为 `core`，会把当前“补齐能力”的问题放大为“重做物理边界策略”的问题，收益低于成本。

### 5.4 后续仍保留可演进空间

继续使用 `poms` schema，并不意味着未来永远不能拆分。由于当前已通过：

- 表名表达域职责
- 模块边界表达代码分层
- 关系表与主表命名清晰

未来若真的需要拆为 `core` schema，仍可以通过独立 ADR 和受控 migration 演进完成，而不会丢失当前结构语义。

---

## 6. 对现有设计与实现的影响 (Consequences)

接受该决策后，以下内容应统一保持一致：

- `schema-ddl-design.md` 中“第一阶段采用单一业务 schema `poms`”继续有效
- `table-structure-freeze-design.md` 与 `data-model-prerequisites.md` 中的平台治理域表继续以 `poms` 下逻辑表为准
- 平台治理域实体 `schema` 字段继续使用 `poms`
- 平台治理域 migration 继续落在 `poms` schema 下
- 不新增 `core` schema 相关工程配置、迁移约束与测试路径

---

## 7. 落地约束 (Implementation Constraints)

第一阶段平台治理域后续实现需遵循以下约束：

1. 不因“平台基础能力”语义而擅自切换到独立 schema。
2. 若有人提出改为 `core` schema，必须先更新 ADR，而不是直接改代码。
3. 当前所有新增平台治理域表一律使用 `poms` schema。
4. 平台治理域的“基础性”优先通过：
   - 模块边界
   - 表命名
   - 关系建模
   - 授权与导航规则
   来表达，而不是通过当前阶段多 schema 来表达。

---

## 8. 后续动作 (Next Steps)

接受本 ADR 后，建议立即执行以下动作：

1. 在平台治理域设计文档中引用本 ADR。
2. 在 `schema-ddl-design.md` 中补一条说明：平台治理域第一阶段继续使用 `poms` schema。
3. 当前与后续平台治理域实体、migration 保持 `schema: 'poms'` 不变。
4. 后续若要讨论独立 `core` schema，应在第一阶段通过后单独发起新的 ADR，而不是在当前实现中途直接切换。

---

## 9. 当前结论

`POMS` 第一阶段平台治理域的物理数据库边界现已正式固定为：

- **物理 schema**: `poms`
- **边界表达方式**: 通过表名与模块边界表达平台治理域职责
- **当前不采用**: `core` 等独立 database schema

这一决策符合当前阶段“以最低成本完成第一阶段补齐”的目标，同时保留未来在更明确的长期架构目标下再演进为独立 schema 的空间。
