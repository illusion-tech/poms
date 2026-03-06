## POMS（Project Oriented Management System）

**POMS 项目导向管理系统** 是一个面向项目型软件销售场景的管理平台，实现公司《销售规范流程制度（试行）》与《销售提成方案制度（试行）》中的关键流程与规则。

本仓库是 POMS 的前端管理后台应用 **`poms-admin`**，基于 Angular 21、PrimeNG 以及 Nx 集成式工作区构建，并使用 **pnpm** 作为包管理工具。

### 技术栈

- **框架**: Angular 21（独立组件/Bootstrap API）
- **UI**: PrimeNG + Poseidon 主题
- **构建与任务编排**: Nx 集成式工作区
- **包管理**: pnpm

### 安装依赖

请先安装 [pnpm](https://pnpm.io/)（全局命令 `pnpm` 可用），然后在仓库根目录执行：

```bash
pnpm install
```

### 开发环境启动

使用 Nx 运行前端管理后台应用：

```bash
pnpm start
# 等价于：pnpm nx serve poms-admin
```

启动后访问 `http://localhost:4200/`。

### 构建

```bash
pnpm build
# 等价于：pnpm nx build poms-admin
```

构建产物会输出到 `dist/poms-admin` 目录。

### 单元测试

```bash
pnpm test
# 等价于：pnpm nx test poms-admin
```

### 结构说明（Nx 工作区）

- 根目录为 Nx 工作区根 `poms`
- Angular 应用 `poms-admin` 位于 `apps/poms-admin`
- Nx 配置位于：
  - `nx.json`：工作区与项目的基础配置
  - `apps/poms-admin/project.json`：`poms-admin` 应用的构建、启动、测试等目标配置

未来可以按需在 `libs/` 目录下拆分公共组件、领域模块和工具库，以更好地支持项目型销售流程和提成规则的模块化演进。
