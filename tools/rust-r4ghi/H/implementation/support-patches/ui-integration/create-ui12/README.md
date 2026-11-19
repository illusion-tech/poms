Root-owned 最小创建UI/Native提案，只写本候选目录，产品未由作者修改。基于 inputs12.json 的四个精确Root SourceBase SHA；原06/08/09/10/11封件不变。

真实可见 toolbar“创建评估项目”，同时原Lead转入按钮/路由/业务gate完全保留。创建对话框默认“创建人主责”，第二项“组织承接，待创建人首次指派”。表单没有阶段、owner UUID、组织UUID、版本或金额手填，创建仍原 POST /api/projects、assessment初始。默认creator省略可选字段，保留旧请求和成功列表刷新行为。

organization明确传新版SDK命名enum ProjectInitialOwnership.Organization；ProjectStore该分支仅返回真实创建response、失效旧list标记，不调用loadProjects/Full/timeline/archive/金融。成功用真实project.id进入原 /projects/:id，既有scope entry只读取Creator anchor并显示首次指派，平台M候选仍显式点击读取；若导航未完成，展示“项目已创建，继续首次指派”真实ID入口，不误报创建失败或自动重复POST。

只在data-access显式导出SDK ProjectInitialOwnership，app不直依赖generated，无export*或反向app依赖。Root已确定Shared独立命名schema ProjectInitialOwnership + initialOwnership；**实际S6 SDK尚未到**，本候选的SDK enum精确导入/成员需新产物核定。没有手改SDK、cast/any、用旧金额或放宽canonical字段。当前不宣称全ngc/build通过；收到S6再跑真实ngc/相应unit。

Native既有ProjectController.create已经挂本method guard，位于原global auth/CSRF/permission之后、Zod pipe之前。本提案在其中对该真实controller/handler的initialOwnership除缺省/creator外显式422（包括organization/无效值），防止旧frozen schema strip字段后默默个人创建；缺省/creator沿原legacy201，不改旧业务producer、Shared clone、OpenAPI/HTTP方法。不存在SDK状态码拓宽或Native伪实现组织承接。

本地目前可实跑的是Native纯分支：真实Nest exception/Zod库，未起app/服务/HTTP/DB，不改现有Mock。UI实际S6编译、DOM与Rust真实organization producer由Root接入后验。epoch-pause12.md给现有08工具等待点和新epoch重绑边界。
