// Candidate only. Importing this file performs no I/O and never connects to PG.
import { randomBytes } from 'node:crypto';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const identifier = value => {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(value)) throw new Error('Invalid technical SQL identifier');
  return `"${value}"`;
};
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const uuid = value => {
  if (!uuidPattern.test(value)) throw new Error('Real producer UUID required');
  return literal(value) + '::uuid';
};
const list = values => {
  if (!Array.isArray(values) || values.length === 0) throw new Error('Nonempty owned UUID set required');
  return `ARRAY[${[...new Set(values)].map(uuid).join(',')}]::uuid[]`;
};

export function validateScope(scope) {
  for (const key of ['actorId', 'sessionId']) uuid(scope[key]);
  list(scope.projectIds);
  if (!/^r4f32_[a-z0-9_]{8,90}$/.test(scope.requestId)) throw new Error('Unique fault32 requestId required');
  if (!/^[A-Za-z][A-Za-z0-9]+_[A-Za-z0-9]+$/.test(scope.operationId)) throw new Error('Frozen operationId required');
  for (const key of ['costIds', 'expenseIds', 'targetProjectIds']) for (const value of scope[key] || []) uuid(value);
  for (const key of ['oldBasisId', 'oldTaxId', 'oldAttributionId', 'selectedCostId', 'selectedProjectId']) if (scope[key]) uuid(scope[key]);
  if ((scope.targetProjectIds || []).some(id => !scope.projectIds.includes(id))) throw new Error('Target project is outside owned scope');
  if (scope.selectedCostId && !scope.costIds?.includes(scope.selectedCostId)) throw new Error('Selected cost is outside owned scope');
  if (scope.selectedProjectId && !scope.projectIds.includes(scope.selectedProjectId)) throw new Error('Selected project is outside owned scope');
  return scope;
}

// All expressions are authored here. The caller supplies identities, never SQL.
export function buildFaultPlan(scope, point, mode = 'pause-raise') {
  validateScope(scope);
  if (!['pause', 'pause-raise', 'raise'].includes(mode)) throw new Error('Unsupported fault mode');
  const tag = 'r4f32_' + randomBytes(10).toString('hex');
  const gate = { namespace: randomBytes(4).readUInt32BE() % 0x3fffffff + 1, key: randomBytes(4).readUInt32BE() % 0x3fffffff + 1 };
  const req = literal(scope.requestId), actor = uuid(scope.actorId), projects = list(scope.projectIds);
  const costs = () => list(scope.costIds);
  const project = () => uuid(scope.selectedProjectId);
  const cost = () => uuid(scope.selectedCostId);
  const basis = () => uuid(scope.oldBasisId);
  const currentEvidence = expression => `EXISTS (SELECT 1 FROM poms.cost_governance_evidence e WHERE e.id=${expression} AND e.request_id=${req} AND e.actor_id=${actor})`;
  const proofOwnsCost = `EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(NEW.frozen_payload->'sourceVersionTransitions')='array' THEN NEW.frozen_payload->'sourceVersionTransitions' ELSE '[]'::jsonb END) proof WHERE proof->>'costRecordId'=ANY(${scope.costIds?.length ? `ARRAY[${scope.costIds.map(literal).join(',')}]::text[]` : "ARRAY[]::text[]"}))`;
  let table, event = 'INSERT', when = 'AFTER', condition;
  switch (point) {
    case 'f-evidence':
    case 'f-result-evidence':
      table = 'cost_governance_evidence';
      condition = `NEW.request_id=${req} AND NEW.actor_id=${actor} AND (NEW.project_id=ANY(${projects}) OR (NEW.project_id IS NULL AND ${proofOwnsCost}))`;
      if (point === 'f-result-evidence') condition += ` AND NEW.target_type='SharedCostAllocationResult' AND NEW.project_id=${project()}`;
      break;
    case 'f-stage-insert':
      table = 'cost_stage_attribution_snapshot';
      condition = `NEW.cost_record_id=${cost()} AND ${currentEvidence('NEW.governance_evidence_id')}`;
      break;
    case 'f-stage-cost-update':
      table = 'project_actual_cost_record'; event = 'UPDATE';
      condition = `NEW.id=${cost()} AND NEW.project_id=ANY(${projects}) AND NEW.record_status='confirmed' AND EXISTS (SELECT 1 FROM poms.cost_stage_attribution_snapshot a JOIN poms.cost_governance_evidence e ON e.id=a.governance_evidence_id WHERE a.id::text=NEW.stage_derived_from_id AND e.request_id=${req} AND e.actor_id=${actor})`;
      break;
    case 'f-basis-insert':
      table = 'shared_cost_allocation_basis'; condition = currentEvidence('NEW.governance_evidence_id'); break;
    case 'f-source-insert':
      table = 'shared_cost_allocation_source_snapshot';
      condition = `NEW.cost_record_id=${cost()} AND EXISTS (SELECT 1 FROM poms.shared_cost_allocation_basis b JOIN poms.cost_governance_evidence e ON e.id=b.governance_evidence_id WHERE b.id=NEW.basis_id AND e.request_id=${req} AND e.actor_id=${actor})`;
      break;
    case 'f-result-insert':
      table = 'shared_cost_allocation_result';
      condition = `NEW.project_id=${project()} AND ${currentEvidence('NEW.governance_evidence_id')}`;
      break;
    case 'f-old-basis-supersede':
      table = 'shared_cost_allocation_basis'; event = 'UPDATE';
      condition = `OLD.id=${basis()} AND OLD.status='active' AND NEW.status='superseded' AND NEW.updated_by=${actor}`; break;
    case 'f-old-result-supersede':
      table = 'shared_cost_allocation_result'; event = 'UPDATE';
      condition = `OLD.basis_id=${basis()} AND OLD.project_id=${project()} AND OLD.status='active' AND NEW.status='superseded' AND NEW.updated_by=${actor}`; break;
    case 'f-old-source-release':
      table = 'shared_cost_allocation_source_snapshot'; event = 'UPDATE';
      condition = `OLD.basis_id=${basis()} AND OLD.cost_record_id=ANY(${costs()}) AND OLD.is_current AND NOT NEW.is_current`; break;
    case 'f-tax-insert':
      table = 'accounting_tax_treatment_snapshot';
      condition = `NEW.project_id=ANY(${projects}) AND ${currentEvidence('NEW.governance_evidence_id')}`; break;
    case 'e-cost-insert':
      table = 'project_actual_cost_record';
      condition = `NEW.project_id=ANY(${projects}) AND NEW.source_type='expense-record' AND NEW.source_id=ANY(ARRAY[${scope.expenseIds?.length ? scope.expenseIds.map(literal).join(',') : (() => { throw new Error('Owned real expense source required'); })()}]::text[])`;
      break;
    case 'e-labor-replacement-insert':
      table = 'project_actual_cost_record';
      condition = `NEW.project_id=ANY(${projects}) AND NEW.cost_type='labor' AND NEW.supersedes_record_id=${cost()}`;
      break;
    case 'e-expense-insert':
      table = 'expense_record';
      if (!/^r4f32_[a-z0-9_]{8,90}$/.test(scope.expenseDescriptionMarker || '')) throw new Error('Unique real expense input marker required');
      condition = `NEW.project_id=ANY(${projects}) AND NEW.expense_description=${literal(scope.expenseDescriptionMarker)}`; break;
    case 'business-audit':
      table = 'audit_log';
      condition = `NEW.request_id=${req} AND NEW.operator_id=${actor} AND NEW.event_type=${literal(scope.operationId)} AND (NEW.metadata->>'projectId')=ANY(ARRAY[${scope.projectIds.map(literal).join(',')}]::text[])`;
      break;
    case 'pending-auth':
      table = 'auth_session'; event = 'UPDATE'; when = 'BEFORE';
      // Excludes the independently committed eager last-seen touch. The current
      // business transaction can see its own uncommitted audit, other txs cannot.
      condition = `NEW.id=${uuid(scope.sessionId)} AND (EXISTS (SELECT 1 FROM poms.audit_log a WHERE a.request_id=${req} AND a.operator_id=${actor} AND a.event_type=${literal(scope.operationId)}) OR EXISTS (SELECT 1 FROM poms.security_event e WHERE e.request_id=${req} AND e.actor_id=${actor}))`;
      break;
    case 'projection-security-event':
      table = 'security_event';
      condition = `NEW.request_id=${req} AND NEW.actor_id=${actor}`; break;
    default: throw new Error('Unknown authored fault point');
  }
  const triggerName = identifier(tag + '_trg'), functionName = identifier(tag + '_fn');
  const action = (mode.includes('pause') ? `PERFORM pg_advisory_xact_lock(${gate.namespace},${gate.key});\n` : '')
    + (mode.includes('raise') ? "RAISE EXCEPTION USING ERRCODE='P0032', MESSAGE='r4f32 owned-row injected failure';\n" : '');
  const body = `CREATE FUNCTION poms.${functionName}() RETURNS trigger LANGUAGE plpgsql AS $r4f32$\nBEGIN\n  IF ${condition} THEN\n    ${action}  END IF;\n  RETURN NEW;\nEND;\n$r4f32$`;
  const create = `CREATE TRIGGER ${triggerName} ${when} ${event} ON poms.${identifier(table)} FOR EACH ROW EXECUTE FUNCTION poms.${functionName}()`;
  return {
    kind: 'candidate-owned-row-trigger', point, table, event, when, mode, tag, gate,
    install: [{ text: body, values: [] }, { text: create, values: [] }],
    cleanup: [{ text: `DROP TRIGGER IF EXISTS ${triggerName} ON poms.${identifier(table)}`, values: [] }, { text: `DROP FUNCTION IF EXISTS poms.${functionName}()`, values: [] }],
    owns: { actorId: scope.actorId, requestId: scope.requestId, projectIds: scope.projectIds, costIds: scope.costIds || [] },
    businessStateMutatedByInjection: false,
    lifetime: 'regular uniquely named PG trigger/function; Root must remove in finally, not CREATE TEMP TRIGGER',
  };
}

export const gateSql = {
  tryHold: gate => ({ text: 'SELECT pg_try_advisory_lock($1::integer,$2::integer) AS held,pg_backend_pid() AS controller_pid', values: [gate.namespace, gate.key] }),
  release: gate => ({ text: 'SELECT pg_advisory_unlock($1::integer,$2::integer) AS released', values: [gate.namespace, gate.key] }),
  observe: gate => ({ text: "SELECT l.pid,a.state,a.wait_event_type,a.wait_event FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid WHERE l.locktype='advisory' AND l.classid=$1::oid AND l.objid=$2::oid AND l.objsubid=2 AND NOT l.granted ORDER BY l.pid", values: [gate.namespace, gate.key] }),
  behind: leaderPid => ({ text: "SELECT a.pid,a.state,a.wait_event_type,a.wait_event,pg_blocking_pids(a.pid) AS blockers FROM pg_stat_activity a WHERE a.pid<>$1::integer AND a.state='active' AND $1::integer=ANY(pg_blocking_pids(a.pid)) AND a.query LIKE '%FROM poms.project%' AND a.query LIKE '%FOR UPDATE%' ORDER BY a.pid", values: [leaderPid] }),
};

export function productionFamilyGateSql(fullFamilyKey) {
  if (!/^poms:cost-rate:(person:[0-9a-f-]{36}|role:[A-Za-z0-9_.:-]{1,64})$/i.test(fullFamilyKey)) throw new Error('Real E family key required');
  return {
    hold: { text: 'SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS held,pg_backend_pid() AS controller_pid', values: [fullFamilyKey] },
    release: { text: 'SELECT pg_advisory_unlock(hashtextextended($1,0)) AS released', values: [fullFamilyKey] },
    observe: { text: "WITH k AS (SELECT hashtextextended($1,0) AS h) SELECT l.pid,l.granted,a.wait_event_type,a.wait_event FROM k JOIN pg_locks l ON l.locktype='advisory' AND l.classid=((k.h >> 32) & 4294967295)::oid AND l.objid=(k.h & 4294967295)::oid AND l.objsubid=1 JOIN pg_stat_activity a ON a.pid=l.pid ORDER BY l.granted,l.pid", values: [fullFamilyKey] },
  };
}
