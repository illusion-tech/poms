# 实际 reviewDiff 阻塞恢复 15

GET getDiffHistory实际无写；diff已由此前createReadiness POST产生。最新000125 ledger漏记确切owned checklist item的status blocked→ready，真实audit/review/parent同xmin1435。recovery-plan15.json只含精确原件路径/hash、PK/来源证明及恢复步骤，不复制cookie、凭据或原始业务行。

Root可审5文件候选和before/after SHA见apply-manifest15.json。contracts只给reviewDiff设置source-specific readinessDiffReviewItems；ledger通过readiness-bindings精确证明一行status更新，不把整个item表加mutableTables。纯raw比较不经过JS浮点舍入。静态语法及3纯测试通过；对实际不可变原件的离线proof匹配通过。

恢复必须先审精确plan SHA，然后由Root在Debian调用recoverReadinessObservation(ctx,{planFile,approvedPlanSHA256})。ctx用现有createContext({epoch:'g2-business08',run:'main01'})；planFile指本目录recovery-plan15.json的实际WSL路径。代码会拿driver lock、验所有原件/实际完整HTTP/原cookie对应actor/同TX来源，fresh捕获两库139表/目录/对象并要求after零漂移，再对仅补一行ownership的prospective state执行assertRecorded。成功才append ownership proof、把实际已成功response写回slot.diffReview防二次POST，保存旧blocked pin的完成对账原件后移除block。任何不匹配均停，不改业务DB/发HTTP/cleanup。

作者仅只读Private原件并在本工具目录写提案，没有执行恢复、DB、HTTP或修改Root harness/private。旧partial/不完整ledger均保留原标签；不是G3/G4。第7业务裁决仍未批准，未执行period写。
