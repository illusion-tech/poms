# RUST-R3-CO D 交付盘点与统一阶段验收 G1 输入 01

本输入绑定 main `5041275d7ad82af4becbb4462e7213ffe465bc7a`，用于 #97 / 第三线 #100。D 是作者，不承担本批独立 G1/G3/G4。显式目标 `gpt-6.1-sol/max`，Fast 未核实。只静态读取、哈希和生成本目录输入；未运行产品、构建、测试、DB、HTTP、浏览器、WSL、旧 private 或 GitHub 写入。01 保留原件，后续补充另增版本。

## 交付与阶段边界

58 个既有公共操作逐项见 `g1-input01.json.routeRows`；A8/B6/C3/D3/E3/F4/G3/H14/I10/J2/K2，25 GET、25 POST、7 PATCH、1 DELETE，#86–96 scoped G4 已完成。Rust173 操作/138路径/585schemas；Native237路径/291操作/585schemas；client579文件/migrations92。计数和旧 G4 是正式输入，不是本批验收通过。M0 要在统一最终 Rust 候选取得每个 operation 的真实成功 receipt；别名删除、claim/assign/close、reject/revoke、FollowUp replace/void 和 I PATCH 等分支不能以拒绝响应或别的操作代替。

R3 内部边界包含业务号消费、真实客户/联系人/Lead引用、评分事实/明示重算、语义去重快照、人工评分覆盖、转换项目/真实附件复制、FollowUp/Todo、成本/竞标/报价版本及 J/K聚合。通用审批目前仅 `approval/domain.rs` 的 contract/contract-review（R4）、commission-payout 和 commission-adjustment（R5）；R3评分 submit/approve/reject/revoke 在 `leads/service.rs` 独立实现。不能为 R3 虚构通用 ApprovalRecord handler，也不能让尚未迁移的 R4/R5生产命令循环阻塞 R3。R2已交付公共机制只按 R3真实调用边复核；prepared未来事实只认证读取，不认证未来写链。

## 最小充分的统一候选矩阵

纯定义见 `acceptance-cases01.json`，不含 runner、import 或执行副作用。Root集中提供 adapter、实际数据、执行及原件。

- M0：58入口逐项有效调用及原完整路由/契约保护；每入口缺会话/权限拒绝，所有变更入口CSRF，shared dispatch的session/method/URI类按真实实现路径覆盖。拒绝前后核业务图不变。
- M1：真实 Customer/alias/Contact → Lead/I事实 → 明示评分与人工覆盖 approve/reject/revoke → qualify/convert；真实local附件字节及copy集合→真实Project，核状态/关系/评分/快照/审计。
- M2：真实Project→成本/竞标/两报价路径和合法版本历史→F/Todo→J/K与workspace/timeline。另补M0中主链未走的有效命令；不同actor语义no-op核业务版本/快照/审计不变。
- M3：按真实事务/flush路径选必要 business、snapshot、registered audit及相关session CAS故障；整体回滚、恢复后成功重试。Customer/Contact/Lead/override/I CAS、同源F和同target空流F并发、UUID身份、Decimal及current唯一专项实跑。
- M4：四个现存纯旅程 `customerJourney` / `projectJourney` / `leadJourney` / `intelligenceDiscussionJourney` × Linux Native/Rust、Windows Native、Windows浏览器→Linux Rust，共16旅程格；当前build、真实登录/网络/PG，不用mock/注入或失败fallback。四格均补非空plannedSignAt转换。
- M5：E1支持入口实际重放和五alias删除；最终源码/产物、完整规范/client/migration保护、必需lint/unit/build与Rust fmt/clippy/test/release；本批完整图/权限/seed/logging恢复与第二次零变化清理，停止owned环境并保留原始记录。

历史深层双端见证、旧Unicode/边界矩阵、旧平台结果和已解决缺陷只在精确pin与依赖影响分析允许时引用，保留原artifact/日期/标签；不机械全重跑，也不计本批实跑。Native后端未改可按原源引用；1373是含335个Angular文件的混合保护集，plannedSignAt两UI文件必须单列允许delta并实跑，不能称1373全未变。client579/migrations92和公开合同仍不变。

## 已确认的 P2 输入

`D-P2-PLANNED-SIGN-AT-01`：`lead-list.ts:2173` 调用 `toIsoDate`（2503–2507）发送YYYY-MM-DD；data-access `lead.store.ts:214–217` 原样传递；shared-contracts.ts:2626 与 `leads/validation.rs:194–257`要求ISO datetime，原DTO亦来自此schema。`lead-list.spec.ts:1274`只mock store成功并锁定错误date-only。前批独审明确未填可选日期控件。归类existing-baseline-drift，Root两UI文件修复为所选Date.toISOString()，保持公共DTO；四轴实际发送/转换/落库/GET/页面日期及空值回归须通过。未经实跑不能认证修复。

## 54 ignored 的真实分类

逐个文件/行号/测试名/原因和源码hash见JSON。53为显式受控DB/PG15 opt-in：auth11、projection1、database8、foundation4、navigation3、org7、roles8、users11；另1为`process_runtime.rs:15` child fixture，由普通父测试 `blocking_worker_does_not_extend_process_shutdown` 以`--ignored --exact`显式启动。默认测试中的ignored既不等于通过，也不能统称54个未执行PG测试。是否显式重跑旧53项按依赖变化裁定；本批R3必要DB语义由当前PG/HTTP实跑另证。子fixture只有当前父测试实际通过才有当前执行证据。

## E1 本次审定与退出

五alias及canonical原件逐字节相同、均regular，合计419264B；精确5路径/SHA和23直接literal消费者的SHA/用途分类见JSON。23分为旧构建/attestation4、旧环境1、HTTP/PG runner10、UI3、旧source generator2、纯case library3。原工具字节不改，均登记历史入口；新的受支持入口承接manifest pin、frozen operation projection和两fixture builder的归档读取/重放。不能声称历史环境脚本不经适配可原样运行。

本批G1必须重新批准原有范围的暂留，owner Root，deadline2026-11-09不延期，G3前退出。D后续仅在`tools/rust-r3m/e1-*`实现小型strict resolver和支持replay工具/纯矩阵；Root集中实际adapter。不得新增兼容镜像、大目录复制或旧private依赖。

退出验收：支持resolver按(file,bytes,SHA)优先immutable snapshot再canonical映射，禁绝旧活动路径fallback、任意路径或latest替换；实际重放两个manifest及冻结operation投影，实际调用cost/direct-pricing/bid-pricing/bid-with-children builders并比较确定性字段/输出SHA；错误hash/长度/未知pin/路径逃逸/冲突映射失败。Root删除恰好五alias后重跑上述支持用例，证明始终缺失、canonical原字节不变、23消费者支持替代/历史限制全登记。旧脚本纯case import需由支持入口按hash验证后解析canonical依赖，不能重新创建旧路径shim。E1当前未退出、本批未批准，本文不继承上批许可。

全部必要实际验收、独立G3、固定提交/main集成、归档及独立实际G4成立后，才可关闭#100/#97/#85；#57持续Open。本输入仅SourceReady，不是阶段完成或审查结论。
