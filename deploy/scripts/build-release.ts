#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

import { join, resolve } from "@std/path";
import { booleanArg, optionalStringArg, parseArgs, stringArg } from "./lib/args.ts";
import { programOutput, runProgram } from "./lib/command.ts";
import { loadDeployConfig } from "./lib/config.ts";
import { assertExists, copyDir, ensureParentDir, removeIfExists } from "./lib/files.ts";
import { assertReleaseId } from "./lib/release.ts";

function timestamp(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return [
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate()),
        "-",
        pad(now.getHours()),
        pad(now.getMinutes()),
        pad(now.getSeconds())
    ].join("");
}

async function gitShortSha(): Promise<string | null> {
    try {
        return (await programOutput("git", ["rev-parse", "--short", "HEAD"], { quiet: true })).trim();
    } catch {
        return null;
    }
}

const args = parseArgs();
const config = await loadDeployConfig(stringArg(args, "config", "deploy/config/poms-test.jsonc"));
const releaseId = assertReleaseId(optionalStringArg(args, "release") ?? timestamp());
const archivePath = resolve(optionalStringArg(args, "out") ?? join(config.releaseArchiveDir, `${config.archivePrefix}-${releaseId}.tar.gz`));
const stageDir = join(config.stagingDir, `${config.archivePrefix}-${releaseId}`);
const skipBuild = booleanArg(args, "skip-build");
const keepStage = booleanArg(args, "keep-stage");
const force = booleanArg(args, "force");

if (!skipBuild) {
    await runProgram("corepack", ["pnpm", "nx", "build", "poms-admin"]);
    await runProgram("corepack", ["pnpm", "nx", "build", "poms-api"]);
}

await assertExists(join(config.adminBrowserDistDir, "index.html"), "Admin browser build output");
await assertExists(join(config.apiDistDir, "main.js"), "API build output");

if (force) {
    await removeIfExists(archivePath);
}

await removeIfExists(stageDir);
await ensureParentDir(join(stageDir, "admin", "browser", "index.html"));
await copyDir(config.adminBrowserDistDir, join(stageDir, "admin", "browser"));
await copyDir(config.apiDistDir, join(stageDir, "api"));

const manifest = {
    app: "poms",
    env: config.env,
    releaseId,
    createdAt: new Date().toISOString(),
    gitCommit: await gitShortSha(),
    adminRoot: "admin/browser",
    apiRoot: "api"
};

await Deno.writeTextFile(join(stageDir, "release-manifest.json"), `${JSON.stringify(manifest, null, 4)}\n`);
await ensureParentDir(archivePath);
await runProgram("tar", ["-czf", archivePath, "-C", stageDir, "."]);

if (!keepStage) {
    await removeIfExists(stageDir);
}

console.log(`Release archive created: ${archivePath}`);
