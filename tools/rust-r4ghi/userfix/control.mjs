import assert from 'node:assert/strict';
import { sha, quote } from './pure.mjs';

export async function ensureControl(ctx) {
  if (ctx.state.control) return ctx.state.control;
  const prefix = `${ctx.state.prefix}_uf`, control = { table: `${prefix}_cfg`, function: `${prefix}_hook`, hit: `${prefix}_hit`, raw: `${prefix}_raw`, gate: `${prefix}_gate`, triggers: [] };
  const q = name => `r4ghi_control.${quote(name)}`;
  await ctx.db(async c => {
    await c.query('BEGIN');
    try {
      await c.query(`CREATE TABLE ${q(control.table)}(id integer PRIMARY KEY CHECK(id=1),mode text NOT NULL DEFAULT '',target_kind text,target_username text,target_id uuid,session_id uuid,error_code text NOT NULL DEFAULT 'P0001',constraint_name text NOT NULL DEFAULT 'userfix_other_unique',gate_a integer,gate_b integer)`);
      await c.query(`INSERT INTO ${q(control.table)}(id) VALUES(1)`);
      for (const sequence of [control.hit, control.raw, control.gate]) await c.query(`CREATE SEQUENCE ${q(sequence)} START 1 MINVALUE 1 NO CYCLE`);
      await c.query(`CREATE FUNCTION ${q(control.function)}() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $uf$
DECLARE cfg record; j jsonb:=to_jsonb(NEW); matched boolean:=false;
BEGIN
 SELECT * INTO cfg FROM ${q(control.table)} WHERE id=1;
 IF cfg.mode='' THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='auth_session' AND TG_OP='UPDATE' THEN
   IF (j->>'id')::uuid=cfg.session_id AND (j->>'last_seen_at') IS DISTINCT FROM (to_jsonb(OLD)->>'last_seen_at') THEN
     PERFORM nextval('r4ghi_control.${control.raw}'::regclass);
   END IF;
 END IF;
 IF TG_TABLE_NAME='platform_user' AND TG_OP='INSERT' THEN matched:=(j->>'username')=cfg.target_username;
 ELSIF TG_TABLE_NAME IN ('user_role_assignment','user_org_membership') AND TG_OP='INSERT' THEN
   matched:=EXISTS(SELECT 1 FROM poms.platform_user u WHERE u.id=(j->>'user_id')::uuid AND u.username=cfg.target_username);
 ELSIF TG_TABLE_NAME='audit_log' AND TG_OP='INSERT' AND j->>'event_type'='platform.user.created' THEN
   matched:=EXISTS(SELECT 1 FROM poms.platform_user u WHERE u.id::text=j->>'target_id' AND u.username=cfg.target_username);
 ELSIF TG_TABLE_NAME='auth_session' AND TG_OP='UPDATE' THEN
   matched:=(j->>'id')::uuid=cfg.session_id AND (j->>'last_seen_at') IS NOT DISTINCT FROM (to_jsonb(OLD)->>'last_seen_at')
     AND (j->>'row_version')::integer=(to_jsonb(OLD)->>'row_version')::integer+1 AND EXISTS(SELECT 1 FROM poms.platform_user u WHERE u.username=cfg.target_username);
 ELSIF TG_TABLE_NAME IN ('role','org_unit') AND TG_OP='UPDATE' THEN
   matched:=(j->>'id')::uuid=cfg.target_id AND (to_jsonb(OLD)->>'is_active')::boolean AND NOT (j->>'is_active')::boolean;
 END IF;
 IF NOT matched OR cfg.target_kind<>TG_TABLE_NAME THEN RETURN NEW; END IF;
 IF cfg.mode='fi' THEN
   PERFORM nextval('r4ghi_control.${control.hit}'::regclass);
   RAISE EXCEPTION USING ERRCODE=cfg.error_code,MESSAGE='controlled userfix required-write failure',CONSTRAINT=cfg.constraint_name;
 ELSIF cfg.mode IN ('gate-create','gate-deactivate') THEN
   PERFORM nextval('r4ghi_control.${control.gate}'::regclass);
   PERFORM pg_advisory_xact_lock(cfg.gate_a,cfg.gate_b);
 END IF;
 RETURN NEW;
END; $uf$`);
      await c.query(`REVOKE ALL ON FUNCTION ${q(control.function)}() FROM PUBLIC`);
      await c.query(`GRANT EXECUTE ON FUNCTION ${q(control.function)}() TO ${quote(ctx.app)}`);
      for (const [table, event] of [['platform_user', 'INSERT'], ['user_role_assignment', 'INSERT'], ['user_org_membership', 'INSERT'], ['audit_log', 'INSERT'], ['auth_session', 'UPDATE'], ['role', 'UPDATE'], ['org_unit', 'UPDATE']]) {
        const trigger = `${prefix}_${table}`; control.triggers.push({ table, name: trigger });
        await c.query(`CREATE TRIGGER ${quote(trigger)} BEFORE ${event} ON poms.${quote(table)} FOR EACH ROW EXECUTE FUNCTION ${q(control.function)}()`);
      }
      await c.query('COMMIT');
    } catch (e) { await c.query('ROLLBACK'); throw e; }
  });
  ctx.state.control = control; ctx.persist();
  control.definition = await controlIdentity(ctx);
  ctx.artifact(`${ctx.next('control-install')}.json`, control, { kind: 'owned-exact-FI-control-install', controlName: prefix, triggerCount: control.triggers.length, securityDefinerSearchPath: 'pg_catalog', businessFixtureCreatedBySQL: false });
  ctx.persist(); return control;
}
export async function controlIdentity(ctx, c = null) {
  const work = async connection => {
    const control = ctx.state.control; assert(control);
    const rows = (await connection.query(`SELECT 'function' kind,p.oid::text oid,pg_get_functiondef(p.oid) definition,p.proacl::text acl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='r4ghi_control' AND p.proname=$1
      UNION ALL SELECT 'trigger:'||t.tgname,t.oid::text,pg_get_triggerdef(t.oid,true),NULL::text FROM pg_trigger t WHERE t.tgname=ANY($2::text[]) ORDER BY kind`, [control.function, control.triggers.map(t => t.name)])).rows;
    assert.equal(rows.length, control.triggers.length + 1);
    const relations = (await connection.query("SELECT c.oid::text,n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner) owner,c.relacl::text acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='r4ghi_control' AND c.relname=ANY($1::text[]) ORDER BY c.relname", [[control.table, control.hit, control.raw, control.gate]])).rows;
    assert.equal(relations.length, 4);
    const columns = (await connection.query("SELECT a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,pg_get_expr(d.adbin,d.adrelid) default_expr FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='r4ghi_control' AND c.relname=$1 AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum", [control.table])).rows;
    return { rows, relations, columns, sha256: sha(JSON.stringify({ rows, relations, columns })) };
  };
  return c ? work(c) : ctx.db(work);
}
export async function configure(ctx, values = {}) {
  const control = await ensureControl(ctx);
  const allowed = ['mode', 'target_kind', 'target_username', 'target_id', 'session_id', 'error_code', 'constraint_name', 'gate_a', 'gate_b'];
  assert(Object.keys(values).every(k => allowed.includes(k)));
  await ctx.db(async c => {
    const original = ctx.state.control.definition;
    if (original) assert.equal((await controlIdentity(ctx, c)).sha256, original.sha256, 'Control identity changed outside this run');
    const keys = Object.keys(values);
    if (keys.length) await c.query(`UPDATE r4ghi_control.${quote(control.table)} SET ${keys.map((k, n) => `${quote(k)}=$${n + 1}`).join(',')} WHERE id=1`, keys.map(k => values[k]));
  });
}
export async function counts(ctx) {
  const control = await ensureControl(ctx);
  return ctx.db(async c => {
    const result = {};
    for (const kind of ['hit', 'raw', 'gate']) {
      const { rows: [r] } = await c.query(`SELECT last_value::text value,is_called FROM r4ghi_control.${quote(control[kind])}`);
      result[kind] = r.is_called ? r.value : '0';
    }
    return result;
  });
}

