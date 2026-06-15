#!/usr/bin/env -S deno run --allow-read --allow-run --allow-env

import { resolve } from "@std/path";
import { booleanArg, optionalStringArg, parseArgs, stringArg } from "./lib/args.ts";
import { loadDeployConfig } from "./lib/config.ts";
import { runMigrationGate } from "./lib/migration-gate.ts";

const args = parseArgs();
const config = await loadDeployConfig(stringArg(args, "config", "deploy/config/poms-test.jsonc"));
const migrationEnvFile = resolve(optionalStringArg(args, "migration-env") ?? config.migrationEnvFile);

await runMigrationGate(config, {
    envFile: migrationEnvFile,
    dryRun: booleanArg(args, "dry-run"),
    pendingOnly: booleanArg(args, "pending-only"),
    skipMigration: booleanArg(args, "skip-migration"),
    skipMigrationCheck: booleanArg(args, "skip-migration-check"),
});
