# K 五路由参数裁决输入：#82（父 #61）

状态：G0 来源与裁决提案；G1 Pending。来源基线 `20335a189ce1197ccd4211bdfbb314954421729e`，共享分支 `codex/poms-r2l1-public-k-route`。本输入只写本目录，尚未改 canonical、controller、OpenAPI、client、consumer 或测试，也未执行应用/runtime。

推荐统一采用既有 canonical `{id}`，在同一受控子任务同步 controller 绑定、完整 OpenAPI、生成客户端和四处命名请求对象调用。实际 URL 值、HTTP method、五个 operationId、权限、业务 DTO、service 语义保持不变，不新增路径或 alias。不能只改设计文字就宣布五项关闭。

## 1. 独占范围与关闭边界

- 只裁决/应用 `AttachmentHandoverController` 五项 path parameter metadata。#82 G4 才可关闭本 route 子 Issue，并在 #61 勾选 K 五项这一条。
- 不关闭 #61；R4 两项 `{handoverId}` 差异及 R3/R4 lookup 仍打开。不修改对应 controller、spec operations、client 或 canonical 行。
- 不实施 Rust K 五操作，不关闭 #78，不把已交付计数从 99 提前改为 104。R4 读取/冻结事实、清单和 ZIP 业务语义不在此 route 子任务内。
- 原 R0/R0F/IJ 清单、源码指纹与 11911 份 IJ 证据保留历史原字节。新的应用结果通过增量映射描述，不能全局重导旧清单替换其历史 hash。

## 2. 五项当前真实来源与推荐目标

完整当前 operation、参数定义、行号和 proposed mapping 见 `route-proposal.json`；逐文件 raw/LF SHA 见 `sources.json`。表中 canonical 不含部署前缀，实际规范当前包含 `/api`。

| operationId                                          | 当前公开 path parameter | 推荐 canonical                                              | Nest decorator / Param 来源 |
| ---------------------------------------------------- | ----------------------- | ----------------------------------------------------------- | --------------------------- |
| `AttachmentHandoverController_getChecklist`          | `handoverId`            | `GET /project-handovers/{id}/attachment-checklist`          | controller:15 / 19          |
| `AttachmentHandoverController_refreshChecklist`      | `handoverId`            | `POST /project-handovers/{id}/attachment-checklist:refresh` | controller:23 / 28          |
| `AttachmentHandoverController_createDownloadPackage` | `handoverId`            | `POST /project-handovers/{id}/attachment-download-packages` | controller:32 / 37          |
| `AttachmentHandoverController_getDownloadPackage`    | `packageId`             | `GET /attachment-download-packages/{id}`                    | controller:41 / 45          |
| `AttachmentHandoverController_downloadPackage`       | `packageId`             | `GET /attachment-download-packages/{id}/download`           | controller:49 / 53          |

源 controller：`apps/poms-api/src/app/features/attachment/attachment-handover.controller.ts`。绑定必须同 decorator 同步为 `@Param('id')`；局部变量可以继续命名 `handoverId` / `packageId` 并原样传 service。refresh 的 Nest literal-colon 转义保留，不重命名 action 或切换 HTTP method。

`libs/shared/api-spec/openapi.json`:3705 起的五个 path key 和各自 `in:path` 参数仍为 `handoverId` / `packageId`，required=true、schema.type=string。不是只在内部代码命名不同。`docs/design/api-route-canonical-inventory.md`:401–405 现有 canonical/Current Design 均为 `{id}`，Current Implemented 如实保留现名并标记 implementation-drift。

R0F 路由基线 `docs/design/archive/slices/rust-r0f-route-baseline.md`:88 要求在相应域 G1 前明确 canonical 同步切换或正式修订保持现名，并交代 OpenAPI/client/绑定/测试边界；没有批准 alias。

## 3. ADR-015 硬规则与两案最小影响

已接受 ADR：`docs/adr/015-api-route-canonical-grammar.md`。

- 4.1.2（:135）统一一等资源 item identity 为 `/resources/{id}`。
- 4.2.3 允许父资源下稳定聚合使用 `/projects/{projectId}/...` 这类名词子资源；因此三条 handover 下子资源的语义型父参数并非完全没有讨论空间，不能误称 ADR 所有嵌套参数都强制字面 `id`。
- 4.5（:177）默认直接 canonical 同步；仓库内可同时修改的 controller/spec/client/E2E/consumer 不足以成为 legacy 理由。
- 落地约束 7/8（:277–278）要求可控接口同片同步；已有生成 client、测试较多、改动面大本身不能成为例外。

| 方案               | 实际最小影响                                                                                                                                                                                                                                                                 | 治理有效性与结论                                                                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A：五项统一 `{id}` | 1 个 controller 的 5 个 route slot + 5 个 Param key；完整 spec 仅 5 个 path key/5 个 path-param name；重新生成 1 个 API service 的 5 个 RequestParams 与读取/encodeParam metadata；1 个实际 store 的 4 个对象键；相关测试与 current inventory 增量；显式更新生成输入保护基线 | 与现有 canonical 和顶层 item 硬规则一致。具体 URI 值不变，无第二路由。推荐。                                                                                                                                                                                     |
| B：全部保留现名    | 表面上可不动产品 spec/client/consumer，只把五行 canonical/Current Design 改成现名；但必须为此提供正式设计依据                                                                                                                                                                | 三条父下聚合可参照 4.2.3 讨论正式设计修订；两条顶层 package item 的 `{packageId}` 不符合 4.1.2，现无已批准例外。保留全五项还需要 ADR 修订/正式明确例外，不能仅为少改代码而改 canonical。当前没有不可控外部调用或发布阻塞的已知证据支持该额外设计成本。故不推荐。 |

这里没有声称不存在任何仓库外 client；已识别仓库内调用可在本片同步。若 Root 在 G1 获得实际外部发布约束，应明确重新审查输入，而不能暗加 alias。默认推荐保持 A。

## 4. 命名对象与位置参数 consumer 的精确边界

生成配置 `tools/openapi/typescript-angular.config.json`:10 明确 `useSingleRequestParameter=true`。生成 API 并非 `api.method(id, body)`：五个方法的第一个位置参数是命名 request object，之后 observe/reportProgress/options 的位置保持不变。

`libs/shared/api-client/api/attachment-handover.service.ts`:34/39/43/47/51 定义五个 RequestParams；其中三项含 `handoverId`，两项含 `packageId`。方法内以 `requestParameters?.handoverId/packageId` 读取，并在 encodeParam 的 name 和 required-parameter 错误信息中使用现名。采用 A 后应由生成器产出 `id`，不能手写覆盖生成文件。

实际 named-object consumer 只有 `libs/admin/data-access/src/lib/project/project-workspace.store.ts` 的四处：

| 行  | 调用                  | 必需同步                                                | 必须保留                                                                        |
| --- | --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 257 | GetChecklist          | `{ handoverId }` → `{ id: handoverId }`                 | store 的位置参数 `loadHandoverAttachmentChecklist(handoverId)`                  |
| 278 | RefreshChecklist      | 对象键 `handoverId` → `id`                              | refresh request body 两字段与 store 方法签名                                    |
| 302 | CreateDownloadPackage | `handoverId: input.handoverId` → `id: input.handoverId` | 业务 input.handoverId、selectionIds/expectedSelectionVersions/敏感排除确认/note |
| 324 | GetDownloadPackage    | `{ packageId }` → `{ id: packageId }`                   | store 的位置参数及返回 summary                                                  |

第五个 generated DownloadPackage 方法没有找到实际仓库调用；其 RequestParams 仍必须生成同步。真实下载使用同一 store:338 的 `HttpClient.get('/api/attachment-download-packages/${packageId}/download', {observe:'response',responseType:'blob'})`。这个具体 URL、blob、文件名处理均不需更改，也不借机重构到 generated 的 any 返回。

UI `apps/poms-admin/src/app/features/project/project-contract-handover.ts`:369/394/407/415/425 调用 store 的位置参数/业务 input，不直接调用 generated RequestParams，因而可保持原样。DTO/response 的业务字段 `handoverId` 不是 path metadata，不得全文替换成 `id`。client `configuration.ts` 的可插拔 encodeParam 将接收到新的 name=id，这是公开客户端 metadata 的有意变化；不能宣称原命名对象继续兼容。

已有测试 `apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts`:979/982/1045 三处 mock 调用对象键要同步；:1059 下载 URL/blob 断言保留。应补 GetDownloadPackage 第四个 consumer 的调用键断言，避免它只有编译覆盖。`attachment-handover.service.spec.ts` 目前测试业务 service，不是 controller Param 绑定测试，不能据此声称绑定已验。

## 5. 生成器真实输入保护及不绕过的执行顺序

`tools/openapi/shared-api-client.mjs`:150 的原 guard 同时执行：

```js
for (const args of [
    ['diff', '--name-only', '--no-ext-diff', '--no-textconv', baseline.sourceHead],
    ['diff', '--cached', '--name-only', '--no-ext-diff', '--no-textconv', baseline.sourceHead],
    ['ls-files', '--others', '--exclude-standard']
]) {
    const changed = execFileSync('git', [...args, '--', ...files], { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    assert.equal(changed, '', 'Frozen generator input differs in the working tree, index or untracked sources');
}
for (const entry of baseline.protectedSources) assert.equal(sha256(readText(safeChild(root, entry.file))), entry.sha256, `Frozen input fingerprint differs: ${entry.file}`);
```

`files` 是当前 baseline 保护的六个实际文件，完整现有 hash 在 `sources.json.generatorGuard.protectedSources`：

1. `libs/shared/api-spec/openapi.json`
2. `tools/openapi/typescript-angular.config.json`
3. `openapitools.json`
4. `package.json`
5. `pnpm-lock.yaml`
6. `.gitattributes`

当前 `sourceHead=e951b76bf65ea9c286e5e281a01e34b9f75c0fae`；validateFullSpecification 还精确保护完整 path 列表、291 method/path/operationId 和 585 schema 名称。只改 baseline 的 spec hash、只 stage 新 spec 或直接运行 generate 都不够。runner 固定 baseline 路径，没有已存在的“受审 dirty spec”基线覆盖入口；本提案不新增旁路。

G1 可批准的顺序：

1. Root 冻结 A、同步范围和新非K消除断言；保留当前 baseline 原字节/hash。
2. focused controller/Param 修改后，由 Root 用既有 `poms-api:openapi` 导出完整 spec；先证明仅五项参数 metadata 变化、非 K 完全相同，完成有限实际绑定/静态检查。
3. 非作者批准 generation-input checkpoint；Root 在 local feature 创建实际 source checkpoint commit，包含受审 controller/spec 输入。它不是完整 G3，不提前推 main 或关闭 Issue。
4. 显式更新 generator baseline 的 sourceHead 到该真实 commit、spec 指纹及五条 path/operation 映射；其他五 protected source hash、291/585覆盖、生成器版本/JAR/config、手管 client metadata 不变。不要关闭或修改 guard 来接受未批准输入。
5. 通过既有 runner `--write` 生成，再 `--check` 验证完整 client；同步四个实际调用键和测试。
6. 最终集成必须保留 checkpoint 为实际可达祖先（`git merge-base --is-ancestor CHECKPOINT HEAD`），远端 clone 也能取得该 commit。不能 squash/rebase 丢弃 checkpoint 后只留下 SHA 字符串；若必须改写，应重新冻结输入与生成基线。

这比新增 dirty-input override 或临时直接 JAR 旁路更小，也保留了既有保护的语义。

## 6. 直接可验收清单（Root G1 Pass 后执行）

- [ ] 受控 source checkpoint、原 baseline 原字节、非作者批准及新 baseline 映射均有来源/hash；所有 six-file dirty guards 实际通过。
- [ ] controller 五 route slot 与五 `@Param` key 都是 id；operationId、权限、状态码、literal colon、StreamableFile/header 以及 service 转发值不变。
- [ ] 五个真实 HTTP route 的绑定输入得到同一个发送 UUID。可用真实鉴权与 PG 证实不存在的 UUID取得原 service 的具体 404，验证值确实穿过 Param；不需要伪造成功移交/清单/ZIP。另用有限 controller binding 单测记录转发参数，报告仅属于 transport 绑定，不冒称 K 业务验收。
- [ ] generated 五 RequestParams 属性为 id；四 named consumers 和断言同步，store 的位置参数及业务 handoverId 保留；raw blob 下载 URL 断言不变。
- [ ] 完整 OpenAPI 291 operationId 集合/585 schemas/operation count/path count保持；目标仍恰五操作、不出现新 alias。
- [ ] 全 client fresh generation/check/build通过；预期只有 handover API service 内容变化，若有任何其他生成输出变化逐项解释，不自动接受全量漂移。
- [ ] 应用后的 current canonical 五行标为一致并引用 #82；新的 route-delta 记录 old/new/source hashes。原 R0/R0F/IJ历史文件不重写；R4两参数及lookup待决条目保持。
- [ ] 独立 G3、source checkpoint祖先可达核验、G4后仅关闭#82/勾#61 K一条；#61/#78继续打开，99/108计数不变。

最小 lint/test/build：Nest controller focused 绑定测试＋既有 `attachment-handover.service.spec.ts`，`poms-api:lint/test/build`；admin 的 `project-workspace.store.spec.ts`（四对象键＋下载 URL）和 `project-contract-handover.spec.ts`，`admin-data-access:lint/build`、`poms-admin:lint/test/build`；`poms-api:openapi`、shared client runner `--write/--check`、`shared-api-client:build` 及既有 generator unit/integration checks。具体命令以本仓已存在 Nx targets/source config为准；Root统一环境执行，当前没有运行这些命令。

## 7. 非 K 不变的消除对照

执行时以本目录保留的五原 operation 为允许改动集，不能凭全文件 hash 全变就接受：

1. 对应用后 spec 仅把这五新 path key 和五 `in:path.name=id` 逆映射到旧名，再做 canonical JSON 深比较，必须与基线完整 spec 精确一致。
2. 非目标 286 operation 单独逐项比较 method/path/operationId/全部 operation payload；全部585 component schema 深比较；所有其他顶层字段相等。五项自身仅允许 path key 与 path-param name，其余 request/response/security/summary/tag 一律相等。
3. 五 template 将指定 slot 消成统一 `{_}` 后 method+URL形状一一相等；参数 schema required/type 保留，不增 UUID validator、状态码、权限或 alias。
4. generated client 除目标 API service 外逐文件 LF-normalized hash 相同，手管三个 metadata 文件、generator/JAR/config/lock 均不变。目标 service 去除受审 id metadata 差异后比较每个方法实际 URL、body、observe/reportProgress/options位置与请求设置。
5. 四 store named-key 外的源码和业务 DTO/full schema不变；两条 R4 operation原 metadata 保留。纯 source/类型/绑定证明与未来 Rust K G4 业务证据明确区分。
