// Request definitions only. The author has not executed these vectors.
// No imports, I/O, environment access, clocks, random IDs, schema changes, or
// runner callbacks. Root owns real fixtures, execution, observations and cleanup.
//
// Required real inputs follow acceptance-context01.mjs:
// customerId, leadId, projectId, adminUserId, otherUserId, adminOrgId, sourceCode,
// plus a Root-provided absent valid UUID in missingUUID.
// Optional live fixture values: leadRowVersion, pendingOverrideId,
// pendingOverrideRowVersion, approvedOverrideId, approvedOverrideRowVersion.
// Version defaults 1/1/2 describe freshly produced Lead/pending/first-approved
// fixtures, not a claim about the row currently named by an input ID.
//
// query is an object of strings or string arrays. Serialize an array as repeated
// keys in its original order; do not turn it into a comma-separated value.
// Bracketed keys are literal names in Express's simple query parser.
// expectedOriginalSchemaStatus=400 is a source-derived DTO expectation only.
// Accepted schema never predicts the eventual business/PG HTTP status.
// Rebuild with isolated real IDs/current versions for stateful vectors; do not
// use a missing override's 404 as evidence of an approve/revoke write boundary.

export function buildLeadBoundaryCases(ids) {
    for (const key of ['customerId', 'leadId', 'projectId', 'adminUserId', 'otherUserId', 'adminOrgId', 'sourceCode', 'missingUUID']) {
        if (typeof ids?.[key] !== 'string' || ids[key].length === 0) {
            throw new TypeError(`buildLeadBoundaryCases requires Root-provided ${key}`);
        }
    }

    const cases = [];
    const leadPath = `/api/leads/${ids.leadId}`;
    const missingLeadPath = `/api/leads/${ids.missingUUID}`;
    const pendingPath = `/api/lead-score-overrides/${ids.pendingOverrideId ?? ids.missingUUID}`;
    const approvedPath = `/api/lead-score-overrides/${ids.approvedOverrideId ?? ids.missingUUID}`;
    const leadVersion = ids.leadRowVersion ?? 1;
    const pendingVersion = ids.pendingOverrideRowVersion ?? 1;
    const approvedVersion = ids.approvedOverrideRowVersion ?? 2;
    const freshRegistered = 'Fresh real registered Lead; use this case\'s ids.leadId and live leadRowVersion, with no competing request.';
    const pendingFixture = 'Fresh real pending override; supply pendingOverrideId and its live pendingOverrideRowVersion.';
    const qualifiedFixture = 'Fresh real qualified Lead with complete conversion gates; isolate because a successful conversion consumes it.';
    const mixedWorkbench = 'Real mixed registered/qualified-ready/qualified-blocked/converted/closed Leads, including owned and public-pool rows; capture matching IDs and every facet count.';

    const add = (operationId, name, method, path, request, details = {}) => {
        cases.push({
            operationId,
            name: `H93.boundary.${String(cases.length + 1).padStart(2, '0')}.${name}`,
            method,
            path,
            ...request,
            ...details,
            definitionOnly: true,
        });
    };
    const rejected = (covers, risk) => ({ covers, risk, expectedOriginalSchemaStatus: 400 });
    const accepted = (covers, risk, requires = []) => ({ covers, risk, schemaExpectation: 'accepted-by-original-schema', requires });
    const create = (name, patch, details, omit = []) => {
        const json = {
            leadName: `H93 boundary ${name}`,
            customerId: ids.customerId,
            sourceCode: ids.sourceCode,
            demandDescription: '客户已确认设备建设目标、采购范围、预算来源以及后续沟通安排。',
            budgetStatus: 'budget-confirmed',
            estimatedAmount: '1200000.00',
            urgency: 'high',
            expectedDecisionDate: '2026-11-20',
            ownerUserId: ids.adminUserId,
            ownerOrgId: ids.adminOrgId,
            ...patch,
        };
        for (const key of omit) delete json[key];
        add('LeadController_create', `create.${name}`, 'POST', '/api/leads', { json }, details);
    };
    const patch = (name, json, details, path = leadPath) => add('LeadController_update', `update.${name}`, 'PATCH', path, { json }, details);
    const command = (operationId, suffix, name, json, details, path = leadPath) => add(operationId, name, 'POST', path + suffix, { json }, details);
    const list = (name, query, details) => add('LeadController_list', `list.${name}`, 'GET', '/api/leads', { query }, details);

    // Create: DTO issue accumulation, default/nullable ownership, numeric text,
    // Gregorian small years, and the separate code-point/UTF-16/PG boundaries.
    add('LeadController_create', 'create.null-object', 'POST', '/api/leads', { json: null },
        rejected(['H03'], 'The body must be an object; null does not become an empty request.'));
    create('ordered-multiple-issues', {
        leadName: '😀'.repeat(256), customerId: null, sourceCode: 'Upper Case',
        demandDescription: [], budgetStatus: 'future-budget', estimatedAmount: 99,
        urgency: null, expectedDecisionDate: '2026-02-30', ownerOrgId: 'not-a-uuid', ownerUserId: {},
    }, rejected(['H03', 'H38'], 'Compare complete original issue content/order: Unicode max, UUID/string types, enum, numeric money, date, and owner fields.'));
    create('owner-defaults-and-server-fields-strip', {
        status: 'converted', score: 100, rating: 'A', leadNo: 'CLIENT-NUMBER',
        createdBy: ids.otherUserId, convertedProjectId: ids.projectId,
    }, accepted(['H03', 'H05'], 'Missing owners default from the operator; unknown server-owned fields are stripped, including a real project pointer.'),
        ['ownerUserId', 'ownerOrgId']);
    create('null-owner-ignores-missing-org', { ownerUserId: null, ownerOrgId: ids.missingUUID },
        accepted(['H05', 'H08'], 'Explicit null owner clears both owners and does not look up the supplied missing organization.'));
    create('explicit-other-owner-null-org', { ownerUserId: ids.otherUserId, ownerOrgId: null },
        accepted(['H05', 'H08'], 'Explicit existing user plus null organization remains legal on create; no assignment active/org-required rule is imported.'));
    create('owner-before-customer-source-priority', {
        ownerUserId: ids.missingUUID, customerId: ids.missingUUID, sourceCode: 'boundary-absent-source',
    }, accepted(['H06'], 'DTO accepts all values; missing owner lookup precedes missing customer and source lookup.'));
    create('money-json-number', { estimatedAmount: 1.25 },
        rejected(['H03', 'H07'], 'Lead money remains a string contract; no body-number coercion.'));
    create('money-leading-zero-one-decimal', { estimatedAmount: ' 0001.2 ' },
        accepted(['H07'], 'Compare immediate trimmed text 0001.2 with later numeric::text scale; do not apply cost-domain toFixed.'));
    create('money-above-js-safe-integer-exact-text', { estimatedAmount: '9007199254740993.00' },
        accepted(['H07'], 'A legal numeric(18,2) string must survive exactly despite JS Number rounding used only for the positivity score test.'));
    create('money-legal-syntax-db-overflow', { estimatedAmount: '10000000000000000.00' },
        accepted(['H07', 'H20'], 'The schema has no precision maximum: observe the real PG error, independent number allocation and complete rolled-back graph.'));
    create('money-exponent-string', { estimatedAmount: '1e2' },
        rejected(['H03', 'H07'], 'Number-compatible exponent syntax still fails the original decimal-text regex.'));
    for (const [name, value] of [
        ['date-year0000-leap', '0000-02-29'], ['date-year0001', '0001-01-01'],
        ['date-year0099', '0099-12-31'], ['date-year9999', '9999-12-31'],
    ]) {
        create(name, { expectedDecisionDate: value }, accepted(['H39'],
            'Source schema accepts this Gregorian date; record immediate value, PG date::text/rejection, GET projection and real rollback surface without assuming its outcome.'));
    }
    create('date-nonleap-century', { expectedDecisionDate: '1900-02-29' },
        rejected(['H03', 'H39'], 'Gregorian century leap rule must reject before customer/number/persistence work.'));
    create('demand-29-utf16-units', { demandDescription: '😀'.repeat(14) + 'x' },
        accepted(['H08', 'H38'], 'Fifteen code points but 29 UTF-16 units: base demand component uses the lower nonempty tier.'));
    create('demand-30-utf16-units', { demandDescription: '😀'.repeat(15) },
        accepted(['H08', 'H38'], 'Fifteen code points and 30 UTF-16 units: compare the recurring five-point raw demand threshold against the preceding vector.'));
    create('lead-name-255-astral-codepoints', { leadName: '😀'.repeat(255) },
        accepted(['H03', 'H38'], 'The 255-code-point name is schema-valid despite having 510 UTF-16 units; compare actual text storage and return.'));
    create('demand-lone-high-surrogate', { demandDescription: '需求\ud800' },
        accepted(['H38'], 'Preserve the lone unit in immediate wire output, distinguish PG replacement and later GET; no raw demand audit is added on create.'));
    create('lead-name-nul-reaches-pg', { leadName: '前\u0000后' },
        accepted(['H03', 'H38'], 'NUL passes string schema; observe the original PG failure and number/session/lead/snapshot final state.'));

    // Update: refinement and nullable presence are separate from business
    // no-op/dirty checking and the raw versus redacted audit paths.
    patch('version-and-unknown-only', { expectedVersion: leadVersion, ownerUserId: ids.otherUserId, status: 'closed' },
        rejected(['H03', 'H10'], 'Stripping unknown owner/status leaves no updatable field; expectedVersion alone cannot satisfy refine.'));
    patch('ordered-null-type-regex-issues', {
        leadName: null, customerId: null, sourceCode: null, demandDescription: null,
        budgetStatus: null, estimatedAmount: '1.234', urgency: [], expectedDecisionDate: {}, expectedVersion: '1',
    }, rejected(['H03', 'H07', 'H40'], 'Compare nullable versus forbidden-null fields, three-decimal regex rejection, string version and full issue order.'));
    patch('nullable-clears-and-unknown-owner-strip', {
        estimatedAmount: null, expectedDecisionDate: null, ownerUserId: ids.otherUserId,
        ownerOrgId: ids.missingUUID, score: 100, status: 'converted',
    }, accepted(['H03', 'H10', 'H11'], 'Null money/date are actual updates; unknown owner/score/status are stripped and cannot trigger missing-org lookup.', [freshRegistered]));
    patch('version-above-js-safe-integer', { leadName: 'H93 safeint rejected', expectedVersion: 9007199254740992 },
        rejected(['H03', 'H40'], 'Integer JSON syntax above the JS safe bound is rejected by the original DTO, independently of i32 storage.'));
    patch('customer-before-missing-lead-and-source', { customerId: ids.missingUUID, sourceCode: 'boundary-absent-source' },
        accepted(['H06'], 'Supplied missing customer fails before source lookup and missing lead lookup; compare exact dynamic message.', []), missingLeadPath);
    patch('lead-name-lone-unit-raw-audit', { leadName: '标题\ud800' },
        accepted(['H11', 'H38'], 'The non-redacted audit JSONB path must keep the original lone unit and its real failure/rollback position.', [freshRegistered]));
    patch('demand-lone-unit-redacted-audit', { demandDescription: '补充需求\udc00' },
        accepted(['H11', 'H38'], 'The demand audit contains changed:true and UTF-16 length only; compare immediate lone unit, PG replacement and successful/failing graph.', [freshRegistered]));
    patch('uppercase-customer-uuid-spelling', { customerId: ids.customerId.toUpperCase(), leadName: 'H93 uppercase customer request' },
        accepted(['H03', 'H10', 'H11'], 'Body UUID spelling is accepted; customer lookup returns its stored canonical ID before field comparison/audit.', [freshRegistered]));

    command('LeadController_claimOwner', ':claim', 'claim.empty-and-extra-fields', { status: 'closed', ownerUserId: ids.otherUserId, score: 100 },
        accepted(['H03', 'H12'], 'Claim has no required body field; unknown status/owner/score strip.', ['Real registered public-pool Lead with no owner.']));
    command('LeadController_claimOwner', ':claim', 'claim.fractional-version', { expectedVersion: 1.5 },
        rejected(['H03', 'H40'], 'Optional expectedVersion remains a positive safe integer and does not coerce/truncate a fraction.'));

    command('LeadController_assignOwner', ':assignOwner', 'assign.ordered-required-null-types', {
        ownerUserId: null, ownerOrgId: 'not-a-uuid', reason: null, expectedVersion: null,
    }, rejected(['H03', 'H12'], 'Assign requires a UUID user and text reason; org alone is nullable and expectedVersion null is forbidden.'));
    command('LeadController_assignOwner', ':assignOwner', 'assign.uppercase-org-strict-comparison', {
        ownerUserId: ids.adminUserId, ownerOrgId: ids.adminOrgId.toUpperCase(), reason: '仅改变组织UUID输入拼写。',
    }, accepted(['H12', 'H38'], 'Do not canonicalize the organization before the source JS strict same-owner comparison; compare immediate response and stored canonical UUID.',
        ['Registered/qualified Lead currently owned by adminUserId and canonical lowercase adminOrgId; no concurrent request.']));
    command('LeadController_assignOwner', ':assignOwner', 'assign.missing-user-before-org', {
        ownerUserId: ids.missingUUID, ownerOrgId: ids.missingUUID, reason: '验证引用错误优先序。',
    }, accepted(['H12'], 'After lead/version/status checks, missing target user precedes missing org.', [freshRegistered]));
    command('LeadController_assignOwner', ':assignOwner', 'assign.stale-before-status-and-user', {
        ownerUserId: ids.missingUUID, ownerOrgId: ids.missingUUID, reason: '验证版本错误优先序。', expectedVersion: 9007199254740991,
    }, accepted(['H12', 'H40'], 'Legal safe-integer stale version wins before closed-state rejection and missing target lookups.', ['Real closed Lead; its int32 row_version is necessarily below this legal expectedVersion.']));

    command('LeadController_qualify', ':qualify', 'qualify.missing-summary-extra-version', { expectedVersion: 'ignored-even-with-wrong-type', status: 'qualified' },
        rejected(['H03', 'H14'], 'Unknown expectedVersion/status strip; qualificationSummary is still required.'));
    command('LeadController_qualify', ':qualify', 'qualify.2000-astral-and-extra-version', {
        qualificationSummary: '😀'.repeat(2000), expectedVersion: 'ignored-even-with-wrong-type',
    }, accepted(['H03', 'H14', 'H38'], '2000 Unicode code points pass despite 4000 UTF-16 units; qualify has no expectedVersion input.',
        ['Fresh registered Lead satisfying all qualification gates; capture main state plus later system snapshot.']));
    command('LeadController_qualify', ':qualify', 'qualify.ordered-missing-hard-facts', { qualificationSummary: '验证硬闸口缺项顺序。' },
        accepted(['H08', 'H14'], 'Compare exact ordered missing facts and message; high score/manual overlay must not bypass these base-field gates.',
            ['Registered Lead with nonempty source/demand, budgetStatus unknown, estimatedAmount 0, ownerUserId null and ownerOrgId null; any prepared score is explicitly labelled if used.']));

    command('LeadController_close', ':close', 'close.numeric-reason-extra-version', { closedReason: 0, expectedVersion: 'ignored' },
        rejected(['H03'], 'The required close reason is text; an unrelated expectedVersion never becomes a validated close parameter.'));
    command('LeadController_close', ':close', 'close.feff-trims-to-empty', { closedReason: '\ufeff' },
        rejected(['H03', 'H38'], 'ECMAScript trimming removes FEFF before the nonempty check.'));

    command('LeadController_convertToProject', ':convertToProject', 'convert.empty-after-unknown-strip', {
        expectedVersion: 'ignored', sourceLeadId: ids.missingUUID, customerId: ids.missingUUID, status: 'closed',
    }, accepted(['H03', 'H16', 'H17'], 'All convert fields are optional; unknown ownership/customer/source/status/version fields do not alter the original conversion inputs.', [qualifiedFixture]));
    command('LeadController_convertToProject', ':convertToProject', 'convert.ordered-null-empty-date-only', {
        projectName: null, customerProjectNo: ' ', plannedSignAt: '2026-11-20',
    }, rejected(['H03', 'H39'], 'projectName is optional but non-null; nullable project number must be nonempty when text; date-only is not datetime.'));
    command('LeadController_convertToProject', ':convertToProject', 'convert.year0099-fraction9', {
        projectName: 'H93 year0099 fraction9', customerProjectNo: null, plannedSignAt: '0099-12-31T23:59:59.123456789Z',
    }, accepted(['H39'], 'Observe small-year Date→PG behavior and truncation of nine fractional digits to milliseconds; nullable project number remains null.', [qualifiedFixture]));
    command('LeadController_convertToProject', ':convertToProject', 'convert.year0001-fraction1', {
        projectName: 'H93 year0001 fraction1', plannedSignAt: '0001-01-01T00:00:00.1Z',
    }, accepted(['H39'], 'Observe small-year Date→PG behavior and .1→.100 millisecond projection; omitted project number is separate from explicit null.', [qualifiedFixture]));
    command('LeadController_convertToProject', ':convertToProject', 'convert.offset-not-original-z-datetime', { plannedSignAt: '2026-11-20T00:00:00+09:00' },
        rejected(['H03', 'H39'], 'Original z.iso.datetime() uses its default uppercase Z-only acceptance; do not expand to arbitrary RFC3339 offsets.'));

    command('LeadController_submitScoreOverride', '/score-overrides', 'submit.ordered-required-types', { score: '80', reason: null },
        rejected(['H03', 'H26'], 'No score coercion; reason and required expectedLeadRowVersion issues retain original field order.'));
    command('LeadController_submitScoreOverride', '/score-overrides', 'submit.score-reason-version-lower-bounds', { score: -1, reason: '', expectedLeadRowVersion: 0 },
        rejected(['H03', 'H26', 'H40'], 'Score range, trimmed nonempty reason and strictly positive expected lead version are independent accumulated issues.'));
    for (const score of [40, 80]) {
        command('LeadController_submitScoreOverride', '/score-overrides', `submit.rating-threshold-${score}`, {
            score, reason: `验证请求评级阈值${score}。`, expectedLeadRowVersion: leadVersion,
        }, accepted(['H26'], 'Observe requestedRating at an exact threshold, system-at-request snapshot and later submitted audit; no lead status or equal-score prohibition is added.',
            [freshRegistered, 'No pending override; provide the fixture\'s actual leadRowVersion.']));
    }
    command('LeadScoreOverrideController_approve', ':approve', 'approve.missing-version-numeric-note', { note: 123 },
        rejected(['H03', 'H27'], 'Required override version and optional-but-text note errors are distinct.'), pendingPath);
    command('LeadScoreOverrideController_approve', ':approve', 'approve.zero-version-empty-note', { expectedOverrideRowVersion: 0, note: '\ufeff' },
        rejected(['H03', 'H27', 'H40'], 'Version positivity and FEFF-trimmed note min length both remain observable.'), pendingPath);
    command('LeadScoreOverrideController_approve', ':approve', 'approve.lone-note-post-commit-audit', {
        expectedOverrideRowVersion: pendingVersion, note: '依据\ud800',
    }, {
        ...accepted(['H27', 'H31', 'H38'], 'The note text can commit with PG replacement before the subsequent original audit JSONB sees the lone unit; observe every stage, without assuming final HTTP status.', [pendingFixture]),
        requiresFixtureKeys: ['pendingOverrideId', 'pendingOverrideRowVersion'],
    }, pendingPath);
    command('LeadScoreOverrideController_approve', ':approve', 'approve.null-note-and-unknown-strip', {
        expectedOverrideRowVersion: 1, note: null, status: 'approved', requestedScore: 100,
    }, accepted(['H03', 'H27'], 'Nullable note is schema-valid; a missing override path intentionally stops at business 404 after DTO acceptance.'),
        `/api/lead-score-overrides/${ids.missingUUID}`);
    command('LeadScoreOverrideController_reject', ':reject', 'reject.missing-reason-string-version', { expectedOverrideRowVersion: '1' },
        rejected(['H03', 'H29'], 'Reject requires a reason and numeric positive version; it does not share approve\'s optional note semantics.'), pendingPath);
    command('LeadScoreOverrideController_reject', ':reject', 'reject.trimmed-reason-with-approved-sibling', {
        reason: '\ufeff旧依据不再充分。\ufeff', expectedOverrideRowVersion: pendingVersion,
    }, {
        ...accepted(['H29'], 'Reject adds no score snapshot and preserves the approved sibling\'s effective overlay; record the trimmed reason and post-commit audit.',
            [pendingFixture, 'The same Lead also has a real approved sibling, produced before this pending request.']),
        requiresFixtureKeys: ['pendingOverrideId', 'pendingOverrideRowVersion'],
    }, pendingPath);
    command('LeadScoreOverrideController_revoke', ':revoke', 'revoke.null-required-fields', { reason: null, expectedOverrideRowVersion: null },
        rejected(['H03', 'H30'], 'Neither revoke reason nor required override version accepts null.'), approvedPath);
    command('LeadScoreOverrideController_revoke', ':revoke', 'revoke.lone-reason-stored-system', {
        reason: '恢复系统\udc00', expectedOverrideRowVersion: approvedVersion,
    }, {
        ...accepted(['H30', 'H31', 'H38'], 'Observe restored stored system score, overrideId null/sourceRecordId revoked ID, and the later raw-reason audit stage; new I facts must not silently refresh the stored score.',
            ['Real approved override and actual approvedOverrideRowVersion; add real I facts without an H refresh before revocation.']),
        requiresFixtureKeys: ['approvedOverrideId', 'approvedOverrideRowVersion'],
    }, approvedPath);

    add('LeadController_getById', 'get.uppercase-path-uuid', 'GET', `/api/leads/${ids.leadId.toUpperCase()}`, { query: { status: 'closed' } },
        { covers: ['H02', 'H23'], risk: 'Raw path spelling is accepted by the original parameter/PG path; unrelated query keys cannot filter out an existing Lead.' });
    add('LeadController_getById', 'get.malformed-path-uuid', 'GET', '/api/leads/not-a-uuid', { query: {} },
        { covers: ['H02'], risk: 'No UUID pipe exists on this parameter: observe the original PG/internal error instead of inventing a DTO 400.' });
    add('LeadController_getScoreHistory', 'history.missing-id-extra-query', 'GET', `${missingLeadPath}/score-history`, { query: { page: 'not-a-number', score: '100' } },
        { covers: ['H02', 'H25'], risk: 'History has no list-query DTO; ignored extra query values must not beat the real missing-lead 404 or cause score recomputation.' });

    list('defaults', {}, accepted(['H04', 'H21'], 'Read default active scope/page1/pageSize500 and all ordered zero/nonzero facets.', [mixedWorkbench]));
    for (const scope of ['registered', 'qualified', 'ready-to-convert', 'blocked-conversion', 'converted', 'closed', 'all']) {
        list(`scope-${scope}`, { scope, page: '1', pageSize: '2' }, accepted(['H21'],
            'Compare exact scoped IDs, totalItems and scope-independent repository summary/facets before pagination.', [mixedWorkbench]));
    }
    list('mine-overrides-explicit-other-user', { scope: 'all', ownershipScope: 'mine', ownerUserId: ids.otherUserId, ownerOrgId: ids.adminOrgId },
        accepted(['H22'], 'Mine replaces the explicit user with the authenticated actor while retaining the explicit org filter.', [mixedWorkbench]));
    list('public-pool-clears-user-retains-org', { scope: 'all', ownershipScope: 'public-pool', ownerUserId: ids.adminUserId, ownerOrgId: ids.adminOrgId },
        accepted(['H22'], 'Public pool discards the user filter and uses owner IS NULL while retaining org; do not force a new owner-only visibility rule.', [mixedWorkbench]));
    list('format-valid-unregistered-source', { scope: 'all', sourceCode: 'boundary-source-not-registered' },
        accepted(['H04', 'H22'], 'List validates code syntax only; absence/inactivity in the dictionary is not a new query rejection.',
            ['Root confirms this syntactically valid source code is absent; this is a read predicate, not a source producer.']));
    list('system-rating-not-manual-overlay', { scope: 'all', rating: 'B', budgetStatus: 'budget-confirmed', urgency: 'high', ownershipScope: 'all' },
        accepted(['H21', 'H22'], 'Filter stored system rating plus budget/urgency before calculating summary; an approved effective A must not replace stored B in predicates.',
            ['Real Lead with stored system B, approved effective A, budget-confirmed/high, plus contrasting real rows for each filter.']));
    list('ilike-unicode-and-wildcards', { scope: 'all', keyword: '%设备_' },
        accepted(['H22'], 'Percent and underscore retain ILIKE wildcard behavior; search only no/name/customer snapshot/source code.',
            ['Real rows distinguish a match in allowed fields from a demand-only match; include Unicode text.']));
    list('hex-page-coercion-and-second-page', { scope: 'all', page: '0x2', pageSize: '1' },
        accepted(['H04', 'H21'], 'JS Number accepts hexadecimal query text; compare the second item with page1 and unchanged summary/facets.', [mixedWorkbench]));
    list('repeated-page-array', { page: ['1', '2'] },
        rejected(['H04'], 'Repeat the key twice: Number(["1","2"]) becomes NaN; do not serialize the definition as a single JSON-array string.'));
    list('empty-page-and-size501', { page: '', pageSize: '501' },
        rejected(['H04'], 'Empty text coerces to zero while 501 independently exceeds pageSize max; compare original issue order.'));
    list('infinite-page-and-fractional-size', { page: 'Infinity', pageSize: '1.5' },
        rejected(['H04', 'H40'], 'Nonfinite number and finite noninteger cause distinct original issues; do not clamp either value.'));
    list('unsafe-page-and-zero-size', { page: '9007199254740992', pageSize: '0' },
        rejected(['H04', 'H40'], 'Query safe-integer and >=1 errors remain separate from body positive-version semantics.'));
    list('ordered-invalid-filters', {
        scope: 'unsupported', sourceCode: 'UpperCase', budgetStatus: 'unsupported', urgency: '', rating: ['A', 'B'],
        ownerOrgId: 'null', ownerUserId: 'not-a-uuid', ownershipScope: 'unsupported', keyword: ' \ufeff ',
    }, rejected(['H03', 'H04'], 'Accumulate original enum/regex/UUID/repeated-array/trim errors in schema order; all query values travel through actual query serialization.'));
    list('literal-bracket-and-server-keys-strip', { 'page[0]': '2', 'ownerUserId[0]': ids.otherUserId, status: 'closed', score: '100' },
        accepted(['H03', 'H04', 'H21'], 'Simple-parser bracket names are literal unknown keys; stripping them leaves original active/page defaults.', [mixedWorkbench]));

    return cases;
}
