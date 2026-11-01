# R2M M5 finite external audit set

This is a source candidate for a new epoch. It grants no actual acceptance,
database ownership, G3 or G4. Root owns all actual execution; C reviews the
source before a new capsule is captured. The approved04 originals remain in
`audit-external-before-source01.json`; no active Linux packet is changed here.

Only the protected B projector `acceptance-api-external-audit-source.mjs` at raw
SHA-256 `7ac9227986ee444b8b1815273fed70a9a00fd93f7c833936077e6b04d0f96cb1` can
supply a descriptor. Its eight original source pins are read and reprojected
before admission. The scope is exactly `m5.integration`, actual operation
`m.http`, and one globally unique request index. Root's existing audit approval
kind must explicitly include `external-provider-null` and `external-org-null`
and bind this run, backend, database, marker and source capsule. Its independent
SourceReady review must list this new helper and the exact protected projector.
If the same approval is used for platform/E requests, that review also needs the
unchanged old helper and both old projectors required by those existing paths.

```js
const set = fixture.admitExternalAuditSet(
    { descriptor, request, context, inputs },
    rootApproval,
);
for (const item of set.items) {
    await fixture.intentWithExternalAuditIdentity(
        "audit_log",
        item.auditSelector,
        {
            caseId: context.caseId,
            index: context.index,
            admissionId: set.id,
            eventType: item.eventType,
            expectedMax: 1,
        },
    );
}
```

`set` returns `id`, `caseId`, `index`, `sourceKind`,
`items[{eventType,auditSelector,expectedMax:1}]`, `expectedMaximumCreates`,
`ownershipRequestId` and `auditStorageRequestId:null`. A generated target needs
its one original typed parent intent before this call; a previously created
target needs its independently visible typed owned row. Descriptor selectors,
known IDs, response IDs and query results supply no creation authority.

The exact source set contains 12 requests and 13 events:

| Source            | Steps                                                                                                            | Bound                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| M5.1 provider     | provider-create, provider-configure, bind-external, grant-authorize, grant-callback, authorize, callback, ticket | One exact audit event each                                                                      |
| M5.2 external org | source, activate, apply                                                                                          | One exact audit event each                                                                      |
| M5.2 preview      | preview                                                                                                          | Two distinct intents: org-sync-run.preview-started and org-sync-run.previewed; each maximum one |

All these original business audits store a null request ID. The ordinary HTTP
ownership request ID and security-event request ID retain their prior rules.
Only M5.1 public `authorize` permits a null audit operator, and only for
`identity-provider.external-login.authorize-started` targeting the actual owned
`IdentityProviderConfig`. Its event selector, actual request index and typed
target are checked independently in the PG observer and fixture reference guard.
`scope.anonymous` never supplies this audit permission. Ticket events use the
actual owned viewer, and ticket consumption also checks the stored ticket hash
and viewer identity.

For two Native preview audits, the caller first retains the original SDK
certificate privately and registers its complete authority. It then calls:

```js
const intentId = await fixture.bindExternalAuditIntentFromCertifiedCreate(
    fixture.creationEnvelope({ ...actualSdkCreate, authorityId }),
    { caseId: context.caseId, index: context.index, admissionId: set.id },
);
```

The binder verifies the genuine SDK 7.0.11 afterCreate and outer COMMIT chain,
profile, before-absence and exact run/case/index/op before reading that
certified PK. Only then does the actual row's immutable event selector choose
one original intent. The method neither creates ownership nor accepts a
query/response ID. The existing recordCommittedCreates/adoptIntents path still
independently proves visibility, target parent provenance and full row
references. A generated parent must share the actual creation context; its
Native outer COMMIT must share that context too.

The 62 UUID-owned tables, immutable identities, complete 107-table facts and
reference scan, borrowed-row rules, singleton restore, writer drain and mature
double-zero cleanup remain unchanged. Pure in-memory proofs are deliberately
labelled synthetic and do not stand in for Root/C actual admission or measured
PG execution.
