#!/usr/bin/env -S deno run --allow-read --allow-run --allow-env

import { optionalStringArg, parseArgs, stringArg } from "./lib/args.ts";
import { commandOutput } from "./lib/command.ts";
import { loadDeployConfig } from "./lib/config.ts";

async function curl(url: string, head = false): Promise<string> {
    const flag = head ? "-fsSI" : "-fsS";
    return await commandOutput(`curl -k ${flag} ${JSON.stringify(url)}`);
}

function assertHeader(headers: string, name: string, expected: string): void {
    const lower = headers.toLowerCase();
    const needle = `${name.toLowerCase()}:`;
    const line = lower.split(/\r?\n/).find((item) => item.startsWith(needle));
    if (!line || !line.includes(expected.toLowerCase())) {
        throw new Error(`Expected header ${name} to include ${expected}`);
    }
}

const args = parseArgs();
const config = await loadDeployConfig(stringArg(args, "config", "deploy/config/poms-test.jsonc"));
const origin = optionalStringArg(args, "origin") ?? `https://${config.domain}`;

await curl(`${origin}/api/health`);
await curl(`${origin}/api/health/readiness`);
await curl(`${origin}/api-docs/`, true);
await curl(`${origin}/projects`, true);

const indexHeaders = await curl(`${origin}/index.html`, true);
assertHeader(indexHeaders, "Cache-Control", "no-store");

const apiHeaders = await curl(`${origin}/api/health`, true);
assertHeader(apiHeaders, "Cache-Control", "no-store");

console.log(`Deployment verification passed: ${origin}`);
