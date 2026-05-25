#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

import { basename, join, resolve } from "jsr:@std/path@^1";
import { booleanArg, optionalStringArg, parseArgs, stringArg } from "./lib/args.ts";
import { runCommand, runProgram, shellQuote } from "./lib/command.ts";
import { loadDeployConfig } from "./lib/config.ts";
import { assertExists, ensureDir, exists, removeIfExists } from "./lib/files.ts";

function deriveReleaseId(archivePath: string, archivePrefix: string): string {
    const name = basename(archivePath);
    const prefix = `${archivePrefix}-`;
    if (!name.startsWith(prefix) || !name.endsWith(".tar.gz")) {
        throw new Error(`Cannot derive release id from archive name: ${name}. Pass --release explicitly.`);
    }
    return name.slice(prefix.length, -".tar.gz".length);
}

async function assertEnvFileReady(path: string): Promise<void> {
    await assertExists(path, "API env file");
    const content = await Deno.readTextFile(path);
    if (content.includes("<replace-me>")) {
        throw new Error(`API env file still contains <replace-me>: ${path}`);
    }
}

const args = parseArgs();
const config = await loadDeployConfig(stringArg(args, "config", "deploy/config/poms-test.jsonc"));
const archivePath = resolve(stringArg(args, "archive"));
const releaseId = optionalStringArg(args, "release") ?? deriveReleaseId(archivePath, config.archivePrefix);
const releaseDir = join(config.releasesDir, releaseId);
const incomingDir = join(config.releasesDir, `.incoming-${releaseId}`);
const force = booleanArg(args, "force");
const installNginx = booleanArg(args, "install-nginx");
const reloadNginx = installNginx || booleanArg(args, "reload-nginx");

await assertExists(archivePath, "Release archive");
await assertExists(config.pm2ConfigPath, "PM2 config template");
await assertEnvFileReady(config.apiEnvFile);

if (await exists(releaseDir)) {
    if (!force) {
        throw new Error(`Release already exists: ${releaseDir}. Pass --force to replace it.`);
    }
    await removeIfExists(releaseDir);
}

await ensureDir(config.releasesDir);
await ensureDir(config.sharedLogsDir);
await ensureDir(config.sharedUploadsDir);
await removeIfExists(incomingDir);
await ensureDir(incomingDir);

await runProgram("tar", ["-xzf", archivePath, "-C", incomingDir]);
await assertExists(join(incomingDir, "admin", "browser", "index.html"), "Extracted Admin index");
await assertExists(join(incomingDir, "api", "main.js"), "Extracted API entry");

if (await exists(join(incomingDir, "api", "package.json"))) {
    await runCommand("corepack pnpm install --prod --frozen-lockfile", { cwd: join(incomingDir, "api") });
}

await Deno.rename(incomingDir, releaseDir);
await runCommand(`ln -sfn ${shellQuote(releaseDir)} ${shellQuote(config.currentPath)}`);
await runCommand(`chmod 600 ${shellQuote(config.apiEnvFile)}`);

if (installNginx) {
    const available = join(config.nginxSitesAvailableDir, config.nginxSiteName);
    const enabled = join(config.nginxSitesEnabledDir, config.nginxSiteName);
    await assertExists(config.nginxSiteTemplatePath, "Nginx site template");
    await runCommand(`cp -f ${shellQuote(config.nginxSiteTemplatePath)} ${shellQuote(available)}`);
    await runCommand(`ln -sfn ${shellQuote(available)} ${shellQuote(enabled)}`);
}

await runCommand(`pm2 startOrReload ${shellQuote(config.pm2ConfigPath)} --env production`);
await runCommand("pm2 save");

if (reloadNginx) {
    await runCommand("nginx -t");
    await runCommand("systemctl reload nginx");
}

console.log(`Release installed: ${releaseDir}`);
