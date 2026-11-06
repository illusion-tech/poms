"""Build tools-only joint G1 review inputs. Writes only beside this script.

No Git, subprocess, network, environment/credential access, SQL or product build.
Run from the repository root: python tools/rust-r4ghi/joint-g1/build.py
"""
from __future__ import annotations

import hashlib
import json
import re
import ast
import copy
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
SOURCES: set[str] = set()


def source(path: str) -> str:
    SOURCES.add(path)
    return (ROOT / path).read_text(encoding="utf-8-sig")


def js(path: str):
    return json.loads(source(path))


def emit(name: str, value):
    target = OUT / name
    assert target.parent == OUT and ROOT in target.parents
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def text(name: str, value: str):
    target = OUT / name
    assert target.parent == OUT and ROOT in target.parents
    target.write_text(value.replace("\r\n", "\n"), encoding="utf-8")


GDIR = "tools/rust-r4ghi/G/final-g1/"
HDIR = "tools/rust-r4ghi/H/final-g1/"
IDIR = "tools/rust-r4ghi/I/final-g1/"
g = js(GDIR + "proposal01.json")
gr = js(GDIR + "refinements02.json")
gdto = js(GDIR + "target-dto.schema.json")
h = js(HDIR + "proposal01.json")
hdto = js(HDIR + "dto-delta01.json")
hschema = js(HDIR + "source-context.schema.json")
i = js(IDIR + "contracts.json")
source(IDIR + "refinements03.md")
iref_path = IDIR + "refinements03.json"
iref = js(iref_path) if (ROOT / iref_path).exists() else None
if (ROOT / (IDIR + "refinements03.sql")).exists():
    source(IDIR + "refinements03.sql")
decisions = js("docs/design/rust-r4ghi/user-decisions02.json")
scope_path = "docs/design/rust-r4ghi/user-decision-scope03.json"
scope_decision = js(scope_path) if (ROOT / scope_path).exists() else None
status = js("docs/design/rust-r4ghi-delivery-status.json")
inventory = source("docs/design/api-route-canonical-inventory.md")
spec_path = "libs/shared/api-spec/openapi.json"
spec = js(spec_path)
shared_path = "libs/shared/contracts/src/lib/shared-contracts.ts"
source(shared_path)
old_h = js("tools/rust-r4ghi/H/g1/operations01.json")
ROOT_ADOPTIONS = {
 "source":"Explicit Root assignment messages in this task; to be promoted into Root formal baseline, not a substitute for independent G1",
 "GHScope":"Finance permission AND (OwnerWrite OR delegated confirmed finance OR delegated confirmed business-admin); read OwnerRead/Part; condition-only and creator-bootstrap-only never expand finance/commission reads",
 "outputReferenceAcyclicity":"Only upstream facts enter sourceHash. New self/result restatedSnapshotRef/restatementRef/new-paired-periodEndSnapshotRef are null at immutable capture and never backfilled; result links use SQL FK/response. Existing restatesSnapshotRef and actual existing period root remain sources.",
 "pendingTax":"Unknown pending tax amount is SQL NULL with explicit knowledge; never zero fallback",
 "modernInputProtocol":"All 32-operation modern write DTOs plus supporting C confirm require inputVersion='server-derived-v1'. Native modern returns explicit422; Rust legacy/missing tag422. Other existing E/F ordinary unconsumed protocols keep existing tags; new sealed restatement branch explicitly versioned.",
 "summaryDefinitions":"Root adopted exact R5/stage scenario/package/projection/export/field-rule names from the joint proposal; configuration definitions only, no business approval rows"
}
emit("root-adoptions.json",ROOT_ADOPTIONS)
SUMMARY_DEFINITIONS = [
 {"scenario":"commission-gate-review","package":"project-operating-commission-gate-v1","projection":"commission-gate-review","export":"internal-only","fieldRule":"r4h-operating-v1","targetType":"operating-signal-gate-binding"},
 {"scenario":"commission-role-freeze","package":"commission-role-freeze-confirmation","projection":"commission-role-freeze","export":"commission-controlled","fieldRule":"r4i-role-freeze-v1","targetType":"commission-role-assignment"},
 *[{"scenario":"project-stage-transition","package":name,"projection":"project-stage-admission","export":"internal-only","fieldRule":"r4i-lifecycle-v1","targetType":"project-stage-record"}
   for name in ("project-handover-stage","project-execution-admission","project-acceptance-admission","project-completion-stage")]
]

# Local effective overlay only; original author files remain untouched.
h = copy.deepcopy(h)
hash_contract = h["sourceContext"]["sourceHashFactualWhitelist"]
hash_contract["snapshot"] = [key for key in hash_contract["snapshot"] if key not in {"restatementRef","restatedSnapshotRef"}]
hash_contract["exclude"] += ["snapshot.restatementRef (this command output)","snapshot.restatedSnapshotRef (this snapshot result)","new paired snapshot.periodEndSnapshotRef (null at capture)"]
h["sourceContext"]["outputRefCapturePolicy"] = ROOT_ADOPTIONS["outputReferenceAcyclicity"]
POLICY_DEFINITION = {"version":"r4h-operating-v1","ruleContract":h["policy"],
 "numericConstants":{"lowReceiptRatio":{"numerator":1,"denominator":5,"comparison":"strictly-less"},
  "negativeAutoRiskMinimumReceiptRatio":{"numerator":1,"denominator":5,"comparison":"greater-or-equal"},
  "extremeMarginLower":{"numerator":-1,"denominator":1,"comparison":"strictly-less"},
  "extremeMarginUpper":{"numerator":1,"denominator":1,"comparison":"strictly-greater"},
  "severityOrder":["prompt","review","block"],"displayRatioScale":6,"displayRounding":"half-away-from-zero"},
 "authority":"H pure derivation only; Root model/hash module contains no business policy calculator"}
POLICY_CANONICAL = json.dumps(POLICY_DEFINITION,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf-8')
POLICY_HASH = hashlib.sha256(POLICY_CANONICAL).hexdigest()
emit("policy-definition.json",POLICY_DEFINITION)

# The old H operations file supplies identities only. All DTO/rule authority is
# final-g1 plus the joint overrides, and the live spec is independently pinned.
spec_ops = {}
for route, methods in spec["paths"].items():
    for method, op in methods.items():
        if isinstance(op, dict) and "operationId" in op:
            spec_ops[op["operationId"]] = (method.upper(), route, op)


def canonical_evidence(method, route):
    wanted = f"{method} {route.removeprefix('/api')}"
    matches = [{"line": n, "row": row} for n, row in enumerate(inventory.splitlines(), 1)
               if f"`{wanted}`" in row]
    return {"canonical": wanted, "observedRows": matches,
            "inventoryStatus": "existing-aligned" if matches else "root-must-register-planned"}


def route(row, group, owner, request, response):
    method, path = row["method"], row["path"]
    if row["operationId"] in {"ProjectController_startExecution", "ProjectController_startAcceptance"}:
        path = path.replace("{projectId}", "{id}")
    if row["operationId"] == "ProjectCompletionRecordController_closeCompletionCondition":
        path = "/api/project-completion-records/{completionRecordId}/conditions/{id}:close"
    keys = re.findall(r"\{([^}]+)\}", path)
    result = {"operationId": row["operationId"], "group": group, "issue": {"G":111,"H":112,"I":113,"R5-min":117}[group],
              "businessOwner": owner, "publicWiringOwner": "Root", "method": method, "runtimePath": path,
              **canonical_evidence(method, path), "namedResourceKeys": {key: "UUID" for key in keys},
              "requestDto": request, "responseDto": response, "successStatus": row["successStatus"],
              "permission": row.get("permission", "contract:finance:manage"),
              "csrf": method != "GET", "newPublicOperation": row.get("canonicalFreezeRequired", False),
              "countedOnce": True, "authentication": "active session + exact route permission",
              "scopePolicy": row.get("guardPolicy", "operating-write" if method == "POST" else "operating-read")}
    if row["operationId"] == "ProjectCompletionRecordController_closeCompletionCondition":
        result["typedResourceKeys"] = {"completionRecordId":"CompletionRecordId", "id":"CompletionConditionId"}
        result["scopePolicy"] = "condition-close-own-only"
    elif row["operationId"] in {"ProjectController_startExecution", "ProjectController_startAcceptance"}:
        result["typedResourceKeys"] = {"id":"ProjectId"}
    if row["operationId"] in spec_ops:
        sm, sp, so = spec_ops[row["operationId"]]
        result["legacySpec"] = {"method":sm, "path":sp, "declaredSuccessStatuses":[x for x in so.get("responses", {}) if x.startswith("2")]}
    return result


operations = [route(r, "G", "G", r["input"]["$ref"].split("/")[-1] if r["input"] else None,
                    r["response"]["$ref"].split("/")[-1]) for r in g["routes"]]
for r in old_h["operations"]:
    operations.append(route(r, "H", "H", r["requestSchema"], r["responseSchema"]))
for r in i["targets"]:
    operations.append(route(r, "R5-min" if r["group"] == "R5" else "I", "I", r["requestDto"], r["responseDto"]))
for op in operations:
    if op["method"] == "POST":
        op["requestProtocol"] = {"requiredInputVersion":"server-derived-v1","NativeModernStatus":422,"RustMissingOrLegacyStatus":422}

modern_names = {op["requestDto"] for op in operations if op["method"] == "POST"} | {"ConfirmReceiptRecordRequest"}
gdto = copy.deepcopy(gdto)
for name, shape in gdto["$defs"].items():
    if name in modern_names:
        shape.setdefault("properties",{})["inputVersion"] = {"const":"server-derived-v1","type":"string"}
        shape["required"] = sorted(set(shape.get("required",[])) | {"inputVersion"})
for op in operations:
    if op["group"] == "G":
        shape = gdto["$defs"][op["responseDto"]]
        shape.setdefault("properties",{})["outputVersion"] = {"const":"server-derived-v1","type":"string"}
        shape["required"] = sorted(set(shape.get("required",[])) | {"outputVersion"})
hdto = copy.deepcopy(hdto)
for delta in hdto["fieldDeltas"]:
    if delta["schema"] in modern_names:
        delta.setdefault("add",{})["inputVersion"] = "required literal server-derived-v1"
i = copy.deepcopy(i)
for name, shape in i["components"]["schemas"].items():
    if name in modern_names:
        shape.setdefault("properties",{})["inputVersion"] = {"const":"server-derived-v1","type":"string"}
        shape["required"] = sorted(set(shape.get("required",[])) | {"inputVersion"})

# Exact old public schemas and closure, for Root's later Native reference aliases.
selected = set()
old_operations = []


def collect_refs(value):
    if isinstance(value, dict):
        ref = value.get("$ref", "")
        if ref.startswith("#/components/schemas/"):
            name = ref.rsplit("/", 1)[-1]
            if name not in selected:
                selected.add(name)
                collect_refs(spec["components"]["schemas"][name])
        for key, child in value.items():
            if key != "$ref":
                collect_refs(child)
    elif isinstance(value, list):
        for child in value:
            collect_refs(child)


support_ids = ["ContractFinanceController_confirmReceiptRecord", "ProjectController_create",
               "ProjectController_reassignOwner", "ProjectController_getById", "ProjectController_getTimeline",
               "ProjectHandoverController_prepareProjectHandover", "LeadController_convertToProject"]
for op_id in [x["operationId"] for x in operations] + support_ids:
    if op_id not in spec_ops:
        continue
    method, path, op = spec_ops[op_id]
    content = {key: op[key] for key in ("parameters","requestBody","responses") if key in op}
    collect_refs(content)
    old_operations.append({"operationId": op_id,"method":method,"path":path, **content})
native = {"kind":"frozen-native-reference-input-not-new-public-contract", "source":spec_path,
          "sourceSha256":hashlib.sha256((ROOT/spec_path).read_bytes()).hexdigest(),
          "sharedSourceSha256":hashlib.sha256((ROOT/shared_path).read_bytes()).hexdigest(),
          "rule":"Exact deep copies of current source schema objects and full transitive component closure. Root later extracts explicit Native aliases; no current public schema weakened for Native compilation.",
          "operations":old_operations,
          "components":{"schemas":{key:spec["components"]["schemas"][key] for key in sorted(selected)}}}
emit("native-reference.schemas.json", native)

effective = dict(hschema)
effective["title"] = "R4 G/H joint immutable source context v1 - review input"
effective["x-authority"] = {"modelOwner":"Root", "factCollectorOwner":"G", "policyOwner":"H", "source":HDIR+"source-context.schema.json",
                          "noIndependentGModel":True, "internalOnly":True}
effective["x-sourceHashFactualWhitelist"] = h["sourceContext"]["sourceHashFactualWhitelist"]
effective["x-arrayOrdering"] = h["sourceContext"]["arrayOrdering"]
effective["x-preEffectInputHashWhitelist"] = gr["inputHashExactWhitelist"]
effective["x-sourceRefKindDispatch"] = gr["inputRefKindNarrowing"]
effective["x-activePolicy"] = {"file":"policy-definition.json","policyVersion":"r4h-operating-v1","policyHash":POLICY_HASH,"canonicalization":"contract_support::canonical_hash: recursively sort object keys, preserve array order, compact UTF-8 JSON; no floats in this policy artifact"}
effective["x-semanticValidation"] = {"collector":g["collector"],"sourceContext":h["sourceContext"],
                                   "required":"Validate real records and exact amounts/hashes; JSON Schema cannot prove scope, sums, lineage, authorization or policy."}
emit("source-context.schema.json", effective)

baseline_only = {
  "contextTable":"operating_baseline_source", "forbidden":"No fake OperatingSourceContext/snapshot/H evaluation for baseline-only activation",
  "sequence":g["baselineOnlySequence"]}
scope_policy = {
  "version":"project-scope-v1-direct-relations", "source":IDIR+"refinements03.json",
  "freshActor":"actor.id=session.user.user_id=session.user_snapshot.id; DB platform_user active; guard permission exact; cached profile organization is not a grant",
  "membership":"fresh active user_org_membership, revoked_at IS NULL, type primary/secondary, JOIN org_unit.is_active=true",
  "OwnerRead":"project.owner_user_id=actor.id; old missing-org permits only non-sensitive anchor read",
  "OwnerWrite":"OwnerRead AND active project.owner_org_id AND actor has exact current membership in that org",
  "Part":"exact current producer_version=1 handover draft/confirmed + basis matching project/current sales owner + actual confirmation/participant/duty joins; verify frozen payload/hash",
  "ConfirmedDuty":"Part AND handover/confirmation/self participant all confirmed; EO also equals handover.execution_owner_user_id",
  "DelegatedWrite":"active project ownerOrg AND actor at least one active org membership AND exact required ConfirmedDuty; cross-department explicit duty permitted",
  "OwnCondition":"true parent-completion/condition/project match; v1 conditional completion; actor strictly condition.responsible_user_id; active membership+ownerOrg; own-task scope only",
  "Bootstrap":"Only the new explicit project_ownership_origin fact can authorize creator's first personal assignment. Direct create starts consumed. Never infer neverPersonal from current NULL, empty reassignment history, role, or org membership. Old missing-origin stays fail-closed.",
  "actions":{
    "read":"route permission AND (OwnerRead OR Part); condition-only returns only own completion/task minimal view",
    "draft":"commission:assignments:manage AND OwnerWrite",
    "freeze":"commission:assignments:manage AND (OwnerWrite OR DelegatedWrite+BA)",
    "execution-entry":"project:write AND DelegatedWrite+EO",
    "acceptance-entry/acceptance/completion":"project:write AND DelegatedWrite+EO consistent with true execution stage owner",
    "archive":"project:write AND (OwnerWrite OR DelegatedWrite+(EO OR BA))",
    "condition-close-own-only":"project:write AND OwnCondition; current owner/admin cannot act as responsible user",
    "prepare":"project:write AND OwnerWrite before applying requested participants",
    "participant-confirm":"project:read AND Part AND self-confirmation; preserve D7 permission",
    "handover-finalize/rebaseline":"project:write AND (OwnerWrite OR DelegatedWrite+BA)",
    "reassignOwner":"project:write AND pre-change OwnerWrite, OR precise unconsumed creator bootstrap from I final origin fact; lock old project before deciding",
    "operating-read":"contract:finance:manage AND (OwnerRead OR Part); no ConditionOnly finance expansion; exact sensitive projections still apply",
    "operating-write":"contract:finance:manage AND (OwnerWrite OR DelegatedWrite+ConfirmedDuty(finance) OR DelegatedWrite+BA); Root explicitly adopted in this assignment. BA is the actual current handover duty, never a platform roleKey"
  },
  "denials":"same org/ancestor org/admin roleKey/is_system_role/project:write/finance permission alone grants no project scope; no manufactured new manager/setting/seed",
  "errors":{"outsideScope":404,"insideScopeWrongAction":403,"changedSourceOrCAS":409,"invalidShape":400,"databaseFailure":500},
  "listFiltering":"SQL relation predicate before projection/pagination. OwnCondition-only filters conditions to own while whole-parent conditionStatus derives all real conditions.",
  "proof":"private nonserializable ProjectAccessProof, bound to actor/project/action/current facts and caller TX; never body-supplied responsibilities; no second connection/cache"}

supporting = [
 {"area":"C","operationId":"ContractFinanceController_confirmReceiptRecord","method":"POST","canonical":"/receipt-records/{id}:confirm","newHttp":False,"countDelta":0,
  "dto":"ConfirmReceiptRecordRequest", "owner":"Root", "source":GDIR+"target-dto.schema.json#/$defs/ConfirmReceiptRecordRequest", "contract":g["receiptBasis"]},
 {"area":"B","operationId":"existing contract term activation producer","newHttp":False,"countDelta":0,"owner":"Root",
  "contract":"On true activation freeze term.currency_code from actual linked CommercialReleaseBaseline and hash it. Legacy NULL remains NULL; no guessed current/latest tax/currency. Actual immutable term or actual commercial baseline rowVersion is currency authority; no fake ProjectHandoverContractBasis version."},
 {"area":"E/F","operationId":"existing labor/source/stage/tax/allocation replacements","newHttp":False,"countDelta":0,"owner":"Root","contract":g["inclusion"]},
 {"area":"D","operationId":"ProjectHandoverController_prepareProjectHandover","newHttp":False,"countDelta":0,"owner":"Root",
  "contract":"Pre-change OwnerWrite first; verify actual approved activated contract/plan/pre-signing producer; insert stage handover or true handover requalification + project CAS in same outerTX. Never regress execution/acceptance/terminal and never authorize from body duties."},
 {"area":"D","operationId":"existing handover current/material/self-confirm/finalize/rebaseline","newHttp":False,"countDelta":0,"owner":"Root",
  "contract":"Use same exact current (no latest fallback), project-scope proof and true self-confirmation. Current scope helper never substitutes for contract/source freshness and domain admission."},
 {"area":"Project","operationId":"ProjectController_create","newHttp":False,"countDelta":0,"owner":"Root",
  "contract":"currentStage omitted or literal assessment only; advanced requested stage is400, no coercion. Server createdBy=actor, initial personal owner=actor; persist true project_ownership_origin already consumed, no future reset."},
 {"area":"Lead","operationId":"LeadController_convertToProject","newHttp":False,"countDelta":0,"owner":"Root",
  "contract":"Preserve actual inherited lead owner/org and actual converting creator. New immutable ownership origin freezes initial state; only genuinely org-owned/never-personal origin can be unconsumed. Real conversion scope remains required; no new authorization from body."},
 {"area":"Project","operationId":"ProjectController_reassignOwner","newHttp":False,"countDelta":0,"owner":"Root",
  "contract":"Pre-change OwnerWrite or I's precise unconsumed creator bootstrap. Active target has actual target-org membership; project CAS+true reassignment row+permanent origin consumption+audit atomic. Setting owner NULL later never revives bootstrap."},
 {"area":"Project","operationId":"ProjectController_getById / ProjectController_getTimeline","newHttp":False,"countDelta":0,"owner":"Root",
  "contract":"Expose projectRowVersion/currentStageRecordId and genuine stage ledger events; completion event anchored once to actual completion. Explicit touched-read scope narrowing; do not claim all old R3/ABCDEF scope fixed."},
 {"area":"H preparation query","operationId":"ProjectCostController_getProjectUnifiedAccounting","newHttp":False,"countDelta":0,"owner":"Root+G/H",
  "contract":"Default without real evaluation=>typed409 OperatingEvaluationNotReadyError. Explicit view=preparation=>200 typed preparation envelope even before first snapshot; officialCurrent is explicit null or real current view. Read-only collector+pure derive; preparation cannot create facts. Intent/period/receipt/restatement IDs typed. This overload is same HTTP operation, never counted twice."},
 {"area":"Shared infrastructure","operationId":"attachment upload/complete/link, auth/sensitive/audit/summary","newHttp":False,"countDelta":0,"owner":"Root",
  "contract":"Consume actual existing authority; required events and audit/auth pending flush fail entire write; sensitive GET event failure emits no protected payload. No fixtures, new permissive scope, or stand-alone commits."}
]

ownership = [
 {"owner":"Root","paths":["apps/poms-api-rust/Cargo.toml","apps/poms-api-rust/src/lib.rs","apps/poms-api-rust/src/contract_support/http.rs","apps/poms-api-rust/src/contract_support/mod.rs","apps/poms-api-rust/src/contract_support/validation.rs","apps/poms-api-rust/src/project_operating_common/**","apps/poms-api-rust/src/project_action_authorization/**","apps/poms-api/src/migrations/Migration20261106060000_rust_r4ghi_joint_operating_lifecycle.ts","libs/shared/contracts/**","libs/shared/api-spec/**","libs/shared/api-client/**","libs/admin/data-access/**"],
  "also":"Native frozen-reference extraction/controllers/services type adapters; existing B/C/D/E/F and project/lead producer gates; common summary registration, runtime enums; central UI workspace and router. Authors provide exact patches for Root review; one writer per shared file."},
 {"owner":"G","paths":["apps/poms-api-rust/src/project_operating/**","apps/poms-admin/src/app/features/project/project-operating-authoring.ts"],"role":"real collector, immutable capture, baseline/period/restatement/inclusion business orchestration; independent authoring UI child"},
 {"owner":"H","paths":["apps/poms-api-rust/src/project_operating_signals/**","apps/poms-admin/src/app/features/project/project-operating-review.ts"],"role":"pure rules, same-TX evaluate, reads, 2 reviews, protected projection and review UI child"},
 {"owner":"I","paths":["apps/poms-api-rust/src/commission_assignment/**","apps/poms-api-rust/src/project_lifecycle/**","apps/poms-api-rust/src/lifecycle_evidence/**","apps/poms-admin/src/app/features/project/project-lifecycle-authoring.ts","apps/poms-admin/src/app/features/commission/project-role-assignment-authoring.ts"],"role":"4 role assignments + 11 lifecycle operations, typed actor responsibility, genuine evidence, independent UI children"}
]
ownership[0]["paths"] += [
 "apps/poms-api/src/app/features/project-cost/project-cost.controller.ts",
 "apps/poms-api/src/app/features/project-cost/project-cost.service.ts",
 "apps/poms-api/src/app/features/commission/commission.controller.ts",
 "apps/poms-api/src/app/features/commission/commission.service.ts",
 "apps/poms-api/src/app/features/commission/commission-role-assignment.controller.ts",
 "apps/poms-api/src/app/features/project/project.controller.ts",
 "apps/poms-api/src/app/features/project-handover/project-handover.controller.ts",
 "apps/poms-api/src/app/features/contract-finance/contract-finance.controller.ts",
 "apps/poms-api/src/app/features/lead/lead.controller.ts",
 "apps/poms-api-rust/src/projects/**", "apps/poms-api-rust/src/leads/**",
 "apps/poms-api-rust/src/project_handover/**", "apps/poms-api-rust/src/contract_finance/**",
 "apps/poms-api-rust/src/project_actual_cost/**", "apps/poms-api-rust/src/project_cost_governance/**",
 "apps/poms-api-rust/src/approval_common/**"]

signatures = {
 "model":"Root owns OperatingSourceContext exactly source-context.schema.json; no G/H parallel structs or facts calculator",
 "collector":g["interface"]["collect"],"prepare":g["interface"]["prepare"],"frozenLoader":g["interface"]["loadFrozen"],
 "derive":h["interface"]["derive"],"readiness":h["interface"]["readiness"],"evaluate":h["interface"]["evaluate"],
 "evaluationRefs":h["interface"]["returns"],"referenceReturns":h["referenceSignatures"],
 "scope":"pub async fn require(session:&mut CommonSession<'_, '_>, actor:&Actor, action:ProjectAction, target:ProjectActionTarget)->Result<ProjectAccessProof,contract_support::Error>",
 "typedTargets":"Project{id}; Handover{id}; Assignment{id}; Archive{id}; Condition{completion_record_id,condition_id}; resolve real FK project before proof",
 "resourceMap":"ResourceKeys(BTreeMap<String,Uuid>), exact template named keys; decode each once, reject invalid/missing/duplicate key. Existing single-key adapter explicitly selects its registered key; never last UUID.",
 "dispatch":"execute_with_session(session:&mut CommonSession<'_, '_>, operation:Operation, keys:&ResourceKeys, request:&TypedRequest, actor:&Actor)->Result<AuthorizedResponse,Error>",
 "rawWeight":"ParsedBody preserves exact original numeric token. Parse only participant.weight JSON numeric tokens into checked integer millionths before serde_json Value/f64. Typed AssignmentRequest carries weight_units; no meaningful as-cast or epsilon.",
 "rawWeightAlgorithm":"Parse RawValue numeric token with JSON-number grammar before generic Value; reject duplicate participant weight keys. Remove insignificant mantissa zeros, combine decimal scale and exponent using checked integer/string bounds; nonzero effective fractional scale<=6, units exact0..1000000, sum exact1000000. Zero reason required. Accept1e-6/0.1000000/0; reject1e-7/0.10000000000000001/out-of-range. Rust serde_json raw_value feature and raw/typed adapter are Root-owned.",
 "httpSeams":["matched(template,path): retain all named captures","normalize_uri: decode/canonicalize EVERY named UUID exactly once","dispatch: build ResourceKeys rather than last id","validate_body: branch modern protocol + raw-weight typed decoder before generic Value/f64","legacy single-key adapter: select registered id/projectId explicitly; no positional fallback"],
 "restatementPermit":"private sealed RestatementPermit with affected project IDs, locked current heads/snapshots/source IDs+versions+hashes, real correction intent and same-TX binding; constructor only in verified restatement flow; no client boolean/public ctor/serialization"
}

compatibility = {
 "frozenNativeReference":"native-reference.schemas.json exact legacy source closure. Root creates new rust-r4ghi-native-reference.ts from pinned pre-change shapes, records extraction SHA; never edits prior frozen file.",
 "legacyNativeCommands":"Modern discriminator checked explicitly before historical DTO validation/service: server-derived-v1=>422 reference_runtime_unsupported unless a real Node producer exists. Only explicit legacy-reference or genuine old untagged request validated against frozen old schema can call historical producer. Incomplete modern body can never fall into legacy based on field-presence heuristics.",
 "rustCommands":"All 32-operation modern writes and C confirm require inputVersion='server-derived-v1'. Missing/legacy=>422 legacy_reference_input_unsupported before modern DTO validation; modern invalid shape400. Monetary/conclusion fields only explicit assertions with exact comparison, mismatch409; never legacy monetary authority. Other delivered E/F ordinary unconsumed protocols unchanged; sealed restatement branch explicitly versioned.",
 "discriminator":"All modern write inputVersion='server-derived-v1'. Official G result/views outputVersion='server-derived-v1'; reference outputVersion='legacy-reference',producerVersion=0/legacy-unverified. H evaluationContext and I/R5 sourceQualification/weightsPolicyVersion remain required certification discriminators; absent tag never means certified.",
 "currentQueries":"Official current getters select only true v1 context/evidence. Legacy reference object is explicit separate tagged data, never a current certified object/head/gate. Missing official eval default409, item unknown404.",
 "nativeTypes":"Node service/controller Promise types use Native aliases; Swagger decorators use modern public DTO and explicit response branching. Four widened H enum slots use Pick<CurrentSharedShape, key>; no any/as-cast/optional weakening.",
 "oldG200201":"Actual response status, declared OpenAPI status and blueprint status compared individually in operationMap. The 3 existing platform create 201-vs200 mismatches are separate existing-baseline-drift, never counted as GHI route novelty or hidden by changing all POST statuses.",
 "generation":"Only after Root canonical rows+formal baseline+manifest and independent G1: shared TS->createZodDto->OpenAPI->generated client/Rust->admin. No DTO/OpenAPI/client product generated by this tools-only input work."
}

lock_order = [
 "Guard/session/CSRF + precise route permission before domain; preserve parsed raw body numeric token provenance.",
 "Resolve only minimal true FK identity; discover complete impacted project set WITHOUT partial project locks. Lock project UUIDs ascending; rediscover all affected sources/projects; restart outer transaction if expanded.",
 "Fresh active accounts/orgs/memberships in stable UUID order FOR SHARE after project locks; verify Owner/Part/duty/condition relation; no independent pool/connection.",
 "Acquire required existing rows using lockFamilyRank: handover/scope-source rows before operating head and baseline/contract/receipt; then assignment and stage/acceptance/completion/conditions/archive. Each family stable UUID order. Shared allocation operation/basis/result/source families precede member costs. Domain validation sequences never override the common lock rank; a coordinator prelocks the full relevant plan before calling borrowed helpers.",
 "Lock E/F source/governance/stage/tax/full allocation batch + inclusion decisions/heads + affected frozen members in fixed family rank and UUID order; compare complete versions/hash + expectedInputHash BEFORE requested producer side effects.",
 "After real source/certification/classification/CAS, collect final context, pure H derive, insert G final v1 once; evaluate reload snapshot v1+finalSourceHash; insert evidence/DMER/OSER/4 bindings/reasons/summaries; advance heads atomically.",
 "Write business audit, required sensitive security event, idempotency receipt, pending authentication coflush in same CommonSession/outerTX. One COMMIT; uncertain COMMIT remains unknown, never auto-replayed as proven failure."
]
LOCK_FAMILY_RANK = {
 "00":"complete impacted project IDs ascending; rediscover/restart on expansion",
 "10-12":"platform_user,org_unit,user_org_membership fresh shared locks; UUID order",
 "20-25":"handover,basis,confirmation_record,confirmation_participant,duty,receipt judgment freeze (scope proof first)",
 "30-36":"operating_head,baseline,contract,term,commercial baseline,receipt,receipt accounting basis",
 "37":"all E labor rate-family advisory keys (person/role) for complete source set, sorted lexical via existing family_locks; never acquire one family per source after cost locks",
 "38":"real labor rate versions/current family rows in stable UUID order",
 "39":"actual business source rows in registered Payable->Payment->Invoice->Expense family order, stable UUIDs",
 "40-42":"assignment,assignment participants,assignment freeze payload",
 "50-55":"stage,acceptance,completion,conditions,closure,archive",
 "60-63":"shared allocation operation,basis,result,source-snapshot full batch",
 "70-73":"actual cost,cost governance,stage attribution,tax treatment",
 "80-81":"inclusion decision/head; verify all source-set/primary-chain overlaps under prior source locks",
 "90-94":"immutable context/snapshot/period/restatement/evidence; existing predecessors first, inserted rows don't invert locks",
 "100-112":"DMER,OSER,signal review,current four-stage bindings,gate review,source/review summaries,command receipt"
}

invariants = [
 {"id":"receipt-basis","owner":"Root/C+G","predicate":"locked confirmed receipt gross equals immutable basis gross; same project+contract+actual activated term+frozen currency lineage; gross=net+tax; cents HALF_UP exact; one basis per receipt, historical certify does not change receipt fact timestamps/actor/cash/date"},
 {"id":"baseline-chain","owner":"G","predicate":"original and current packages are real approved adopted PROJECT estimates of same project; one connected predecessor/successor chain, no forks or duplicate contract-counted packages; approved successor net-minus-predecessor deltas exactly once"},
 {"id":"source-exhaustiveness","owner":"G","predicate":"complete real source universe partitioned include/exclude with reason/current decision; no omitted unclassified row; known-zero proof explicit; hard included and confirmed receipt basis gaps reject formal publication"},
 {"id":"inclusion-protection","owner":"Root/E/F+G","predicate":"sticky direct consumed flag/status or F result project-share flag; all membership history preserved; ordinary source/labor/stage/tax/whole-allocation mutation finds any published membership and409 operating_restatement_required; sealed same-TX permit only after full affected-project/source locks"},
 {"id":"double-measurement","owner":"G","predicate":"included primary canonicalAccumulationKey unique per snapshot; commitment principal and linked payments cannot coexist; genuine distinct installment payment IDs permitted; exclude support requires actual primary ref; source-set full principal and allocation project share overlap forbidden"},
 {"id":"hash-layers","owner":"Root+G/H","predicate":"pre-effect expectedInputHash uses G exact whitelist; after producers use H finalSourceHash whitelist; complete stored payloadHash excluding self; evaluationHash includes final source+policy+normalized derived result+verified overlay. Do not confuse hashes or hash derived metrics as source facts"},
 {"id":"capture-versus-overlay","owner":"G/H","predicate":"G immutable captured final facts/action inserted once v1; H reloads v1/hash and recomputes equality; later review adds append-only overlay/new effective bindings and summary without writing G snapshot"},
 {"id":"policy-exact","owner":"H","predicate":"all11 reason rows+all tied primaries; project cost floor and independent stage matrix; negative auto-risk only known+mature+gross receipt ratio>=20%+net>0; preserve independent BLOCK; all qualitative missing-threshold issues require manual materiality review"},
 {"id":"numeric","owner":"Root+G/H/I","predicate":"money integer cents/DB numeric(18,2), tax fraction four places; ratio derived rational unrounded for thresholds, six-place half-away display and explicit overflow; only gross_margin_rate DB numeric(38,6) widens. Raw exact weights=>millionths0..1000000,sum1000000,zero reason; no f64 or epsilon"},
 {"id":"role-freeze","owner":"I","predicate":"true current draft+same current confirmed handover/basis/all actual self confirmations/receipt freeze+contract/handover summaries; normalized real participants and sum exact1; freeze own new summary distinct upstream; no R5 rules/payout/H prerequisite"},
 {"id":"lifecycle","owner":"I","predicate":"assessment->real handover->frozen roles+EO startExecution->EO startAcceptance+actual evidence->final acceptance only->completion. accepted=>completed,conditional=>conditional-completed+nonempty owned dated evidenced conditions; original result immutable; all actual closed only changes conditionStatus; pending blocks archive"},
 {"id":"scope-producers","owner":"Root+I","predicate":"true pre-change owner/creator origin branch before reassign; OwnerWrite before D prepare; no self-grant from requested owner/participants. Initial individual origin permanently consumed, org-owned never-personal origin creator branch atomically consumed; legacy missing origin denies"},
 {"id":"summary-and-sensitive","owner":"Root+H/I","predicate":"true same-chain summary definitions/target/source hash+versions; source summary assertion before review,new reviewed summary in response; all raw protected keys literal null; labor yes/unknown applies strictest reversible projection groups to text/reasons/evidence/aggregates; no sensitive payload when event fails"}
]

pending = []
if iref is None:
    pending.append({"id":"I-final-delta","required":"I refinements03.json final with ownership origin model/DDL/action table and provenance not yet present at build","blocks":"final byte freeze; blueprint not admitted"})
if scope_decision is None:
    pending.append({"id":"scope-user-decision","required":"Root user-decision-scope03.json exact final source pending","blocks":"final source pin only; supplied user decision already guides blueprint"})

blueprint = {
 "schemaVersion":1,"kind":"R4-GHI-and-minimal-R5-joint-G1-review-input","status":"DRAFT-ROOT-REVIEW-REQUIRED-NOT-G1-PASS",
 "workspace":"E:/projects/worktrees/poms-r3hijk-next28/poms","providedBranch":"codex/poms-r4ghi-next25",
 "providedHead":"42b6fc3451eb31042bef80f995c4023eeb6c736b","headVerification":"Provided by Root; Git operations prohibited in this assignment. Byte manifest is actual local observed evidence, not Git certification.",
 "previousOfficialBase":"aaa4b16ac66092f0cb1dc6646a02cf14e80823ee","liveDeliveryIndex":status,
 "gates":{"G1Passed":False,"G2Authorized":False,"userfixIsSeparate":True,"promotion":"Root alone writes canonical+baseline+source manifest; independent G1 must pass before any G2/new public DTO/controller/OpenAPI/client product files"},
 "counts":{"G":9,"H":8,"I-existing":8,"I-new-stage":2,"I-new-condition":1,"I-total":11,"R4-target":28,"R5-min-existing":4,"batchTotal":32,"newPublic":3,"supportingCountDelta":0,"previousRustOfficial":240,"previousR4Delivered":67,"previousR4Total":92,"targetR4TotalAfterRouteFreeze":95,"forecastRustAfterAcceptance":272,"forecastR4DeliveredAfterAcceptance":95,"forecastIsNotDeliveryEvidence":True},
 "operationMap":operations,"supportingExistingOperations":supporting,
 "ssot":{"sourceContext":"source-context.schema.json","collector":"G","policy":"H","commonModelHashLoader":"Root","sourceBeforeEffect":gr["inputHashExactWhitelist"],"finalSourceHash":h["sourceContext"]["sourceHashFactualWhitelist"],"payloadAndOutputHashes":h["sourceContext"],"baselineOnly":baseline_only,"dtoSources":{"G":GDIR+"target-dto.schema.json","H":HDIR+"dto-delta01.json","I-R5":IDIR+"contracts.json#components"}},
 "transaction":{"sequence":g["interface"]["sequence"],"lockOrder":lock_order,"lockFamilyRank":LOCK_FAMILY_RANK,"lockRule":"One Root-owned rank registry used by new G/H/I and touched E/F restatement branches; within family sort stable UUIDs. Borrowed helper may reacquire already-owned rows, never lock an earlier unowned family. Final source-set discovery after global batch locks; expansion restarts outer TX, no incremental project locking.","noNestedTransactions":True,"noGSnapshotWritebackFromManualReview":True},
 "policy":h["policy"],"reviews":h["reviews"],"period":g["periodPolicy"],"baselineAmounts":g["baselineAmounts"],"inclusion":g["inclusion"],"receiptBasis":g["receiptBasis"],
 "policyIdentity":{"file":"policy-definition.json","policyVersion":"r4h-operating-v1","policyHash":POLICY_HASH,"canonicalBytes":len(POLICY_CANONICAL),"algorithm":"same sorted-key/preserved-array compact JSON SHA-256 as contract_support::canonical_hash; Root/H must verify compiled policy constant against pinned artifact before G3"},
 "scope":scope_policy,"IRefinements":iref,"scopeUserDecision":scope_decision,
 "lifecycleContract":{key:i[key] for key in ("rulesProducerDependency","runtimeInvariants","legacyCertification","adapterConstraints","services","dependencyDAG")},
 "publicContractInputs":{"G":gdto,"H":hdto,"I-R5":i["components"],"NativeFrozen":"native-reference.schemas.json","overlayAuthority":ROOT_ADOPTIONS,"modernWriteSchemas":sorted(modern_names),
 "errors":{"NativeModernUnsupported":{"statusCode":422,"code":"reference_runtime_unsupported","inputVersion":"server-derived-v1","operationId":"exact current operation ID","message":"This reference runtime does not implement the server-derived-v1 producer"},"RustLegacyUnsupported":{"statusCode":422,"code":"legacy_reference_input_unsupported","operationId":"exact current operation ID","requiredInputVersion":"server-derived-v1"},"modernValidation":{"statusCode":400,"code":"validation_error"},"computedAssertionMismatch":{"statusCode":409,"code":"assertion_mismatch"}}},
 "interfaces":signatures,"owners":ownership,"compatibility":compatibility,
 "rootAdoptions":ROOT_ADOPTIONS,"productionSummaryDefinitions":SUMMARY_DEFINITIONS,
 "existingBaselineDrift":[{"classification":"existing-baseline-drift","operationId":op_id,"runtimePath":path,"observedOrRootProvidedRuntimeSuccess":201,"currentDeclaredSuccess":list(spec_ops[op_id][2]["responses"]),"inThisBatchOperationCount":False,"scope":"Separate platform baseline drift, not changed by GHI route addition/protocol work"}
   for op_id,path in [("PlatformController_createUser","/api/platform/users"),("PlatformController_createRole","/api/platform/roles"),("PlatformController_createOrgUnit","/api/platform/org-units")]],
 "migration":{"draft":"migration.sql","forwardOnly":True,"proposedClass":"Migration20261106060000_rust_r4ghi_joint_operating_lifecycle","observedMigrationFiles":94,"targetMigrationFiles":95,"existingPomsTablesProvided":120,"tablesVerification":"Repository migration SQL structurally inspected; no DB queried. Do not claim DB table count measured.","legacy":"New producer_version columns default0; never synthesize old facts/roles/stages/bases/origins. Existing older nullable producer columns keep their original legacy semantics.","noSQLExecution":True,"runtimePredicates":invariants},
 "minimumUI":{"G":g["minimumUI"],"H":h["compile"]["uiWork"],"I":"real R5 weights/zero reason + self-confirmed true chain; controlled stage buttons; acceptance/final completion/own conditions/archive forms; visible missing scope/source/unknown/conflict, hide no required business states; central Root workspace mounts independent children"},
 "rootDecisionItems":pending,
 "verification":{"plannedOnly":["source pin and canonical final rows","Native/shared/Rust/admin compilation","SQL migration/entity/schema alignment","exact rational policy/raw weight tests","transaction failpoints+source replacement/review/CAS races","real human authoring path and sensitive projections","same-org unrelated/cross-org assigned/scope producer self-grant denial/creator consume and revoke races"],"thisArtifact":"read-only local structure and source-byte checks only; no product/SQL/HTTP/UI/runtime acceptance"}
}
blueprint["acceptancePlan"] = {
 "owner":"Root/#114 independently checks G/H/I/R5 from actual new HTTP-produced fixtures; source authors provide business tests, not their own G1/G3 admission",
 "G":g["acceptance"],"H":h["acceptance"],
 "I-R5":[
  "Actual project->activated contracts/receipt plan->authorized D prepare->each real participant self-confirm->D finalize->real role draft/freeze->EO startExecution->actual uploaded/linked acceptance evidence->EO startAcceptance->final acceptance->completion->all owned condition closures->archive; no seeded frozen role/stage/approval/condition facts",
  "Final accepted maps completed only; final conditional requires nonempty owned/dated/evidenced conditions and maps conditional-completed; stage acceptance/rejected cannot complete; last closure changes conditionStatus only and pending/unknown blocks archive",
  "Raw number: accept1e-6,0.1000000,zero with reason; reject1e-7,0.10000000000000001,sum!=1000000,negative,duplicate user/role and missing zero reason; inspect exact stored integer units and frozen source payload",
  "Real org-owned lead-conversion creator first assignment succeeds once; different creator/same-org unrelated/absent origin/initial personal/consumed even if ownerNULL fails; both target and creator membership true; assigning another removes creator privilege; double first assignment one success/one409",
  "No scope self-grant through reassign target body or D prepare participant body; owner notEO cannot execution; EO cannot role-draft unlessOwnerWrite; actual confirmed BA can freeze/finalize but never confirm others; condition assignee closes only self",
  "Named dual UUID parent-child-project mismatch, each URL-encoded UUID, missing/invalid key; preserve old single-key routes; current stage/row preconditions survive hard refresh and typed409 reload",
  "Fault each project/history/origin,source,evidence,summary,domain,audit,security,pending-auth,commit boundary; all required writes atomic and unknown commit labeled unknown; membership revoke/owner transfer/handovers/freeze/two-conditions/replace races use stable rank and double CAS"
 ],
 "evidenceLabels":"All above planned-not-run in this input assignment. Structural PASS is never HTTP/UI/SQL acceptance or G1 Pass."
}

# Read only the exact current runtime/source files relevant to Root-owned seams.
for rel in [
 ".agents/skills/poms-implementation-governance/SKILL.md",
 ".agents/skills/poms-implementation-governance/references/governance-summary.md",
 ".agents/skills/poms-github-task-governance/SKILL.md",
 "apps/poms-api-rust/src/contract_support/http.rs", "apps/poms-api-rust/src/contract_support/mod.rs",
 "apps/poms-api-rust/src/contract_support/validation.rs", "apps/poms-api-rust/src/projects/service.rs",
 "apps/poms-api-rust/src/projects/store.rs", "apps/poms-api-rust/src/leads/service.rs",
 "apps/poms-api-rust/src/project_handover/service.rs", "apps/poms-api-rust/src/project_handover/sources.rs",
 "apps/poms-api-rust/src/auth/store.rs", "apps/poms-api-rust/src/approval_common/session.rs",
 "apps/poms-api-rust/src/project_actual_cost/mod.rs", "apps/poms-api-rust/src/project_actual_cost/store.rs",
 "apps/poms-api-rust/src/project_cost_governance/service.rs", "apps/poms-api-rust/src/project_cost_governance/store.rs"]:
    if (ROOT / rel).exists():
        source(rel)
for rel in ["apps/poms-api-rust/src/users/http.rs","apps/poms-api-rust/src/roles/http.rs","apps/poms-api-rust/src/org_units/http.rs"]:
    source(rel)
for prefix in (GDIR, HDIR, IDIR):
    for path in sorted((ROOT / prefix).iterdir()):
        if path.suffix in {".json", ".md", ".sql"}:
            source(path.relative_to(ROOT).as_posix())

# Count source CREATE TABLEs from up() only, and retain exact extracted source
# SQL bytes for a static source model. This parser never connects to a database.
up_sql = []
migrations = sorted((ROOT / "apps/poms-api/src/migrations").glob("Migration*.ts"))
for path in migrations:
    raw = source(path.relative_to(ROOT).as_posix()).split("override async down", 1)[0]
    for match in re.finditer(r"this\.addSql\(\s*(?:String\.raw)?(`(?:[^`]|\\`)*`|\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')\s*,?\s*\)", raw, re.S):
        literal = match[1]
        sql = json.loads(literal) if literal.startswith('"') else ast.literal_eval(literal) if literal.startswith("'") else literal[1:-1]
        up_sql.append(sql)
joined_up = "\n".join(up_sql)
base_tables = sorted(set(re.findall(r'(?i)create\s+table\s+(?:if\s+not\s+exists\s+)?["\']?poms["\']?\s*\.\s*["\']?([a-z_][a-z_0-9]*)', joined_up)))
emit("observed-schema.json", {"method":"static source SQL extraction, up() only; no live database", "migrationFileCount":len(migrations),"extractedStatements":len(up_sql),"createdPomsTables":base_tables,"createdPomsTableCount":len(base_tables),"providedLivePomsTables":120})

gsql = source(GDIR + "target-schema.sql").split("-- Root must add the following exact", 1)[0]
isql = source(IDIR + "ddl-proposal.sql").split("-- Root must freeze metadata/enum registration", 1)[0]
isql = isql.replace("ADD COLUMN producer_version integer NULL", "ADD COLUMN producer_version smallint NOT NULL DEFAULT 0").replace("producer_version IS NULL OR", "producer_version=0 OR")

SQL_HEADER = """-- JOINT G1 REVIEW INPUT ONLY. NOT EXECUTED / NOT A REGISTERED MIGRATION.
-- Proposed one forward migration: 94 -> 95. Root promotes after independent G1.
-- Never run this file as an ad-hoc tool. Existing facts remain legacy version 0.
-- Existing semantic current/version indexes remain authoritative.
-- Runtime semantic predicates are enumerated in blueprint.json migration.runtimePredicates.
-- This draft fixes structural constraints; source hashes use the shared Rust
-- canonical serializer, never jsonb::text or a second SQL policy calculator.

"""

HSQL = """
-- H immutable policy output and same-source review overlays.
CREATE TABLE poms.operating_evaluation_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL,
 snapshot_id uuid NOT NULL, source_context_id uuid NOT NULL,
 producer_version smallint NOT NULL CHECK(producer_version=1),
 policy_version varchar(64) NOT NULL CHECK(policy_version='r4h-operating-v1'),
 policy_hash varchar(64) NOT NULL CHECK(policy_hash~'^[0-9a-f]{64}$'),
 source_hash varchar(64) NOT NULL CHECK(source_hash~'^[0-9a-f]{64}$'),
 evaluation_hash varchar(64) NOT NULL CHECK(evaluation_hash~'^[0-9a-f]{64}$'),
 frozen_output jsonb NOT NULL CHECK(jsonb_typeof(frozen_output)='object'),
 output_payload_hash varchar(64) NOT NULL CHECK(output_payload_hash~'^[0-9a-f]{64}$'),
 contains_labor varchar(16) NOT NULL CHECK(contains_labor IN ('yes','no','unknown')),
 evaluated_at timestamptz NOT NULL, evaluated_by uuid NOT NULL REFERENCES poms.platform_user(id),
 row_version integer NOT NULL DEFAULT 1 CHECK(row_version=1),
 UNIQUE(id,project_id,snapshot_id), UNIQUE(snapshot_id,policy_version),
 FOREIGN KEY(source_context_id,project_id,snapshot_id)
   REFERENCES poms.operating_source_context(id,project_id,snapshot_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE poms.operating_evaluation_reason (
 evidence_id uuid NOT NULL REFERENCES poms.operating_evaluation_evidence(id),
 reason_index integer NOT NULL CHECK(reason_index>=0), rule_id varchar(8) NOT NULL,
 reason_code varchar(128) NOT NULL CHECK(length(btrim(reason_code))>0),
 project_action varchar(16) NOT NULL CHECK(project_action IN ('prompt','review','block')),
 stage_actions jsonb NOT NULL CHECK(jsonb_typeof(stage_actions)='object'),
 project_primary boolean NOT NULL, stage_primaries jsonb NOT NULL CHECK(jsonb_typeof(stage_primaries)='array'),
 source_refs jsonb NOT NULL CHECK(jsonb_typeof(source_refs)='array'),
 frozen_payload jsonb NOT NULL CHECK(jsonb_typeof(frozen_payload)='object'),
 payload_hash varchar(64) NOT NULL CHECK(payload_hash~'^[0-9a-f]{64}$'),
 PRIMARY KEY(evidence_id,reason_index), CHECK(rule_id IN ('H01','H02','H03','H04','H05','H06','H07','H08','H09','H10','H11'))
);
ALTER TABLE poms.data_maturity_evaluation_result
 ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
 ADD COLUMN evidence_id uuid NULL,
 ADD COLUMN tax_pending_knowledge varchar(16) NULL,
 ADD CONSTRAINT uq_jghi_dmer_scope UNIQUE(id,project_id,referenced_snapshot_id),
 ADD CONSTRAINT fk_jghi_dmer_evidence FOREIGN KEY(evidence_id,project_id,referenced_snapshot_id)
  REFERENCES poms.operating_evaluation_evidence(id,project_id,snapshot_id),
 ADD CONSTRAINT ck_jghi_dmer_v1 CHECK(producer_version=0 OR (producer_version=1 AND evidence_id IS NOT NULL
  AND tax_pending_knowledge IS NOT NULL AND tax_pending_knowledge IN ('known','unknown')
  AND ((tax_pending_knowledge='known' AND tax_impact_pending_amount IS NOT NULL)
    OR (tax_pending_knowledge='unknown' AND tax_impact_pending_amount IS NULL))));
ALTER TABLE poms.data_maturity_evaluation_result ALTER COLUMN tax_impact_pending_amount DROP NOT NULL;
ALTER TABLE poms.operating_signal_evaluation_result
 ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
 ADD COLUMN evidence_id uuid NULL,
 ADD CONSTRAINT uq_jghi_oser_scope UNIQUE(id,project_id,referenced_snapshot_id),
 ADD CONSTRAINT fk_jghi_oser_evidence FOREIGN KEY(evidence_id,project_id,referenced_snapshot_id)
  REFERENCES poms.operating_evaluation_evidence(id,project_id,snapshot_id),
 ADD CONSTRAINT fk_jghi_oser_maturity_scope FOREIGN KEY(data_maturity_evaluation_id,project_id,referenced_snapshot_id)
  REFERENCES poms.data_maturity_evaluation_result(id,project_id,referenced_snapshot_id) NOT VALID,
 ADD CONSTRAINT ck_jghi_oser_v1 CHECK(producer_version=0 OR (producer_version=1 AND evidence_id IS NOT NULL));
ALTER TABLE poms.operating_signal_review_record
 ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
 ADD COLUMN evidence_id uuid NULL REFERENCES poms.operating_evaluation_evidence(id),
 ADD COLUMN source_hash varchar(64) NULL, ADD COLUMN evaluation_hash varchar(64) NULL,
 ADD COLUMN expected_signal_version integer NULL,
 ADD COLUMN review_payload jsonb NULL, ADD COLUMN payload_hash varchar(64) NULL,
 ADD COLUMN supersedes_id uuid NULL REFERENCES poms.operating_signal_review_record(id),
 ADD CONSTRAINT ck_jghi_osreview_v1 CHECK(producer_version=0 OR
  (producer_version=1 AND evidence_id IS NOT NULL AND source_hash IS NOT NULL AND source_hash~'^[0-9a-f]{64}$'
   AND evaluation_hash IS NOT NULL AND evaluation_hash~'^[0-9a-f]{64}$'
   AND expected_signal_version IS NOT NULL AND expected_signal_version>0
   AND review_payload IS NOT NULL AND jsonb_typeof(review_payload)='object'
   AND payload_hash IS NOT NULL AND payload_hash~'^[0-9a-f]{64}$' AND handled_by IS NOT NULL));
CREATE UNIQUE INDEX uq_jghi_signal_review_current ON poms.operating_signal_review_record(signal_evaluation_id)
 WHERE producer_version=1 AND status='active';
CREATE UNIQUE INDEX uq_jghi_signal_review_successor ON poms.operating_signal_review_record(supersedes_id)
 WHERE supersedes_id IS NOT NULL;
ALTER TABLE poms.operating_signal_gate_binding
 ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
 ADD COLUMN evidence_id uuid NULL REFERENCES poms.operating_evaluation_evidence(id),
 ADD COLUMN signal_review_id uuid NULL REFERENCES poms.operating_signal_review_record(id),
 ADD COLUMN system_binding_action varchar(16) NULL,
 ADD COLUMN tax_pending_knowledge varchar(16) NULL,
 ADD COLUMN evaluation_hash varchar(64) NULL,
 ADD COLUMN current_summary_id uuid NULL REFERENCES poms.approval_summary_snapshot(id) DEFERRABLE INITIALLY DEFERRED,
 ADD COLUMN supersedes_id uuid NULL REFERENCES poms.operating_signal_gate_binding(id),
 ADD CONSTRAINT uq_jghi_binding_project UNIQUE(id,project_id),
 ADD CONSTRAINT ck_jghi_binding_v1 CHECK(producer_version=0 OR
  (producer_version=1 AND evidence_id IS NOT NULL AND system_binding_action IS NOT NULL
   AND system_binding_action IN ('prompt','review','block') AND gate_stage_type IN ('first','second','final','retention')
   AND evaluation_hash IS NOT NULL AND evaluation_hash~'^[0-9a-f]{64}$' AND current_summary_id IS NOT NULL
   AND tax_pending_knowledge IS NOT NULL AND tax_pending_knowledge IN ('known','unknown')
   AND ((tax_pending_knowledge='known' AND tax_impact_pending_amount IS NOT NULL)
     OR (tax_pending_knowledge='unknown' AND tax_impact_pending_amount IS NULL))));
ALTER TABLE poms.operating_signal_gate_binding ALTER COLUMN tax_impact_pending_amount DROP NOT NULL;
ALTER TABLE poms.commission_gate_review_record
 ADD COLUMN producer_version smallint NOT NULL DEFAULT 0,
 ADD COLUMN evidence_id uuid NULL REFERENCES poms.operating_evaluation_evidence(id),
 ADD COLUMN source_summary_snapshot_id uuid NULL REFERENCES poms.approval_summary_snapshot(id),
 ADD COLUMN source_hash varchar(64) NULL, ADD COLUMN evaluation_hash varchar(64) NULL,
 ADD COLUMN policy_hash varchar(64) NULL, ADD COLUMN evidence_hash varchar(64) NULL,
 ADD COLUMN review_action varchar(32) NULL, ADD COLUMN review_payload jsonb NULL,
 ADD COLUMN supersedes_id uuid NULL REFERENCES poms.commission_gate_review_record(id),
 ADD CONSTRAINT ck_jghi_gate_review_v1 CHECK(producer_version=0 OR
  (producer_version=1 AND evidence_id IS NOT NULL AND source_summary_snapshot_id IS NOT NULL
   AND source_hash IS NOT NULL AND source_hash~'^[0-9a-f]{64}$'
   AND evaluation_hash IS NOT NULL AND evaluation_hash~'^[0-9a-f]{64}$'
   AND policy_hash IS NOT NULL AND policy_hash~'^[0-9a-f]{64}$'
   AND evidence_hash IS NOT NULL AND evidence_hash~'^[0-9a-f]{64}$'
   AND review_action IS NOT NULL AND review_action IN ('acknowledge','tighten-review','tighten-block')
   AND review_payload IS NOT NULL AND jsonb_typeof(review_payload)='object' AND handled_by IS NOT NULL));
CREATE UNIQUE INDEX uq_jghi_gate_review_current ON poms.commission_gate_review_record(binding_id)
 WHERE producer_version=1 AND status='active';
CREATE TABLE poms.operating_gate_summary_payload (
 summary_snapshot_id uuid PRIMARY KEY REFERENCES poms.approval_summary_snapshot(id),
 binding_id uuid NOT NULL, binding_row_version integer NOT NULL CHECK(binding_row_version>0),
 project_id uuid NOT NULL, gate_stage_type varchar(32) NOT NULL CHECK(gate_stage_type IN ('first','second','final','retention')),
 snapshot_id uuid NOT NULL, evidence_id uuid NOT NULL,
 source_hash varchar(64) NOT NULL CHECK(source_hash~'^[0-9a-f]{64}$'),
 evaluation_hash varchar(64) NOT NULL CHECK(evaluation_hash~'^[0-9a-f]{64}$'),
 policy_version varchar(64) NOT NULL, policy_hash varchar(64) NOT NULL CHECK(policy_hash~'^[0-9a-f]{64}$'),
 source_summary_snapshot_id uuid NULL REFERENCES poms.approval_summary_snapshot(id),
 signal_review_id uuid NULL REFERENCES poms.operating_signal_review_record(id),
 gate_review_id uuid NULL REFERENCES poms.commission_gate_review_record(id) DEFERRABLE INITIALLY DEFERRED,
 frozen_payload jsonb NOT NULL CHECK(jsonb_typeof(frozen_payload)='object'),
 payload_hash varchar(64) NOT NULL CHECK(payload_hash~'^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL, created_by uuid NOT NULL REFERENCES poms.platform_user(id),
 FOREIGN KEY(binding_id,project_id) REFERENCES poms.operating_signal_gate_binding(id,project_id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(evidence_id,project_id,snapshot_id) REFERENCES poms.operating_evaluation_evidence(id,project_id,snapshot_id)
);
CREATE TABLE poms.operating_command_receipt (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id varchar(160) NOT NULL,
 target_scope varchar(192) NOT NULL, actor_id uuid NOT NULL REFERENCES poms.platform_user(id),
 request_key uuid NOT NULL, request_hash varchar(64) NOT NULL CHECK(request_hash~'^[0-9a-f]{64}$'),
 authorized_response jsonb NOT NULL CHECK(jsonb_typeof(authorized_response)='object'),
 http_status integer NOT NULL CHECK(http_status BETWEEN 200 AND 299),
 source_hash varchar(64) NOT NULL CHECK(source_hash~'^[0-9a-f]{64}$'),
 evaluation_hash varchar(64) NOT NULL CHECK(evaluation_hash~'^[0-9a-f]{64}$'),
 committed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(operation_id,target_scope,actor_id,request_key)
);

-- Existing lower-case enum checks may be named by the direct-cutover migration.
-- Exact constraint names from the migration ancestry are dropped only for these
-- two fields; unknown/normal do not extend maturity or arbitrary stage enums.
ALTER TABLE poms.operating_signal_evaluation_result
 DROP CONSTRAINT IF EXISTS chk_operating_signal_evaluation_result_signal_level,
 DROP CONSTRAINT IF EXISTS chk_operating_signal_evaluation_result_risk_level;
ALTER TABLE poms.operating_signal_evaluation_result
 ADD CONSTRAINT ck_jghi_signal_level CHECK(signal_level IN ('attention','alert','normal','unknown')),
 ADD CONSTRAINT ck_jghi_risk_level CHECK(risk_level IN ('attention','risk','normal','unknown'));

-- Structural same-project constraints supplement the existing single-id FKs.
ALTER TABLE poms.project_handover ADD CONSTRAINT uq_jghi_handover_project UNIQUE(id,project_id);
ALTER TABLE poms.commission_role_assignment ADD CONSTRAINT uq_jghi_assignment_project UNIQUE(id,project_id);
ALTER TABLE poms.acceptance_record ADD CONSTRAINT uq_jghi_acceptance_project UNIQUE(id,project_id);
ALTER TABLE poms.project_completion_record ADD CONSTRAINT uq_jghi_completion_project UNIQUE(id,project_id);
ALTER TABLE poms.project_stage_record
 ADD CONSTRAINT fk_jghi_stage_previous_project FOREIGN KEY(previous_stage_record_id,project_id) REFERENCES poms.project_stage_record(id,project_id),
 ADD CONSTRAINT fk_jghi_stage_handover_project FOREIGN KEY(source_handover_id,project_id) REFERENCES poms.project_handover(id,project_id),
 ADD CONSTRAINT fk_jghi_stage_assignment_project FOREIGN KEY(source_role_assignment_id,project_id) REFERENCES poms.commission_role_assignment(id,project_id),
 ADD CONSTRAINT fk_jghi_stage_completion_project FOREIGN KEY(source_completion_record_id,project_id) REFERENCES poms.project_completion_record(id,project_id);
ALTER TABLE poms.commission_role_assignment_freeze_payload
 ADD CONSTRAINT fk_jghi_freeze_assignment_project FOREIGN KEY(assignment_id,project_id) REFERENCES poms.commission_role_assignment(id,project_id),
 ADD CONSTRAINT fk_jghi_freeze_handover_project FOREIGN KEY(handover_id,project_id) REFERENCES poms.project_handover(id,project_id);
ALTER TABLE poms.acceptance_record ADD CONSTRAINT fk_jghi_acceptance_stage_project
 FOREIGN KEY(source_stage_record_id,project_id) REFERENCES poms.project_stage_record(id,project_id) NOT VALID;
ALTER TABLE poms.project_completion_record
 ADD CONSTRAINT fk_jghi_completion_stage_project FOREIGN KEY(source_stage_record_id,project_id) REFERENCES poms.project_stage_record(id,project_id) NOT VALID,
 ADD CONSTRAINT fk_jghi_completion_acceptance_project FOREIGN KEY(acceptance_record_id,project_id) REFERENCES poms.acceptance_record(id,project_id) NOT VALID;
ALTER TABLE poms.project_completion_condition
 ADD CONSTRAINT uq_jghi_condition_scope UNIQUE(id,completion_record_id,project_id),
 ADD CONSTRAINT fk_jghi_condition_parent FOREIGN KEY(completion_record_id,project_id) REFERENCES poms.project_completion_record(id,project_id);
ALTER TABLE poms.project_completion_condition_closure ADD CONSTRAINT fk_jghi_closure_parent
 FOREIGN KEY(condition_id,completion_record_id,project_id) REFERENCES poms.project_completion_condition(id,completion_record_id,project_id);
ALTER TABLE poms.project_archive_record ADD CONSTRAINT fk_jghi_archive_stage_project
 FOREIGN KEY(source_stage_record_id,project_id) REFERENCES poms.project_stage_record(id,project_id) NOT VALID;
ALTER TABLE poms.project_stage_record ADD CONSTRAINT ck_jghi_stage_payload_object CHECK(jsonb_typeof(source_payload)='object');
ALTER TABLE poms.commission_role_assignment_freeze_payload ADD CONSTRAINT ck_jghi_freeze_payload_object CHECK(jsonb_typeof(source_payload)='object');
ALTER TABLE poms.project_completion_condition_closure ADD CONSTRAINT ck_jghi_closure_payload_object CHECK(jsonb_typeof(source_payload)='object');
ALTER TABLE poms.project_lifecycle_evidence_ref ADD CONSTRAINT ck_jghi_lifecycle_payload_object CHECK(jsonb_typeof(source_payload)='object');
ALTER TABLE poms.shared_cost_allocation_result ADD CONSTRAINT ck_jghi_share_consumed
 CHECK((NOT is_included_in_project_cost AND included_at IS NULL AND included_by IS NULL)
    OR (is_included_in_project_cost AND included_at IS NOT NULL AND included_by IS NOT NULL));

-- Immutable new evidence tables: no UPDATE/DELETE through ordinary DML.
-- Authorized development cleanup remains separately governed, not a runtime
-- client flag or a SECURITY DEFINER bypass in this migration.
CREATE FUNCTION poms.jghi_reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'immutable GHI evidence cannot be changed' USING ERRCODE='23514';
END $$;
"""

immutable = ["receipt_accounting_basis","operating_baseline_source","project_cost_inclusion_decision",
 "operating_source_context","operating_snapshot_cost_member","operating_source_member",
 "operating_evaluation_evidence","operating_evaluation_reason","operating_gate_summary_payload","operating_command_receipt",
 "project_stage_record","commission_role_assignment_freeze_payload","project_completion_condition_closure","project_lifecycle_evidence_ref"]
for table in immutable:
    HSQL += f"CREATE TRIGGER jghi_immutable BEFORE UPDATE OR DELETE ON poms.{table}\n FOR EACH ROW EXECUTE FUNCTION poms.jghi_reject_immutable_change();\n"

HSQL += """
-- Frozen assignment participants are immutable; drafts are new versions rather
-- than in-place participant edits. This also prevents normal DELETE FK escape.
CREATE FUNCTION poms.jghi_assignment_participant_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM poms.commission_role_assignment a
           WHERE a.id=COALESCE(NEW.assignment_id,OLD.assignment_id) AND a.status='frozen') THEN
   RAISE EXCEPTION 'frozen assignment participants immutable' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER jghi_frozen_participant BEFORE INSERT OR UPDATE OR DELETE
 ON poms.commission_role_assignment_participant FOR EACH ROW EXECUTE FUNCTION poms.jghi_assignment_participant_guard();

-- Deferred final-state validators allow same-TX domain+evidence construction.
CREATE FUNCTION poms.jghi_assignment_total_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a record; n bigint; total bigint;
BEGIN
 IF TG_TABLE_NAME='commission_role_assignment' THEN
  SELECT * INTO a FROM poms.commission_role_assignment WHERE id=NEW.id;
 ELSE
  SELECT * INTO a FROM poms.commission_role_assignment WHERE id=COALESCE(NEW.assignment_id,OLD.assignment_id);
 END IF;
 IF a.producer_version=1 THEN
   SELECT count(*),sum(weight_units) INTO n,total FROM poms.commission_role_assignment_participant WHERE assignment_id=a.id;
   IF n=0 OR total IS DISTINCT FROM 1000000::bigint THEN
     RAISE EXCEPTION 'assignment weights must sum exactly one million' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_assignment_total AFTER INSERT OR UPDATE
 ON poms.commission_role_assignment DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_assignment_total_guard();
CREATE CONSTRAINT TRIGGER jghi_participant_total AFTER INSERT OR UPDATE OR DELETE
 ON poms.commission_role_assignment_participant DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_assignment_total_guard();

CREATE FUNCTION poms.jghi_completion_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cr record; ar record; n bigint; open_count bigint;
BEGIN
 IF TG_TABLE_NAME='project_completion_record' THEN
   SELECT * INTO cr FROM poms.project_completion_record WHERE id=NEW.id;
 ELSE
   SELECT * INTO cr FROM poms.project_completion_record WHERE id=NEW.completion_record_id;
 END IF;
 IF cr.producer_version=1 THEN
   SELECT * INTO ar FROM poms.acceptance_record WHERE id=cr.acceptance_record_id;
   IF ar.id IS NULL OR ar.project_id IS DISTINCT FROM cr.project_id OR ar.producer_version<>1
      OR ar.status<>'confirmed' OR ar.acceptance_type<>'final-acceptance'
      OR NOT ((ar.acceptance_result='accepted' AND cr.completion_result='completed')
           OR (ar.acceptance_result='conditional' AND cr.completion_result='conditional-completed')) THEN
     RAISE EXCEPTION 'completion requires same-project true final acceptance and exact result mapping' USING ERRCODE='23514';
   END IF;
   SELECT count(*),count(*) FILTER(WHERE status='pending') INTO n,open_count
    FROM poms.project_completion_condition WHERE completion_record_id=cr.id;
   IF (cr.completion_result='completed' AND (n<>0 OR cr.condition_status<>'not-applicable'))
      OR (cr.completion_result='conditional-completed' AND
          (n=0 OR cr.condition_status IS DISTINCT FROM CASE WHEN open_count=0 THEN 'closed' ELSE 'pending' END)) THEN
     RAISE EXCEPTION 'completion condition aggregate differs from actual complete condition set' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_completion_valid AFTER INSERT OR UPDATE
 ON poms.project_completion_record DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_completion_guard();
CREATE CONSTRAINT TRIGGER jghi_condition_aggregate AFTER INSERT OR UPDATE
 ON poms.project_completion_condition DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_completion_guard();

CREATE FUNCTION poms.jghi_archive_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a record; c record;
BEGIN
 SELECT * INTO a FROM poms.project_archive_record WHERE id=NEW.id;
 IF a.producer_version=1 AND a.status='recorded' AND a.archive_anchor_source_type='project-completion-record' THEN
   SELECT * INTO c FROM poms.project_completion_record WHERE id=a.archive_anchor_source_id;
   IF c.id IS NULL OR c.project_id IS DISTINCT FROM a.project_id OR c.status<>'confirmed'
     OR (c.producer_version=1 AND c.condition_status='pending')
     OR (c.producer_version<>1 AND c.completion_result='conditional-completed') THEN
     RAISE EXCEPTION 'archive completion anchor unavailable or conditions pending/unknown' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_archive_valid AFTER INSERT OR UPDATE
 ON poms.project_archive_record DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_archive_guard();

-- Normal updates to G captured facts may change only lifecycle metadata. H
-- manual reviews never modify these rows, even when effective action changes.
CREATE FUNCTION poms.jghi_snapshot_fact_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.producer_version=1 AND
   (to_jsonb(NEW)-ARRAY['status','is_current','row_version','updated_at','updated_by'])
   IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','is_current','row_version','updated_at','updated_by']) THEN
   RAISE EXCEPTION 'captured operating facts immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER jghi_snapshot_fact_guard BEFORE UPDATE ON poms.project_operating_snapshot
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_snapshot_fact_guard();
CREATE TRIGGER jghi_period_fact_guard BEFORE UPDATE ON poms.period_closing_snapshot
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_snapshot_fact_guard();
CREATE TRIGGER jghi_dmer_fact_guard BEFORE UPDATE ON poms.data_maturity_evaluation_result
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_snapshot_fact_guard();
CREATE TRIGGER jghi_oser_fact_guard BEFORE UPDATE ON poms.operating_signal_evaluation_result
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_snapshot_fact_guard();

-- Completion result and its original final acceptance are immutable. Closing
-- conditions updates only aggregate state/version and ordinary audit metadata.
CREATE FUNCTION poms.jghi_completion_fact_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.producer_version=1 AND
  (to_jsonb(NEW)-ARRAY['condition_status','row_version','updated_at','updated_by'])
   IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['condition_status','row_version','updated_at','updated_by']) THEN
  RAISE EXCEPTION 'original completion conclusion immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER jghi_completion_fact_guard BEFORE UPDATE ON poms.project_completion_record
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_completion_fact_guard();
CREATE FUNCTION poms.jghi_condition_fact_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'completion condition immutable' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-ARRAY['status','closure_record_id','closed_at','closed_by','row_version'])
   IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','closure_record_id','closed_at','closed_by','row_version'])
   OR OLD.status<>'pending' OR NEW.status<>'closed' OR NEW.row_version<>OLD.row_version+1 THEN
  RAISE EXCEPTION 'condition permits only its own terminal closure' USING ERRCODE='23514';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM poms.project_completion_condition_closure cc
  WHERE cc.id=NEW.closure_record_id AND cc.condition_id=NEW.id
   AND cc.project_id=NEW.project_id AND cc.completion_record_id=NEW.completion_record_id
   AND cc.closed_by=NEW.responsible_user_id AND cc.closed_at=NEW.closed_at) THEN
  RAISE EXCEPTION 'condition closure does not match immutable actor/source fact' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER jghi_condition_fact_guard BEFORE UPDATE OR DELETE ON poms.project_completion_condition
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_condition_fact_guard();

-- Consumed member existence is the authority for service mutation protection.
-- Root E/F/C controllers call this read predicate through their existing outer
-- TX before mutation. Changing tax/stage/basis inputs must resolve all actual
-- member source IDs first; no client-supplied permit flag is consulted here.
CREATE FUNCTION poms.jghi_cost_was_consumed(cost_id uuid,allocation_id uuid)
 RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(
  SELECT 1 FROM poms.operating_snapshot_cost_member m
  JOIN poms.project_cost_inclusion_decision d ON d.id=m.decision_id
  JOIN poms.project_operating_snapshot s ON s.id=m.snapshot_id
  WHERE s.producer_version=1 AND d.decision='include'
   AND ((cost_id IS NOT NULL AND d.cost_record_id=cost_id)
      OR (allocation_id IS NOT NULL AND d.allocation_result_id=allocation_id))
 ) OR EXISTS(
  SELECT 1 FROM poms.operating_source_context c
  JOIN poms.project_operating_snapshot s ON s.id=c.snapshot_id AND s.project_id=c.project_id
  CROSS JOIN LATERAL jsonb_array_elements(c.frozen_payload->'costs') cost
  WHERE cost_id IS NOT NULL AND s.producer_version=1
   AND cost->'classification'->>'decision'='include'
   AND ((cost->'costRef'->>'id')::uuid=cost_id OR EXISTS(
      SELECT 1 FROM jsonb_array_elements(cost->'allocationSourceMembers') member
      WHERE (member->'costRef'->>'id')::uuid=cost_id))
 )
$$;

-- This constraint checks one persisted representation, without recalculating
-- business formulas in SQL or changing immutable source JSON after insertion.
CREATE FUNCTION poms.jghi_context_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c record; s record;
BEGIN
 IF TG_TABLE_NAME='operating_source_context' THEN
  SELECT * INTO c FROM poms.operating_source_context WHERE id=NEW.id;
 ELSE
  IF NEW.producer_version<>1 THEN RETURN NULL; END IF;
  SELECT * INTO c FROM poms.operating_source_context WHERE id=NEW.source_context_id;
 END IF;
 SELECT * INTO s FROM poms.project_operating_snapshot WHERE id=c.snapshot_id;
 IF c.id IS NULL OR s.id IS NULL OR s.producer_version<>1
  OR s.project_id IS DISTINCT FROM c.project_id OR s.source_context_id IS DISTINCT FROM c.id
  OR s.source_hash IS DISTINCT FROM c.source_hash OR s.currency IS DISTINCT FROM c.currency
  OR c.frozen_payload->>'projectId' IS DISTINCT FROM c.project_id::text
  OR c.frozen_payload->>'contextId' IS DISTINCT FROM c.id::text
  OR c.frozen_payload->'snapshot'->>'id' IS DISTINCT FROM c.snapshot_id::text
  OR c.frozen_payload->>'sourceHash' IS DISTINCT FROM c.source_hash
  OR c.frozen_payload->>'policyVersion' IS DISTINCT FROM c.policy_version
  OR c.frozen_payload->>'policyHash' IS DISTINCT FROM c.policy_hash
  OR c.frozen_payload->>'currency' IS DISTINCT FROM c.currency THEN
  RAISE EXCEPTION 'persisted snapshot/context identity mismatch' USING ERRCODE='23514';
 END IF;
 IF (c.frozen_payload->'snapshot'->'restatedSnapshotRef') IS DISTINCT FROM 'null'::jsonb
   OR (c.frozen_payload->'snapshot'->'restatementRef') IS DISTINCT FROM 'null'::jsonb
   OR ((c.frozen_payload->'snapshot'->>'mode')='period-end'
       AND (c.frozen_payload->'snapshot'->'periodEndSnapshotRef') IS DISTINCT FROM 'null'::jsonb) THEN
  RAISE EXCEPTION 'new result references must remain null in immutable capture context' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_context_identity AFTER INSERT ON poms.operating_source_context
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION poms.jghi_context_identity_guard();
CREATE CONSTRAINT TRIGGER jghi_snapshot_context_identity AFTER INSERT OR UPDATE ON poms.project_operating_snapshot
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION poms.jghi_context_identity_guard();

CREATE FUNCTION poms.jghi_binding_summary_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b record; e record; o record; p record;
BEGIN
 SELECT * INTO b FROM poms.operating_signal_gate_binding WHERE id=NEW.id;
 IF b.producer_version<>1 OR b.status<>'active' THEN RETURN NULL; END IF;
 SELECT * INTO e FROM poms.operating_evaluation_evidence WHERE id=b.evidence_id;
 SELECT * INTO o FROM poms.operating_signal_evaluation_result WHERE id=b.signal_evaluation_id;
 SELECT * INTO p FROM poms.operating_gate_summary_payload WHERE summary_snapshot_id=b.current_summary_id;
 IF e.id IS NULL OR o.id IS NULL OR p.summary_snapshot_id IS NULL
  OR e.project_id IS DISTINCT FROM b.project_id OR o.project_id IS DISTINCT FROM b.project_id
  OR o.evidence_id IS DISTINCT FROM e.id OR o.referenced_snapshot_id IS DISTINCT FROM e.snapshot_id
  OR p.binding_id IS DISTINCT FROM b.id OR p.binding_row_version IS DISTINCT FROM b.row_version
  OR p.project_id IS DISTINCT FROM b.project_id OR p.gate_stage_type IS DISTINCT FROM b.gate_stage_type
  OR p.snapshot_id IS DISTINCT FROM e.snapshot_id OR p.evidence_id IS DISTINCT FROM e.id
  OR p.source_hash IS DISTINCT FROM e.source_hash OR p.evaluation_hash IS DISTINCT FROM b.evaluation_hash
  OR p.policy_hash IS DISTINCT FROM e.policy_hash OR p.policy_version IS DISTINCT FROM e.policy_version THEN
  RAISE EXCEPTION 'current binding/evaluation/summary chain mismatch' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_binding_summary AFTER INSERT OR UPDATE ON poms.operating_signal_gate_binding
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION poms.jghi_binding_summary_guard();

__SUMMARY_DEFINITIONS__

-- No down migration or automatic data rewrite. NOT VALID composite constraints
-- deliberately preserve unknown old rows while enforcing new writes; Root must
-- report these as accepted legacy-unverified constraints, not full DB validation.
"""

definition_sql = "-- Production definition metadata only; no business approval/confirmation facts.\n"
for definition in SUMMARY_DEFINITIONS:
    scenario,package,projection,export,field = (definition[key] for key in ("scenario","package","projection","export","fieldRule"))
    definition_sql += f"""DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM poms.approval_summary_package_definition
  WHERE approval_scenario_key='{scenario}' AND summary_package_key='{package}'
   AND (projection_level<>'{projection}' OR export_policy<>'{export}' OR field_rule_version<>'{field}' OR status<>'active')) THEN
  RAISE EXCEPTION 'conflicting production summary definition {package}';
 END IF;
END $$;
INSERT INTO poms.approval_summary_package_definition
 (approval_scenario_key,summary_package_key,projection_level,export_policy,field_rule_version,status)
 VALUES('{scenario}','{package}','{projection}','{export}','{field}','active')
 ON CONFLICT(approval_scenario_key,summary_package_key) DO NOTHING;
"""
HSQL = HSQL.replace("__SUMMARY_DEFINITIONS__",definition_sql)

origin_sql = ""
if iref is not None:
    origin_source = source(IDIR + "refinements03.sql")
    origin_match = re.search(r"CREATE TABLE poms\.project_ownership_origin\s*\(.*?\n\);", origin_source, re.S)
    if origin_match:
        origin_sql = "\n-- I final refinement: exact new-only ownership provenance.\n" + origin_match[0] + "\n"
        origin_sql += """
ALTER TABLE poms.project_owner_reassignment_record ADD CONSTRAINT uq_jghi_reassignment_project UNIQUE(id,project_id);
ALTER TABLE poms.project_ownership_origin ADD CONSTRAINT fk_jghi_origin_reassignment_project
 FOREIGN KEY(bootstrap_assignment_record_id,project_id) REFERENCES poms.project_owner_reassignment_record(id,project_id);
CREATE FUNCTION poms.jghi_ownership_origin_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  RAISE EXCEPTION 'ownership origin immutable' USING ERRCODE='23514';
 END IF;
 IF (to_jsonb(NEW)-ARRAY['bootstrap_state','first_personal_owner_user_id','first_personal_assigned_at','bootstrap_consumed_at','bootstrap_assignment_record_id','row_version'])
   IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['bootstrap_state','first_personal_owner_user_id','first_personal_assigned_at','bootstrap_consumed_at','bootstrap_assignment_record_id','row_version'])
   OR OLD.bootstrap_state<>'available' OR NEW.bootstrap_state<>'consumed'
   OR NEW.row_version<>OLD.row_version+1 THEN
  RAISE EXCEPTION 'ownership bootstrap permits only one terminal consumption' USING ERRCODE='23514';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM poms.project_owner_reassignment_record rr
  WHERE rr.id=NEW.bootstrap_assignment_record_id AND rr.project_id=NEW.project_id
   AND rr.previous_owner_user_id IS NULL AND rr.new_owner_user_id=NEW.first_personal_owner_user_id
   AND rr.previous_owner_org_id=NEW.initial_owner_org_id AND rr.new_owner_org_id=NEW.initial_owner_org_id
   AND rr.reassigned_by=NEW.creator_user_id AND rr.reassigned_at=NEW.first_personal_assigned_at) THEN
  RAISE EXCEPTION 'bootstrap consumption lacks exact real first-assignment history' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER jghi_ownership_origin_guard BEFORE UPDATE OR DELETE ON poms.project_ownership_origin
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_ownership_origin_guard();
CREATE FUNCTION poms.jghi_ownership_origin_insert_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p record;
BEGIN
 SELECT * INTO p FROM poms.project WHERE id=NEW.project_id;
 IF p.id IS NULL OR p.created_by IS DISTINCT FROM NEW.creator_user_id
  OR p.owner_user_id IS DISTINCT FROM NEW.initial_owner_user_id OR p.owner_org_id IS DISTINCT FROM NEW.initial_owner_org_id
  OR p.created_at IS DISTINCT FROM NEW.created_at
  OR NOT ((NEW.source_type='direct-create' AND NEW.source_record_id=p.id AND NEW.initial_kind='personal'
             AND NEW.initial_owner_user_id=NEW.creator_user_id)
       OR (NEW.source_type='lead-conversion' AND p.source_lead_id IS NOT NULL AND NEW.source_record_id=p.source_lead_id)) THEN
  RAISE EXCEPTION 'ownership origin must match actual new creation/conversion facts' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER jghi_ownership_origin_insert_guard BEFORE INSERT ON poms.project_ownership_origin
 FOR EACH ROW EXECUTE FUNCTION poms.jghi_ownership_origin_insert_guard();
"""

migration = SQL_HEADER + "-- G source and capture DDL.\n" + gsql + "\n-- I lifecycle and minimal R5 DDL.\n" + isql + "\n" + HSQL + origin_sql
text("migration.sql", migration)
new_tables = re.findall(r"(?i)CREATE\s+TABLE\s+poms\.([a-z_0-9]+)", migration)
blueprint["migration"].update({"newTables":new_tables,"newTableCount":len(new_tables),"forecastTableCountFromProvidedBase":120+len(new_tables),"originDDLIncluded":bool(origin_sql),"notValidCompositeConstraints":"Preserve legacy rows; enforce new DML. Source semantic facts still need true producers, never a backfill."})
if not origin_sql:
    blueprint["rootDecisionItems"].append({"id":"ownership-origin-DDL","required":"Merge exact I final ownership origin producer DDL before freeze; intentionally not invented from current NULL owner","blocks":"final migration completeness/G1"})
emit("blueprint.json", blueprint)

rows = []
for n, op in enumerate(operations,1):
    req = op['requestDto'] or 'none'
    rows.append(f"| {n} | {op['group']} | `{op['canonical']}` | `{op['operationId']}` | `{req}` -> `{op['responseDto']}` | {op['successStatus']} |")
text("integration.md", """# R4 GHI 与最小 R5 联合 G1 输入草案

状态：**待 Root 审核，未通过 G1，未准入 G2**。本目录不修改产品、canonical、正式 baseline、Git/GitHub、DB/API 或凭证。Userfix #115 独立通过的证据不代表本业务批次通过。

唯一机器蓝图是 `blueprint.json`；G/H 共同内部模型是 `source-context.schema.json`；11条规则与精确数值常量冻结于 `policy-definition.json`，policyHash按现有canonical_hash算法生成；唯一迁移提案是 `migration.sql`；旧 Native 参考原样冻结在 `native-reference.schemas.json`；来源字节由 `sources.json` 冻结。`verify.py` 只读结构校验，不连接 DB，不生成产品。

## 操作边界

G9 + H8 + I既有8/新stage2/新condition1 + R5最小既有4 = **32**；R4本批28，另R5为4。新公开操作3，其余既有操作只发生协议/producer变更。正式R4总数从92扩为95只在Root冻结canonical后成立；正式交付仍为240/R4 67，目标验收后的272/R4 95仅预测。

| # | 归属 | canonical（无 /api） | operationId | request -> response | 成功状态 |
| --- | --- | --- | --- | --- | --- |
""" + "\n".join(rows) + """

## 来源与事务

Root单写公共模型/hash/loader。G唯一负责真实来源收集与分类，H唯一负责经营规则。G先锁完整影响集合，核pre-effect expectedInputHash；完成真实producer/CAS后形成H白名单finalSourceHash。本次生成self/result引用在capture context固定null且不进入sourceHash，不事后补写；实际既存restates/period root可作为上游，结果关联只在SQL FK/response，避免自引用hash循环。预分配ID后H纯derive，G一次INSERT最终v1事实与capture action，H同outerTX按snapshotId/v1/hash重载重算，写DMER/OSER/四阶段bindings/全原因/摘要。manual review只追加overlay和新有效bindings，永不改写G原snapshot。

baseline-only只写operating_baseline_source；不创建缺回款/成本的伪完整context。known-zero、未知、成熟度、正式可发布性分别表达；确认回款gross和冻结合同净税依据相连，成本必须显式include/exclude/reason。按真实source chain与allocation source-set消重；保留真实分期payment独立主体；shared share不伪造actual-cost行。

## 必要既有producer与边界

同一路C.confirm扩confirm/certify-existing-basis模式；B激活冻结真实currency；E/F普通写保护读取实际consumed membership，仅封闭的同TX restatement permit允许完整改正链。D.prepare先核变更前OwnerWrite再生产职责grant并写真实handover阶段。Project.create只接受assessment且记录creator/owner事实；Lead.convert保留真实初始owner来源。reassign先核旧责任链或真实未consumed creator origin，成功永久消耗首次指派权。detail/timeline回当前stage/版本及真实事件。这些不新增HTTP计数。

## 权限与数据范围

权限与项目关系同时满足。同组织、ancestor、任意roleKey、is_system_role、project:write或finance权限本身都不是project scope。current handover必须是实际v1 current与真实basis/本人confirmation链，不能latest兜底；当前组织成员事实fresh读取且受同TX锁保护。org-owned bootstrap只能从明确新origin事实得出，不能从当前owner=NULL或缺reassign历史反推。OwnCondition仅开放本人任务最小读取/关闭，完整父conditionStatus仍看全体条件；不扩成全项目经营读。

I最终refinements03与Root scope03原文必须并入来源清单；Root已采纳G/H经营写的OwnerWrite或真实ConfirmedDuty(finance)/BA三分支，仍需原finance权限。BA是实际current handover职责，不是平台roleKey。本轮不编造主管权限、管理配置或seed。详细可执行谓词、404/403/409边界和动作表见blueprint.scope。

## 公共接线与兼容

Root独占Cargo/lib/http/validation、shared DTO、OpenAPI/client、迁移/ORM、scope/common模型、既有关键controllers和中心workspace；G/H/I各写独立Rust业务目录与UI子件。named ResourceKeys保留条件route两个UUID，强制parent-child-project匹配；旧单key显式适配。权重原始数字token进checked millionths后再转JSON Value；接受1e-6、拒绝1e-7和0.10000000000000001，sum精确1000000，零权重有原因。

Root从冻结旧schema提取Native参考alias；新shared协议不可为了旧return literal而变optional、降低raw-null保护或使用any/as-cast。本批全部16个现代write DTO及C confirm统一required inputVersion=server-derived-v1，在Rust由来源计算，旧任意金额/结论只能是精确assertions。Native先显式判现代tag再返回422 reference_runtime_unsupported；Rust对legacy/缺tag返回422 legacy_reference_input_unsupported，现代tag后的shape错误400。不能靠新字段存在性误落旧producer；既有E/F未消费正常协议不无故加tag，sealed restatement分支明确v1。现有3个平台create的实际201/声明200单独记existing-baseline-drift。

## 迁移与验证

只提供一份forward migration草案（94->95），保留旧producer0/NULL原始含义，不补造历史。新结构增加同项目复合FK、nullable authority显式IS NOT NULL、不可变证据、权重合计与final验收/条件聚合/归档deferred检查。仅gross_margin_rate扩numeric(38,6)，money/tax/weight精度不变。NOT VALID复合约束明示保护旧未知行，不冒称整库验证。source hash和经营policy由共同Rust实现，不能用jsonb::text或第二套SQL公式替代。

Root须审核blueprint.rootDecisionItems并形成正式canonical/DTO/DDL/owner/范围baseline和字节manifest，经独立G1通过后才准G2。之后产品验证覆盖Native/shared/Rust/admin编译、迁移实体一致、真实作者链、精确数值/全部规则、故障回滚与并发、敏感JSON/DOM/audit、跨组织真实指派、同组织无关拒绝、creator首次指派永久消耗及职责自授阻断。本目录纯结构验证不能代替这些证据。
"""
)

source_entries = []
for path in sorted(SOURCES):
    raw = (ROOT/path).read_bytes()
    source_entries.append({"path":path,"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()})
emit("sources.json", {"kind":"joint-G1-observed-source-byte-manifest","algorithm":"SHA-256 raw bytes, no normalization","status":"review-input-not-formal-baseline","providedHead":blueprint["providedHead"],"headNotGitVerified":True,"entries":source_entries})
artifact_entries = []
for name in ["blueprint.json","integration.md","source-context.schema.json","policy-definition.json","migration.sql","native-reference.schemas.json","observed-schema.json","root-adoptions.json","sources.json","build.py","verify.py","validation.json"]:
    path=OUT/name
    if path.exists():
        raw=path.read_bytes()
        artifact_entries.append({"path":name,"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()})
emit("artifacts.json", {"kind":"review-artifact-byte-manifest","excludesSelf":True,"entries":artifact_entries})
print(json.dumps({"status":blueprint["status"],"operations":len(operations),"newTables":len(new_tables),"sourceFiles":len(source_entries),"rootDecisionItems":blueprint["rootDecisionItems"]},ensure_ascii=False))
