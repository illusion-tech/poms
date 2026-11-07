# A07 cent-max producer 准入补正57-02

本增量接在 sealed57 之后；旧57原件不改。当前 Root 尚无 `lifecycle-two-task57.mjs`，所以 updated file 的 before SHA 明确为原57候选的 `4fc43c037bd46668e7ff980494a9979dca2b8d6c328283b7ad7a53bc0d7fc11b`，须 Root 把57与本增量按 manifest 顺序组合。另加两个新文件。

`prepareTwoTask57` 在创建 consumer view/API 或发送任何 HTTP 前，先用实际 persisted `/fixtures/a05Boundaries26/views/cent-max`、真实 projectId、真实 published proof pin 调用 `assertAdmittedFixtureSource`。随后从全局已批准 private 根内的 canonical 常规文件重读 exact bytes/hash，拒绝 symlink/path escape；对实际原件核同项目、同已发布 snapshot ID、已完成 producer proof及四份 H evaluation 的同 sourceHash。truthy flag、preparation-only、错项目/snapshot/binding 均不能成为 published authority。

Root 升级12后，generic consumer registry 必须真实登记此 Source11-born cent-max 的来源和 published proof receipt；旧10-born A05 max-zero 的标签不改。本工具只验证，不在旧 producer record 上缓存来源或补新 source 标签。

原81+57四项+本增量两项 pure 共87通过；纯测试验证 artifact 内容边界，不冒称实际FS准入/HTTP/A07运行通过。作者没有执行DB/HTTP，也未改Root产品/工具。H可据当前候选继续非作者重核。
