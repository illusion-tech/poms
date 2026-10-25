#!/usr/bin/env bash
set -euo pipefail
if [[ ! -s "$PGDATA/PG_VERSION" ]]; then
    test -f /run/secrets/r0e-password
    initdb --username=poms_r0e_owner --pwfile=/run/secrets/r0e-password \
        --encoding=UTF8 --locale=en_US.UTF-8 --auth-host=scram-sha-256 --auth-local=peer
    printf 'local all poms_r0e_owner peer map=r0e_owner\n' > "$PGDATA/pg_hba.conf"
    printf 'host all all 0.0.0.0/0 scram-sha-256\nhost all all ::/0 scram-sha-256\n' >> "$PGDATA/pg_hba.conf"
    printf 'r0e_owner postgres poms_r0e_owner\n' > "$PGDATA/pg_ident.conf"
fi
test "$(cat "$PGDATA/PG_VERSION")" = 15
exec postgres -D "$PGDATA" -p 15432 -k /run/postgresql \
    -c listen_addresses='*' -c timezone=Etc/GMT-8 \
    -c poms.r0e_isolated=on -c password_encryption=scram-sha-256
