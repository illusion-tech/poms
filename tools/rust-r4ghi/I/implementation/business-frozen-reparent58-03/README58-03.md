58-03 只处理真实Role02停点。006937原上游create=200且006938 ledger完整；首例zero-reparent-to-draft已真实23514、ROLLBACK并verified。第二例在capture(label)第一步segment检查被拒：006944-frozen58-positive-reparent-to-draft-before共49字符，超过48；此时未创建6944文件/目录、未生成第二例intent、未开始第二例DML。afterResponse因此失败，Chrome见502；不能把已提交create当失败重POST。

FS原件核验见facts58-03.json。当前state.json的6aff…是Root暂停时的live观察值，不冒称immutable frozen state pin；恢复工具在精确校验该SHA后才把原始全state复制到新的私有原件，绝不把含凭据state放进仓库。原UI error-1.log、linux-failure.log、done.json均保原SHA，原case1 intent/observation/before/after不写。已只读复核首例两库139表：Native541行、Rust3803行全部行SHA/xmin、meta/sequence/objects一致，无Root/SQL/HTTP写入。

运行修正是固定短label f58-c1-before至f58-c5-after，不把长业务case key放进capture名。新continue入口只接受既定draft1817b9ae-ec3a-4910-aebd-07a2b6963975/project389793fb-0f5b-48ea-a5f1-8515ee572d7f，保第一项对象逐值不变，只跳过已verified第一项。存在任何后续starting/pending/verified或已有proof时拒绝盲重跑。

现有实际SQL执行块逐字保持：先按UUID顺序锁两个实际parent FOR UPDATE，再锁精确frozen participant，核rawSHA/xmin，仅更新白名单单列；finally永远ROLLBACK并结束client。未新增COMMIT、parentless或commit-window动作。剩余四项为positive-reparent-to-real-draft、frozen-user-identity、frozen-role-identity、frozen-zero-weight，仍严格要求原23514及对应guard诊断；其它失败不算成功。

Root顺序：

1. Root先审并按beforeSHA应用三候选，Root源码/产品不由作者改。冻结最终完整business mjs/json helper图到私有JSON，给plan-template58-03.json的currentHelperGraph填真实file/hash；现在仍null，模板不可运行。该私有helper manifest不要放进business目录造成自引用。原Source12产品pin不改，不能用旧Role02 helper图冒充新图。
2. Root保存新私有plan原字节并批准其SHA；必须保持固定旧state/sequence6943、record/create/ledger/case1/三个旧UI partial pins。不得清record、改activeFault/blocked或补fixture。state已有变化则工具拒绝，须先精确对账，不宽松接受漂移。
3. 运行reconcile模式。它只保存原始state的私有副本、读取原证据、做两次新只读fresh快照，两库139表/meta/sequence/objects每次都必须等case1after，并以原owned/borrowed核ledger。只新增consumerChecks.frozenReparent58Resume03[target]的metadata-ready记录和counter，不更新任何业务行，不HTTP，不运行四项DML。

```text
node tools/rust-r4ghi/business/resume-frozen-reparent58-03.mjs --plan <Root私有plan> --approved-plan-sha <真实rawSHA> --mode reconcile --execute
```

4. Root检查reconciliation原件，在同一已批准图、没有其它PG/HTTP/driver介入的边界，运行remaining模式。它核原state私有副本、限定metadata投影与原record，重新fresh等case1after后，才调用同一个已锁parent且永ROLLBACK的执行块做剩余四项。它不调用create、freeze、public race或任何HTTP。中断/失败会保留starting/pending事实，不可用该入口盲重跑。

```text
node tools/rust-r4ghi/business/resume-frozen-reparent58-03.mjs --plan <同一私有plan> --approved-plan-sha <同一真实rawSHA> --mode remaining --execute
```

5. 成功后仍在state.consumerChecks.frozenReparent58[target].proof保存原aggregate kind=actual-frozen-zero-and-positive-reparent-to-real-draft-and-identity-weight-23514、actualCaseCount=5、cases五项全verified、原create pair、原actualGuard和全回滚标志。case1对象逐值保持，proof额外resume58_03明确剩余真实执行4项；consumerChecks.uiRoleFrozenReparent58镜像同pin。续验metadata独立在consumerChecks.frozenReparent58Resume03[target]，不写旧producer fixture。
6. H36只在该五项proof成立后，真实重新加载现draft/current/detail，继续UI freeze和合法public revised-draft race。原create不重放；旧Role02 partial不覆盖。此候选不包含H36操作，也不宣称UI/freeze/race或G3/G4通过。

作者仅FS复核、7项纯回归、三语法/help/20静态import图；0SQL/HTTP/Root写、0实际剩余DML。new current helper graph必须Root现场绑定；所有真实续验结果为空，不能把本提案当实际完成。
