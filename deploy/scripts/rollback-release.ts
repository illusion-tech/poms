#!/usr/bin/env -S deno run --allow-read --allow-run

import { booleanArg, optionalStringArg, parseArgs, stringArg } from "./lib/args.ts";
import { loadDeployConfig } from "./lib/config.ts";
import { remoteHost, remoteQuote, sshScript } from "./lib/remote.ts";
import { assertReleaseId } from "./lib/release.ts";

function rollbackScript(config: Awaited<ReturnType<typeof loadDeployConfig>>, input: { previous: boolean; releaseId?: string }): string {
    const explicitRelease = input.releaseId ? remoteQuote(input.releaseId) : "''";

    return `set -euo pipefail

release_id=${explicitRelease}
releases_dir=${remoteQuote(config.releasesDir)}
current_path=${remoteQuote(config.currentPath)}
pm2_config_path=${remoteQuote(config.remotePm2ConfigPath)}

test -d "$releases_dir" || { echo "Releases directory not found: $releases_dir" >&2; exit 1; }
test -f "$pm2_config_path" || { echo "PM2 config not found: $pm2_config_path" >&2; exit 1; }

if [ ${input.previous ? "1" : "0"} -eq 1 ]; then
    current_real="$(readlink -f "$current_path" 2>/dev/null || true)"
    release_id=""
    for candidate in $(ls -1 "$releases_dir" | sort -r); do
        case "$candidate" in
            .*) continue ;;
        esac
        candidate_path="$releases_dir/$candidate"
        [ -d "$candidate_path" ] || continue
        candidate_real="$(readlink -f "$candidate_path")"
        if [ -z "$current_real" ] || [ "$candidate_real" != "$current_real" ]; then
            release_id="$candidate"
            break
        fi
    done
fi

[ -n "$release_id" ] || { echo "No rollback release selected" >&2; exit 1; }
release_dir="$releases_dir/$release_id"

test -f "$release_dir/admin/browser/index.html" || { echo "Rollback Admin index not found: $release_dir" >&2; exit 1; }
test -f "$release_dir/api/main.js" || { echo "Rollback API entry not found: $release_dir" >&2; exit 1; }

ln -sfn "$release_dir" "$current_path"
pm2 startOrReload "$pm2_config_path" --env production
pm2 save

echo "Rolled back to release: $release_id"
`;
}

const args = parseArgs();
const config = await loadDeployConfig(stringArg(args, "config", "deploy/config/poms-test.jsonc"));
const host = remoteHost(config, optionalStringArg(args, "host"));
const dryRun = booleanArg(args, "dry-run");
const previous = booleanArg(args, "previous");
const releaseId = optionalStringArg(args, "to");
const checkedReleaseId = releaseId ? assertReleaseId(releaseId) : undefined;

if (!previous && !releaseId) {
    throw new Error("Pass --to <release-id> or --previous");
}

if (previous && releaseId) {
    throw new Error("Use either --previous or --to, not both");
}

await sshScript(host, rollbackScript(config, { previous, releaseId: checkedReleaseId }), { dryRun });
