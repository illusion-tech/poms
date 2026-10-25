-- R0E isolated PostgreSQL 15.12 smoke. Run with psql -X as poms_r0e_owner.
-- Provisioning, extension installation and persistent restart markers are separate.
-- This file reads catalogs and its own synthetic TEMP rows only. It never queries
-- application relations, changes existing objects, creates databases or commits.
\set ON_ERROR_STOP on
\pset pager off
\echo R0E isolated PostgreSQL smoke: checking target before any probe DDL

SET statement_timeout = '15s';
SET lock_timeout = '3s';

DO $guard$
DECLARE
    db record;
    runtime_role record;
BEGIN
    IF current_database() NOT IN ('poms_r0e_nest', 'poms_r0e_rust') THEN
        RAISE EXCEPTION 'R0E refuses database %', current_database();
    END IF;
    IF current_setting('poms.r0e_isolated', true) IS DISTINCT FROM 'on' THEN
        RAISE EXCEPTION 'R0E isolation marker poms.r0e_isolated=on is required';
    END IF;
    IF current_setting('server_version_num')::integer <> 150012 THEN
        RAISE EXCEPTION 'R0E requires PostgreSQL 15.12, observed %', current_setting('server_version');
    END IF;
    IF current_setting('port')::integer <> 15432 THEN
        RAISE EXCEPTION 'R0E requires server port 15432, observed %', current_setting('port');
    END IF;
    IF session_user <> 'poms_r0e_owner' OR current_user <> 'poms_r0e_owner' THEN
        RAISE EXCEPTION 'Run smoke as poms_r0e_owner administrator; session/current user are %/%', session_user, current_user;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = session_user AND rolsuper) THEN
        RAISE EXCEPTION 'poms_r0e_owner administrator is required to SET LOCAL ROLE for the runtime probe';
    END IF;

    SELECT pg_catalog.pg_encoding_to_char(encoding) AS encoding,
           datlocprovider, datcollate, datctype, datcollversion,
           pg_catalog.pg_database_collation_actual_version(oid) AS actual_collation_version,
           pg_catalog.pg_get_userbyid(datdba) AS owner
      INTO STRICT db
      FROM pg_catalog.pg_database
     WHERE datname = current_database();
    IF db.encoding <> 'UTF8' OR db.datlocprovider <> 'c'
       OR db.datcollate <> 'en_US.UTF-8' OR db.datctype <> 'en_US.UTF-8' THEN
        RAISE EXCEPTION 'R0E locale mismatch: %', row_to_json(db);
    END IF;
    IF db.datcollversion IS DISTINCT FROM '2.34'
       OR db.actual_collation_version IS DISTINCT FROM '2.34' THEN
        RAISE EXCEPTION 'R0E requires stored/actual collation proxy 2.34; observed %/%', db.datcollversion, db.actual_collation_version;
    END IF;
    IF db.owner <> 'poms_r0e_owner' THEN
        RAISE EXCEPTION 'Unexpected isolated database owner %', db.owner;
    END IF;
    IF current_setting('TimeZone') <> 'Etc/GMT-8' THEN
        RAISE EXCEPTION 'R0E requires initial session TimeZone Etc/GMT-8; observed %', current_setting('TimeZone');
    END IF;

    SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
      INTO STRICT runtime_role
      FROM pg_catalog.pg_roles WHERE rolname = 'poms_r0e_app';
    IF runtime_role.rolsuper OR runtime_role.rolcreatedb
       OR runtime_role.rolcreaterole OR runtime_role.rolbypassrls THEN
        RAISE EXCEPTION 'poms_r0e_app must be an unprivileged runtime role';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_namespace
         WHERE nspname = 'poms' AND pg_catalog.pg_get_userbyid(nspowner) = 'poms_r0e_owner'
    ) THEN
        RAISE EXCEPTION 'poms schema must already be owned by poms_r0e_owner';
    END IF;
    IF (SELECT count(*) FROM pg_catalog.pg_extension
         WHERE (extname = 'pgcrypto' AND extversion = '1.3')
            OR (extname = 'btree_gist' AND extversion = '1.7')) <> 2 THEN
        RAISE EXCEPTION 'Provision exact pgcrypto 1.3 and btree_gist 1.7 before smoke';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_extension e
        JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
        WHERE e.extname IN ('pgcrypto', 'btree_gist') AND n.nspname NOT IN ('public', 'poms')
    ) THEN
        RAISE EXCEPTION 'Probe expects required extensions in public or poms';
    END IF;
END
$guard$;

SELECT current_database() AS database,
       current_setting('server_version') AS server_version,
       current_setting('port') AS server_port,
       current_setting('TimeZone') AS session_timezone,
       pg_catalog.pg_encoding_to_char(encoding) AS encoding,
       datlocprovider AS locale_provider, datcollate, datctype,
       datcollversion AS stored_collation_version,
       pg_catalog.pg_database_collation_actual_version(oid) AS actual_collation_version
FROM pg_catalog.pg_database WHERE datname = current_database();

SELECT e.extname, e.extversion, n.nspname AS extension_schema
FROM pg_catalog.pg_extension e
JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname IN ('pgcrypto', 'btree_gist') ORDER BY e.extname;

-- Snapshot object identities, never application row counts or contents.
SELECT pg_catalog.md5(coalesce(string_agg(
           format('%s:%s:%s:%s', n.nspname, c.relname, c.relkind, c.oid),
           E'\n' ORDER BY n.nspname, c.relname, c.relkind, c.oid), '')) AS persistent_catalog_before
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('poms', 'public')
\gset

BEGIN;
SET LOCAL ROLE poms_r0e_app;
SET LOCAL search_path = pg_catalog, pg_temp, poms, public;

DO $privileges$
DECLARE
    crypto_schema name;
    digest_hex text;
BEGIN
    IF current_user <> 'poms_r0e_app' OR session_user <> 'poms_r0e_owner' THEN
        RAISE EXCEPTION 'Runtime privilege switch failed';
    END IF;
    IF NOT has_database_privilege(current_user, current_database(), 'TEMP') THEN
        RAISE EXCEPTION 'poms_r0e_app requires TEMP on this isolated database';
    END IF;
    IF NOT has_schema_privilege(current_user, 'poms', 'USAGE')
       OR NOT has_schema_privilege(current_user, 'public', 'USAGE') THEN
        RAISE EXCEPTION 'poms_r0e_app requires USAGE on poms/public';
    END IF;
    IF has_schema_privilege(current_user, 'poms', 'CREATE')
       OR has_schema_privilege(current_user, 'public', 'CREATE')
       OR has_database_privilege(current_user, current_database(), 'CREATE') THEN
        RAISE EXCEPTION 'Runtime role must not own persistent DDL privileges';
    END IF;
    SELECT n.nspname INTO STRICT crypto_schema
    FROM pg_catalog.pg_extension e
    JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pgcrypto';
    EXECUTE format('SELECT encode(%I.digest($1, $2), ''hex'')', crypto_schema)
       INTO digest_hex USING 'abc'::text, 'sha256'::text;
    IF digest_hex <> 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' THEN
        RAISE EXCEPTION 'pgcrypto digest result mismatch';
    END IF;
END
$privileges$;

CREATE TEMP TABLE pg_temp.r0e_smoke_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id uuid NOT NULL,
    business_version integer NOT NULL,
    is_current boolean NOT NULL DEFAULT true,
    supersedes_id uuid,
    row_version integer NOT NULL DEFAULT 1,
    CONSTRAINT r0e_smoke_subject_version_uq UNIQUE (subject_id, business_version),
    CONSTRAINT r0e_smoke_supersedes_fk FOREIGN KEY (supersedes_id)
        REFERENCES pg_temp.r0e_smoke_versions (id) ON DELETE RESTRICT,
    CONSTRAINT r0e_smoke_positive_version_ck CHECK (business_version > 0 AND row_version > 0)
) ON COMMIT DROP;
CREATE UNIQUE INDEX r0e_smoke_one_current_uq
    ON pg_temp.r0e_smoke_versions (subject_id) WHERE is_current = true;

DO $versions$
DECLARE
    observed_constraint text;
    changed_rows integer;
BEGIN
    INSERT INTO pg_temp.r0e_smoke_versions (id, subject_id, business_version)
    VALUES ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1);

    BEGIN
        INSERT INTO pg_temp.r0e_smoke_versions (subject_id, business_version)
        VALUES ('20000000-0000-4000-8000-000000000001', 2);
        RAISE EXCEPTION 'Expected partial unique violation was not raised';
    EXCEPTION WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS observed_constraint = CONSTRAINT_NAME;
        IF observed_constraint <> 'r0e_smoke_one_current_uq' THEN
            RAISE EXCEPTION 'Unexpected unique constraint %', observed_constraint;
        END IF;
    END;
    BEGIN
        INSERT INTO pg_temp.r0e_smoke_versions (subject_id, business_version, is_current)
        VALUES ('20000000-0000-4000-8000-000000000001', 1, false);
        RAISE EXCEPTION 'Expected business-version unique violation was not raised';
    EXCEPTION WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS observed_constraint = CONSTRAINT_NAME;
        IF observed_constraint <> 'r0e_smoke_subject_version_uq' THEN
            RAISE EXCEPTION 'Unexpected business-version constraint %', observed_constraint;
        END IF;
    END;

    UPDATE pg_temp.r0e_smoke_versions SET is_current = false, row_version = row_version + 1
    WHERE id = '10000000-0000-4000-8000-000000000001' AND row_version = 1;
    GET DIAGNOSTICS changed_rows = ROW_COUNT;
    IF changed_rows <> 1 THEN RAISE EXCEPTION 'Initial compare-and-swap failed'; END IF;
    UPDATE pg_temp.r0e_smoke_versions SET row_version = row_version + 1
    WHERE id = '10000000-0000-4000-8000-000000000001' AND row_version = 1;
    GET DIAGNOSTICS changed_rows = ROW_COUNT;
    IF changed_rows <> 0 THEN RAISE EXCEPTION 'Stale compare-and-swap unexpectedly wrote a row'; END IF;

    INSERT INTO pg_temp.r0e_smoke_versions (id, subject_id, business_version, supersedes_id)
    VALUES ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 2,
            '10000000-0000-4000-8000-000000000001');
    BEGIN
        INSERT INTO pg_temp.r0e_smoke_versions (subject_id, business_version, supersedes_id)
        VALUES ('20000000-0000-4000-8000-000000000002', 1, '10000000-0000-4000-8000-999999999999');
        RAISE EXCEPTION 'Expected FK violation was not raised';
    EXCEPTION WHEN foreign_key_violation THEN
        GET STACKED DIAGNOSTICS observed_constraint = CONSTRAINT_NAME;
        IF observed_constraint <> 'r0e_smoke_supersedes_fk' THEN
            RAISE EXCEPTION 'Unexpected FK constraint %', observed_constraint;
        END IF;
    END;
    IF (SELECT count(*) FROM pg_temp.r0e_smoke_versions) <> 2
       OR (SELECT count(*) FROM pg_temp.r0e_smoke_versions WHERE is_current) <> 1 THEN
        RAISE EXCEPTION 'Version probe did not retain exactly one current version';
    END IF;
END
$versions$;

CREATE TEMP TABLE pg_temp.r0e_smoke_types (
    id integer PRIMARY KEY,
    amount numeric(18,2) NOT NULL,
    cost numeric(15,4) NOT NULL,
    rate numeric(18,8) NOT NULL,
    optional_amount numeric(18,2),
    business_day date NOT NULL,
    occurred_at timestamptz NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb
) ON COMMIT DROP;
INSERT INTO pg_temp.r0e_smoke_types VALUES
    (1, '1.005', '123.45675', '0.130000005', NULL, DATE '2026-01-01',
     TIMESTAMPTZ '2026-01-01 00:15:00+08', '{"explicit_null":null,"rate":0.13,"empty":{}}');

DO $types$
DECLARE
    sample record;
BEGIN
    SELECT * INTO STRICT sample FROM pg_temp.r0e_smoke_types WHERE id = 1;
    IF sample.amount::text <> '1.01' OR sample.cost::text <> '123.4568'
       OR sample.rate::text <> '0.13000001' OR sample.optional_amount IS NOT NULL THEN
        RAISE EXCEPTION 'numeric scale/null storage mismatch';
    END IF;
    IF ('-1.005'::numeric(18,2))::text <> '-1.01'
       OR ('2.675'::numeric(18,2))::text <> '2.68'
       OR (0.1::numeric + 0.2::numeric) <> 0.3::numeric
       OR '9999999999999999.99'::numeric(18,2) <> 9999999999999999.99::numeric THEN
        RAISE EXCEPTION 'numeric boundary arithmetic mismatch';
    END IF;
    BEGIN
        INSERT INTO pg_temp.r0e_smoke_types (id, amount, cost, rate, business_day, occurred_at)
        VALUES (2, '9999999999999999.995', 0, 0, DATE '2026-01-01', now());
        RAISE EXCEPTION 'Expected numeric overflow was not raised';
    EXCEPTION WHEN numeric_value_out_of_range THEN
        NULL; -- SQLSTATE 22003 is required; other failures remain fatal.
    END;
    IF sample.business_day::text <> '2026-01-01'
       OR sample.occurred_at AT TIME ZONE 'UTC' <> TIMESTAMP '2025-12-31 16:15:00'
       OR sample.occurred_at AT TIME ZONE 'Etc/GMT-8' <> TIMESTAMP '2026-01-01 00:15:00'
       OR extract(timezone FROM sample.occurred_at) <> 28800 THEN
        RAISE EXCEPTION 'Date/timestamptz/Etc-GMT-8 offset mismatch';
    END IF;
    IF sample.payload -> 'explicit_null' IS DISTINCT FROM 'null'::jsonb
       OR sample.payload ? 'missing' OR sample.payload -> 'missing' IS NOT NULL
       OR sample.payload ->> 'rate' <> '0.13'
       OR jsonb_typeof(sample.payload -> 'empty') <> 'object' THEN
        RAISE EXCEPTION 'JSON null/missing/object/number distinction mismatch';
    END IF;
END
$types$;

SET LOCAL TIME ZONE 'UTC';
DO $date_invariance$
BEGIN
    IF (SELECT business_day::text FROM pg_temp.r0e_smoke_types WHERE id = 1) <> '2026-01-01'
       OR (SELECT occurred_at::date FROM pg_temp.r0e_smoke_types WHERE id = 1) <> DATE '2025-12-31' THEN
        RAISE EXCEPTION 'Date-only value or timestamp day conversion mismatch under UTC';
    END IF;
END
$date_invariance$;
SET LOCAL TIME ZONE 'Etc/GMT-8';

CREATE TEMP TABLE pg_temp.r0e_smoke_rates (
    rate_key text NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    status text NOT NULL DEFAULT 'active',
    CONSTRAINT r0e_smoke_active_range_excl EXCLUDE USING gist (
        rate_key WITH =,
        daterange(effective_from, coalesce(effective_to, 'infinity'::date), '[]') WITH &&
    ) WHERE (status = 'active')
) ON COMMIT DROP;
DO $ranges$
DECLARE observed_constraint text;
BEGIN
    INSERT INTO pg_temp.r0e_smoke_rates VALUES ('role:sales:day', '2026-01-01', '2026-01-31', 'active');
    BEGIN
        INSERT INTO pg_temp.r0e_smoke_rates VALUES ('role:sales:day', '2026-01-31', '2026-02-28', 'active');
        RAISE EXCEPTION 'Expected inclusive-range exclusion violation was not raised';
    EXCEPTION WHEN exclusion_violation THEN
        GET STACKED DIAGNOSTICS observed_constraint = CONSTRAINT_NAME;
        IF observed_constraint <> 'r0e_smoke_active_range_excl' THEN
            RAISE EXCEPTION 'Unexpected exclusion constraint %', observed_constraint;
        END IF;
    END;
    INSERT INTO pg_temp.r0e_smoke_rates VALUES ('role:sales:day', '2026-02-01', NULL, 'active');
    INSERT INTO pg_temp.r0e_smoke_rates VALUES ('role:sales:day', '2026-01-15', '2026-02-15', 'superseded');
END
$ranges$;

CREATE TEMP TABLE pg_temp.r0e_smoke_names (name text NOT NULL) ON COMMIT DROP;
CREATE UNIQUE INDEX r0e_smoke_lower_name_uq ON pg_temp.r0e_smoke_names (lower(name));
DO $names$
DECLARE observed_constraint text;
BEGIN
    INSERT INTO pg_temp.r0e_smoke_names VALUES ('Acme');
    BEGIN
        INSERT INTO pg_temp.r0e_smoke_names VALUES ('aCME');
        RAISE EXCEPTION 'Expected lower-case expression unique violation was not raised';
    EXCEPTION WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS observed_constraint = CONSTRAINT_NAME;
        IF observed_constraint <> 'r0e_smoke_lower_name_uq' THEN
            RAISE EXCEPTION 'Unexpected case-insensitive unique constraint %', observed_constraint;
        END IF;
    END;
END
$names$;

-- This fingerprint records a synthetic sample. It does not certify all locale
-- rules or equality with an unknown TEST OS/glibc locale-package patch level.
SELECT array_agg(value ORDER BY value COLLATE "default", value COLLATE "C") AS synthetic_sort_order,
       md5(string_agg(value, E'\n' ORDER BY value COLLATE "default", value COLLATE "C")) AS synthetic_sort_md5
FROM (VALUES ('a'), ('A'), ('á'), ('ä'), ('Z'), ('中'), ('文'), ('ss'), ('ß'), ('İ'), ('i')) AS fixture(value);

SAVEPOINT r0e_smoke_rollback;
INSERT INTO pg_temp.r0e_smoke_names VALUES ('rollback-only');
ROLLBACK TO SAVEPOINT r0e_smoke_rollback;
RELEASE SAVEPOINT r0e_smoke_rollback;
DO $rollback_probe$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_temp.r0e_smoke_names WHERE name = 'rollback-only') THEN
        RAISE EXCEPTION 'SAVEPOINT rollback left synthetic data';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_class
        WHERE relname IN ('r0e_smoke_versions', 'r0e_smoke_types', 'r0e_smoke_rates', 'r0e_smoke_names')
          AND (relnamespace <> pg_my_temp_schema() OR relpersistence <> 't')
    ) THEN
        RAISE EXCEPTION 'Smoke relation escaped the session TEMP schema';
    END IF;
END
$rollback_probe$;
ROLLBACK;

DO $cleanup$
BEGIN
    IF current_user <> 'poms_r0e_owner' OR current_setting('TimeZone') <> 'Etc/GMT-8' THEN
        RAISE EXCEPTION 'Transaction-local role/timezone did not reset';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_class
        WHERE relnamespace = pg_my_temp_schema()
          AND relname IN ('r0e_smoke_versions', 'r0e_smoke_types', 'r0e_smoke_rates', 'r0e_smoke_names')
    ) THEN
        RAISE EXCEPTION 'Top-level rollback left smoke TEMP tables';
    END IF;
END
$cleanup$;

SELECT pg_catalog.md5(coalesce(string_agg(
           format('%s:%s:%s:%s', n.nspname, c.relname, c.relkind, c.oid),
           E'\n' ORDER BY n.nspname, c.relname, c.relkind, c.oid), '')) = :'persistent_catalog_before' AS persistent_catalog_unchanged
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('poms', 'public')
\gset
\if :persistent_catalog_unchanged
\echo R0E_PG_SMOKE_PASS: guards, runtime TEMP privileges, extensions, constraints, numeric, dates, JSON and rollback passed
\else
\echo R0E_PG_SMOKE_FAIL: persistent poms/public relation catalog changed
\quit 1
\endif
