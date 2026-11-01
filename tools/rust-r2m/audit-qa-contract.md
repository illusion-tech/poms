# Original-runner QA admission and calls

Source-only until Root's current source capsule, necessary C isolation review
and exact execution admission. No old private/environment is read. The three
resources are whole QA databases, never a claim of 107 owned M fixture rows.

| Resource | Database / dedicated low role | Template | Marker |
|---|---|---|---|
| Nest foundation then API14 | `poms_r2m_qa_nest_api` / `poms_r2m_qa_nest_api_app` | cleaned `poms_r2m_nest` | `23949557-c6d4-4b20-9524-71196b7cf3ce` |
| Rust foundation13 | `poms_r2m_qa_rust_foundation` / `poms_r2m_qa_rust_foundation_app` | cleaned `poms_r2m_rust` | `b468f0fb-f38b-48b0-9d28-b36ebffbf2ca` |
| Native original legacy8 | `poms_r2m_qa_nest_legacy` / `poms_r2m_qa_nest_legacy_app` | cleaned `poms_r2m_nest` | `d63b5df0-b7f0-4ebc-a422-9699bc872755` |

All connect to the same new-M PG15 on loopback20432/server15432 with existing
owner `poms_r0e_owner`. New `r2m_qa_control.marker` is owner-only. Each app role
is NOINHERIT/NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOBYPASSRLS/NOREPLICATION,
has no role memberships or M table privileges, and receives explicit grants
only in its own QA database. Existing PUBLIC CONNECT on M is left unchanged;
it does not grant product table access. Each original M data/ACL snapshot must
remain equal to the exact initial new-M seed and is checked after provisioning
and each original-runner phase. No existing session is terminated to clone.

Root creates a public approval JSON with kind
`Root-R2M-QA-clone-execution-admission`, `rootAuthorized:true`, the precise
plan SHA, parent marker, `writersStopped:true`, `sourceMDoubleZeroCompleted:true`,
`sourceMInitialSeedEqualityRequired:true`, and two `sourceSeedReferences`.
Each reference has `{template,file,rawBytesSha256,expectedRowsSha256}` pointing
to the original **new-M** private `global-before-prepare-full107` or
`UI-global-full107-before-preparation` record. Its complete107 rows digest is
compared to the actual current cleaned template before cloning; a Root label
alone does not prove equality. `nonAuthorSourceReview:{file,rawBytesSha256}`
must identify the public C SourceReady report that pins the actual plan/common/
provision sources. This is the necessary isolation check delegated by Root.

The current QA capsule must explicitly include both small original test trees,
`apps/poms-api-e2e` and `apps/poms-admin-e2e`, plus these tools and original
API/admin artifacts. SourceReader refuses omitted/changed inputs. The original
72 API tests and36 legacy tests are existing definitions, not a Rust291 gate.

```sh
node tools/rust-r2m/audit-qa-provision.mjs --check
node tools/rust-r2m/audit-qa-provision.mjs --provision \
  --approval docs/design/rust-r2m/qa-execution-admission01.json \
  --cap tmp/rust-r2m/source-cap-qa01.json

node tools/rust-r2m/audit-qa-run.mjs --run --phase foundation-nest --tag qfn01 \
  --cap tmp/rust-r2m/source-cap-qa01.json
node tools/rust-r2m/audit-qa-run.mjs --run --phase nest-full --tag qapi01 \
  --cap tmp/rust-r2m/source-cap-qa01.json
node tools/rust-r2m/audit-qa-run.mjs --run --phase foundation-rust --tag qfr01 \
  --cap tmp/rust-r2m/source-cap-qa01.json
node tools/rust-r2m/audit-qa-run.mjs --run --phase legacy --tag qleg01 \
  --cap tmp/rust-r2m/source-cap-qa01.json \
  --browser-pin tmp/rust-r2m/ui-browser-pin-deps03.json
```

The API phases call installed Nx `poms-api-e2e:e2e` with the original Jest
configuration, runInBand, JSON report and explicit `POMS_E2E_SUITE`.
`nest-full` selects exactly the14 non-foundation files; foundation selects
the original13 tests. The original global harness uses `external` against
Root's exact QA API owner on10070/10071 and does not load any old profile.
Foundation uses the original public synthetic admin credential on the QA
copy only. No `POMS_E2E_FIXTURE_RUN_ID` or old profile is forged.

Legacy calls the original installed Playwright CLI and all8 original spec
files. The new derived QA config preserves the original config, assertions,
testMatch and owned server setup. It changes only absolute path resolution,
new-private artifacts and the byte-pinned browser/child library environment.
It serves the original production app entry, without the R2M test bridge.
The11 historical route-mocked cases remain separately labelled Native UI
regression, not Rust API/PG acceptance.

Raw Jest/Playwright JSON, stdout/stderr, screenshots/traces, temporary owned
service logs and complete107 after-facts stay under new-M `private/qa`.
Public output gives counts, labels and hashes. Each phase independently stops
its precise API owner and verifies10070/10071/10080 released. QA databases,
roles, private environments and phase data remain in the new-M volume with
their actual pass/fail/partial labels. No reseed/drop/reset runs automatically;
the M databases retain their separate strict per-row double-zero obligation.
