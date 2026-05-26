#!/usr/bin/env -S deno run --allow-read --allow-run

import { booleanArg, optionalStringArg, parseArgs, stringArg } from "./lib/args.ts";
import { loadDeployConfig } from "./lib/config.ts";
import { remoteHost, remoteQuote, sshScript } from "./lib/remote.ts";

function preflightScript(config: Awaited<ReturnType<typeof loadDeployConfig>>): string {
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
require_command pm2
require_command nginx
require_command tar
require_command readlink
require_command systemctl

test -f ${remoteQuote(config.apiEnvFile)} || { echo "API env file not found: ${config.apiEnvFile}" >&2; exit 1; }
if grep -q '<replace-me>' ${remoteQuote(config.apiEnvFile)}; then
    echo "API env file still contains <replace-me>: ${config.apiEnvFile}" >&2
    exit 1
fi

test -f ${remoteQuote(config.remoteSslCertPath)} || { echo "TLS cert not found: ${config.remoteSslCertPath}" >&2; exit 1; }
test -f ${remoteQuote(config.remoteSslKeyPath)} || { echo "TLS key not found: ${config.remoteSslKeyPath}" >&2; exit 1; }

echo "Remote preflight passed for ${config.env}: ${config.domain}"
`;
}

const args = parseArgs();
const config = await loadDeployConfig(stringArg(args, "config", "deploy/config/poms-test.jsonc"));
const host = remoteHost(config, optionalStringArg(args, "host"));
const dryRun = booleanArg(args, "dry-run");

await sshScript(host, preflightScript(config), { dryRun });
