import type { DeployConfig } from "./config.ts";
import { programOutput, runProgram } from "./command.ts";
import { assertExists } from "./files.ts";

const MIKRO_ORM_CONFIG = "apps/poms-api/src/mikro-orm.config.ts";

export interface MigrationGateInput {
    envFile: string;
    dryRun?: boolean;
    pendingOnly?: boolean;
    skipMigration?: boolean;
    skipMigrationCheck?: boolean;
}

function migrationEnv(envFile: string): Record<string, string> {
    return {
        POMS_ENV_FILE: envFile,
        NODE_ENV: "production",
        NX_TUI: "false",
        MIKRO_ORM_CLI_TS_CONFIG_PATH: "tsconfig.base.json",
        NO_COLOR: "1",
        FORCE_COLOR: "0",
    };
}

function mikroOrmArgs(command: "migration:pending" | "migration:up" | "migration:check"): string[] {
    return ["pnpm", "exec", "mikro-orm", command, "--config", MIKRO_ORM_CONFIG];
}

function parseEnvFile(content: string): Record<string, string> {
    const values: Record<string, string> = {};

    for (const line of content.split(/\r?\n/)) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("#")) continue;

        const separator = trimmedLine.indexOf("=");
        if (separator === -1) continue;

        const key = trimmedLine.slice(0, separator).trim();
        const value = trimmedLine.slice(separator + 1).trim();
        values[key] = value.replace(/^(['"])(.*)\1$/, "$2");
    }

    return values;
}

async function logMigrationTarget(envFile: string): Promise<void> {
    const values = parseEnvFile(await Deno.readTextFile(envFile));
    const databaseUrl = values.DATABASE_URL?.trim() ? "<configured>" : "<empty>";
    const target = [
        `host=${values.DB_HOST ?? "<default>"}`,
        `port=${values.DB_PORT ?? "<default>"}`,
        `database=${values.DB_DATABASE ?? values.DB_NAME ?? "<default>"}`,
        `user=${values.DB_USER ?? "<default>"}`,
        `schema=${values.DB_SCHEMA ?? "<default>"}`,
        `databaseUrl=${databaseUrl}`,
    ].join(" ");

    console.log(`Migration target: ${target}`);
}

function hasPendingMigrations(output: string): boolean {
    return !/No pending migrations/i.test(output);
}

async function readPendingMigrations(envFile: string): Promise<{ output: string; hasPending: boolean }> {
    const output = await programOutput("corepack", mikroOrmArgs("migration:pending"), {
        env: migrationEnv(envFile),
    });

    return {
        output,
        hasPending: hasPendingMigrations(output),
    };
}

async function assertNoPendingMigrations(envFile: string): Promise<void> {
    const pending = await readPendingMigrations(envFile);
    const normalizedOutput = pending.output.trim();

    if (normalizedOutput) {
        console.log(normalizedOutput);
    }

    if (pending.hasPending) {
        throw new Error(`Migration gate failed: pending migrations remain for ${envFile}.`);
    }
}

export async function runMigrationGate(
    config: Pick<DeployConfig, "migrationCheckAfterUp">,
    input: MigrationGateInput,
): Promise<void> {
    if (input.skipMigration) {
        console.warn("Skipping database migration gate because --skip-migration was passed.");
        return;
    }

    if (input.dryRun) {
        console.log(`[dry-run] require migration env file: ${input.envFile}`);
        console.log(`[dry-run] Migration gate uses direct MikroORM CLI with ${MIKRO_ORM_CONFIG}`);
        console.log(`[dry-run] POMS_ENV_FILE=${input.envFile} corepack ${mikroOrmArgs("migration:pending").join(" ")}`);
        if (!input.pendingOnly) {
            console.log(`[dry-run] POMS_ENV_FILE=${input.envFile} corepack ${mikroOrmArgs("migration:up").join(" ")}`);
            console.log(`[dry-run] POMS_ENV_FILE=${input.envFile} corepack ${mikroOrmArgs("migration:pending").join(" ")}`);
            if (config.migrationCheckAfterUp && !input.skipMigrationCheck) {
                console.log(`[dry-run] POMS_ENV_FILE=${input.envFile} corepack ${mikroOrmArgs("migration:check").join(" ")}`);
            }
        }
        return;
    }

    await assertExists(input.envFile, "Migration env file");
    await logMigrationTarget(input.envFile);

    if (input.pendingOnly) {
        await assertNoPendingMigrations(input.envFile);
        return;
    }

    const pendingBefore = await readPendingMigrations(input.envFile);
    if (pendingBefore.output.trim()) {
        console.log(pendingBefore.output.trim());
    }

    await runProgram("corepack", mikroOrmArgs("migration:up"), {
        env: migrationEnv(input.envFile),
    });
    await assertNoPendingMigrations(input.envFile);

    if (config.migrationCheckAfterUp && !input.skipMigrationCheck) {
        await runProgram("corepack", mikroOrmArgs("migration:check"), {
            env: migrationEnv(input.envFile),
        });
    }
}
