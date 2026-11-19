这是基于 Root 已应用 final03 的五文件 Nx boundary 修复，未改 final03原件或产品。app 的三个直接 generated 依赖全部改为 data-access/contracts。

data-access 新增本地 project-governance-client facade，仅显式重导出实际用到的44个 SDK enum 和22个 SDK type，barrel 以 ProjectGovernanceClient 命名 namespace 导出这个受限本地文件。没有 export* 全 SDK，也没有 data-access 反向导入 app 作者 interface。gateway 留在 app，API class 改从既有 data-access 导出获取；其所需 ContractFinanceApi 原 barrel未暴露，本组额外明确导出该一个 API class。旧详情新增的三种归档 inputVersion enum和 FullProjectDetailView type 也明确导出，不用宽类型或强转。

实际完整 main.ts ngc 叠加本五文件候选为0诊断，sourceStable；实际 facade 中的 SDK值映射与 canonical 请求109项单元断言通过。没有放宽全局 lint、编写假API或修改 SDK/canonical。真实 Nx admin lint/build/DOM 由 Root 应用后统一跑，本组没有伪称 lint已通过。

manifest05提供每个Root原始/候选SHA；proposed为完整字节，originals保留原始字节。Root校验后单写应用。一个新增 facade 文件及四个既有文件需要晋升；SDK空类型/null/boolean/union修复仍由Root生成管线负责。
