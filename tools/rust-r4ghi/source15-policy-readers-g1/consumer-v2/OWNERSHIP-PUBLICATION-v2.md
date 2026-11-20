# G1-C15 v2：冻结归属及无环发布补充

v1 `50a6b234…` 未充分指定这项协议。它已有 attempt-bound 历史读取和禁止旧latest比较的条文，但没有强制一个在真实normal reconcile、postconditions和exit-journal之后封存的ownership/journal frame，也没有要求完整ownership日志原件。v1所有原件不改。

v2只补此项：completion和sidecar各增加同名 `afterVerifiedFrame` pin，最终 `record.sweep.afterVerifiedFrame` 同pin。五consumer及其固定抽取、284 normalize、返回native字段、reader两文件与原其它契约不变。

## 单向顺序

1. normal实际201原件已保存，真实after capture/reconcile、完整postconditions、实际exit guard及closed journal完成。此时尚无completion/sidecar输出pin。
2. 在同一Root nonce/driver下，封实际ownership state的原字节副本、完整当前D15 `ownership.jsonl` 原字节副本、完整有序command-ledger索引及已真实写出的normal/entry/exit/journal原件，生成不可变frame F。不得以手工筛选owned子集或构造ctx代替实际state。
3. completion C引用F及真实FI/201；C不含S。sidecar S最后引用C和同F。
4. C/S两原件已wx成功后，当前state最后一次metadata发布记录C/S及sweep的F。F不反指C/S，C不反指S；任一中断只留孤件/partial，不覆盖旧文件、不重发normal。

路径/nonce可以在输入中提前固定，未来输出hash不能提前填入F。state完成/sidecar/frame指针在F的ownership state副本中只能缺失或null，不能已含待生成输出pin；保留真实先前FI完成pin是允许的。计数器后续进展不要求整份current state永远等于F。

## 最小F字段

`kind='actual-Source15-Tax118-after-verified-ownership-journal-frame'`、schema1、namespace/epoch15/run/sourceGeneration15、marker/prefix、实际封点sequence、current15 tuple，以及：

- `ownershipState`：实际完整state原字节的独立私有副本pin，包含真实owned/borrowed/必要object归属。不得指向会继续覆盖的state.json，不补字段/重标父来源。
- `ownershipLog`：实际D15 ownership.jsonl从首字节至封点的完整独立副本pin，不是挑出的normal行。原日志记录是 `{at,key,rowSha256,proof}`，本协议不虚构其含xmin。
- `observation`：本normal原件的after全139×2 snapshot pin。after capture至F之间不得有未观察的HTTP/业务写入；postcondition/exit阶段依约仅验证。若实际设计需要其它会改行的读取，必须先另明确该额外观察及ledger链，不能假定旧after仍最新。
- `commandLedgers`：从本normal invocation的真实entry ownership锚点到observation的每个实际HTTP reconciliation ledger pin，按实际顺序完整列出，包含实际认证步骤，不限normal一条。
- `normalResult`、`fiCompletion`、`entryGuard`、`exitGuard`、`closedJournal`：全部实际已封原件pin。normalResult必须包含真实201/ledger/before/after及verified postconditions来源，不能只有bool。

每个effectful invocation的entryGuard另须明确 `ownershipState` 与 `ownershipLogPrefix` 两个实际immutable pin。完整after日志必须逐字包含相应entry日志前缀；reader由该entry实际state起，以原HTTP/ledger/snapshot及真实append记录核对归属推进，不拿v1未定义的缓存/ctx替身作权威。FI仍用其各自真实entry/rollback原件，不能由normal的最终map倒推FI当时已准。

## native严校及后续推进

用明确数据参数读取F，不调用旧assertRecorded时替换ctx.state或造readonly fake ctx。通过真实before/after各行sha/xmin、实际wire/requestId/op、ledger.recorded/blockers和ownership append逐项闭合；重算全部normal必要/允许差分及原postconditions。原birth/first/proof保持；每个改行的before身份、after SHA与实际xmin、latestProof的request/op/beforeSha和原snapshot pins必须一致。borrowed不假设存在latestXmin：其after真实xmin由原snapshot/ledger证明，最新SHA、允许列、baseline身份仍严格核。删除及不在ownership.jsonl追加的借用元数据必须由完整commandLedgers及实际state差分覆盖，未知项拒绝。

原snapshot对象由原pin读取并深等验证；ledger现有字段没有status，状态从真实HTTP原件核。整个frame在封点实际owned/latest上验证一次，此后period/mixed合法推进不能使读者将F旧值与ctx.owned.latest强比；当前只验真实15 source/API/注册及当前Tax完成/F指针身份。旧epoch13 Main、epoch14保留点仍由typed桥验证，不用F重标。

F/C/S的hash、正常结果、observation、FI、entry/exit/journal及current tuple必须跨对象同一。五consumer均经同一native/joint严校；不能为Role/period例外省略。返回的具名sidecar证明额外公开F pin，仍effectsGranted=false、深只读独立副本，不授cap或修复权限。

此为设计补充，所有actual为null。没有新增reader产品、executor第七叶、H3变动或实施许可。Root另冻六叶15/prepare-facts与actual G2；v1的不充分性保原标签。
