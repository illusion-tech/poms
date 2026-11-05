<!-- poms-r4def-closeout177-parent-57 -->

R4DEF 增量与既有R2补缺登记；总体保持 **Doing / OPEN**，原R4/R5/R6/R7未完成清单全部保留。

[固定实现d6c3cff8](https://github.com/illusion-tech/poms/commit/d6c3cff84dd96c981bab075d3f4aca3e98c76c4b)已集成main，[独立G3](https://github.com/illusion-tech/poms/blob/d6c3cff84dd96c981bab075d3f4aca3e98c76c4b/tools/rust-r4def/independent-final131/g3-final131.json)已Pass；永久[S4 4f0ad88e](https://github.com/illusion-tech/poms/commit/4f0ad88e78622a75b88b4e3cc72aded9da67458a)和原S3/既往G4证据均保留。本批 #106 / #107 / #108 / #109 只覆盖D7/E11/F12共30公共HTTP（28既有＋2新增）及必要内部生产者和最小原生产UI；当前技术Rust240，完整spec239 paths/293 operations/626 schemas、client616。

Ready metadata commit `{{READY_METADATA_COMMIT}}`；[Ready记录]({{READY_RECORD_URL}})；[原字节归档]({{ARCHIVE_MANIFEST_URL}})，SHA256 `{{ARCHIVE_MANIFEST_SHA256}}`；[独立preclose]({{PRECLOSE_RECORD_URL}})，SHA256 `{{PRECLOSE_SHA256}}`。实际六Issue线上读回、Final docs/main、独立actual G4终审及Seal尚须完成；不以实现/G3/归档或preclose替代actual G4。本批G4终审和Seal后才登记Rust正式240、R4累计67/92；当前正式Rust仍210、本批正式新增0。R4余25（经营17＋验收/完工/归档8）及完整R4阶段验收、R5–R7继续未完成。

- [ ] 既有R2补缺：`PlatformController_createUser` 带非空 `initialRoleIds` 实际返回500。本批已观察并保留原始 `tmp/rust-r4def/root/api32/00011-PlatformController_createUser.json`：POST `/api/platform/users`，request ID `r4def32-00011-423e6000`，状态500。固定实现[users/service.rs#L469](https://github.com/illusion-tech/poms/blob/d6c3cff84dd96c981bab075d3f4aca3e98c76c4b/apps/poms-api-rust/src/users/service.rs#L469)的 `has_unbound_children` / intentional Protocol 分支在生成UUID后以 `original user relation has no pre-flush user id` 拒绝并回滚，保留了旧Node/MikroORM缺陷语义。此缺陷在本批不修、未验收修复，不得因R2历史阶段完成而遗漏；后续单独冻结G1，以业务语义、正确性和合理性修复，不追Nodebug等价。

已证本批清理仅2673新增PK、3授权借用原件恢复、两库各两次fresh120表532行、62对象copy/SHA保全后unlink和自有PG15/端口停止；container/volume/private保留。历史Failed/Partial/ignored、Native参考和ORM exit1分类、Unknown-retain各自保留。本批不认证完整R4/R5–R7、部署切流、性能、S3/外部presigned/WORM运行验收或真实网络丢失COMMIT ACK。只允许本批107/108/109完成后收口106，#101/#57始终OPEN。

<!-- /poms-r4def-closeout177-parent-57 -->
