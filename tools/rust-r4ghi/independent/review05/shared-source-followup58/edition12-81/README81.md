81 是对未提升80的最小工具修订，旧80文件和 ledger 实现均不改。以 manifest81.json 的 effectiveFiles 为最终13文件应用集合，只有 race58、其测试、source58 三个文件覆盖80；其余10个文件继续精确使用80候选。Source12/API135、406/5263、binary de8、M97、152个business helper/155个helper pins和全部业务/FI/race逻辑保持80边界。

修复点在一次 common before/after 的 winning ledger 完成之后。若真实 loser session 有 raw touch，必须仍为实际 capture409/operating_preparation_changed、同一真实actor、不同requestId、完整HTTP传输；精确核sessionId、原SHA/xmin及五列稳定条件。先确认通用ledger刚把这个现有auth_session绑定到winner/同一beforeSHA和actual afterSHA/xmin，再追加私有attribution原件，链接loser原HTTP四个raw pins、common observation、before/after和immutable winner ledger；只把该session的latestProof更新为真实loser requestId/operation/status409。原winner ledger与旧ownership记录保留，不改任何业务owned，不授新authority，不泛化auth豁免。若没有实际变化，attribution明确为null，零ownership写入。

原80的执行顺序不变：`shared-stage-race58` 先完成Stage全部必要FI并以唯一正常纠正成功执行58C，再 `shared-tax-fixture58` 真实生产/消费并获取fresh准备，最后 `shared-tax-sweep58`。不得先plain Stage成功再重放race。Root仍须非作者核修订、按effectiveFiles精确提升，随后唯一执行实际driver。所有旧失败、80原件及producer134/read135标记保留。

新增三项纯回归覆盖真实loser409归属、无touch明确null/零写入、错误HTTP/foreign actor/越界列或stale owned绑定拒绝。Windows全部23files128项、Linux新4files25项均通过，两个改动mjs语法0；其他10个mjs字节与80完全相同。作者未SQL/HTTP、未改Root helper/产品/Git，未签业务或G3/G4。
