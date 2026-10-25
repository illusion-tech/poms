DO $$
BEGIN
    IF current_database() NOT IN ('poms_r0e_nest', 'poms_r0e_rust')
       OR current_user <> 'poms_r0e_owner'
       OR current_setting('server_version_num') <> '150012'
       OR current_setting('poms.r0e_isolated', true) IS DISTINCT FROM 'on' THEN
        RAISE EXCEPTION 'Refusing to initialize a database outside R0E';
    END IF;
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA IF NOT EXISTS poms AUTHORIZATION poms_r0e_owner;
CREATE SCHEMA IF NOT EXISTS r0e_control AUTHORIZATION poms_r0e_owner;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public VERSION '1.3';
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public VERSION '1.7';
GRANT USAGE ON SCHEMA public, poms TO poms_r0e_app;
ALTER ROLE poms_r0e_app SET search_path = poms, public;
CREATE TABLE IF NOT EXISTS r0e_control.marker (
    database_name text PRIMARY KEY CHECK (database_name IN ('poms_r0e_nest', 'poms_r0e_rust')),
    instance_id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO r0e_control.marker (database_name) VALUES (current_database())
ON CONFLICT (database_name) DO NOTHING;
