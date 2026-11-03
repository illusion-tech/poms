# R3 收口 G2 纠偏 01：有效评分命令响应

- 状态：G2 已定位，待真实未修见证、实现、统一候选验收及独立 G3；不是已通过报告。
- 归属：#98 / #97；来源与冻结包仍为 `546c6c243ea6162077cb065ced54c5a8188afe23`，原联合 G1、作者输入和三补充原件保留。
- 分类：existing-baseline-drift，冻结后在本批要求的业务正确性和即时有效评分一致性检查中发现；无新增设计、route、DTO、schema、migration 或产品模块。

`leads/service.rs` 的 `command_summary` 把 active override 固定传为 None。已有 approved 人工覆盖时，update / qualify / close 等命令即时回包会暂时显示 system 有效分，随后 GET 才恢复 manual-override。存储和 system snapshot 可正确，回包本身仍误导调用者。不能为对齐旧实现保留该错误。

修复限 A 已有 leads/ 非 http 文件，在原调用者事务内读取或复用当前真正 approved override，按同一 summary 规则输出。既有权限、业务状态、系统重算触发、人工覆盖状态机、DTO 字段和错误协议不变，不开第二连接，不增加 eligibility。

Root 在新隔离 namespace 用未修精确来源候选保留“approve → changed PATCH 即时回包 → GET”的实际差异。最终统一候选核该命令回包、GET、存储有效分和快照一致；同时覆盖该 helper 的其余实际调用与 revoke 后回退。修复不能替代本批其余六项补缺或阶段验收。

另将 B G2 用例定位澄清记为 tool-noise：`CustomerDetailView` 经 serde(flatten) 后 `ownerOrgName` / `rowVersion` 在 HTTP body 顶层。G1 的现行 DTO/contract 为 SSOT；纯 adapter 使用真实 flat wire，不变更原 G1 输入或公开 DTO。独立 G3 集中核对本纠偏与全部候选证据，#85/#57 当前仍开放。
