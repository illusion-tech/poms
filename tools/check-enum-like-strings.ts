#!/usr/bin/env -S deno run --allow-read
// Usage: deno run --allow-read tools/check-enum-like-strings.ts

type RuleId =
    | "enum-like-comparison"
    | "enum-like-fixture"
    | "inline-string-union"
    | "inline-z-enum"
    | "string-as-const"
    | "record-string-string"
    | "object-entries-labels"
    | "generated-client-string-field";

interface AllowlistEntry {
    id: string;
    ruleId?: RuleId;
    path?: string;
    pathPrefix?: string;
    textIncludes?: string;
    regex?: string;
    reason: string;
    cleanupOwner: string;
    cleanupDue: string;
    maxMatches?: number;
}

interface Finding {
    ruleId: RuleId;
    path: string;
    line: number;
    text: string;
}

interface Rule {
    id: RuleId;
    pattern: RegExp;
    include?: (path: string) => boolean;
}

const enumLikeFields =
    "status|type|sourceType|targetType|stage|decision|mode|category|priority|handoverStatus|diffLevel|reviewStatus|packageStatus|guardDecision|result|level";

const enumLikeTypeNames =
    "Status|Type|Source|Target|Stage|Decision|Mode|Category|Priority|Level|Result|Severity|Role|Scope";

const roots = [
    "apps/poms-admin/src/app/features",
    "apps/poms-admin/src/app/shared",
    "apps/poms-api/src/app/features",
    "libs/api/contracts/src",
    "libs/admin/data-access/src",
    "libs/shared/api-client/model",
    "libs/shared/contracts/src"
];

const rules: Rule[] = [
    {
        id: "enum-like-comparison",
        pattern: new RegExp(`\\b(?:${enumLikeFields})\\s*(?:===|!==)\\s*['"][^'"]+['"]`)
    },
    {
        id: "enum-like-fixture",
        pattern: new RegExp(`\\b(?:${enumLikeFields})\\s*:\\s*['"][^'"]+['"]`)
    },
    {
        id: "inline-string-union",
        include: (path) => path.startsWith("apps/poms-api/src/app/features/") || path.startsWith("libs/api/contracts/src/") || path.startsWith("libs/shared/contracts/src/"),
        pattern: new RegExp(`\\btype\\s+\\w*(?:${enumLikeTypeNames})\\w*\\s*=\\s*['"][^'"]+['"](?:\\s*\\|\\s*['"][^'"]+['"])+`)
    },
    {
        id: "string-as-const",
        pattern: /['"][^'"]+['"]\s+as\s+const/
    },
    {
        id: "record-string-string",
        pattern: /Record<string,\s*string>/
    },
    {
        id: "object-entries-labels",
        pattern: /Object\.entries\(.*LABELS\)/
    },
    {
        id: "generated-client-string-field",
        include: (path) => path.startsWith("libs/shared/api-client/model/"),
        pattern: /\b(?:status|type|sourceType|targetType|stage|decision|mode|category|severity|receiptJudgmentMode|participantRoleKey|costSubtype|costSubcategory)\s*:\s*string(?:\s*\|\s*null)?/
    }
];

const inlineZEnumPattern = /z\.enum\(\s*\[(?:[\s\S]*?)\]\s*\)/g;

const allowlistPath = "tools/enum-like-string-allowlist.json";
const allowlist = JSON.parse(await Deno.readTextFile(allowlistPath)) as AllowlistEntry[];

function normalizePath(path: string): string {
    return path.replaceAll("\\", "/");
}

async function* walkFiles(dir: string): AsyncGenerator<string> {
    for await (const entry of Deno.readDir(dir)) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory) {
            yield* walkFiles(path);
            continue;
        }
        if (entry.isFile && /\.(ts|js|json|html)$/.test(entry.name)) {
            yield normalizePath(path);
        }
    }
}

function matchesAllowlistEntry(entry: AllowlistEntry, finding: Finding): boolean {
        if (entry.ruleId && entry.ruleId !== finding.ruleId) return false;
        if (entry.path && normalizePath(entry.path) !== finding.path) return false;
        if (entry.pathPrefix && !finding.path.startsWith(normalizePath(entry.pathPrefix))) return false;
        if (entry.textIncludes && !finding.text.includes(entry.textIncludes)) return false;
        if (entry.regex && !new RegExp(entry.regex).test(finding.text)) return false;
        return true;
}

function isAllowed(finding: Finding): boolean {
    return allowlist.some((entry) => matchesAllowlistEntry(entry, finding));
}

function compareFindings(a: Finding, b: Finding): number {
    return a.path.localeCompare(b.path) || a.line - b.line || a.ruleId.localeCompare(b.ruleId);
}

function lineNumberAt(content: string, index: number): number {
    return content.slice(0, index).split(/\r?\n/).length;
}

function firstLine(text: string): string {
    return text.split(/\r?\n/)[0]?.trim() ?? "";
}

const findings: Finding[] = [];

for (const root of roots) {
    for await (const file of walkFiles(root)) {
        const content = await Deno.readTextFile(file);
        const path = normalizePath(file);
        const lines = content.split(/\r?\n/);

        for (const match of content.matchAll(inlineZEnumPattern)) {
            if (match.index === undefined) continue;

            findings.push({
                ruleId: "inline-z-enum",
                path,
                line: lineNumberAt(content, match.index),
                text: firstLine(match[0])
            });
        }

        for (const rule of rules) {
            if (rule.include && !rule.include(path)) continue;

            lines.forEach((lineText, index) => {
                if (!rule.pattern.test(lineText)) return;

                findings.push({
                    ruleId: rule.id,
                    path,
                    line: index + 1,
                    text: lineText.trim()
                });
            });
        }
    }
}

const unallowed = findings.filter((finding) => !isAllowed(finding)).sort(compareFindings);
const exceededAllowlistEntries = allowlist
    .filter((entry) => entry.maxMatches !== undefined)
    .map((entry) => ({
        entry,
        count: findings.filter((finding) => matchesAllowlistEntry(entry, finding)).length
    }))
    .filter(({ entry, count }) => count > (entry.maxMatches ?? 0));

if (unallowed.length > 0 || exceededAllowlistEntries.length > 0) {
    if (exceededAllowlistEntries.length > 0) {
        console.error(`Enum-like string scan failed with ${exceededAllowlistEntries.length} allowlist baseline overflow(s):`);
        for (const { entry, count } of exceededAllowlistEntries) {
            console.error(`- ${entry.id} matched ${count} finding(s), maxMatches=${entry.maxMatches}`);
        }
        console.error("");
    }

    console.error(`Enum-like string scan failed with ${unallowed.length} unclassified finding(s):`);
    for (const finding of unallowed) {
        console.error(`- ${finding.ruleId} ${finding.path}:${finding.line} ${finding.text}`);
    }
    console.error(`\nClassify true exceptions in ${allowlistPath}; otherwise replace literals with shared/generated enum constants.`);
    Deno.exit(1);
}

console.log(`Enum-like string scan passed: ${findings.length} finding(s), all classified by ${allowlist.length} allowlist entries.`);
