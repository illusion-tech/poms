# K86 幂等 Link 真源与事务意图纠偏

依据 Root `g2-K86-correction.json`（SHA `daf3d46f884a1615cf840279cf64d5532bb1ce2f2ac22f26ca5395ff0566b3ab`，implementationAuthorized=true），仅修改 `attachments/service.rs`、`attachments/store.rs`。registry 必须保持 K56 SHA `617f734af15f7e75db2cc69de63343c04104abbd446f322809fb1f1bfc625765`。K56 delivery、其三份完整 product 原件与原检查载体不覆盖；F46/F44/K55保持封存。

本次修复独审 `K56-P2-01`：重复 active link 命中后追踪真实 existing tuple，再执行无新audit的 guarded save；inactive unlink在target检查前捕获完整active-link集，成功无变化分支也执行 guarded save。loaded Link同Attachment/Session保留首次读取证明，后续identity-map refresh不能重base。store明确把source/set/session/history/routing任一guard当事务意图；对clean existing Link也在同canonical group下锁内校验首次tuple。

顺序重复调用保留原no-op：不新增业务审计类型/事件、不额外UPDATE业务行、不递增未变化行版本。真正存在的pending auth仍在同事务flush，并且只在COMMIT ACK后消费。K56既有未知提交poison/保留final与已知rollback恢复checkpoint机制保持。

新增5项纯回归覆盖source-only无dirty意图、非versioned clean Link同版本下实质变化、首次tuple抗refresh、各显式guard字段和table/id隔离。实际fmt/Clippy/纯测与附件既有回归结果以`author-checks01/receipt.json`为准；完整两文件及精确before/after在`delivery86.json`和`product/`。作者没有执行DB、HTTP、对象I/O、故障或真实barrier，不认证G3/G4。

## Root实际验收向量（作者全部not-run）

1. 使用真实API新建独立附件组，保留project/normal、contract/evidence和最后新增的project/source三个实际active关联；从实际GET取得关联ID。另用真实unlink把contract/evidence变inactive，测试它的第二次unlink。不可SQL造业务状态。
2. 分别对重复active-link与inactive-unlink，由控制连接持有该canonical group advisory锁，再发出真实请求；只读PG必须观测实际应用backend等待`poms:attachment-group:<UUID>`锁。旧K56会直接返回、没有该等待。解锁后应200，关联数/业务row_version/业务audit数不变；dirty pending若存在必须与本次ACK共同提交。
3. 源变化向量可由Root在隔离环境静默期控制真实target读取的relation锁：控制连接`BEGIN; LOCK TABLE poms.contract IN ACCESS EXCLUSIVE MODE`（无业务DML），启动目标为contract的重复link或inactive-unlink；观察应用实际contract SELECT被控制backend阻塞，证明first Attachment/Link/set已经读取。另一真实会话解除project/normal关联，保留project/source使读取仍合法；head rowVersion不变。控制连接ROLLBACK释放锁后，原请求应409，不能把准备过的关联集默认为未变。该relation锁可能影响其它contract请求，只能Root显式静默窗口执行，不能冒称owned-row trigger。
4. 同样的读取barrier下由另一真实会话执行相关metadata/flag或complete变更：原请求应按首次Attachment proof冲突。正常幂等重试用新的实际上下文，仍不增加重复业务事件或行版本。
5. pending auth存在时，以精确当前token归属的真实auth_session ID和真实managed UPDATE形态设置owned-only故障；比较post-eager baseline，失败不留业务/审计/managed auth变更，未知结果不复用旧ctx。不能猜latest auth session或SQL制造dirty状态。

Root实际K71七阶段60HTTP/13PG保留在K56源码epoch，不能外推为K86两条幂等分支已完成真实barrier。K78其余工具候选尚未封存，不能当作K86实际验收回执。
