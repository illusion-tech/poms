精确 metadata-only 恢复提案，作者未执行。000658 实际改派已经成功提交，但返回 **201**，canonical 唯一成功码仍 **200**；659 ledger 已完整、没有 blockedObservation。原 partial/HTTP status 失败永久保留，不能重POST、改期望201通过、伪造200或再造业务。

recovery-plan11.json 来自真实已保留 request/body/headers/response/public receipt、659 ledger 和前后 snapshot。offline proof 已核：请求 cookie 绑定真实 manager；请求URI/目标/源版本1完全一致；项目仅 owner_user_id、row_version、updated_at 变化，1→2；新的 reassignment row、更新project row、audit row 同xmin，audit event/requestId/operator/target/result全匹配；三行latest owned SHA/xmin已经匹配。新 proof 不改 owned，也不清 blockedObservation。

Root 先审核 exact plan/raw hashes，批准 **plan 自身 SHA** 后才能运行：

```sh
node /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/append06/mask-recovery11/recover-mask11.mjs --plan /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/append06/mask-recovery11/recovery-plan11.json --approved-plan-sha ROOT_REVIEWED_PLAN_SHA --execute
```

执行器取得driver.lock，Root createContext 验证原 epoch/source 环境，要求 state bytes 与审定plan完全一致、f.maskReassignment缺失、无blockedObservation/cleanup/fault。重核原件与canonical唯一码200、同TX producer proof；再由 Root 做一次现有 read-only capture，两库全部meta/sequence/object/table rowSHA/xmin与000658-after逐项完全相等，assertRecorded也必须通过。任何漂移都阻断，不重置或泛化白名单。

通过后只备份原state bytes到private，并保存 **actual 000658 body** 到 f.maskReassignment，补 f.maskReassignmentRecovery 与 f.maskReassignmentContractFailure 原件链接（actual201/canonical200/contractPassed=false）。不发送业务请求，不执行业务SQL写，不改SDK/期望状态/源码或旧failed原件。Root 可再运行 MASK09，其生产/改派分支因已有真实body被跳过，继续原权限新增与masked GET断言。MASK业务后续完成也不使此前HTTP contract自动转PASS；状态缺陷仍需Root源码修复、新epoch实测。

作者只运行语法与offline原件/7个负例检查，未取得live current snapshot或apply metadata。这一步是否可执行只由Root对具体plan的审核决定。
