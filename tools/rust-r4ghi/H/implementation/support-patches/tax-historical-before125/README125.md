125 仅修改 `tools/rust-r4ghi/business/tax13-semantics.mjs`，修复 IR122-01：真实201已经被ledger归属、owner.latest已更新为after，原Tax语义首段却用普通current owned读before，导致成功后假拒绝。全局 `tax13-facts.rowsTax13`、所有after reader、Main completion reader和业务数学规则均不改。

新增 `historicalOwnedRowsTax13(ctx,before,after,attempt)` 仅由 `verifyTax13Semantics` 使用。先核真实attempt及其publicHTTP/headers为完整201、same operation/request；pin读取的before/after JSON与传入snapshot深等（没有虚构manifest属性）；同attempt ledger必须ownershipComplete、无blockers、same req/op/两pins。

未变旧行继续普通strict owned。changed仅支持Tax实际会替换的basis/tax/result/old snapshot四表；核原HTTP birth before无PK、after firstSHA、marker/source一致，after仍普通strict当前latest SHA/xmin；核latestProof必须HTTP-owned-row-update、same request/op、beforeSha和两actual pins，并在完整ledger中有same PK owned-update。不能凭旧current.latest或一个放宽参数读取任意历史，不能改原birth proof。

本code封件先交A读；FS正负回执另append。Root198/220/221/223和原Tax helper保留原样，119未发表。通过独审后将本单文件作为额外明确H0→H1 delta，另生成实际H1/plain/plan；不得热改已mint图、重播已成功来源或把Stage历史FS反例当Tax新业务成功。

无Root写、SQL、HTTP、服务/进程动作或G3/G4认证。仅作者Node语法检查与后续纯/不可变FS测试。
