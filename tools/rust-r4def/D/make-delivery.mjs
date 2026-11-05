// Creates the author handoff inventory. Does not certify G3/G4 or run product services.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../../..');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const hash=relative=>{const bytes=fs.readFileSync(path.join(root,relative));return {path:relative,bytes:bytes.length,rawBytesSha256:crypto.createHash('sha256').update(bytes).digest('hex')};};
const owned=[
  'apps/poms-api-rust/src/project_handover',
  'apps/poms-api-rust/src/contracts',
  'apps/poms-api-rust/src/contract_readiness',
  'apps/poms-api-rust/src/approval/domain.rs',
  'apps/poms-admin/src/app/features/project/project-contract-handover.ts',
  'apps/poms-admin/src/app/features/project/project-contract-handover.spec.ts',
  'apps/poms-admin/src/app/features/project/project-handover-actions.ts',
  'apps/poms-admin/src/app/features/project/project-handover-flow.ts',
  'apps/poms-admin/src/app/features/project/project-handover-flow.spec.ts',
];
const paths=[...new Set([...git('diff','--name-only','--',...owned).split('\n'),...git('ls-files','--others','--exclude-standard','--',...owned).split('\n')].filter(Boolean))].sort();
const pins=[
  'docs/design/rust-r4def/g1-gate-authority07.json',
  'docs/design/rust-r4def/joint-g1-06/manifest06.json',
  'docs/design/rust-r4def/joint-g1-06/operation-map06.json',
  'docs/design/rust-r4def/joint-g1-06/schema-authority06.json',
  'docs/design/rust-r4def/joint-g1-06/schema06.sql',
  'docs/design/rust-r4def/ownership04.md',
  'docs/design/rust-r4def/protocol01.md',
  'docs/design/rust-r4def/root-decisions02.json',
  'docs/design/rust-r4def/root-projection05.json',
  'docs/design/rust-r4def/D-g1-candidate01.md',
  'docs/design/rust-r4def/D-g1-candidate01.json',
  'docs/design/rust-r4def/D-schema-candidate01.sql',
  'libs/shared/contracts/src/lib/shared-contracts.ts',
  'libs/shared/api-spec/openapi.json',
  'libs/shared/api-client/api/project-handover.service.ts',
  'libs/shared/api-client/model/project-handover-frozen-materials.ts',
  'apps/poms-api-rust/src/lib.rs',
];
const localTools=fs.readdirSync(import.meta.dirname).filter(name=>name!=='D-delivery01.json').sort().map(name=>hash('tools/rust-r4def/D/'+name));
const report={
  kind:'R4D-G2-author-implementation-handoff',createdAt:new Date().toISOString(),baseline:git('rev-parse','HEAD'),branch:git('branch','--show-current'),issues:{parent:106,D:107,stageRemainsOpen:101,overallRemainsOpen:57},
  status:{implementationReadyForRootIntegration:true,G3Certified:false,G4Certified:false,committed:false,pushed:false},
  scope:{DHttp:7,batchHttp:30,newHttp:2,controlledAmendment:'existing readiness/contract/review routes only',generatedFullHttp:293,generatedSchemas:626},
  sourceFileCount:paths.length,sourceFiles:paths.map(hash),toolArtifacts:localTools,readOnlyInputPins:pins.map(hash),
  excludedRootOwnedChanges:['apps/poms-api-rust/src/lib.rs','libs/shared/**','public support/http/Cargo','migrations/entities','GitHub/formal governance docs'],
  implemented:[
    'D7 execute borrows caller CommonSession and active outer transaction; all mandatory business/common/todo/summary/audit/security writes fail together.',
    'Real prepare freezes every active contract exact approved preparation/snapshot/formal plan; explicit actual people/core duties/optional finance and receipt mode; real pending tasks, no invented consent.',
    'Self confirmation authenticates actual own participant and revalidates complete current contract/plan/attachment sources under locks before any write; stale sources conflict including duplicate retries.',
    'Final confirmation consumes actual complete participant/duty set and freezes receipt mode without inventing R5 role freeze or execution admission.',
    'Real summary definitions are required from promoted migration94; producer stores immutable basis/full payload/two linked summary payloads with exact hashes and safe basis labels.',
    'frozenMaterials reconstructs only historical scope/risk typed allowlists, cost version references and exact basis/source identities; financial/people/rate payloads never bypass projection.',
    'Active controlled amendment keeps old snapshot/plan effective until true exact R2 approval and atomic activation of full new schedule; no receipt copies or replay.',
    'Rebaseline verifies every changed contract complete consecutive amendment before/after chain, requires explicit affected contract/receivable items, persists full lineage in basis/hash/audit and starts fresh participant confirmations.',
    'Ordinary prepare cannot bypass changed previous contract snapshots and preserves inherited valid rebaseline lineage; historical detail uses its own receipt freeze.',
    'Minimal Angular UI supports actual user selection/duties/materials/self/final confirmation, controlled terms/commercial reference/review/activation/rebaseline, route and request epochs and explicit version state.',
  ],
  validation:[
    {name:'isolated Rust fmt',result:'pass',artifact:'fmt-20261103T225648649Z-original.log'},
    {name:'isolated Rust Clippy -D warnings',result:'pass',artifact:'clippy-20261103T225804762Z-metadata.json'},
    {name:'actual Rust project_handover pure tests',result:'pass',passed:9,failed:0,ignored:0,filtered:236,artifact:'test-20261103T230029436Z-metadata.json'},
    {name:'actual pure UI helper runtime assertions',result:'pass',passed:4,artifact:'pure-ui-20261103224746109.json'},
    {name:'TypeScript with actual 626 generated client',result:'pass',errors:0,artifact:'ui-typecheck-20261103230015057.json'},
    {name:'5 owned UI TS files Prettier check',result:'pass',observedExitCode:0},
    {name:'owned git diff --check',result:'pass',observedExitCode:0},
    {name:'Angular template/build/Jest/browser, HTTP/DB/concurrency/fault injection',result:'not-run-by-D',owner:'Root'},
  ],
  preservedFailures:['clippy-original.log','ui-typecheck-20261103225838606.json'],
  pendingImplementationBlockers:[],
  requiredRootIntegration:['Register D7 with the common outer transaction adapter and promoted94/entities/error mapping.','Consume only sourceFiles whitelist; preserve Root-owned lib/shared sync separately.','Run real full Angular/Jest/template/build/browser, source/authorization/CSRF/rollback/concurrency/DB checks and independent G3/G4.'],
  requiredRootBusinessScenarios:['real R3 and two independently priced contracts to exact reviews/activation/plans/prepare/each own confirmation/final/R5-pending','changed contract or attachment before self/final including already confirmed self retry must conflict without side effects','existing confirmed receipt then controlled amount amendment: current plan unique, old plan historical, original receipt still one fact and aggregate counted once','two changed contracts and two successive activations of one contract: full lineage and explicit impact coverage; missing/foreign/branched history rejected','all necessary write failures including summary/payload/participant/todo/freeze/impact/audit/auth/security produce whole rollback','R2 actual uploaded bytes checklist/refresh/package/download with material version/security changes and no metadata refresh loop','historical by-id material/mode remain frozen; writer-only active user picker; readonly operational scope/risk legible; financial canaries masked','UI actual complete workflow and A to B to A late-response protection'],
};
const destination=path.join(import.meta.dirname,'D-delivery01.json');
fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({manifest:destination,sourceFileCount:paths.length,rawBytesSha256:hash('tools/rust-r4def/D/D-delivery01.json').rawBytesSha256,baseline:report.baseline,sourceFiles:paths},null,2));
