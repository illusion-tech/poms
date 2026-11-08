本封件是 Source12 / API135 的新工具 edition。它不改旧 A01/A02/B02、134 producer 或历史失败原件，也不改产品、公共 schema、源码输入、17/19/40 原件或 M97。M98 仍为未登记候选。

精确输入为 004534 frozen candidate（raw SHA b5c86c8882657aac1e1affc153510a728bc304943265e51a230b6be19a0429b7）、406 源码 SHA 5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa、API135 binary de8eaaf6ce15a2054380e25f3151c21611cf0bf760230c7336745d80850d9cff。141 个当前 business helper 加候选后共 152 个；source58 排除自身、另包含 4 个外部实际消费源，共 155 个 helper pins。源数、epoch/run、binary 均为显式固定值，没有 dirty override 或动态放宽。

Root 非作者审核并按 manifest80.json 精确应用全部 13 个文件后，在没有其他 driver 的同一个 g2-business12/main01 中按以下顺序执行。全部真实 SQL、HTTP、锁调度和证据登记只能由 Root 执行。

1. Stage 与 58C 共用一次纠正成功：运行 `business/driver.mjs run --epoch g2-business12 --run main01 --phase shared-stage-race80-01 --stage shared-stage-race58`。先真实登录，读取实际 003079 L1 successor、当前完整批次和公共 preparation；同阶段证据替代，allocationCorrections 始终为空。全部实际派生必要写族依次 FI，逐项 primary=1、fallback=0、278 表完整回滚。其中 F-stage-evidence 同一失败请求额外观察真实 non-anchor project waiter；没有提前的正常纠正。最后两次真实登录、重新只读核保存纠正 body/hash 未变，另取当前 capture preparation，等赢家真实 auth throttle 到期，持 primary head barrier。必须观察 correction→control/Head 与 capture→correction/project 链后释放，要求纠正201、capture409/operating_preparation_changed。两原始 HTTP、共同 before/after、一次 winner ledger，loser 只有绑定真实 session 的五列精确 raw touch 可单列。若先跑无竞态 `shared-stage-sweep58`，它会消费同一个 body，不能再把另一次请求当58C；正式顺序应选择 race 入口。
2. 仅第一步完整封成功后，运行 `business/driver.mjs run --epoch g2-business12 --run main01 --phase shared-tax-fixture80-01 --stage shared-tax-fixture58`。这是真实普通 producer：在仍为 execution 的 EF receiver 生产新 Expense1130/净1000/税130→确认→E→F人工同日归属→F pending130/抵扣影响0→完整2/1共享批次→两项目实时 G 消费。所有 UUID、版本、日期、币种与证据均取真实响应/owned行；不借 SQL 造源，不回填历史。必须先有实际 F.tax 再消费。共享份额没有 receiver-local F 关系时继续 unknown/null；不复制或缩放 source-project pending。最后只读产生 Tax correction 的完整当前 preparation、固定 body 和实际库存，不在此步执行纠正。
3. 运行 `business/driver.mjs run --epoch g2-business12 --run main01 --phase shared-tax-sweep80-01 --stage shared-tax-sweep58`。仅替代同 pending 税务证据，不提供 allocation override；全批隐式重建、全部真实 G/H 目标必要写族逐项 FI，最后同 body 正常201。保留全部旧事实、原2/1权重、量纲、算法、源净税毛额及未知税务结论；旧 current 只按实际 live 关系移动。

每步都在第一业务写入前校验 canonical operation/enum 与完整 source58 图；实际库存按当前真实来源、全部 terminal、旧 binding/review 派生，示例87/67不是可替代实际库存的固定数量。出现任何真实期间目标会拒绝，需要另外审定的 period 库存，不能删掉它。普通 consumed producer 的409仅为负例，不计 FI。

每个成功前后对所有旧行逐项检查 key/原字节金额/xmin；所有新增或变化行必须属于必要库存和唯一 winning xmin，或单独精确证明的 losing-session raw touch。basis/result 全批替代保原金额/权重/measurement，stage 不造 E 成本，tax 不假定抵扣。现金核验按每个 terminal 的真实 sourceWindowEnd/knowledgeCutoff 从共同 before 逐条确定全部 confirmed receipt，核实际 receipt/basis/term/币种/净税毛额，再计算精确 margin/ratio。旧窗口外的新 C 回款不得强塞；窗口内真实新回款也不得为“等于旧快照”而忽略。新测试及134历史三context FS形状回归仅验证工具，不冒称135 HTTP。

所有未知 ACK、非预期状态、未观察到排队、401/403、错误409、失败后不完整对账都会保留 pending/partial。正常201在后置断言之前先保存；不得自动重POST、重建项目、刷新保存 CAS/hash、撤掉 blocked 或删除旧原件。竞态异常仍释放自己的控制事务并等待所有已发请求结束，之后只允许依据实际原件另审对账。

本封件实际只运行 Node24 纯/文件系统验证：Windows当前全部23个test files共125项、Linux新增4个test files共22项全过，12个mjs解析通过；实际134/003079三context现金字节/日期/关系形状回归通过。作者未连接DB、未发送HTTP、未做迁移/产品/Git修改。Root审核/提升与随后真实结果必须另留原件；G3/G4仍未认证。
