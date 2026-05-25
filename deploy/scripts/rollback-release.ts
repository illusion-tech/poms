#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

import { join } from "jsr:@std/path@^1";
import { booleanArg, optionalStringArg, parseArgs, stringArg } from "./lib/args.ts";
import { runCommand, shellQuote } from "./lib/command.ts";
import { loadDeployConfig } from "./lib/config.ts";
import { assertExists } from "./lib/files.ts";

async function previousReleaseId(releasesDir: string, currentPath: string): Promise<string> {
    const currentRealPath = await Deno.realPath(currentPath).catch(() => null);
    const releases: string[] = [];

    for await (const entry of Deno.readDir(releasesDir)) {
        if (!entry.isDirectory || entry.name.startsWith(".")) continue;
        const releasePath = join(releasesDir, entry.name);
        const realPath = await Deno.realPath(releasePath).catch(() => releasePath);
        if (currentRealPath && realPath === currentRealPath) continue;
        releases.push(entry.name);
    }

    releases.sort().reverse();
    const previous = releases[0];
    if (!previous) {
        throw new Error(`No previous release found in ${releasesDir}`);
    }
    return previous;
}

const args = parseArgs();
const config = await loadDeployConfig(stringArg(args, "config", "deploy/config/poms-test.jsonc"));
const releaseId = booleanArg(args, "previous")
    ? await previousReleaseId(config.releasesDir, config.currentPath)
    : optionalStringArg(args, "to");

if (!releaseId) {
    throw new Error("Pass --to <release-id> or --previous");
}

const releaseDir = join(config.releasesDir, releaseId);
await assertExists(join(releaseDir, "admin", "browser", "index.html"), "Rollback Admin index");
await assertExists(join(releaseDir, "api", "main.js"), "Rollback API entry");
await assertExists(config.pm2ConfigPath, "PM2 config template");

await runCommand(`ln -sfn ${shellQuote(releaseDir)} ${shellQuote(config.currentPath)}`);
await runCommand(`pm2 startOrReload ${shellQuote(config.pm2ConfigPath)} --env production`);
await runCommand("pm2 save");

console.log(`Rolled back to release: ${releaseId}`);
