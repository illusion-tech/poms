// Governance-only snapshot after actual API15 readiness, before state admission.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const P = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const sha = b => createHash('sha256').update(b).digest('hex');
function pin(file, h) { const b = fs.readFileSync(file); if (h) assert.equal(sha(b), h, file); return { file, bytes: b.length, rawBytesSha256: sha(b) }; }
function privatePin(relative, h) { const p = pin(P + '/' + relative, h); return { ...p, file: '/home/wangzishi/.local/share/poms-r4ghi/private/' + relative }; }
function put(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); return pin(file); }
const file = R + '/docs/design/rust-r4ghi/continuation-status349.json'; assert(!fs.existsSync(file));
const oldFile = R + '/docs/design/rust-r4ghi/continuation-status348.json', old = JSON.parse(fs.readFileSync(oldFile));
const liveFile = R + '/tmp/rust-r4ghi/root/status349-live-issues.json', live = JSON.parse(fs.readFileSync(liveFile)).data.repository;
for (const [key, value] of Object.entries(live)) assert.equal(value.state, key === 'i115' ? 'CLOSED' : 'OPEN');
assert.equal(fs.readdirSync(R + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).length, 227);
const api = JSON.parse(fs.readFileSync(P + '/source15-api119-start15-01/complete.json'));
assert.equal(api.kind, 'actual-Source15-API-start119'); assert.equal(api.Source15Admitted, false);
const process = JSON.parse(fs.readFileSync(P + '/source15-api119-start15-01/process.json'));
const ready = JSON.parse(fs.readFileSync(P + '/source15-api119-start15-01/readiness.json'));
assert.equal(ready.readiness, 200); assert.equal(ready.pid, process.pid);
assert(!fs.existsSync(P + '/business/g2-business15/main01/state.json'));
const indexFile = R + '/docs/design/rust-r4ghi-delivery-status.json', trackerFile = R + '/docs/design/phase2-development-execution-tracker.md';
const indexBytes = fs.readFileSync(indexFile), trackerBytes = fs.readFileSync(trackerFile);
const B = R + '/tmp/rust-r4ghi/root/status349-before'; assert(!fs.existsSync(B)); fs.mkdirSync(B);
fs.writeFileSync(B + '/delivery-status.before.bin', indexBytes, { flag: 'wx' });
fs.writeFileSync(B + '/tracker.before.bin', trackerBytes, { flag: 'wx' });
const status = {
  kind: 'R4-actual-Source15-API-ready-state-admission-pending-status349', recordedAt: new Date().toISOString(), stage: 'Doing',
  previousFixedSnapshot: pin(oldFile), official: old.official, issues: old.issues, liveIssueReadback: pin(liveFile),
  userPolicy: old.userPolicy,
  retained: {
    ...old.retained,
    actualSource13: privatePin('business/g2-business13/main01/state.json', 'af245ff8ed1047fe2f8176b6fcd828f95af657e86feba29ab03a6963706285a4'),
    actualSource14: privatePin('business/g2-business14/main01/state.json', 'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97'),
    actualOwnership14: privatePin('business/g2-business14/main01/ownership.jsonl', '559aa091ba9cfa1ef1c72dd2a7c4d21c8d4285588519de937e6db2b2efd6aa79'),
  },
  RustProduct: { sourceCount: 420, compileCount: 528, sourceCanonicalSHA256: 'b55f88e158665474fb3890bec8749ec2af52544318f45aa068251bb476c18be7', actualSerialCargoCommands: 8, eachTreeDefault: { suites: 34, passed: 620, failed: 0, ignored: 54 }, testsNotRerunForThisMetadataSnapshot: true },
  components: { actualRootPromotedProducts: 23, actualHelpers: 227, actualHelpersPin: privatePin('source15-components119-H9-prepared01/promotion01/actual-helper-pins227.json', '1d88950c22a5f9a7d91ded85ab62d4eae5c58548eb83b36fa39ab5d94285dea1') },
  runtime: {
    oldAPI14RetiredOnce: true,
    actualRetirement: privatePin('source15-api119-retire14-01/retirement14.json', '9b4ab2730b7b2f1bb956e321406476c38cc3fb5804d906c9806fd343c506a354'),
    actualBinding: privatePin('source15-build119-bind-01/build-binding.json', '19eed60ccb24bfd77b13fce8b353651538b0fcf39274a7f3112f7dae72896ce2'),
    actualBindingComplete: privatePin('source15-build119-bind-01/complete.json', 'd70f41433b05d0c67cbb174f1963fac420f911acf3f78251cb7ba00cc269946a'),
    actualAPIComplete: privatePin('source15-api119-start15-01/complete.json', '416403b49e166d0182e679793ccf62c133ee584b149989c8217ffcc42a0e0790'),
    actualProcess: api.process, actualReadiness: api.readiness, pid: process.pid, port: 31441, readiness: 200,
    actualCurrentSource15State: null, Source15Admitted: false,
    actualObservation15: null, actualB0: null, actualReg5: null, actualB1: null,
    next: 'Exact pre-observe metadata assembly, full defaultRO139x2 conservation, actual B0, independent scope+B0 and Root review, Reg5 then actual B1 then no-replace state last, independent actual technical readback',
  },
  Tax118: { code01IndependentReady: true, codeManifestSHA256: 'f20513e897bd51661408d61376c8f21d23c1e8196f4b349cc0e06efe6b1985ed', independentCodeReviewSHA256: 'b3d57cf0a7f4b08929001f9365c8c31176fd8bbc49b315f998caed59d55ae563', actualPreparation15: null, actualFI15: null, actualNormal201: null, actualFCS: null },
  callers120: { productionExternal: 25, H3Delta: 0, code01ManifestSHA256: '5ef69401c461a0d08509fc6bf624faa95805de3c3321417781ada63aac3ccef5', code01Status: 'NOT_READY-old14-code-ready-status-rejects-real15', code02ManifestSHA256: '1570b7187ec4a714c3c92f57b22147a53242084c1636c326a11d297b05e8db5a', code02AuthorChecks: { uniqueTests: 75, syntax: 23, help: 4 }, code02IndependentReviewPending: true, actualPromotion: false },
  remainingBusinessOrder: ['Tax15 prepare/full closed FI/separate unique normal201', 'H46 equal20 and above20.01', 'Independent actual Role matrix', 'Main legacy-authority negative and exact restore without replaying Main13 create', 'Receiver genuine W45 period full FI and unique normal201 with actual historical budget chain', 'Mixed complete Live and Period targets with full original roots/batches/frozen period budget', 'Fresh final Role/Labor matrix, cleanup and conservation, independent business G3/G4'],
  newCertified: 0, G3Certified: false, G4Certified: false,
};
put(file, status);
const index = JSON.parse(indexBytes); index.date = '2026-11-11'; index.latestExecutionStatus = 'rust-r4ghi/continuation-status349.json';
index.currentExecution349 = { status: 'rust-r4ghi/continuation-status349.json', actualHelperCount: 227, API14RetiredOnce: true, actualBuildBinding15: true, actualAPI15Readiness: 200, Source15Admitted: false, businessG3: false, businessG4: false, newCertified: 0 };
fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');
const marker = '<!-- poms-r4ghi-status349 -->'; assert(!trackerBytes.toString().includes(marker));
fs.writeFileSync(trackerFile, trackerBytes.toString() + '\n\n' + marker + '\n\n### 2026-11-11 统一候选状态349：新隔离 API 就绪，状态准入待完成\n\n[固定状态349](rust-r4ghi/continuation-status349.json)接续348：Root实际23文件和227 helper已独立读回；原API14已唯一受控SIGTERM退休，真实buildBinding15通过完整后验，新ROOT15 API已启动且31441/readiness真实200。Source13/14状态与ownership原hash保持；无迁移、恢复或重置。新状态、B0/Reg5/B1尚未发布；先完成默认只读139表双快照守恒与独立准入，才能进入新业务验收。\n\n#118八外置叶已非作者代码就绪，真实15 prepare/FI/单正常201和F/C/S未执行。#120原code01发现真实旧14准入标识拒绝新15的P2，原件保NOT READY；code02仅一字节修正，作者75项/23syntax/4help通过，独立最终复核待完成。四caller仍未推广。已完成Main13的一次201及旧partial/failed原件保持原标签，未重放。Rust正式240、R4交付67/95、本批新增认证0、业务G3/G4未通过；#57及完整业务R5 #116保持开放。\n\n<!-- /poms-r4ghi-status349 -->\n');
console.log(JSON.stringify({ status: pin(file), index: pin(indexFile), tracker: pin(trackerFile), Source15Admitted: false, newCertified: 0 }));
