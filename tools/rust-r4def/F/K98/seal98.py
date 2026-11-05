"""Store-only K98 delivery seal; no DB/HTTP/object/network/Git operations."""
import hashlib,json,re
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];BASE=ROOT/"tools/rust-r4def/F"
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(p.read_text(encoding="utf-8-sig"))
def rec(p,base):
    b=p.read_bytes();return {"file":p.relative_to(base).as_posix(),"bytes":len(b),"rawBytesSha256":sha(b)}
def once(p,b):
    p.resolve().relative_to(HERE);p.parent.mkdir(parents=True,exist_ok=True)
    if p.exists():assert p.read_bytes()==b,f"Refuse overwrite {p}"
    else:
        with p.open("xb") as s:s.write(b)
auth=HERE/"authority98.json.bin";assert sha(auth.read_bytes())=="e1f2da3e5a8855395f37dba60ca5bd88b4d6a76fcc166d2bb78c4e13f7c405c9"
f=load(auth);assert f["implementationAuthorized"]
receipt_path=HERE/"author-checks01/receipt.json";receipt=load(receipt_path)
assert receipt["passed"] and receipt["sourceStableDuringChecks"]
assert [r["mode"] for r in receipt["commands"]]==["version","fmt-check","clippy","test","regression"]
assert all(r["exitCode"]==0 for r in receipt["commands"])
afters=receipt["sourceAfter"]
if isinstance(afters,dict):afters=[afters]
assert len(afters)==1
after=afters[0];rel=after["file"];assert [rel]==f["allowedProductFiles"]
pins={i["file"]:i for i in f["pins"]};before=HERE/"source-before"/(rel+".bin")
assert sha(before.read_bytes())==pins[rel]["rawBytesSha256"]
assert sha((ROOT/rel).read_bytes())==after["rawBytesSha256"]
output=HERE/"product"/rel;once(output,(ROOT/rel).read_bytes())
unchanged=[]
for path in ["apps/poms-api-rust/src/attachments/service.rs","apps/poms-api-rust/src/attachments/handover.rs","apps/poms-api-rust/src/attachment_storage/registry.rs"]:
    assert sha((ROOT/path).read_bytes())==pins[path]["rawBytesSha256"];unchanged.append(rec(ROOT/path,ROOT))
seals={"K56/delivery56.json":"09f17e101976b12f5b741e0a9d1e110cae12e7d2a632369d4eae6d1ffd47d82b","K86/delivery86.json":"af204da15ec0d6030afbca1635711d7cd9f996d317d879e9f34061da59e0b3c8","K55/proposal55-manifest.json":"a0c6d57f0a9a3e13bb9ceb324d2e6000144bb42a7d0e5b926eafe9c638787e58","delivery46.json":"1707b06f619c5995547824968ac739b055dfb2f8bff6452c16ab72a6e607aa41","acceptance44/delivery44.json":"2d8f1238a5a1e21a382523f939bb6ebe14c9d7efb15264ef9bd8be2261019473"}
for path,digest in seals.items():assert sha((BASE/path).read_bytes())==digest
for package,key in [("K56","products"),("K86","products")]:
    old=load(BASE/package/("delivery56.json" if package=="K56" else "delivery86.json"))
    for item in old[key]:
        record=item["completeImportFile"];assert sha((BASE/package/record["file"]).read_bytes())==record["rawBytesSha256"]
f46=load(BASE/"delivery46.json")
for item in f46["productFiles"]:assert sha((ROOT/item["file"]).read_bytes())==item["rawBytesSha256"]
names=set();counts={}
for mode in ["test","regression"]:
    log=(HERE/"author-checks01"/(mode+".log")).read_text(encoding="utf-8-sig");match=re.search(r"test result: ok\. (\d+) passed; 0 failed",log);assert match
    counts[mode]=int(match[1]);names.update(re.findall(r"^test ([^ ]+) \.\.\. ok",log,re.M))
d={"kind":"K98-complete-Link-RETURNING-baseline-delivery98","authority":{"file":"docs/design/rust-r4def/g2-K98-correction.json","rawBytesSha256":sha(auth.read_bytes()),"implementationAuthorized":True},"resolvedFinding":"K86-P1-01","scope":{"productFiles":[rel],"support":"tools/rust-r4def/F/K98/**","DatabaseChanged":False,"HTTPChanged":False,"DTOChanged":False,"DDLChanged":False,"dependenciesChanged":False},"product":{"file":rel,"sourceBefore":rec(before,HERE),"sourceAfter":rec(ROOT/rel,ROOT),"completeImportFile":rec(output,HERE)},"otherProductsUnchanged":unchanged,"actualChecks":{"receipt":rec(receipt_path,HERE),"sourceStableDuringChecks":True,"commandTestPassCountsWithOverlap":counts,"distinctPureTestNames":len(names),"newK98PureTests":counts["test"],"scope":"Real app lib, offline target-F/jobs2, no fake E producer"},"sealedEarlierPackages":seals,"oldK56K86CompleteProductOriginalsUnchanged":True,"F46SixSourcesUnchanged":f46["productFiles"],"RootOwnedCompilerScaffoldingNotDelivered":[rec(ROOT/"apps/poms-api-rust/src/lib.rs",ROOT),rec(ROOT/"apps/poms-api-rust/src/contract_support/mod.rs",ROOT)],"baseCommitFromAssignedWorktree":"756d813c9578090fcf8e56821acce01b46b40420","actualPGExecuted":False,"actualHTTPExecuted":False,"actualObjectIOExecuted":False,"actualConcurrencyExecuted":False,"S3Accepted":False,"G3Certified":False,"G4Certified":False,"RootSharedWritten":False,"credentialsRead":False,"environmentModified":False,"committed":False,"pushed":False,"notRun":["PG execution of full-row RETURNING","fresh true handover autoLink creation then necessary audit","K86 actual no-op barriers","actual faults/concurrency/object checks on final runtime"],"supportArtifactsExcludingManifest":[rec(p,HERE) for p in sorted(HERE.rglob("*")) if p.is_file() and p.name!="delivery98.json" and "__pycache__" not in p.parts],"next":"Root imports this single exact store file; service/registry/handover retain pinned bytes; actual final runtime acceptance then independent G3/G4"}
once(HERE/"delivery98.json",(json.dumps(d,ensure_ascii=False,indent=2)+"\n").encode())
print(json.dumps({"delivery":rec(HERE/"delivery98.json",HERE),"product":d["product"],"newPureTests":counts["test"],"distinctPureTests":len(names),"otherProductsUnchanged":unchanged,"notRuntime":True},ensure_ascii=False))
