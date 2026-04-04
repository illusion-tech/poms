# POMS 第一阶段最终验收快照

**文档状态**: Archived
**最后更新**: 2026-04-04
**适用范围**: `POMS` 第一阶段阶段级最终探活、验收结论与历史留痕
**关联文档**:

- `README.md`
- `poms-phase1-delivery-roadmap.md`
- `poms-phase1-acceptance-gap-matrix.md`
- `../../poms-design-progress.md`

---

## 1. 验收目标

本快照用于把第一阶段当前已实现的基础设施、业务主干、平台治理、导航治理与统一运行时审计基线，收束成一轮可复核的阶段验收结论，避免继续以零散测试成功记录替代正式收口。

---

## 2. 本轮探活命令与结果

### 2.1 环境与契约基线

- `pnpm nx run poms-api:migration-list`
  - 结果：通过；当前已执行 10 条 migration，最新为 `Migration20260328120000_init_runtime_audit_and_security_event`
- `pnpm nx run poms-api:seeder-run`
  - 结果：通过；成功写入 2 个项目、2 个合同、2 个平台用户（`admin`、`viewer`）
- `pnpm nx run poms-api:openapi`
  - 结果：通过；当前 OpenAPI 已可稳定导出

### 2.2 构建与单测

- `pnpm nx test poms-api --runInBand`
  - 结果：通过；20 suite / 174 tests 全绿
- `pnpm nx build poms-api`
  - 结果：通过
- `pnpm nx test poms-admin --runInBand --testPathPattern=permission.guard.spec.ts`
  - 结果：通过；1 suite / 4 tests 全绿
- `pnpm nx build poms-admin`
  - 结果：通过；`P1-T20` 当轮曾出现 2 条非阻塞 warning，后续已由 `P1-T30` 收口：
  - `bundle initial exceeded maximum budget`
  - `Unable to locate stylesheet: E:\layout\styles\preloading\preloading.css`

### 2.3 端到端验收

- `pnpm nx run poms-api-e2e:e2e --runInBand`
  - 结果：通过；7 suite / 34 tests 全绿
- `pnpm nx run poms-admin-e2e:e2e`
  - 结果：通过；5 条 smoke 全绿

---

## 3. 本轮重要问题与处理

本轮最终探活中发现 1 个真实问题，但已在本轮内收口：

- **导航结构调整后的单测口径漂移**：`navigation.service.spec.ts` 仍按旧信息架构断言根层叶子节点 `dashboard / projects / contracts`，导致 `pnpm nx test poms-api --runInBand` 首次失败。当前已把测试改成递归校验“一级分组 + 二级页面入口”的新树形结构，并重新验证通过。

这说明当前阻塞项不再是功能缺失，而是验收口径需要跟上已落地的信息架构调整。

---

## 4. 阶段验收结论

本轮探活确认：

1. 第一阶段原定硬门槛已全部具备实现证据与验收证据。
2. `P1-S08`、`P1-S09`、`P1-S10`、`P1-S11`、`P1-S12`、`P1-S13` 当前均可按 `Done` 口径维持。
3. `P1-S07` 的“第一阶段是否通过”问题，当前可正式收口为 `Done`。
4. 第一阶段后续不再补新的功能性硬门槛；剩余事项仅包括非阻塞工程治理与后续阶段规划。

---

## 5. 非阻塞保留项

以下问题不阻塞第一阶段正式收口，但应继续留痕并在后续阶段处理：

- 成本 / 应付 / 对账链当前仍为最小事实模型，尚未扩展为完整财务闭环

补充说明：

- `preloading.css` warning 已在后续 `P1-T30` 中通过把预加载样式内联到 `apps/poms-admin/src/index.html` 收口，构建已不再报 `Unable to locate stylesheet`
- bundle budget warning 也已在后续 `P1-T30` 中收口：通过把 `app.configurator`、搜索弹层、右侧抽屉改为按需加载，`notfound` 页面改为懒加载，并清理 `app.topbar.ts` 未使用的 PrimeNG 模块，重新执行 `pnpm nx build poms-admin --stats-json` 后，production `initial` 已从约 `1.45 MB` 降到 `899.10 kB`，当前已重新回到 `1 MB` warning budget 以内
