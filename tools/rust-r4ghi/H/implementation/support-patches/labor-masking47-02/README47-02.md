原H47/18e76…不改，本增量只替换一个business/labor-mask47.mjs，必须在H0/mint前组合。关闭独审两项P2及同函数G独立源positive-control缺口；模板与角色授权范围均不变。当前constructor采用Root final03 0b89…及其精确G2 source pin，原47 README645…仅是历史引用，不据此批准旧constructor。

IR110-01：同operation/target/query的M正向payload在同一个check闭包保留，并按projection JSON path逐项配对E。M所有路径必须Full；E不能删路径/换适用package。Labor及unknown最严格组只有M本身同path真实full-null/field-package-not-applicable时，才允许E相同full-null例外；M非空金额/依据/对象不允许E伪称not-applicable。实际masked/denied value必null，displayText必须SSOT的“敏感字段已隐藏/敏感字段不可见”，避免文本侧漏。

G的独立non-Labor源保持FinanceS授权下Full且value与同path M完全相同；不能用把合同也全mask来假通过。G preparation官方current子树沿H同一strongest规则，不能误归独立源。H未适用None例外有真实M对照，不用客户端自报“absence”。只有投影比较，未改变业务资格、模型、真实来源或敏感后端。

IR110-02：audit模式先实际M正向GET，再现行exact one-hit masked审计失败/同GET重试。失败和成功都要求真实complete/no transport failure，500 body严格仅 `{statusCode:500,message:'Internal server error'}`；额外raw/source字段、不同message/类型、nested对象均拒绝。失败before/after调用既有assertSweepRollback检查两库全部table sha+xmin/catalog/object，没有audit/security/platform_user豁免。唯一可独立变化的是从真实cookie token_hash+actor_id查到的唯一active caller session五列rawtouch；额外要求updated_at与last_seen_at精确相同字符串、xmin实际变更，不接受version-only或另一session。

成功masked security_event.details严格SSOT12键：fieldPackageKey/projectionMode/targetType/targetId/targetCount/sampleTargetIds/fieldKeys/hiddenFieldCount/reasonCode/requiredPermission/auditAggregationMode/projectId。所有scalar/array类型与值、样本target、数量、required Labor permission/blocked/masked都核；未知键/nested raw拒绝。fieldKeys允许集合取当前已pin SSOT全部Projection属性（common_fields一次产生的字段可能多于当前view返回子集），加真实positive reason count对应reason.i.detail/evidence及G两组名；不随被测E响应扩大集合。

Root依旧另外完成受审的隔离owned EO role两child公共授权增量：原2权限→exact4，old Source12 E2证据保持原标签。H47验证最终role/user/unique owned FK/权限与实际Full；新增两child、旧permission行不变的setup delta仍由Root单独真实原件核，不声称这个模块已独立检查该增量。工具没有role写/participant DML；audit是既有精确安全审计失败控制，不是已停止的parentless SQL窗口。

22个纯例（旧9+新13）PASS，语法检查；包括M非空/E伪absence、E合同被mask/值漂移、missing path、unknown/nested audit key、500多字段、security/audit/platform_user/project变更、别的session与version-only。全部为离线合成断言/owned测试文件，没有实际Root schema3/actor/HTTP/SQL或服务操作，不签G3/G4。Root实际仍须新环境binding→prepare STOP→审完整scope→GET/audit；跨期增加后同代码重prepare，0period不当正向。

封件完整性说明：考虑额外角色child核验时曾短暂误编辑已封47，立即逐字反向恢复并对manifest.files全SHA复核，已同步Root/A。原47所有当前bytes精确18e76…；该未封guard没有混入原件或此02角色范围。Root树/私件均未受写入。
