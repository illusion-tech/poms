/**
 * Pure G1 definitions for #98 / RUST-R3-CO-A.
 * No self-run, I/O, environment access, network, DB, process or browser work.
 * Root supplies real producer receipts, actors, owned DB barriers and observations.
 * Expected assertions below are definitions, never claimed measured outcomes.
 */

export const leadStageRequirements = Object.freeze({
  base: '5041275d7ad82af4becbb4462e7213ffe465bc7a',
  issue: 98,
  newHTTP: 0,
  newDTO: 0,
  newDDL: 0,
  execution: 'Root only after joint G1 freeze and explicit G2',
  fixtures: [
    'A fresh owned cohort; real customer POST and active lead-source dictionary item.',
    'Real active writer/admin, second writer, override approver, owner/org and permission-negative actors; independent sessions for concurrent actors.',
    'Real Lead create receipts with low initial score and a matching system snapshot, plus owned/public-pool/qualified/incomplete/closed examples.',
    'Actual contact/stakeholder/discovery/competitor/F/Todo producers shared with B; no direct prepared rows presented as HTTP producer evidence.',
    'Actual local attachment upload initiate/PUT/complete plus active lead links; two eligible categories and finance/internal-assessment excluded controls; retain bytes/hash receipts.',
    'Root can observe committed rows, full business before/after snapshots, row versions, audit requestId and lock waiters without reading old private.',
    'Root-owned temporary permission denial and table lock sessions; exact restoration and resource cleanup receipts.',
  ],
  businessObservationTables: [
    'lead', 'lead_owner_assignment_record', 'lead_score_snapshot',
    'lead_score_override', 'project', 'attachment', 'attachment_link', 'audit_log',
  ],
  separateObservation: 'auth session flush and independent business-number counter; number gaps may survive a failed command',
  legacyDecision: 'Direct human decision: only missing matching system tuple triggers recalculation plus system snapshot inside approval TX before manual approval; any necessary write failure rolls all state back. Matched tuple is reused.',
});

function request(operationId, method, path, json) {
  return { operationId, method, path, ...(json === undefined ? {} : { json }) };
}

/** Only already-created, real fixture IDs are accepted; no placeholders are minted. */
export function buildLeadStageCases(ids) {
  const required = ['customer', 'sourceCode', 'owner', 'org', 'lead', 'pendingOverride', 'activeOverride'];
  for (const key of required) {
    if (typeof ids[key] !== 'string' || ids[key].length === 0) {
      throw new TypeError(`Root must supply real fixture ${key}`);
    }
  }
  if (!Number.isInteger(ids.leadRowVersion) || !Number.isInteger(ids.overrideRowVersion)) {
    throw new TypeError('Root must supply current real leadRowVersion and overrideRowVersion');
  }
  const lead = encodeURIComponent(ids.lead);
  const pending = encodeURIComponent(ids.pendingOverride);
  const active = encodeURIComponent(ids.activeOverride);
  const readLead = request('LeadController_getById', 'GET', `/api/leads/${lead}`);
  const readHistory = request('LeadController_getScoreHistory', 'GET', `/api/leads/${lead}/score-history`);
  return [
    {
      id: 'A-S01', name: 'Real producer chain through conversion',
      producerRequirements: ['customer', 'Lead', 'contact', 'stakeholder', 'competitor', 'discovery', 'F/Todo', 'four real uploads and lead links'],
      requests: [readLead, readHistory,
        request('LeadController_update', 'PATCH', `/api/leads/${lead}`, { urgency: ids.changedUrgency ?? 'high', expectedVersion: ids.leadRowVersion }),
        request('LeadController_qualify', 'POST', `/api/leads/${lead}:qualify`, { qualificationSummary: '实际阶段验收已核对预算、需求与销售主责。' }),
        request('LeadController_convertToProject', 'POST', `/api/leads/${lead}:convertToProject`, { projectName: 'R3阶段真实线索转换项目' }),
      ],
      sequencing: 'Replace each expected version with the just-observed committed response; require urgency actually changes. Observe new Project ID from real conversion response, then Root invokes existing Project/J/K reads with that ID.',
      assertions: [
        'Actual producer receipt graph has no fabricated source/target reference.',
        'Each newly recomputed system snapshot has coherent systemScore/rating, total, formula and gate summary.',
        'Project.sourceLeadId and Lead.convertedProjectId point to each other; customer/owner preserved, active/assessment initial Project.',
        'Both eligible source attachments copied exactly once as project/source; finance/internal-assessment excluded, original links and bytes unchanged.',
        'Required copy audit has exact copiedCount; snapshot sourceRecordId is actual Project ID; no unrelated audit event invented.',
      ],
    },
    {
      id: 'A-S02', name: 'Unrefreshed real facts then manual override',
      precondition: 'Fresh API Lead with a stored system snapshot; add score-changing real I/F/upload facts after that snapshot, without any Lead mutation.',
      requests: [readLead, readHistory,
        request('LeadController_submitScoreOverride', 'POST', `/api/leads/${lead}/score-overrides`, { score: 91, reason: '实际事实变化后验证人工覆盖与系统评分时点一致。', expectedLeadRowVersion: ids.leadRowVersion }),
        request('LeadScoreOverrideController_approve', 'POST', `/api/lead-score-overrides/${pending}:approve`, { expectedOverrideRowVersion: ids.overrideRowVersion, note: '仅覆盖有效评分，保留已存系统评分依据。' }),
        request('LeadScoreOverrideController_revoke', 'POST', `/api/lead-score-overrides/${active}:revoke`, { expectedOverrideRowVersion: ids.overrideRowVersion, reason: '验证撤销后回退同一已存系统评分。' }),
      ],
      sequencing: 'Pending/active override IDs and versions must be replaced from each real response. Approve and revoke fixtures may be separate to prevent stale IDs. Capture pre- and post-GET business fingerprints.',
      assertions: [
        'Before manual command, real facts changed but stored system score/history remain unchanged by GET.',
        'Matching stored system tuple is reused for manual/revoked breakdown/formula/systemScore/rating/gates; systemScore equals that breakdown.total.',
        'Effective score becomes91 then returns to stored system score; no silent system recomputation.',
        'Only registered direct override rows/snapshots/audits are created; no generic ApprovalRecord/Todo from these direct commands.',
      ],
    },
    {
      id: 'A-S03', name: 'Facts commit between score calculation and snapshot construction',
      requests: [request('LeadController_update', 'PATCH', `/api/leads/${lead}`, { urgency: ids.changedUrgency ?? 'high', expectedVersion: ids.leadRowVersion })],
      rootBarrier: {
        table: 'poms.lead_score_override', mode: 'ACCESS EXCLUSIVE in an owned uncommitted Root session',
        observe: 'Confirm PATCH is lock-waiting on its approved-override lookup after refresh_score; record pg_stat_activity query/lock identity before changing facts.',
        duringWait: 'A separate real I HTTP producer commits a score-changing boolean fact for the same low-score Lead; release the barrier and await PATCH.',
        restrictions: 'No arbitrary sleeps, mock route, evaluator injection, product test hook or global transaction setting.',
      },
      assertions: [
        'Committed Lead score and newly committed system snapshot use one identical materialized score tuple; breakdown.total equals systemScore.',
        'The tuple may represent one well-defined materialization before or after the independent fact commit, never a mixture.',
        'Subsequent GET is read-only; later actual Lead scoring write can consume the newer facts coherently.',
      ],
    },
    {
      id: 'A-S04', name: 'System trigger and semantic-noop regression',
      triggerOperationIds: ['LeadController_create', 'LeadController_update', 'LeadController_claimOwner', 'LeadController_assignOwner', 'LeadController_qualify', 'LeadController_close', 'LeadController_convertToProject'],
      fixtureRules: 'Separate eligible Lead fixtures for terminal commands; at least one active manual override while a legitimate Lead component write refreshes system score.',
      assertions: [
        'System score/rating/reason and snapshot system tuple derive from one materialization on every real trigger.',
        'Active manual override remains effective while system score updates.',
        'Exact noop changes no business row/version/scoreUpdatedAt/audit/snapshot; name-only edit changes no semantic system snapshot.',
        'Formula/facts/gates/score/rating semantic change creates one system snapshot; object key order alone creates none.',
      ],
    },
    {
      id: 'A-S05', name: 'Critical optimistic races',
      races: [
        { kind: 'Lead edit', expectedStatuses: [200, 409], invariant: 'One Lead version increment and one lead.updated audit.' },
        { kind: 'Existing approved plus one pending replacement, same pending version', expectedStatuses: [200, 409], invariant: 'Old approved superseded once, pending approved once, one manual snapshot and one approved audit.' },
        { kind: 'Two submissions sharing the same Lead version', expectedStatuses: [201, 409], invariant: 'Exactly one pending override and submitted audit; known unique conflict is409.' },
      ],
      rootBarrier: 'Use independent actors/sessions and record real waiters; table/row gates remain Root-owned and are always released/restored.',
      assertions: ['No weak bulk two-success replacement; no partial old-approved supersede after loser rollback.'],
    },
    {
      id: 'A-S06', name: 'Workbench filters and read purity on real stage IDs',
      requests: [
        { ...request('LeadController_list', 'GET', '/api/leads'), query: { scope: 'all', page: '1', pageSize: '2' } },
        { ...request('LeadController_list', 'GET', '/api/leads'), query: { ownershipScope: 'mine', ownerUserId: ids.owner, scope: 'active' } },
        { ...request('LeadController_list', 'GET', '/api/leads'), query: { ownershipScope: 'public-pool', scope: 'all' } },
        readLead, readHistory,
      ],
      assertions: [
        'Ownership filters use actual actor id/public null owner; summary/facets derive from repository-filtered full set before scope/page.',
        'Converted scope and real Project summary match actual conversion references.',
        'Repeated list/detail/history does not change business score/history/audit; session bookkeeping observed separately.',
      ],
    },
    {
      id: 'A-S07', name: 'Conversion concurrency',
      requests: [request('LeadController_convertToProject', 'POST', `/api/leads/${lead}:convertToProject`, {})],
      rootConcurrency: 'Two independently authorized actors on one real qualified eligible Lead; require simultaneous preflights/observed waiters if asserting a write race.',
      assertions: [
        'Exactly one success and one real Project/source pointer/copy cohort; never two successful Projects.',
        'Write CAS loser409; a later preflight/reread of already converted state may be400 and must have no extra business effects.',
        'Independent Project number reservations may both survive; no pool self-deadlock.',
      ],
    },
    {
      id: 'A-S08', name: 'Required writes abort owning command',
      faultMatrix: [
        { table: 'lead_score_snapshot', commands: ['create', 'update with score/gate change', 'claim', 'assign', 'qualify', 'close', 'approve', 'revoke'] },
        { table: 'lead_owner_assignment_record', commands: ['claim', 'assign'] },
        { table: 'audit_log', commands: ['changed update', 'submit', 'approve replacement', 'reject', 'revoke'] },
      ],
      assertions: [
        'Root denies only necessary INSERT for the selected role/table, observes500, restores permission and verifies recovery success.',
        'Lead fields/version/score, owner records, old/new overrides, snapshots and required audits exactly match before after failed command.',
        'Pending auth session change also rolls back if enlisted; number counter excluded from business equality only for reserved create/convert.',
        'No audit failure injection for an unregistered creation event; no fabricated lead.created/snapshot-created event requirement.',
      ],
    },
    {
      id: 'A-S09', name: 'Real conversion dependent-write rollback',
      requests: [request('LeadController_convertToProject', 'POST', `/api/leads/${lead}:convertToProject`, {})],
      denyOneAtATime: ['attachment_link INSERT', 'audit_log INSERT when eligible copy count>0', 'lead_score_snapshot INSERT'],
      assertions: [
        'Failed500 leaves no Project, converted Lead fields, copied link, new system snapshot or required audit.',
        'Source link/object bytes and prior history unchanged; Project number reservation may advance.',
        'Permission restoration followed by actual successful conversion proves usable transaction/lock lifecycle.',
      ],
    },
    {
      id: 'A-S10', name: 'Reservation capacity and unchanged validated bounds',
      requests: [request('LeadController_create', 'POST', '/api/leads', {
        customerId: ids.customer, sourceCode: ids.sourceCode, ownerUserId: ids.owner, ownerOrgId: ids.org,
        leadName: 'R3收口真实池容量创建', demandDescription: '验证独立号码预留不持有主业务事务连接。', budgetStatus: 'unknown', urgency: 'normal',
      })],
      rootConcurrency: 'Issue at least configuredPoolCapacity+1 real creates with distinct names/request IDs and a finite timeout; record pool setting and completion/unique number count.',
      reusableInputControls: ['money 9007199254740993.00 exact', 'numeric18,2 overflow400 before reservation', 'year0000 rejected,0001/0099 retained', 'NUL/lone surrogate400'],
      assertions: ['No nested reservation-pool self-deadlock; independent numbers unique; only invalid local input consumes no reservation/business row.'],
    },
    {
      id: 'A-S11', name: 'Authority, hard gates and stale versions',
      assertions: [
        'Conversion needs both existing LeadWrite and ProjectWrite; override decision needs existing LeadScoreOverride.',
        'Inactive owner/org, same-owner reassignment and claim of owned Lead follow existing rules with zero writes on failure.',
        'Manual score100 never bypasses missing budget/amount/owner/status hard gates.',
        'Required stale expected versions produce409 and no business/snapshot/registered-audit changes; terminal-state failures preserve history.',
      ],
    },
    {
      id: 'A-S12', name: 'Historical missing system tuple fallback in approval transaction',
      fixture: 'Root-owned prepared historical Lead with stored score and no matching system snapshot, plus a real pending override. Record preparation before/after explicitly; never claim the prepared legacy state was produced by HTTP. Include real changed I/F/upload facts so fallback recalculation is observable.',
      requests: [request('LeadScoreOverrideController_approve', 'POST', `/api/lead-score-overrides/${pending}:approve`, { expectedOverrideRowVersion: ids.overrideRowVersion, note: '历史缺口在同一审批事务内补齐系统依据。' })],
      variants: ['success', 'deny Lead UPDATE', 'deny lead_score_snapshot INSERT', 'deny audit_log INSERT'],
      assertions: [
        'Only the missing/mismatched tuple fallback recalculates system score from one materialized facts result; normal matching tuple is not refreshed.',
        'Success stores coherent Lead system score/rating/reason and one system snapshot first, then approved override plus one manual snapshot and registered approved audit in the same transaction.',
        'Both snapshots share coherent system formula/breakdown/score/gates; manual snapshot has the real override/source/actor and effective score.',
        'Any necessary Lead/system snapshot/manual snapshot/approved audit failure500 restores the whole historical before-state, pending status and versions; no partial backfill.',
        'Existing active override replacement, if present, is superseded only with the successful complete approval; CAS loser409 leaves no fallback residue.',
        'Permission restoration and retry succeeds; no new HTTP/DTO/DDL, GET backfill or unconditional manual refresh.',
      ],
    },
  ];
}
