# RUST-R2B 纠偏记录

- 状态：最终非作者G3 Pass，未关闭P1/P2为0；实现已集成推送，G4随归档推送和Issue同步生效，见[收口记录](rust-r2b-closeout.md)。
- Slice：[#69](https://github.com/illusion-tech/poms/issues/69)；[G1基线](rust-r2b-role-permissions-baseline.md)仍限定八个既有操作。
- 来源HEAD：`9734515f84ebe1a4833d207124adbfbe378f691f`；日期2026-10-27（Asia/Tokyo）。

## 原 Nest 事实

新PG15 Nest副本上的28个普通目标场景已完成。原件SHA256为`3697aa4ce3191f94623984c3b218c8bc26a9f37b27fd4205db015784325d1f8a`，SQL原件为`59015e16c20b30f66fe9d2a1d9aa099b607fae219570da9a8b0ef8980df65744`。C独立核对658条SQL记录、329完整配对、18来源指纹、原始文本码元及版本差值；无captureIncomplete、unsupported或server sentinel。原件结果为`observed`，服务已停止，二次cleanup matched/changed均为0；它证明原行为，不直接认证Rust。

- due create：业务事务内先INSERT role，再UPDATE pending session；随后独立audit事务。
- due dirty update和启停：业务事务内先UPDATE session，再UPDATE role。同值操作不改role版本，但due时首flush仍提交pending session；non-due同值操作没有业务事务。
- changed permissions：新增行先INSERT；non-due混合场景为INSERT后撤销UPDATE。补充的真实Nest due混合见证确定为INSERT assignment→UPDATE pending session→UPDATE revoked assignment→COMMIT，审计另开事务。no-op permissions只在audit事务消费pending session。
- 合法DTO中的lone surrogate用于roleKey/name时，PG text业务先提交，后续jsonb audit以22P02失败；HTTP500、角色仍存在、due session版本累计增加2。description create返回201，当前响应保留UTF-16 d800，DB为fffd；不能用数据库回读覆盖当前响应。
- 重复提交lone-surrogate description PATCH两次，每次均按原JS值判脏、role版本增加1，再发生审计失败；不能因DB编码结果相同就当作no-op。
- displayOrder=2147483648经DTO后在第一业务flush以22003失败，无新角色，只保留认证raw touch的session版本增加1。非法UUID为500，合法不存在UUID为404。

## 请求局部角色快照

真实SQL证明，修改actor已分配的角色时，原service的findOne命中权限检查阶段已加载的ORM identity map；独立目标另发SELECT。Rust若总在service入口重新读取，会改变并发读取时点和内部版本CAS。

纠偏限定为请求局部快照：在与原findRolesByIds相同阶段读取全部已分配角色（包括inactive），保留完整行；active角色与权限并集算法不变。快照仅附于非序列化ResolvedSession，角色service从本请求派生；精确canonical id匹配时复用，其余输入保留DB cast路径。AuthUser公共JSON、session表和跨请求状态不变，不使用共享或thread-local缓存。

后续permission assignment查询会merge新non-null字段，不扩大缓存。六项受控并发场景进一步确认：认证阶段加载的角色在本请求中保留旧的详情快照；列表重新查询会合并新name，但数据库description从非null变为null时，原ORM仍保留请求内旧description。Rust已按这一窄边界修正列表合并，最终ee21二进制的六项并发差分已通过，早期不匹配原件保留。

## UUID别名与URI兼容

真实Nest与Rust各六项UUID别名见证确认：canonical、uppercase和compact UUID均可通过数据库cast读取同一角色，但原详情的assignedUserCount使用原路径字符串与canonical roleId严格比较，因此计数分别为1、0、0。六项见证还验证权限替换成功审计的targetId保存原路径字符串；拒绝分支按原TypeScript源、独立源码审查及纯测确认同样保留原路径，未冒称由这六项实跑覆盖。其它角色命令继续使用实体canonical id。Rust只修正这两处差异，不增加UUID验证管道、不全局规范化参数。

原Nest另完成51项URI见证：八操作的静态路径大小写、单个尾斜杠和启停后缀大小写可兼容；双尾斜杠、编码后的静态段和编码冒号返回原HTML 404。CSRF拒绝的安全事件path保留原始大小写、尾斜杠和query，未知路由的404正文按原行为省略query。Rust仅在八操作已知method/path形状内规范化静态段和单尾斜杠，保留raw UUID、query和OriginalUri；旧十操作不进入该转换，未知命令复用原404响应。e171版本实际完成51项请求，完整差分通过；没有将该结果重标为最终ee21的实际运行。

独立审查随后补足原三个GET的隐式HEAD。最终ee21只为这三个形状增加HEAD方法识别，沿用GET handler与框架body抑制，不增加metadata操作。两端实际15项HEAD、GET参考及完整前后快照通过；单尾斜杠/静态大小写200，双斜杠/编码静态段HTML404，均空body且无状态变更。成功HEAD长度等于本端真实GET，原列表Nest5078/Rust5864字节的Unicode编码表示差异独立披露，不能声称所有跨端header或原始响应字节相等。

## 未约束的并列排序

严格HTTP比较发现15个固定seed角色的组内顺序不同，组外顺序相同。只读核验两库的原始微秒值确认：每库15行的display_order均为0，created_at在该库内完全相同。原DatabaseSeeder在同一INSERT省略这两个字段，沿用0与now()默认值；原查询没有第三排序键，因此同键组内次序未被约束。

这是比较器对未约束并列顺序添加期望产生的tool-noise，不添加产品id排序。比较工具仅在独立只读回执绑定当次原始HTTP/并发/URI六份报告、15个固定ID/key、完整微秒排序键与响应毫秒时间后，允许该连续并列组按固定ID配对并比较全部字段。组外顺序和审计记录数组继续严格核对；缺少证明或键值不一致时仍拒绝比较。

系统角色两端各22项实际运行及精确恢复完成后，审计beforeSnapshot的原权限列表也出现组内顺序差异。B逐项核对六个权限step的原始beforeSystem active关系、微秒assigned_at/created_at和原Nest SQL，确认两实现均按这两个字段排序且没有第三键；实际差异仅在相同双键桶内，没有跨桶或成员差异。比较纠正仅适用于这六个step的权限audit.beforeSnapshot，按各step真实关系快照验证分组后配对；afterSnapshot仍严格按请求Set首次出现顺序，记录数组、其余审计列、关系历史与版本不放宽。

另八个指定权限拒绝事件的details.userPermissions是原无ORDER BY赋权查询的首次出现Set并集。比较器逐事件验证确切四项唯一成员及完整事件身份后，仅将该字段视作集合；requiredPermissions、其它事件、重复出现的既有事件原字段和其它数组次序不放宽。上述比较器修正均经B/C独立审查和拒绝越界的变异测试，179/6/22最终差分通过；没有修改产品ORDER BY或隐藏成员、版本、时间桶差异。

## 测试工具纠正与原件

- 首次并发runner在GET请求传入`json: undefined`，客户端在实际发送前失败。修正为省略该字段，部分运行和当时全部工具源文件保留于`tmp/rust-r2b/preserved/concurrency-nest-01`。第二轮六项并发已实际完成，早期Rust的nullable列表差异保留为不匹配证据。
- 系统角色第一轮22项HTTP与逐步持久化检查均完成，但release因catalog严格比较失败。app默认`search_path=poms,public`，owner默认值不同，导致`pg_get_constraintdef`对同一外键输出限定与非限定schema名称。journal停在active、pending为null、completed为22，失败发生在恢复写入之前。修正两连接显式设置并核验相同search_path和时区；保留所有结构、行、actor和原始时间精度检查。失败报告维持fail，恢复必须另有证据。
- Linux原页面已完成Nest和Rust各3项用例，保留原报告及桌面/390×844截图。原页面的PrimeUI许可证提示为既有前端现象，本片不改变许可证或页面实现。最终Windows/Linux × Nest/Rust四组合共12项已完成，最终Rust运行绑定ee21。
- 两个本轮新副本重新执行原`migration:check`均exit1；`schema:update --dump`均exit0，结果为Failed-with-classification而非schema clean。各168条add CHECK提议均有同名现存约束，低权`information_schema.constraint_column_usage`为0行、owner为541行；安装的MikroORM7.0.11 `PostgreSqlSchemaHelper`实际通过该view查询CHECK。另有既有注释差异：迁移`lead_score_override.status`为“覆盖审批状态”，entity为“覆盖状态”。CLI连接强制只读，生成SQL从未执行。两库107表/1778列/515约束/504索引/92迁移/0个用户trigger的完整捕获前后相同，catalog SHA256均为`b53c815c60d91c16366fe748388588c9cd620000ead9a03e7c5a975e0d100996`；不据此声称168条表达式逐项比较相同。

## 范围与待验收

以上属于保留已冻结原行为的实现纠正，不增加公共操作、产品DDL、权限规则或部署范围。自然DTO失败已验证第二flush边界，无需安装审计拒绝触发器。最终系统角色22项、并发6项和HTTP179项两端差分已通过；四组合页面12项和51个run最终零残留审计已完成。最终非作者G3已于2026-10-26T22:10:46.396Z签结Pass，报告SHA256为`2eec6e4ce96c00d90f366b7bc0794c66079c7536609eb7c05ac3e343a9ea6dd0`；实现已提交推送并通过集成后检查，G4随归档推送和Issue同步生效。PG17和旧业务库继续保留。
