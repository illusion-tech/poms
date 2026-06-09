#!/usr/bin/env -S deno run --allow-read --allow-run

import { basename, resolve } from "@std/path";
import * as posix from "@std/path/posix";
import { booleanArg, optionalStringArg, parseArgs, stringArg } from "./lib/args.ts";
import { runProgram } from "./lib/command.ts";
import { loadDeployConfig } from "./lib/config.ts";
import { assertExists } from "./lib/files.ts";
import { assertReleaseId } from "./lib/release.ts";
import { remoteArchivePath, remoteHost, remoteQuote, remoteTmpReleaseDir, scpFile, sshScript } from "./lib/remote.ts";

function deriveReleaseId(archivePath: string, archivePrefix: string): string {
    const name = basename(archivePath);
    const prefix = `${archivePrefix}-`;
    if (!name.startsWith(prefix) || !name.endsWith(".tar.gz")) {
        throw new Error(`Cannot derive release id from archive name: ${name}. Pass --release explicitly.`);
    }
    return name.slice(prefix.length, -".tar.gz".length);
}

function stageReleaseScript(input: {
    config: Awaited<ReturnType<typeof loadDeployConfig>>;
    releaseId: string;
    archivePath: string;
    force: boolean;
}): string {
    const { config, releaseId, archivePath, force } = input;
    const incomingDir = posix.join(config.releasesDir, `.incoming-${releaseId}`);
    const releaseDir = posix.join(config.releasesDir, releaseId);

    return `set -euo pipefail

require_command() {
    command -v "$1" >/dev/null 2>&1 || {
        echo "Missing required command: $1" >&2
        exit 1
    }
}

require_command node
require_command corepack
require_command pnpm
require_command tar

release_id=${remoteQuote(releaseId)}
archive_path=${remoteQuote(archivePath)}
release_dir=${remoteQuote(releaseDir)}
incoming_dir=${remoteQuote(incomingDir)}
api_env_file=${remoteQuote(config.apiEnvFile)}
pm2_config_path=${remoteQuote(config.remotePm2ConfigPath)}

mkdir -p ${remoteQuote(config.releasesDir)} ${remoteQuote(config.sharedLogsDir)} ${remoteQuote(config.sharedUploadsDir)}
mkdir -p ${remoteQuote(posix.dirname(config.remotePm2ConfigPath))}

test -f "$archive_path" || { echo "Release archive not found: $archive_path" >&2; exit 1; }
test -f "$pm2_config_path" || { echo "PM2 config not found: $pm2_config_path" >&2; exit 1; }
test -f "$api_env_file" || { echo "API env file not found: $api_env_file" >&2; exit 1; }
if grep -Ev '^[[:space:]]*(#|$)' "$api_env_file" | grep -q '<replace-me>'; then
    echo "API env file still contains <replace-me>: $api_env_file" >&2
    exit 1
fi
chmod 600 "$api_env_file"

if [ -e "$release_dir" ]; then
    if [ ${force ? "1" : "0"} -eq 1 ]; then
        rm -rf "$release_dir"
    else
        echo "Release already exists: $release_dir. Pass --force to replace it." >&2
        exit 1
    fi
fi

rm -rf "$incoming_dir"
mkdir -p "$incoming_dir"
tar -xzf "$archive_path" -C "$incoming_dir"

test -f "$incoming_dir/admin/browser/index.html" || { echo "Missing admin/browser/index.html in release" >&2; exit 1; }
test -f "$incoming_dir/api/main.js" || { echo "Missing api/main.js in release" >&2; exit 1; }

if [ -f "$incoming_dir/api/package.json" ]; then
    (cd "$incoming_dir/api" && corepack pnpm install --prod --frozen-lockfile)
fi

echo "Release staged: $incoming_dir"
`;
}

function activateReleaseScript(input: {
    config: Awaited<ReturnType<typeof loadDeployConfig>>;
    releaseId: string;
    force: boolean;
    installNginx: boolean;
    reloadNginx: boolean;
}): string {
    const { config, releaseId, force, installNginx, reloadNginx } = input;
    const incomingDir = posix.join(config.releasesDir, `.incoming-${releaseId}`);
    const releaseDir = posix.join(config.releasesDir, releaseId);

    return `set -euo pipefail

require_command() {
    command -v "$1" >/dev/null 2>&1 || {
        echo "Missing required command: $1" >&2
        exit 1
    }
}

require_command pm2
require_command readlink
${reloadNginx ? "require_command nginx\nrequire_command systemctl" : ""}

release_id=${remoteQuote(releaseId)}
release_dir=${remoteQuote(releaseDir)}
incoming_dir=${remoteQuote(incomingDir)}
current_path=${remoteQuote(config.currentPath)}
pm2_config_path=${remoteQuote(config.remotePm2ConfigPath)}

test -f "$pm2_config_path" || { echo "PM2 config not found: $pm2_config_path" >&2; exit 1; }
test -f "$incoming_dir/admin/browser/index.html" || { echo "Missing admin/browser/index.html in staged release" >&2; exit 1; }
test -f "$incoming_dir/api/main.js" || { echo "Missing api/main.js in staged release" >&2; exit 1; }

if [ -e "$release_dir" ]; then
    if [ ${force ? "1" : "0"} -eq 1 ]; then
        rm -rf "$release_dir"
    else
        echo "Release already exists: $release_dir. Pass --force to replace it." >&2
        exit 1
    fi
fi

previous_current=""
if [ -e "$current_path" ] || [ -L "$current_path" ]; then
    previous_current="$(readlink -f "$current_path" || true)"
fi

mv "$incoming_dir" "$release_dir"
ln -sfn "$release_dir" "$current_path"

${installNginx ? `ln -sfn ${remoteQuote(config.remoteNginxAvailablePath)} ${remoteQuote(config.remoteNginxEnabledPath)}` : ":"}

if ! pm2 startOrReload "$pm2_config_path" --env production; then
    echo "PM2 reload failed after release activation: $release_dir" >&2
    if [ -n "$previous_current" ] && [ -d "$previous_current" ]; then
        echo "Restoring current symlink to: $previous_current" >&2
        ln -sfn "$previous_current" "$current_path"
        pm2 startOrReload "$pm2_config_path" --env production || true
    fi
    exit 1
fi
pm2 save

${reloadNginx ? "nginx -t\nsystemctl reload nginx" : ":"}

echo "Release installed: $release_dir"
`;
}

async function runMigrationGate(
    config: Awaited<ReturnType<typeof loadDeployConfig>>,
    input: {
        dryRun: boolean;
        envFile: string;
        skipMigration: boolean;
        skipMigrationCheck: boolean;
    },
): Promise<void> {
    if (input.skipMigration) {
        console.warn("Skipping database migration gate because --skip-migration was passed.");
        return;
    }

    if (input.dryRun) {
        console.log(`[dry-run] require migration env file: ${input.envFile}`);
        console.log(
            `[dry-run] POMS_ENV_FILE=${input.envFile} NODE_ENV=production NX_TUI=false corepack pnpm nx run poms-api:migration-up --skip-nx-cache`,
        );
        if (config.migrationCheckAfterUp && !input.skipMigrationCheck) {
            console.log(
                `[dry-run] POMS_ENV_FILE=${input.envFile} NODE_ENV=production NX_TUI=false corepack pnpm nx run poms-api:migration-check --skip-nx-cache`,
            );
        }
        return;
    }

    await assertExists(input.envFile, "Migration env file");

    const env = {
        POMS_ENV_FILE: input.envFile,
        NODE_ENV: "production",
        NX_TUI: "false",
    };

    await runProgram("corepack", ["pnpm", "nx", "run", "poms-api:migration-up", "--skip-nx-cache"], { env });

    if (config.migrationCheckAfterUp && !input.skipMigrationCheck) {
        await runProgram("corepack", ["pnpm", "nx", "run", "poms-api:migration-check", "--skip-nx-cache"], { env });
    }
}

const args = parseArgs();
const config = await loadDeployConfig(stringArg(args, "config", "deploy/config/poms-test.jsonc"));
const archivePath = resolve(stringArg(args, "archive"));
const host = remoteHost(config, optionalStringArg(args, "host"));
const releaseId = assertReleaseId(
    optionalStringArg(args, "release") ?? deriveReleaseId(archivePath, config.archivePrefix),
);
const dryRun = booleanArg(args, "dry-run");
const force = booleanArg(args, "force");
const installNginx = booleanArg(args, "install-nginx");
const reloadNginx = installNginx || booleanArg(args, "reload-nginx");
const skipMigration = booleanArg(args, "skip-migration");
const skipMigrationCheck = booleanArg(args, "skip-migration-check");
const migrationEnvFile = resolve(optionalStringArg(args, "migration-env") ?? config.migrationEnvFile);

await assertExists(archivePath, "Release archive");
await assertExists(config.pm2ConfigPath, "PM2 config template");
if (installNginx) {
    await assertExists(config.nginxSiteTemplatePath, "Nginx site template");
}

const remoteReleaseDir = remoteTmpReleaseDir(config);
const remoteArchive = remoteArchivePath(config, archivePath);

await sshScript(
    host,
    `set -euo pipefail
mkdir -p ${remoteQuote(remoteReleaseDir)} ${remoteQuote(posix.dirname(config.remotePm2ConfigPath))}
${installNginx ? `mkdir -p ${remoteQuote(posix.dirname(config.remoteNginxAvailablePath))}` : ""}
`,
    { dryRun },
);
await scpFile(archivePath, host, remoteArchive, { dryRun });
await scpFile(config.pm2ConfigPath, host, config.remotePm2ConfigPath, { dryRun });

if (installNginx) {
    await scpFile(config.nginxSiteTemplatePath, host, config.remoteNginxAvailablePath, { dryRun });
}

await sshScript(
    host,
    stageReleaseScript({
        config,
        releaseId,
        archivePath: remoteArchive,
        force,
    }),
    { dryRun },
);

await runMigrationGate(config, {
    dryRun,
    envFile: migrationEnvFile,
    skipMigration,
    skipMigrationCheck,
});

await sshScript(
    host,
    activateReleaseScript({
        config,
        releaseId,
        force,
        installNginx,
        reloadNginx,
    }),
    { dryRun },
);
