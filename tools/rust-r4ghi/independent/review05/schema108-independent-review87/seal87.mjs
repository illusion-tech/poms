import fs from 'node:fs'; import path from 'node:path'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url';
const out = path.dirname(fileURLToPath(import.meta.url)), sha = b => createHash('sha256').update(b).digest('hex');
const pin = name => { const b = fs.readFileSync(path.join(out, name)); return { file: name, rawBytesSha256: sha(b), bytes: b.length }; };
const probes = JSON.parse(fs.readFileSync(path.join(out, 'probes87.json'))), baseline = JSON.parse(fs.readFileSync(path.join(out, 'baseline-probes87b.json')));
const report = { kind: 'I108-independent-schema-admission-review87', createdAt: new Date().toISOString(), reviewer: '/root/r4ghi_independent_review', nonAuthor: true,
  authorManifest: { file: 'E:/projects/worktrees/poms-r4i-lifecycle/poms/tools/rust-r4ghi/I/implementation/schema-admission108/manifest108.json', rawBytesSha256: '8943e0ac1fcabe40cee6171862cb6d2fca65186c78bf01784e61c75f372cba96' },
  disposition: 'preserve-reviewable-proposal-hold-executable-schema3-mint-for-IR87-01',
  exactInputs: { candidates: 11, unchangedRootDependencies: 7, sidecars: 14, designInputs: 3, allDeclaredRawHashesAndSizesAndRootBeforeHashesVerified: true },
  acceptedStaticBoundaries: ['Original M97 baseline remains pinned to frozen producer and direct prior registry; no whole business baseline reset.',
    'Derived comparison replaces only exact approved function body at unchanged OID/owner/ACL/frame, one migration row and one actual ID nextval; other metadata stays exact.',
    'All original migration rows retain full SHA/xmin; 138 business tables and objects are unchanged across normal migration.',
    'loadSnapshot retains original semantics; ledger/cleanup opt in through explicit verified comparison reader.',
    'Canonical M98 registration cannot be fixture owned/borrowed or cleanup deletion authority.',
    'Schema3 preserves chained original birth/retainedAt/receipt provenance and original immutable producer projection rules.',
    'New context ordinary baseline reset is refused; actual Source13 templates remain null/non-executable.',
    'No pending historical baseline package choice is selected by this proposal.'],
  findings: [{ id: 'IR87-01', priority: 'P2', file: 'tools/rust-r4ghi/business/schema-comparison108.mjs', candidateSHA256: 'adcf196d4b224156fb9eb575e8a982b2dd07ef14a672136680b9d04df40384bc', startLine: 125, endLine: 132,
    problem: 'Consistent wrapper/execution annotations do not prove that actual argv invokes the authorized single forward migration on its target database.',
    counterexample: probes.counterexample, impact: 'A wrong-direction or unrelated command receipt can satisfy the claimed normal-forward execution chain; exact catalog delta checks do not establish which normal runner produced it.',
    requestedCorrection: 'Bind the supported Root-chosen migration runner and its source pin, exact argv and target database/one forward migration configuration. Reject down/wrong migration/wrong database/unrelated invocation even if both receipt labels agree. Preserve programmatic MikroORM support when that is the reviewed real entry.' }],
  independentProbes: { exactDeltaPassed: probes.exactAdvanceAndDerivedPreservationPassed, rejectedDeltaMutations: probes.rejectedMutations,
    exactPinnedBindingPassed: baseline.exactBindingPassed, rejectedBaselineMutations: baseline.rejected,
    wrongDirectionArgvAcceptedByCurrentValidator: true, syntheticOnly: true },
  actualSource13PinsBound: false, actualM98ExecutedOrCertified: false,
  requiredLater: ['Non-author review of the exact IR87-01 corrective candidate.', 'Root final Source12 retention/stop/Native cleanup and normal M98 actual command originals.',
    'Fresh Source13 code/count/binary/physical process/candidate/complete helper graph and new plan raw SHA.', 'Exact two-database M98 before/after/fresh and read-only schema3 admission originals; retain old epoch labels.'],
  evidence: ['README87.md', 'probes87.mjs', 'probes87.json', 'baseline-probes87b.mjs', 'baseline-probes87b.json'].map(pin),
  reviewedInputs: probes.inputs, commandsExecutedFromReceipts: 0, SQL: 0, HTTP: 0, browserActions: 0, RootProductOrHelperWrites: 0, GitWrites: 0, registriesMinted: 0,
  authoredG83G84IndependentG3Granted: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(path.join(out, 'review87.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(pin('review87.json')));
