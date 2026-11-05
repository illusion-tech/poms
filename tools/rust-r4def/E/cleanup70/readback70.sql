-- ROOT READ-ONLY INPUT QUERIES. Author has not executed these.
-- Before snapshot: exact new namespace/DB OID/marker/PG15/25433 admission;
-- SET timezone='UTC'; BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY.
-- After Root actually stops all batch API writers, it captures and seals again.

SELECT current_database() AS database,current_user::text AS principal,
       current_setting('port') AS server_port,
       current_setting('server_version_num') AS server_version_num,
       current_setting('poms.r0e_isolated',true) AS isolated,
       (SELECT oid::text FROM pg_database WHERE datname=current_database()) AS database_oid,
       m.instance_id::text,m.namespace,m.source_base
FROM r4def_control.marker m;

-- Original catalog25 shapes: property order/order-by are intentionally identical.
SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,
       character_maximum_length,numeric_precision,numeric_scale,ordinal_position
FROM information_schema.columns WHERE table_schema='poms'
ORDER BY table_name,ordinal_position;
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='poms'
ORDER BY tablename,indexname;
SELECT c.relname table_name,k.conname,k.contype,k.convalidated,k.condeferrable,
       k.condeferred,pg_get_constraintdef(k.oid) definition
FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms'
ORDER BY c.relname,k.conname;

-- For each of the EXACT120 admitted catalog tables, quote only catalog identifier.
-- SELECT to_jsonb(t)::text AS raw FROM poms."<actual_table>" t
-- ORDER BY to_jsonb(t)::text;
-- Keep these raw strings private. Numeric source contexts preserve18,2 precision;
-- do not replace raw with JSON.stringify of parsed large floating-point amounts.
-- baselineRows remains the original private cleanup-before-<backend>-rows.json
-- object arrays. Validate every table's original public catalog25 summary hash.

-- guards.triggers: exact five enabled BEFORE UPDATE immutability definitions.
SELECT t.relname table_name,g.tgname,g.tgenabled,pg_get_triggerdef(g.oid) definition
FROM pg_trigger g JOIN pg_class t ON t.oid=g.tgrelid
JOIN pg_namespace n ON n.oid=t.relnamespace
WHERE n.nspname='poms' AND NOT g.tgisinternal ORDER BY t.relname,g.tgname;
SELECT * FROM pg_policies WHERE schemaname='poms' ORDER BY tablename,policyname;
-- guards.acl exact cleanup-plan65 property names/order, including RLS flags.
SELECT t.relname,t.relacl::text,t.relrowsecurity,t.relforcerowsecurity
FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
WHERE n.nspname='poms' AND t.relkind IN('r','p') ORDER BY t.relname;

-- guards.supplement: capture/keep all these original records and compare unchanged.
SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='poms' AND p.prokind IN('f','p')
ORDER BY p.proname,pg_get_function_identity_arguments(p.oid);
SELECT n.nspname,n.nspowner::regrole::text AS owner,n.nspacl::text AS acl
FROM pg_namespace n WHERE n.nspname IN('poms','r4def_control') ORDER BY n.nspname;
SELECT c.relname,a.attname,a.attacl::text,a.attidentity,a.attgenerated,
       a.attcollation::regcollation::text
FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='poms' AND a.attnum>0 AND NOT a.attisdropped
ORDER BY c.relname,a.attnum;
SELECT c.relname,s.seqstart::text,s.seqincrement::text,s.seqmax::text,s.seqmin::text,
       s.seqcache::text,s.seqcycle
FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid
JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='poms' ORDER BY c.relname;
SELECT nspname FROM pg_namespace WHERE nspname LIKE 'r4def_%' ORDER BY nspname;
-- In these two main DBs only permanent owned r4def_control is expected;
-- temporary test gate schemas must be removed under their original protocol.
-- Never advance/reset a PG sequence to manufacture a no-op. Existing serial
-- migration ledger sequence state is captured as infrastructure too if required.

-- Root apply wrapper, not executed by this package:
-- BEGIN; same actual scope guard + sorted120 table DML exclusion lock if needed;
-- read sealed rows/catalog/guards on this same connection and re-admit;
-- apply privateStatement70 descriptors serially, every result expectedRows=1;
-- if any mismatch ROLLBACK once and stop; no automatic retry;
-- compare restored all120/532/catalog/guards INSIDE Tx before COMMIT;
-- actual COMMIT ACK; then two distinct fresh READ ONLY no-DML full verifications.
-- No TRUNCATE/CASCADE/delete-prefix/trigger disabling/DDL or constraint changes.
