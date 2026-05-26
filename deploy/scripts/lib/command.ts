export interface CommandOptions {
    cwd?: string;
    quiet?: boolean;
    stdin?: string;
}

function shellCommand(command: string): { command: string; args: string[] } {
    if (Deno.build.os === "windows") {
        return { command: "cmd", args: ["/d", "/s", "/c", command] };
    }

    return { command: "sh", args: ["-lc", command] };
}

export function shellQuote(value: string): string {
    if (Deno.build.os === "windows") {
        return `"${value.replaceAll('"', '""')}"`;
    }

    return `'${value.replaceAll("'", "'\\''")}'`;
}

export async function runCommand(command: string, options: CommandOptions = {}): Promise<void> {
    if (!options.quiet) console.log(`$ ${command}`);

    const shell = shellCommand(command);
    const result = await new Deno.Command(shell.command, {
        args: shell.args,
        cwd: options.cwd,
        stdout: "inherit",
        stderr: "inherit"
    }).output();

    if (result.code !== 0) {
        throw new Error(`Command failed with exit code ${result.code}: ${command}`);
    }
}

export async function runProgram(command: string, args: string[], options: CommandOptions = {}): Promise<void> {
    if (!options.quiet) console.log(`$ ${[command, ...args].map((part) => part.includes(" ") ? shellQuote(part) : part).join(" ")}`);

    const child = new Deno.Command(command, {
        args,
        cwd: options.cwd,
        stdin: options.stdin === undefined ? "null" : "piped",
        stdout: "inherit",
        stderr: "inherit"
    }).spawn();

    if (options.stdin !== undefined) {
        const writer = child.stdin.getWriter();
        await writer.write(new TextEncoder().encode(options.stdin));
        await writer.close();
    }

    const result = await child.output();

    if (result.code !== 0) {
        throw new Error(`Command failed with exit code ${result.code}: ${command}`);
    }
}

export async function programOutput(command: string, args: string[], options: CommandOptions = {}): Promise<string> {
    if (!options.quiet) console.log(`$ ${[command, ...args].map((part) => part.includes(" ") ? shellQuote(part) : part).join(" ")}`);

    const result = await new Deno.Command(command, {
        args,
        cwd: options.cwd,
        stdout: "piped",
        stderr: "piped"
    }).output();

    const decoder = new TextDecoder();
    const stdout = decoder.decode(result.stdout);
    const stderr = decoder.decode(result.stderr);

    if (result.code !== 0) {
        if (stderr.trim()) console.error(stderr.trim());
        throw new Error(`Command failed with exit code ${result.code}: ${command}`);
    }

    return stdout;
}

export async function commandOutput(command: string, options: CommandOptions = {}): Promise<string> {
    if (!options.quiet) console.log(`$ ${command}`);

    const shell = shellCommand(command);
    const result = await new Deno.Command(shell.command, {
        args: shell.args,
        cwd: options.cwd,
        stdout: "piped",
        stderr: "piped"
    }).output();

    const decoder = new TextDecoder();
    const stdout = decoder.decode(result.stdout);
    const stderr = decoder.decode(result.stderr);

    if (result.code !== 0) {
        if (stderr.trim()) console.error(stderr.trim());
        throw new Error(`Command failed with exit code ${result.code}: ${command}`);
    }

    return stdout;
}
