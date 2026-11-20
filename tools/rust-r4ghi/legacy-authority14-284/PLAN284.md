# Source14 历史数据冲突验收执行版 284

本目录由 Root 独占。旧 H222 的 `f6bcaac9cfd1bc6941198cc979e6de43a1cad61d74ff6df76d463af1181564cd` 提案与 IR135 审阅原件保留；本目录不进入当前 198 个 helper，也不改变 Source13/API136。当前仅为新版本准备，尚无实际 SQL、HTTP、writer/restore 授权或 G3/G4 认证。

本版保持原先的一条新负例记录、真实项目等待锁、提交确认后归属、全量回滚核对与精确恢复边界。新增内容限于：

- 从真正的新 Source14/schema4/252、H2、B1 和实际 API/Common 构建获得身份，不接收活动的旧 119/B2 或固定 416 数量。
- 首次关期使用 273 的服务端选择和显式 `baselinePackageRef:null`，保留真实当期选择、完整父行与输入指纹。
- 补 IR135-01：在同一条已提交专用 legacy baseline 存在时，实际调用正式 current GET，要求精确 admission-required 409；单独记录来源、审计及真实认证触碰，不把它称为并发测试。
- 新依赖项目的持久化数据视图保留 schema4 所需的原有资源组，禁止覆盖或删除这些原组；新项目字段独立产生，不能回退读取 Main 项目并冒充新 witness。
- 完整 Tax14 完成证明复用 I270 封闭只读 reader 的相同原始字节，不调用只允许 Tax 活动阶段的 effect guard，不复制维护另一套宽松证明规则。该 reader 在 I 封件前仍为依赖待接。

执行顺序必须为：完整 Tax14、角色权限复核、284 baseline witness/真实锁等待/正式 GET/精确恢复、284 Main W45 period 真实锁等待/精确恢复、270 Main W45 正常关期、271 混合重述。Main W45 负例要求原先无该期间 root，所以必须先于正常关期；不得为负例删除真实 period、改挂外键、关闭唯一约束或伪造历史。

具体实际输入、准备观察、唯一新 PK、父行 raw/hash/xmin、SQL、正常请求体、writer/restore 授权与非作者审阅必须逐项固定后才允许 Root 执行。未知提交保持原件并阻断重放。
