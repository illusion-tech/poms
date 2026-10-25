\set ON_ERROR_STOP on
DO $$
BEGIN
    IF current_database() <> 'postgres'
       OR current_user <> 'poms_r0e_owner'
       OR current_setting('server_version_num') <> '150012'
       OR current_setting('port') <> '15432'
       OR current_setting('poms.r0e_isolated', true) IS DISTINCT FROM 'on' THEN
        RAISE EXCEPTION 'Refusing to provision a database outside the R0E instance';
    END IF;
END $$;

SELECT format('CREATE ROLE poms_r0e_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L',
              trim(pg_read_file('/run/secrets/r0e-app-password')))
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'poms_r0e_app')
\gexec
SELECT format('CREATE DATABASE %I OWNER poms_r0e_owner TEMPLATE template0 ENCODING %L LC_COLLATE %L LC_CTYPE %L',
              name, 'UTF8', 'en_US.UTF-8', 'en_US.UTF-8')
FROM (VALUES ('poms_r0e_nest'), ('poms_r0e_rust')) AS target(name)
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = target.name)
\gexec
REVOKE ALL ON DATABASE poms_r0e_nest, poms_r0e_rust FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE poms_r0e_nest, poms_r0e_rust TO poms_r0e_app;

\connect poms_r0e_nest
\ir provision-database.sql
\connect poms_r0e_rust
\ir provision-database.sql
