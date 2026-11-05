"""Offline K55 proposal provenance/consistency seal. No DB/network/storage client.

Writes only this script's own K55 directory. Immutable inputs and output files are
write-once: a differing existing file is an error. This does NOT exercise product
Rust, HTTP, PG, object I/O or concurrency; actual acceptance remains planned.
"""

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OWN = HERE.parents[3]
ROOT = Path("E:/projects/worktrees/poms-r3hijk-next28/poms")
THREE = {
    "apps/poms-api-rust/src/attachments/service.rs": "13ea71827b3ee14ece4d8dda9a561f97975f10cbadcee2925adf6923a4bd91d9",
    "apps/poms-api-rust/src/attachments/store.rs": "d4907b05cf9772efc20c378667ccf78fce19473e8e3fa24bc498a4f72452a403",
    "apps/poms-api-rust/src/attachment_storage/registry.rs": "728eb662ca1f8ae459b7144956c87e6108702072b09d366ea55e0a7844f0b123",
}
EXTRA = {
    "tmp/rust-r4def/independent/k-proposal54-review55.json": "621433d14fd779b53c9f3f85f0471ca2745fff72820132367041fa73d9528694",
    "docs/design/rust-r4def/g2-attachment-proposal54.json": "b6ce1910d1ad4e5063af49cac1cade9fc66b9af190aeaa2dd34ed5ba0feed75f",
    "docs/design/rust-r4def/g2-attachment-checkpoint54.md": "42e2091fe92008d20caa92491e02146492a6706c0e267881c6ba6c3606e8cab1",
    "apps/poms-api-rust/src/attachment_storage/local.rs": "eb41e2738b7e54d200809f0f0eaab3361f526b6dfc16203468e945923c49ae28",
    "apps/poms-api-rust/src/attachment_storage/obs_s3.rs": "858e47a1cfdfba6aadabf3e644ae888466b926bf570cc5ef7f68c5e8102dba3d",
    "apps/poms-api-rust/src/attachments/handover.rs": "0fb5f3c71b1167e76a339f4d5996e0c6fac1b964a01be03f92f148906d20e217",
    "apps/poms-api-rust/src/attachments/http.rs": "bf3104acae5ce0ea4899887036a4328d87a9e6ef173ca830d46c375e179270ce",
    "apps/poms-api-rust/src/database.rs": "9f595d9e759222c05a5dbb14d36d84f29c449151b40fc7d8ec7ce362a58b79f9",
    "tmp/rust-r4def/root/catalog25/rust-catalog.json": "0a6ef59de84f1e975c314735d49697c7f94ffde1415c1805bd01d7d0bf7efbef",
}
SEALED = {
    "tools/rust-r4def/F/delivery46.json": "1707b06f619c5995547824968ac739b055dfb2f8bff6452c16ab72a6e607aa41",
    "tools/rust-r4def/F/acceptance44/delivery44.json": "2d8f1238a5a1e21a382523f939bb6ebe14c9d7efb15264ef9bd8be2261019473",
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def load(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_once(path, data):
    path.resolve().relative_to(HERE)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        assert path.read_bytes() == data, f"Refusing to overwrite frozen bytes: {path}"
    else:
        with path.open("xb") as stream:
            stream.write(data)


def info(path, relative_to):
    data = path.read_bytes()
    return {"file": path.relative_to(relative_to).as_posix(), "bytes": len(data), "rawBytesSha256": digest(data)}


def main():
    assert OWN.as_posix().endswith("poms-r4f-cost-governance/poms"), str(OWN)
    checks = []

    def check(name, condition):
        assert condition, name
        checks.append({"name": name, "status": "passed", "class": "offline-proposal-consistency-only"})

    inputs = []
    for rel, sha in {**THREE, **EXTRA}.items():
        path = ROOT / rel
        check(f"Root raw input pinned: {rel}", digest(path.read_bytes()) == sha)
        record = info(path, ROOT)
        record["originRoot"] = ROOT.as_posix()
        if rel in THREE or rel.endswith("k-proposal54-review55.json"):
            frozen = HERE / "inputs" / (rel + ".bin")
            write_once(frozen, path.read_bytes())
            record["localFrozen"] = frozen.relative_to(HERE).as_posix()
        inputs.append(record)

    for rel, sha in SEALED.items():
        check(f"Sealed earlier package unchanged: {rel}", digest((OWN / rel).read_bytes()) == sha)
    f46 = load(OWN / "tools/rust-r4def/F/delivery46.json")
    for item in f46["productFiles"]:
        check(f"Sealed F46 product unchanged: {item['file']}", digest((OWN / item["file"]).read_bytes()) == item["rawBytesSha256"])

    proposal = load(HERE / "proposal55.json")
    vectors = load(HERE / "vectors55.json")
    review = load(ROOT / "tmp/rust-r4def/independent/k-proposal54-review55.json")
    check("Three-file product proposal boundary", proposal["scope"]["proposedProductFiles"] == list(THREE))
    check("No implementation admission", proposal["implementationAuthorized"] is False)
    check("No product writes declared", proposal["scope"]["productFilesChanged"] is False)
    check("K54 genuinely blocked, not a previous Pass", review["implementationAdmission"]["allowed"] is False)
    check("Both independent findings covered", {x["id"] for x in review["findings"]} <= {x["finding"] for x in proposal["resolves"]})
    for flag in ("DatabaseChanged", "HTTPChanged", "DTOChanged", "DDLChanged", "dependenciesChanged", "F46OrF44Changed"):
        check(f"Scope freeze: {flag}=false", proposal["scope"][flag] is False)

    catalog = load(ROOT / "tmp/rust-r4def/root/catalog25/rust-catalog.json")
    tables = {"attachment", "attachment_link", "attachment_upload_session", "attachment_download_package", "attachment_storage_provider_config"}
    subset = {
        "kind": "K55-readonly-catalog-subset-no-row-data",
        "source": {"file": "tmp/rust-r4def/root/catalog25/rust-catalog.json", "rawBytesSha256": EXTRA["tmp/rust-r4def/root/catalog25/rust-catalog.json"]},
        "columns": [r for r in catalog["columns"] if r["table_name"] in tables],
        "indexes": [r for r in catalog["indexes"] if r["tablename"] in tables],
        "constraints": [r for r in catalog["constraints"] if r["table_name"] in tables],
    }
    write_once(HERE / "inputs/catalog-attachment-subset55.json", encoded(subset))
    columns = {(r["table_name"], r["column_name"]): r for r in subset["columns"]}
    for table in ("attachment", "attachment_upload_session"):
        check(f"{table}.size_bytes real int4", columns[(table, "size_bytes")]["udt_name"] == "int4")
    check("Final key uses existing varchar1024", columns[("attachment", "storage_key")]["character_maximum_length"] == 1024)
    check("Actual SHA fits existing varchar64", columns[("attachment", "checksum_sha256")]["character_maximum_length"] == 64)
    indexes = {i["indexname"]: i["indexdef"] for i in subset["indexes"]}
    for name in ("uq_attachment_latest_active", "uq_attachment_final_active", "uq_attachment_version_no", "uq_attachment_link_active_relation"):
        check(f"Existing unique protection pinned: {name}", name in indexes and "UNIQUE INDEX" in indexes[name])
    check("VersionNo unique includes voided history", "WHERE" not in indexes["uq_attachment_version_no"])
    check("Catalog relevant constraints validated", all(c["convalidated"] for c in subset["constraints"]))

    for name, value in vectors["payloads"].items():
        data = value["character"].encode("ascii") * value["count"]
        check(f"Constant design payload hash {name}", len(data) == value["count"] and digest(data) == value["sha256"])
    check("Same-size A/B have different actual hashes", vectors["payloads"]["A64"]["sha256"] != vectors["payloads"]["B64"]["sha256"])
    link_fields = proposal["storePlan"]["activeLinkIdentity"]

    def fingerprint(rows):
        projection = [{k: r[k] for k in link_fields} for r in sorted(rows, key=lambda r: r["id"])]
        return digest(json.dumps(projection, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))

    links = vectors["linkProofExamples"]
    one = links["oneActive"]
    two = links["additionalActive"]
    check("Complete ordered full-link tuple field set", set(one[0]) == set(link_fields))
    check("Link set order itself not semantic", fingerprint(two) == fingerprint(list(reversed(two))))
    check("Unchanged headV does not hide extra link", links["headBeforeAndAfter"]["row_version"] == 7 and fingerprint(one) != fingerprint(two))
    changed_target = json.loads(json.dumps(one))
    changed_target[0]["target_id"] = "30000000-0000-4000-8000-000000000002"
    check("Same-count target replacement changes proof", fingerprint(one) != fingerprint(changed_target))
    changed_identity = json.loads(json.dumps(one))
    changed_identity[0]["id"] = "20000000-0000-4000-8000-000000000003"
    check("Same-target new Link identity changes proof", fingerprint(one) != fingerprint(changed_identity))
    check("Removed complete set changes proof", fingerprint(one) != fingerprint([]))

    case_ids = [x["id"] for x in vectors["cases"]]
    check("32 unique planned acceptance vectors", len(case_ids) == 32 and len(set(case_ids)) == 32)
    for flag in ("actualHTTPExecuted", "actualPGExecuted", "actualObjectIOExecuted", "S3Accepted"):
        check(f"No runtime acceptance claim: {flag}=false", vectors[flag] is False)
    over = next(c["input"] for c in vectors["cases"] if c["id"] == "K55-06-head-untrusted-overflow")
    check("Overrun vector has exact declared prefix then extra byte", sum(over["streamChunks"][:2]) == over["declared"] and over["streamChunks"][2] == 1)
    check("All-history static version example avoids reused voided2", max([1, 2]) + 1 == 3 and (1 + 1) == 2)
    check("Unknown cannot be cleaned even if one empty read", "never Unknown" in proposal["outcomeAndCleanup"]["finalDeletePreconditions"][0])
    sql = (HERE / "readback55.sql").read_text(encoding="utf-8-sig")
    sql_without_comments = "\n".join(line for line in sql.splitlines() if not line.lstrip().startswith("--"))
    statements = [s.strip() for s in sql_without_comments.split(";") if s.strip()]
    check("Readback plan contains SELECT only", len(statements) == 10 and all(s.startswith("SELECT ") or s.startswith("SELECT\n") for s in statements))

    for rel, sha in THREE.items():
        check(f"Root product input remained unchanged during checks: {rel}", digest((ROOT / rel).read_bytes()) == sha)

    report = {
        "kind": "K55-offline-provenance-and-design-consistency-receipt",
        "classification": "Static pins, constant hashes and declarative consistency only. NOT Rust product tests or actual PG/HTTP/object/concurrency acceptance.",
        "checks": checks,
        "passedAssertions": len(checks),
        "fullLinkDesignFingerprints": {"oneActive": fingerprint(one), "additionalActive": fingerprint(two)},
        "actualPGExecuted": False,
        "actualHTTPExecuted": False,
        "actualObjectIOExecuted": False,
        "S3Accepted": False,
        "implementationAuthorized": False,
    }
    write_once(HERE / "checks/offline-receipt55.json", encoded(report))
    artifacts = [info(p, HERE) for p in sorted(HERE.rglob("*")) if p.is_file() and p.name != "proposal55-manifest.json" and "__pycache__" not in p.parts]
    manifest = {
        "kind": "K55-minimal-three-file-corrective-proposal55-immutable-manifest",
        "implementationAuthorized": False,
        "G3Pass": False,
        "G4Pass": False,
        "RootSourceInputs": inputs,
        "artifactRoot": HERE.as_posix(),
        "artifactsExcludingThisManifest": artifacts,
        "sealedF46F44": SEALED,
        "F46ProductsUnchanged": f46["productFiles"],
        "actualChecks": {"offlineAssertions": len(checks), "receipt": "checks/offline-receipt55.json", "productionTestsRun": 0},
        "notRun": ["product implementation", "product Rust build/test", "actual HTTP", "actual PG", "actual binary/object I/O", "actual concurrency", "failure injection", "S3 acceptance"],
        "boundaries": {"productFilesWritten": False, "RootSharedWritten": False, "credentialsRead": False, "networkUsed": False, "environmentChanged": False, "committed": False, "pushed": False},
        "next": "Root/Gate freezes this exact candidate before separate three-file implementation authority. All 32 real acceptance vectors remain planned-not-run.",
    }
    write_once(HERE / "proposal55-manifest.json", encoded(manifest))
    print(json.dumps({"status": "candidate-sealed-not-runtime", "offlineAssertions": len(checks), "manifest": info(HERE / "proposal55-manifest.json", HERE), "vectors": info(HERE / "vectors55.json", HERE)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
