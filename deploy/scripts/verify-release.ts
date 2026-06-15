#!/usr/bin/env -S deno run --allow-read --allow-net --allow-run --allow-env

import { resolve } from "@std/path";
import { booleanArg, optionalStringArg, parseArgs, stringArg } from "./lib/args.ts";
import { programOutput } from "./lib/command.ts";
import { loadDeployConfig } from "./lib/config.ts";
import { runMigrationGate } from "./lib/migration-gate.ts";

interface HttpResult {
    status: number;
    headers: Headers;
    body: string;
}

async function fetchHttp(url: string, init: RequestInit = {}): Promise<HttpResult> {
    const response = await fetch(url, {
        redirect: "manual",
        ...init
    });
    const body = init.method === "HEAD" ? "" : await response.text();
    return { status: response.status, headers: response.headers, body };
}

async function curlHttp(url: string, head = false): Promise<HttpResult> {
    const args = head ? ["-k", "-fsSI", url] : ["-k", "-fsS", url];
    const output = await programOutput("curl", args);
    if (!head) {
        return { status: 200, headers: new Headers(), body: output };
    }

    const headers = new Headers();
    let status = 0;
    for (const line of output.split(/\r?\n/)) {
        const statusMatch = /^HTTP\/\S+\s+(\d+)/.exec(line);
        if (statusMatch) {
            status = Number(statusMatch[1]);
            continue;
        }
        const separator = line.indexOf(":");
        if (separator !== -1) {
            headers.append(line.slice(0, separator), line.slice(separator + 1).trim());
        }
    }
    return { status, headers, body: "" };
}

function request(url: string, options: { head?: boolean; insecure?: boolean } = {}): Promise<HttpResult> {
    if (options.insecure) {
        return curlHttp(url, options.head);
    }
    return fetchHttp(url, options.head ? { method: "HEAD" } : {});
}

function assertOk(result: HttpResult, label: string): void {
    if (result.status < 200 || result.status >= 400) {
        throw new Error(`${label} returned HTTP ${result.status}`);
    }
}

function assertHeaderIncludes(result: HttpResult, name: string, expected: string): void {
    const value = result.headers.get(name);
    if (!value || !value.toLowerCase().includes(expected.toLowerCase())) {
        throw new Error(`Expected ${name} to include ${expected}; got ${value ?? "<missing>"}`);
    }
}

const args = parseArgs();
const config = await loadDeployConfig(stringArg(args, "config", "deploy/config/poms-test.jsonc"));
const origin = optionalStringArg(args, "origin") ?? `https://${config.domain}`;
const insecure = booleanArg(args, "insecure");
const skipMigrationGate = booleanArg(args, "skip-migration-gate");
const migrationEnvFile = resolve(optionalStringArg(args, "migration-env") ?? config.migrationEnvFile);

assertOk(await request(`${origin}/api/health`, { insecure }), "/api/health");
assertOk(await request(`${origin}/api/health/readiness`, { insecure }), "/api/health/readiness");
assertOk(await request(`${origin}/api-docs/`, { head: true, insecure }), "/api-docs/");
assertOk(await request(`${origin}/projects`, { head: true, insecure }), "/projects");

const indexHeaders = await request(`${origin}/index.html`, { head: true, insecure });
assertOk(indexHeaders, "/index.html");
assertHeaderIncludes(indexHeaders, "Cache-Control", "no-store");

const apiHeaders = await request(`${origin}/api/health`, { head: true, insecure });
assertOk(apiHeaders, "/api/health headers");
assertHeaderIncludes(apiHeaders, "Cache-Control", "no-store");

if (!skipMigrationGate) {
    await runMigrationGate(config, {
        envFile: migrationEnvFile,
        pendingOnly: true,
    });
}

console.log(`Deployment verification passed: ${origin}`);
