"""K86 bounded delivery seal after real stable-source checks. No DB/HTTP/Git."""
import hashlib,json,re
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
def sha(data):return hashlib.sha256(data).hexdigest()
def load(path):return json.loads(path.read_text(encoding="utf-8-sig"))
def rec(path,base):
    data=path.read_bytes();return {"file":path.relative_to(base).as_posix(),"bytes":len(data),"rawBytesSha256":sha(data)}
def once(path,data):
    path.resolve().relative_to(HERE);path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists():assert path.read_bytes()==data,f"Refuse overwrite {path}"
    else:
        with path.open("xb") as stream:stream.write(data)
authority=HERE/"authority86.json.bin"
assert sha(authority.read_bytes())=="daf3d46f884a1615cf840279cf64d5532bb1ce2f2ac22f26ca5395ff0566b3ab"
f=load(authority);assert f["implementationAuthorized"]
receipt_path=HERE/"author-checks01/receipt.json";receipt=load(receipt_path)
assert receipt["passed"] and receipt["sourceStableDuringChecks"]
assert [r["mode"] for r in receipt["commands"]]==["version","fmt-check","clippy","test","regression"]
assert all(r["exitCode"]==0 for r in receipt["commands"])
products=[];before={r["file"]:r for r in f["pins"]}
for after in receipt["sourceAfter"]:
    rel=after["file"];assert rel in f["allowedProductFiles"]
    path=ROOT/rel;assert sha(path.read_bytes())==after["rawBytesSha256"]
    archived=HERE/"source-before"/(rel+".bin");assert sha(archived.read_bytes())==before[rel]["rawBytesSha256"]
    output=HERE/"product"/rel;once(output,path.read_bytes())
    products.append({"file":rel,"sourceBefore":rec(archived,HERE),"sourceAfter":rec(path,ROOT),"completeImportFile":rec(output,HERE)})
registry="apps/poms-api-rust/src/attachment_storage/registry.rs"
assert sha((ROOT/registry).read_bytes())=="617f734af15f7e75db2cc69de63343c04104abbd446f322809fb1f1bfc625765"
seals={"K56/delivery56.json":"09f17e101976b12f5b741e0a9d1e110cae12e7d2a632369d4eae6d1ffd47d82b","K55/proposal55-manifest.json":"a0c6d57f0a9a3e13bb9ceb324d2e6000144bb42a7d0e5b926eafe9c638787e58","delivery46.json":"1707b06f619c5995547824968ac739b055dfb2f8bff6452c16ab72a6e607aa41","acceptance44/delivery44.json":"2d8f1238a5a1e21a382523f939bb6ebe14c9d7efb15264ef9bd8be2261019473"}
base=ROOT/"tools/rust-r4def/F"
for rel,digest in seals.items():assert sha((base/rel).read_bytes())==digest
k56=load(base/"K56/delivery56.json")
for item in k56["products"]:
    original=item["completeImportFile"];assert sha((base/"K56"/original["file"]).read_bytes())==original["rawBytesSha256"]
f46=load(base/"delivery46.json")
for item in f46["productFiles"]:assert sha((ROOT/item["file"]).read_bytes())==item["rawBytesSha256"]
names=set();counts={}
for mode in ["test","regression"]:
    log=(HERE/"author-checks01"/(mode+".log")).read_text(encoding="utf-8-sig")
    match=re.search(r"test result: ok\. (\d+) passed; 0 failed",log);assert match
    counts[mode]=int(match[1]);names.update(re.findall(r"^test ([^ ]+) \.\.\. ok",log,re.M))
d={"kind":"K86-no-dirty-Link-intent-corrective-delivery86","authority":{"file":"docs/design/rust-r4def/g2-K86-correction.json","rawBytesSha256":sha(authority.read_bytes()),"implementationAuthorized":True},"resolvedFinding":"K56-P2-01","scope":{"productFiles":f["allowedProductFiles"],"support":"tools/rust-r4def/F/K86/**","registryUnchanged":rec(ROOT/registry,ROOT),"DatabaseChanged":False,"HTTPChanged":False,"DTOChanged":False,"DDLChanged":False,"dependenciesChanged":False},"products":products,"actualChecks":{"receipt":rec(receipt_path,HERE),"sourceStableDuringChecks":True,"commandTestPassCountsWithOverlap":counts,"distinctPureTestNames":len(names),"newK86PureTests":counts["test"],"scope":"Real app lib, dedicated target-F/jobs2, offline, no fake E producer"},"sealedEarlierPackages":seals,"K56CompleteProductOriginalsUnchanged":True,"F46SixSourcesUnchanged":f46["productFiles"],"RootOwnedCompilerScaffoldingNotDelivered":[rec(ROOT/"apps/poms-api-rust/src/lib.rs",ROOT),rec(ROOT/"apps/poms-api-rust/src/contract_support/mod.rs",ROOT)],"baseCommitFromAssignedWorktree":"756d813c9578090fcf8e56821acce01b46b40420","branchFromAssignedWorktree":"codex/poms-r4f-cost-governance","actualPGExecuted":False,"actualHTTPExecuted":False,"actualObjectIOExecuted":False,"actualConcurrencyExecuted":False,"S3Accepted":False,"G3Certified":False,"G4Certified":False,"RootSharedWritten":False,"credentialsRead":False,"environmentModified":False,"committed":False,"pushed":False,"notRun":["actual two-session no-op group barriers","actual unchanged-head active-set race","actual no-op metadata/flag/complete races","actual managed-auth no-op rollback","unified Root runtime and final binary pin"],"evidenceReuse":"K71 positive chain remains K56 epoch; does not certify K86 no-op branch acceptance","supportArtifactsExcludingManifest":[rec(p,HERE) for p in sorted(HERE.rglob("*")) if p.is_file() and p.name!="delivery86.json" and "__pycache__" not in p.parts],"next":"Root guarded import of two complete files, independent G3 and actual runtime/barrier acceptance; registry remains exact K56 bytes"}
once(HERE/"delivery86.json",(json.dumps(d,ensure_ascii=False,indent=2)+"\n").encode())
print(json.dumps({"delivery":rec(HERE/"delivery86.json",HERE),"products":products,"newPureTests":counts["test"],"distinctPureTests":len(names),"registryUnchanged":True,"notRuntime":True},ensure_ascii=False))
