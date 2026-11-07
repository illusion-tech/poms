24 是工具修正与 exact metadata-only 恢复候选，未由作者执行恢复。23 原件不变；Root 产品、source404、数据库、时间和原 HTTP/ledger 均未修改。

只晋升 manifest24.json 的 proposed/ 六文件：offset-aware creator-proofs、导出既有 creationProof 并校正/预检 canonical operationId 的 creator-ownership、Legacy canonical PATCH、metadata 恢复模块/薄 CLI、五项新纯测试。每个现有文件要求 exact beforeSHA，或已经逐字等于 afterSHA 才能视作 no-op；不覆盖其它改动。

时间比较用真实 Gregorian 整秒、显式正/负 offset 和 BigInt 纳秒；PostgreSQL 的 `2026-11-07T20:29:05.476+08:00` 与 payload 的 `2026-11-07T12:29:05.476Z` 等价。微秒/纳秒差异、跨日/年/闰年与非法日期反例保留，没有使用 Date.parse 降到毫秒。原 default 的 000110 HTTP201 / 000111 完整 ledger 已只读复算通过，project/origin/必要 creation audit 的真实共同 xmin 为 1703；这是冻结原件验证，不是新 SQL/HTTP 或恢复执行。

Root 审查 recovery-plan24.json 的 SHA 后，在 Root 工作树串行执行（先确保其它 driver 已结束）：

```sh
/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node \
  tools/rust-r4ghi/business/run-creator-slot-recovery24.mjs \
  /mnt/e/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/business-offset-recovery24/recovery-plan24.json \
  16da19881237e447acbe41dee6fc1d7e20a63270b33e391656106422c2d539da
```

恢复不发 HTTP；只做现有 capture 的只读 SQL、原件/来源/target 核验及 metadata 持久化。只把实际已提交 default slot 的 proofPending 置 false 并附上重新通过同一 creationProof 的真实 receipt，不改变 owned/borrowed 的任何 hash，不清 blockedObservation，不改旧原件，不重 POST。原 default slot SHA、原请求/响应/完整 ledger/partial、snapshot pins、三个精确 project/origin/audit 的当前 row SHA+xmin 必须匹配；其它合法 Legacy/login 进展只沿原 assertRecorded 逐一验已有 ownership，无新增漂移豁免，也不钉整份 state SHA。

23 的 ProjectController_update 是旧名；当前既有 canonical PATCH 是 ProjectController_updateBasicInfo。两处工具已更正，并在 ownership 第一条 HTTP 前预检所有固定 operationId。Root 产品中 audit literal 的独立修正由 Root 在精确 cleanup09 后处理；本候选没有 Rust 改动。未来新 epoch/新 product source 必须由 Root 重新审核 source pins，09 此恢复计划不能复用到其它 epoch。

作者离线 57 模块语法检查、全部 62 项工具纯测试及 recovery CLI --help 通过；未执行真实恢复、SQL、HTTP、cleanup、migration、产品测试或 DOM，G3/G4 false。
