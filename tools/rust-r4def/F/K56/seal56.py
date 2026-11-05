"""Seal K56 only after actual stable-source checks; no network/DB/env/Git access."""
import hashlib
import json
import re
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_once(path,data):
    path.resolve().relative_to(HERE)
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists():
        assert path.read_bytes()==data,f"Refuse overwrite: {path}"
    else:
        with path.open("xb") as stream:
            stream.write(data)


def record(path,base):
    data=path.read_bytes()
    return {"file":path.relative_to(base).as_posix(),"bytes":len(data),"rawBytesSha256":sha(data)}


authority=HERE/"freeze62.json.bin"
assert sha(authority.read_bytes())=="31f93f67f235d4bc1ae88e7d5913119e07aa6ba6948d836dd75dbb0d5c054fd6"
freeze=load(authority)
assert freeze["implementationAuthorized"] is True
receipt_path=HERE/"author-checks02/receipt.json"
receipt=load(receipt_path)
assert receipt["passed"] and receipt["sourceStableDuringChecks"]
assert all(c["exitCode"]==0 for c in receipt["commands"])
assert [c["mode"] for c in receipt["commands"]]==["version","fmt-check","clippy","test","legacy-test"]
products=[]
for before,after in zip(freeze["sourceBefore"],receipt["sourceAfter"],strict=True):
    assert before["file"]==after["file"]
    path=ROOT/after["file"]
    assert sha(path.read_bytes())==after["rawBytesSha256"]
    frozen_before=HERE/"source-before"/(before["file"]+".bin")
    assert sha(frozen_before.read_bytes())==before["sha256"]
    export=HERE/"product"/after["file"]
    write_once(export,path.read_bytes())
    products.append({"file":after["file"],"sourceBeforeRawBytesSha256":before["sha256"],"sourceAfter":record(path,ROOT),"completeImportFile":record(export,HERE)})

seals={
    "tools/rust-r4def/F/K55/proposal55-manifest.json":"a0c6d57f0a9a3e13bb9ceb324d2e6000144bb42a7d0e5b926eafe9c638787e58",
    "tools/rust-r4def/F/delivery46.json":"1707b06f619c5995547824968ac739b055dfb2f8bff6452c16ab72a6e607aa41",
    "tools/rust-r4def/F/acceptance44/delivery44.json":"2d8f1238a5a1e21a382523f939bb6ebe14c9d7efb15264ef9bd8be2261019473",
}
for path,digest in seals.items():
    assert sha((ROOT/path).read_bytes())==digest
f46=load(ROOT/"tools/rust-r4def/F/delivery46.json")
for item in f46["productFiles"]:
    assert sha((ROOT/item["file"]).read_bytes())==item["rawBytesSha256"]
counts={}
names=set()
for mode in ("test","legacy-test"):
    log=(HERE/"author-checks02"/(mode+".log")).read_text(encoding="utf-8-sig")
    match=re.search(r"test result: ok\. (\d+) passed; 0 failed",log)
    assert match,mode
    counts[mode]=int(match[1])
    names.update(re.findall(r"^test ([^ ]+) \.\.\. ok",log,re.M))

manifest={
    "kind":"R4DEF-K56-three-file-supporting-corrective-delivery56",
    "authority":{"file":"docs/design/rust-r4def/g2-attachment-freeze62.json","rawBytesSha256":sha(authority.read_bytes()),"implementationAuthorized":True},
    "scope":{"productFiles":freeze["authorizedProductFiles"],"support":"tools/rust-r4def/F/K56/**","DatabaseChanged":False,"HTTPChanged":False,"DTOChanged":False,"DDLChanged":False,"dependenciesChanged":False,"F46F44Changed":False},
    "baseCommitFromAssignedWorktree":"756d813c9578090fcf8e56821acce01b46b40420",
    "branchFromAssignedWorktree":"codex/poms-r4f-cost-governance",
    "products":products,
    "actualChecks":{"receipt":record(receipt_path,HERE),"commandTestPassCountsWithOverlap":counts,"distinctPureTestNames":len(names),"sourceStableDuringChecks":True,"compiler":"Real application lib with Root-owned existing real E registration, dedicated target-F/jobs2 offline","initialIncompleteAttempt":"author-checks01/runner-error.json"},
    "sealedEarlierPackages":seals,
    "sealedF46SixSources":f46["productFiles"],
    "RootOwnedCompilerScaffoldingNotDelivered":[record(ROOT/"apps/poms-api-rust/src/lib.rs",ROOT),record(ROOT/"apps/poms-api-rust/src/contract_support/mod.rs",ROOT)],
    "actualPGExecuted":False,"actualHTTPExecuted":False,"actualObjectProviderIOExecuted":False,"actualConcurrencyExecuted":False,"actualFailureInjectionExecuted":False,"S3Accepted":False,
    "notRun":["K55 actual vectors32","actual binary download/hash","actual PG rows/rollback","actual controlled races","actual necessary-write faults","actual lost COMMIT ACK","S3 provider acceptance"],
    "G3Certified":False,"G4Certified":False,"committed":False,"pushed":False,"RootSharedWritten":False,"credentialsRead":False,"environmentModified":False,
    "remainingBoundary":["Known rollback plus successful fresh no-reference probe is the only final cleanup authority; unknown retains/poisons","No resurrection/extension of expired old validating session","Legacy published staging and already-issued external URLs are not silently migrated or revoked","Administrative post-commit runtime retarget and full handover/package multi-phase atomicity remain separate scope"],
    "supportArtifactsExcludingThisManifest":[record(path,HERE) for path in sorted(HERE.rglob("*")) if path.is_file() and path.name!="delivery56.json" and "__pycache__" not in path.parts],
    "next":"Root imports these exact three complete files, then actual K55 vectors, independent G3 and G4. Author source frozen after this delivery.",
}
encoded=(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n").encode("utf-8")
write_once(HERE/"delivery56.json",encoded)
print(json.dumps({"delivery":record(HERE/"delivery56.json",HERE),"products":products,"actualDistinctPureTests":len(names),"notRuntime":True},ensure_ascii=False))
