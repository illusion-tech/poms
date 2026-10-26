# poms-api-e2e

运行配置与进程生命周期见 [共享 E2E 工具](../../tools/e2e/README.md)。默认 `POMS_E2E_MODE=managed-nest` + `POMS_E2E_SUITE=nest-full` 保留现有14 suites/72 tests；新增 `foundation` 的13 tests使用同一源码覆盖 Nest/Rust 已实现七操作。Rust只运行foundation，external必须显式选择suite并给 `POMS_API_BASE_URL` origin。

managed必须给经过R1D guard校验的明确 `POMS_ENV_FILE`；Rust另给同机 `POMS_RUST_API_BINARY`。foundation需要合成 `POMS_E2E_USERNAME` / `POMS_E2E_PASSWORD`。普通E2E不自动migration/seed/reset，数据准备由[隔离环境入口](../../tools/rust-r1d/README.md)显式执行。完整Nest回归会改变固定fixture状态，复跑前仅在已核marker的R1D两库重新准备；外部服务和PG17不受此入口清理。

```sh
node --test tools/e2e/runtime.test.cjs tools/e2e/api-server.test.cjs
pnpm exec tsc -p apps/poms-api-e2e/tsconfig.spec.json --noEmit
pnpm nx e2e poms-api-e2e --skip-nx-cache
```

external只探测与请求目标，不读取本地DB文件、不启动或停止受测后端。API readiness使用实际HTTP200与database pass；未实现业务不能冒充通过。foundation不使用现有会访问R2 `/auth/profile` 的完整业务登录helper。

`poms-api-e2e` 采用面向域的布局：

- `src/poms-api/*.e2e-spec.ts`：按业务域分组的端到端规范。
- `src/support/*.ts`：共享的 API 客户端、测试数据构建器、断言和工作流助手。

约定：

- 复用共享契约类型而不是在本地重新定义 DTO 形状。
- 在同一个域规范中保留正常流程和保护/负面路径测试。
- 将乐观并发（`409`）和审批拒绝/回滚视为命令式工作流的一流 e2e 范畴。
- 将读侧断言视为一流的 e2e 覆盖范围，用于阶段关闭：命令成功/失败后，验证 `/me/todos`、审批详情和域列表/详情视图反映新状态。
- 对于审批式工作流，覆盖生命周期关闭和恢复：被拒绝的项目在重新提交时必须创建新的审批记录，而不是默认重用旧记录。
- 对于新引入的业务域，除了正常流程外，至少要覆盖一个权限边界（`401`/`403`）、一个无效状态转换（`422`）和一个乐观并发路径（`409`）。
- 使用 `E2E-` 前缀标记运行时创建的业务记录，使用 `e2e-` 前缀标记辅助平台角色；需要清理时只由显式、受控的隔离数据准备入口处理，不恢复普通E2E的隐式seeder依赖。
- 将重复的请求编排放在支持助手中；保持规范文件关注意图和断言。
