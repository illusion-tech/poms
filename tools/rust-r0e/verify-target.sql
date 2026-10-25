\set ON_ERROR_STOP on
DO $$
BEGIN
    IF current_database() <> 'postgres'
       OR current_user <> 'poms_r0e_owner'
       OR current_setting('server_version_num') <> '150012'
       OR current_setting('port') <> '15432'
       OR current_setting('poms.r0e_isolated', true) IS DISTINCT FROM 'on' THEN
        RAISE EXCEPTION 'R0E instance identity verification failed';
    END IF;
END $$;
SELECT current_setting('server_version') AS version,
       current_setting('port') AS port,
       current_setting('poms.r0e_isolated') AS isolated;
