import { basename } from "@std/path";
import * as posix from "@std/path/posix";
import { runProgram } from "./command.ts";
import type { DeployConfig } from "./config.ts";

export interface RemoteCommandOptions {
    dryRun?: boolean;
}

export function remoteQuote(value: string): string {
    return `'${value.replaceAll("'", "'\\''")}'`;
}

export function remoteHost(config: DeployConfig, override?: string): string {
    const host = override ?? config.remoteHost;
    if (!host) {
        throw new Error("Missing remote host. Set remoteHost in deploy config or pass --host.");
    }
    return host;
}

export function remoteTmpReleaseDir(config: DeployConfig): string {
    return posix.join(config.remoteTmpDir, "releases");
}

export function remoteArchivePath(config: DeployConfig, archivePath: string): string {
    return posix.join(remoteTmpReleaseDir(config), basename(archivePath));
}

export async function sshScript(host: string, script: string, options: RemoteCommandOptions = {}): Promise<void> {
    if (options.dryRun) {
        console.log(`[dry-run] ssh ${host} bash -se`);
        console.log(script.trimEnd());
        return;
    }

    await runProgram("ssh", [host, "bash", "-se"], { stdin: script });
}

export async function sshCommand(host: string, command: string, options: RemoteCommandOptions = {}): Promise<void> {
    if (options.dryRun) {
        console.log(`[dry-run] ssh ${host} ${command}`);
        return;
    }

    await runProgram("ssh", [host, command]);
}

export async function scpFile(localPath: string, host: string, remotePath: string, options: RemoteCommandOptions = {}): Promise<void> {
    if (options.dryRun) {
        console.log(`[dry-run] scp ${localPath} ${host}:${remotePath}`);
        return;
    }

    await runProgram("scp", [localPath, `${host}:${remotePath}`]);
}
