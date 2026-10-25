#!/usr/bin/env bash
set -euo pipefail
umask 077

# Run inside the user's Debian WSL distro. Never reads the product .env.
readonly state="$HOME/.local/share/poms-r0e"
readonly container=poms-r0e-pg15
readonly volume=poms-r0e-pg15-data
readonly scope=rust-r0e
readonly image=localhost/poms-r0e-pg15:1
readonly expected_image=b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a
readonly source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
podman_cmd=(podman --cgroup-manager=cgroupfs)
die() { printf '%s\n' "$*" >&2; exit 1; }
[[ "$(id -u)" != 0 ]] || die 'Run as the ordinary WSL user, not root.'
[[ "$state" == /home/*/.local/share/poms-r0e ]] || die 'Unexpected state root.'

check_container() {
    [[ "$("${podman_cmd[@]}" volume inspect --format '{{index .Labels "org.poms.scope"}}' "$volume")" == "$scope" ]] || die 'Volume scope mismatch.'
    [[ "$("${podman_cmd[@]}" inspect --format '{{.Image}}' "$container")" == "$expected_image" ]] || die 'Container image mismatch.'
    [[ "$("${podman_cmd[@]}" inspect --format '{{json .HostConfig.PortBindings}}' "$container")" == '{"15432/tcp":[{"HostIp":"127.0.0.1","HostPort":"15432"}]}' ]] || die 'Container port binding mismatch.'
    [[ "$("${podman_cmd[@]}" inspect --format '{{index .Config.Labels "org.poms.scope"}}' "$container")" == "$scope" ]] || die 'Container scope mismatch.'
    [[ "$("${podman_cmd[@]}" inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' "$container")" == "$volume" ]] || die 'Data volume mismatch.'
}
sql() {
    check_container
    "${podman_cmd[@]}" exec "$container" psql -X --no-psqlrc --set=ON_ERROR_STOP=1 \
        --host=/run/postgresql --port=15432 --username=poms_r0e_owner "$@"
}
ensure_secret() {
    local name="$1" file="$2"
    if [[ ! -s "$file" ]]; then
        "${podman_cmd[@]}" volume exists "$volume" && die 'Existing volume requires its original private credentials.'
        head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' > "$file"
    fi
    chmod 600 "$file"
    if ! "${podman_cmd[@]}" secret inspect "$name" >/dev/null 2>&1; then
        "${podman_cmd[@]}" secret create --label "org.poms.scope=$scope" "$name" "$file" >/dev/null
    fi
    [[ "$("${podman_cmd[@]}" secret inspect --format '{{index .Spec.Labels "org.poms.scope"}}' "$name")" == "$scope" ]] || die 'Secret scope mismatch.'
}

case "${1:-status}" in
    start)
        mkdir -p "$state/private" "$state/sql" "$state/logs"
        chmod 700 "$state" "$state/private"
        cp "$source_dir/verify-target.sql" "$state/sql/verify-target.sql"
        chmod 755 "$state/sql"
        chmod 644 "$state/sql/verify-target.sql"
        [[ "$("${podman_cmd[@]}" image inspect --format '{{.Id}}' "$image")" == "$expected_image" ]] || die 'Image ID differs from the reviewed build.'
        if "${podman_cmd[@]}" container exists "$container"; then
            check_container
            "${podman_cmd[@]}" start "$container" >/dev/null
        else
            ensure_secret poms-r0e-owner-password "$state/private/owner-password"
            ensure_secret poms-r0e-app-password "$state/private/app-password"
            if ! "${podman_cmd[@]}" volume exists "$volume"; then
                "${podman_cmd[@]}" volume create --label "org.poms.scope=$scope" "$volume" >/dev/null
            fi
            [[ "$("${podman_cmd[@]}" volume inspect --format '{{index .Labels "org.poms.scope"}}' "$volume")" == "$scope" ]] || die 'Volume scope mismatch.'
            [[ "$("${podman_cmd[@]}" image inspect --format '{{index .Labels "org.poms.scope"}}' "$image")" == "$scope" ]] || die 'Image scope mismatch.'
            "${podman_cmd[@]}" run --detach --name "$container" --label "org.poms.scope=$scope" \
                --network=slirp4netns --publish 127.0.0.1:15432:15432 \
                --security-opt=no-new-privileges \
                --mount "type=volume,source=$volume,destination=/var/lib/postgresql/data" \
                --mount "type=bind,source=$state/sql,destination=/opt/r0e-sql,ro=true" \
                --secret poms-r0e-owner-password,target=r0e-password,uid=1000,gid=1000,mode=0400 \
                --secret poms-r0e-app-password,target=r0e-app-password,uid=1000,gid=1000,mode=0400 \
                "$image" >/dev/null
        fi
        for ((attempt=0; attempt<30; attempt++)); do
            if "${podman_cmd[@]}" exec "$container" pg_isready -h /run/postgresql -p 15432 -U poms_r0e_owner >/dev/null 2>&1; then break; fi
            sleep 1
        done
        sql --dbname=postgres --file=/opt/r0e-sql/verify-target.sql
        printf 'Started %s on WSL 127.0.0.1:15432; existing PG17 is untouched.\n' "$container"
        ;;
    provision)
        cp "$source_dir/provision.sql" "$source_dir/provision-database.sql" "$state/sql/"
        chmod 755 "$state/sql"
        chmod 644 "$state/sql/"*.sql
        sql --dbname=postgres --file=/opt/r0e-sql/provision.sql
        ;;
    verify)
        cp "$source_dir/pg-smoke.sql" "$state/sql/pg-smoke.sql"
        chmod 644 "$state/sql/pg-smoke.sql"
        for database in poms_r0e_nest poms_r0e_rust; do
            sql --dbname="$database" --file=/opt/r0e-sql/pg-smoke.sql
            sql --dbname="$database" --tuples-only --command='SELECT database_name, instance_id, created_at FROM r0e_control.marker;'
        done
        ;;
    stop)
        check_container
        "${podman_cmd[@]}" stop --time 30 "$container"
        printf 'Stopped; data volume and credentials retained.\n'
        ;;
    status)
        check_container
        "${podman_cmd[@]}" inspect --format '{{.Name}} {{.State.Status}} {{.Image}}' "$container"
        "${podman_cmd[@]}" port "$container"
        ;;
    *) die 'Usage: environment.sh start|provision|verify|stop|status (no automatic data deletion).' ;;
esac
