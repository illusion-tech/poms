# Root handoff16：封件复制、真实绑定和执行外层

本目录为待 Root 审核的工具候选。作者仅运行本地语法、合成拒绝测试和只读文件核对，未运行 HTTP、DB、WSL、服务、Chrome 或真实 DOM。14 的三种 UI 真写场景是 A08 子集；其余表单另交候选，不能据此签完整 UI/G3/G4。

H Windows 绝对目录：
`E:/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/`

Root Windows 绝对目录：
`E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/`

Root Linux 同一目录：
`/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/`

## 原14完整运行依赖

`exact-copy-plan16.json` 逐文件记录20个封件的原始 bytes/SHA：14 manifest 中17文件，加 `runtime13/binding13.mjs`、`append06/ui06.candidate08.mjs`、`append06/ui-server06.mjs`。没有 Jest 缓存和历史08/09旁支。原复制提案 `promote-tools16.mjs` 仅精确复制这20个文件，不执行任何工具；Root 已报告实际 copied20，正式回执为 `docs/design/rust-r4ghi/ui14-tool-promotion16.json`。

本目录新执行入口另需按 `manifest-handoff16.json` 精确复制8个 `entryFiles16` 模块及 `exact-copy-plan16.json`。MAX/MASK还需 `fixture-copy-plan16.json` 的4个原文件；这四个不是DOM14额外依赖：

1. `runtime13/max13.mjs`、`runtime13/mask13.mjs`：原13封件参数化导出。
2. `append06/max-fixture06.mjs`：仅导入其中 MAX 常量和纯请求工厂，旧 main 不执行。
3. `append06/mask-fixture09/user-proof09.mjs`：已封的真实 getUser/唯一 owned FK 证据解析器。

Root 复制新增工具后，才捕获 plan。不要修改14/13/06原件来重绑定10；所有新数据通过 plan/binding 输入。

## 真实输入和状态要求

必须实际存在 `private/business/g2-business10/main01/state.json`，包括 baseline、404 sourcePins、原 apiProcess 和真实 actors；未清理、未 activeFault/blockedObservation/cleanupPlan。candidate/sourceManifest可指向同一个真实 `000091-candidate-source-binding10.json`，因为该原件确实含 sourcePins、sourcePinsSHA256、process、M97/139，而非为了凑证书造的第二个 manifest。

当前已收到并只读核实的原件是：

- candidate/source：`/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business10/main01/000091-candidate-source-binding10.json`，raw SHA `0a1096457d239cdb16c6f75cec54f5bee994e0d68df0303f0fd27d48c2b81344`。
- process：`/home/wangzishi/.local/share/poms-r4ghi/private/rust-api133-process.json`，raw SHA `81ecfe154efa25f45fc00633bbd565e6ae0bbd75b5c3fb8296e59b688d5a71e9`；PID46874、startTime2753885、binary SHA `06849f6a47997e1b0dcef2b87c3a61baccb051ee9162933149921096ec04b3d2`。
- sourcePins JSON digest `a379d62b5b583446b01f4a6bb3891b4bf9bdaf0e5966fb7a39dd7b07b643c589`。工具仍逐字核对当前 state/实际source，不能仅相信这段文档。

Root填写实际 `prepare-input16.json`，顶层严格为：

```ts
{
  schemaVersion: 1,
  kind: 'prepare-real-ui16-plan',
  purpose: 'fixtures' | 'dom',
  plan: /* 实际填写的14 plan；epoch/run/uiRun/paths/Linux Node/Windows inventory/场景/动作均明确 */,
  sourceManifest: { file: /* 上述实际原件 */, rawBytesSha256: /* 实测SHA */ },
  candidateReceipt: { file: /* 上述实际原件 */, rawBytesSha256: /* 实测SHA */ },
  apiProcess: { file: /* 实际process原件 */, rawBytesSha256: /* 实测SHA */ }
}
```

没有 `actorsFinal` 输入字段；未知键拒绝。`purpose=fixtures`不声称最终actor。准备 MAX/MASK 时可用两个只读case（money-max/manager 与 sensitive-mask/person）、`writeActions=[]`、独立 uiRun，指针指向将由真实producer产生的 maxProject/maskProject；此时不会提前 resolve 这些指针。DOM另用新的 uiRun，在所有 producer/授权变化完成后重新采集。

DOM Creator必须为真实 `creatorOwnership23.uiSpareProjectId`；其 `uiSpareAnchor={view,receipt}`，view是creator-first-assignment-only且ownerUserId=null。EO/Own分别为 `uiFixtureViews23.eo/own.pause.result`；真实项目必须不同，尚无 UICommandObserved。Own只有真实 parentCompletionRecordId，child UUID必须由DOM首个本人任务GET取得。EO权限恰 project:read/write；MASK person恰再加 contract:finance:manage，无敏感读取权。所有计划actor及Creator目标owner都有实际 current-auth 回执。

## Linux完整调用顺序

以下由 Root 在真实 Debian Linux 中运行；`NODE`必须填写 Root 已核实的真实 Linux Node 绝对路径，不能用Windows路径或作者猜测。`T`、实际输入文件路径可直接使用下列根；各 SHA 必须是 Root 当次读取/审核原始文件得出的值。所有工具都要求 `--execute`，文档没有执行它们。

```bash
T=/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16
NODE=/absolute/path/to/Root-verified-linux-node
INPUT=/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14/actual-prepare-input16.json
INPUT_SHA=$($NODE --input-type=module -e 'import fs from "node:fs";import{createHash}from"node:crypto";process.stdout.write(createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"))' "$INPUT")
"$NODE" "$T/prepare-plan16.mjs" --input "$INPUT" --approved-input-sha "$INPUT_SHA" --execute
```

Root先审核输出的完整实际 plan 原件/SHA、sourceBases 和 build manifest，再使用输出的 collectInput.file/rawBytesSha256：

```bash
"$NODE" "$T/collect-actor-proof16.mjs" --input "$COLLECT_INPUT_FILE" --approved-input-sha "$COLLECT_INPUT_RAW_SHA" --execute
```

collector用 Root 原 createContext/createApi 和 driver.lock，逐actor真实请求 `AuthController_getCurrentAuthSession`，保留 before/after/ledger/原始response。它不发业务POST、不登录/改权限；当前权限与state不相等即拒绝，需 Root先完成合法授权及真实重登录。只有 `purpose=dom`、实际current-auth全部匹配、真实新spare/精确权限检查都通过，输出index才为 actorBindingsFinal=true；这不是模板默认值。若Root business正在运行，driver.lock使本工具拒绝并发，不应删除别人的锁。

再使用 collector 返回的私有实际 index pin：

```bash
"$NODE" "$T/make-generation-input16.mjs" --collect-input "$COLLECT_INPUT_FILE" --approved-collect-input-sha "$COLLECT_INPUT_RAW_SHA" --actor-index "$ACTUAL_INDEX_FILE" --actor-index-sha "$ACTUAL_INDEX_RAW_SHA" --execute
"$NODE" "$T/generate-binding16.mjs" --input "$GENERATION_INPUT_FILE" --approved-input-sha "$GENERATION_INPUT_RAW_SHA" --execute
```

generationInput的路径/SHA来自上一条实际输出，Root再审核；不能把示例SHA当批准。生成器只读真实原件并新写mode0600元数据，不发HTTP/DB/进程/browser。它核 `/proc` PID/start/exe/binary、source/state、每个current-auth原件身份/权限和plan pin。closed binding同时含完整 `plan` pin、metadata16/build manifest/leaf hash、四逻辑输入pins、writeActions hash。Root审核该实际binding原始SHA后才执行后续。

## MAX/MASK实际producer调用

Root审核 `purpose=fixtures,actorBindingsFinal=false` 的实际binding后：

```bash
"$NODE" "$T/run-max-mask16.mjs" --binding "$FIXTURE_BINDING_FILE" --approved-binding-sha "$FIXTURE_BINDING_RAW_SHA" --business-date "$ACTUAL_BUSINESS_DATE" --stage max --execute
"$NODE" "$T/run-max-mask16.mjs" --binding "$FIXTURE_BINDING_FILE" --approved-binding-sha "$FIXTURE_BINDING_RAW_SHA" --business-date "$ACTUAL_BUSINESS_DATE" --stage mask --execute
```

runner只调用原13 `actualMaxFixture(ctx,api,{businessDate,executionBinding,approvedBindingSHA256,bindingBytes})` / `actualMaskFixture`，不导入或执行旧13Creator/EO/Own停点。MAX先产生独立 assessment→Expense create/confirm→真实E post→Gprep；MASK再独立项目/成本→真实改派及权限变更→实际masked/null GET。原 main f.project 与 G/FI 来源不替换，单项目只有一笔MAX，officialCurrent=null不冒称formal/H/A05。业务号/owned births/审计按Root原API ledger。新顶层 state.HFixtureRuns16 防止完整或partial阶段直接重放；失败保留原件，Root先精确核已提交effects，不自动重POST。MASK改变person权限后，旧fixture binding不再是DOM最终actor绑定。

## Windows真实DOM外层

Root准备新的 `purpose=dom` plan/binding并审核其SHA后，从Windows运行：

```powershell
& 'C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe' `
  'E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/run-dom16.mjs' `
  --plan '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14/ACTUAL_UI_RUN.json' `
  --approved-binding-sha 'ROOT_REVIEWED_ACTUAL_BINDING_RAW_SHA' --execute
```

该入口执行前后校验整个批准plan、源/helper/product pins、真实dist leaf集合（含新增/删除检测）及Linux Node bytes，再调用原封 `runtime14/windows14.mjs`。14的Windows/WSL两端继续逐一核 plan.sourceBases；不是互相证明一个未审批plan。sourceBases覆盖完整20、8个16入口、当前404产品、Root business helper全部当前mjs/json及literal transitive依赖、实际dist全部leaf。捕获时未默认任何build final状态；它只能绑定 Root 看到的实际bytes，构建通过仍以Root真实build回执为准。

14在真实HTTP canonical status、DB postconditions、完整ledger之后已经调用 `recordActualUIReceipt`。Root无须另造completion标志。其精确签名为 `recordActualUIReceipt(ctx,{scene,action,operationId,ledger,originals})`；scene必须含真实kind/projectId/actor.id；EO/Own action.fixtureViewKey为eo/own，Own action.completionRecordId为真实parent。它只写原持久化record的四个UI observer字段并用Root原persist闭包；不能手工用旧HTTP代替pending。`fixtureFactsHash(ctx)`对比前后除这四字段外的全部根fixtures。Main FI、404 sources、未消费spare均保留。

Legacy若纳入额外case，仍需Root审阅实际 controlled兼容seed receipt并单独绑定 compatibilityFixtures；本生成器不会凭模板制造或默认这个资格。初始三真写plan不包含Legacy。任何更改绑定输入/plan/build/helper、actors再授权、partial请求均应保留原失败并用新的真实元数据回合；不得覆写旧08/09或已封14。
