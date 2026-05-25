export type ParsedArgs = Record<string, string | boolean>;

export function parseArgs(args = Deno.args): ParsedArgs {
    const parsed: ParsedArgs = {};

    for (let i = 0; i < args.length; i++) {
        const current = args[i];
        if (!current.startsWith("--")) {
            throw new Error(`Unexpected positional argument: ${current}`);
        }

        const eq = current.indexOf("=");
        if (eq !== -1) {
            parsed[current.slice(2, eq)] = current.slice(eq + 1);
            continue;
        }

        const key = current.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith("--")) {
            parsed[key] = next;
            i++;
            continue;
        }

        parsed[key] = true;
    }

    return parsed;
}

export function stringArg(args: ParsedArgs, key: string, fallback?: string): string {
    const value = args[key];
    if (value === undefined) {
        if (fallback !== undefined) return fallback;
        throw new Error(`Missing required argument: --${key}`);
    }
    if (typeof value !== "string") {
        throw new Error(`Argument --${key} requires a value`);
    }
    return value;
}

export function optionalStringArg(args: ParsedArgs, key: string): string | undefined {
    const value = args[key];
    if (value === undefined) return undefined;
    if (typeof value !== "string") {
        throw new Error(`Argument --${key} requires a value`);
    }
    return value;
}

export function booleanArg(args: ParsedArgs, key: string): boolean {
    return args[key] === true;
}
