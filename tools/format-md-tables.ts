#!/usr/bin/env -S deno run --allow-read --allow-write
// Usage: deno run --allow-read --allow-write tools/format-md-tables.ts [--check] <path...>

import { join } from "jsr:@std/path@^1";

type Alignment = "left" | "right" | "center" | "none";

function isWide(cp: number): boolean {
    return (
        (cp >= 0x1100 && cp <= 0x115F) ||
        cp === 0x2329 || cp === 0x232A ||
        (cp >= 0x2E80 && cp <= 0x303E) ||
        (cp >= 0x3040 && cp <= 0x33FF) ||
        (cp >= 0x3400 && cp <= 0x4DBF) ||
        (cp >= 0x4E00 && cp <= 0xA4CF) ||
        (cp >= 0xA960 && cp <= 0xA97F) ||
        (cp >= 0xAC00 && cp <= 0xD7FF) ||
        (cp >= 0xF900 && cp <= 0xFAFF) ||
        (cp >= 0xFE10 && cp <= 0xFE19) ||
        (cp >= 0xFE30 && cp <= 0xFE6F) ||
        (cp >= 0xFF01 && cp <= 0xFF60) ||
        (cp >= 0xFFE0 && cp <= 0xFFE6) ||
        (cp >= 0x1F004 && cp <= 0x1F0CF) ||
        (cp >= 0x1F200 && cp <= 0x1F2FF) ||
        (cp >= 0x20000 && cp <= 0x2FFFD) ||
        (cp >= 0x30000 && cp <= 0x3FFFD)
    );
}

function displayWidth(str: string): number {
    let w = 0;
    for (const ch of str) w += isWide(ch.codePointAt(0)!) ? 2 : 1;
    return w;
}

function parseCells(line: string): string[] {
    const t = line.trim();
    const inner = t.startsWith("|") ? t.slice(1) : t;
    const stripped = inner.endsWith("|") ? inner.slice(0, -1) : inner;
    return stripped.split("|").map((c) => c.trim());
}

function isSeparatorRow(line: string): boolean {
    const cells = parseCells(line);
    return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function parseAlignment(cell: string): Alignment {
    const l = cell.startsWith(":");
    const r = cell.endsWith(":");
    if (l && r) return "center";
    if (r) return "right";
    if (l) return "left";
    return "none";
}

function buildSepCell(width: number, align: Alignment): string {
    if (align === "left") return ":" + "-".repeat(width - 1);
    if (align === "right") return "-".repeat(width - 1) + ":";
    if (align === "center") return ":" + "-".repeat(Math.max(1, width - 2)) + ":";
    return "-".repeat(width);
}

function padCell(str: string, width: number, align: Alignment): string {
    const pad = width - displayWidth(str);
    if (pad <= 0) return str;
    if (align === "right") return " ".repeat(pad) + str;
    if (align === "center") {
        const l = Math.floor(pad / 2);
        return " ".repeat(l) + str + " ".repeat(pad - l);
    }
    return str + " ".repeat(pad);
}

function formatTable(lines: string[]): string[] {
    const sepIdx = lines.findIndex(isSeparatorRow);
    if (sepIdx === -1) return lines;

    const rows = lines.map(parseCells);
    const colCount = Math.max(...rows.map((r) => r.length));
    const aligns: Alignment[] = Array.from(
        { length: colCount },
        (_, i) => parseAlignment(rows[sepIdx][i] ?? "-"),
    );

    const colWidths = aligns.map((a) => (a === "center" ? 3 : 3));
    for (let r = 0; r < rows.length; r++) {
        if (r === sepIdx) continue;
        for (let c = 0; c < rows[r].length; c++) {
            colWidths[c] = Math.max(colWidths[c], displayWidth(rows[r][c]));
        }
    }

    return lines.map((_, i) => {
        const cells = Array.from({ length: colCount }, (_, c) => {
            if (i === sepIdx) return buildSepCell(colWidths[c], aligns[c]);
            return padCell(rows[i][c] ?? "", colWidths[c], aligns[c]);
        });
        return "| " + cells.join(" | ") + " |";
    });
}

function formatMarkdown(content: string): string {
    const lines = content.split("\n");
    const out: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trimStart();

        if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
            const fence = trimmed.startsWith("```") ? "```" : "~~~";
            out.push(line);
            i++;
            while (i < lines.length) {
                out.push(lines[i]);
                if (lines[i].trimStart().startsWith(fence)) { i++; break; }
                i++;
            }
            continue;
        }

        if (i + 1 < lines.length && line.includes("|") && isSeparatorRow(lines[i + 1])) {
            const block: string[] = [];
            while (i < lines.length && lines[i].includes("|")) {
                block.push(lines[i++]);
            }
            out.push(...formatTable(block));
            continue;
        }

        out.push(line);
        i++;
    }

    return out.join("\n");
}

async function* walkMd(path: string): AsyncGenerator<string> {
    const stat = await Deno.stat(path);
    if (stat.isFile) {
        if (path.endsWith(".md")) yield path;
    } else {
        for await (const e of Deno.readDir(path)) {
            yield* walkMd(join(path, e.name));
        }
    }
}

const checkMode = Deno.args.includes("--check");
const targets = Deno.args.filter((a) => !a.startsWith("--"));

if (targets.length === 0) {
    console.error("Usage: deno run --allow-read --allow-write tools/format-md-tables.ts [--check] <path...>");
    Deno.exit(1);
}

let dirty = false;
for (const target of targets) {
    for await (const file of walkMd(target)) {
        const original = await Deno.readTextFile(file);
        const formatted = formatMarkdown(original);
        if (original !== formatted) {
            if (checkMode) {
                console.error(`unformatted: ${file}`);
                dirty = true;
            } else {
                await Deno.writeTextFile(file, formatted);
                console.log(`formatted: ${file}`);
            }
        }
    }
}

if (dirty) Deno.exit(1);
