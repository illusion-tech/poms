import { dirname } from "jsr:@std/path@^1";

export async function exists(path: string): Promise<boolean> {
    try {
        await Deno.stat(path);
        return true;
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) return false;
        throw error;
    }
}

export async function assertExists(path: string, label: string): Promise<void> {
    if (!(await exists(path))) {
        throw new Error(`${label} does not exist: ${path}`);
    }
}

export async function ensureDir(path: string): Promise<void> {
    await Deno.mkdir(path, { recursive: true });
}

export async function ensureParentDir(path: string): Promise<void> {
    await ensureDir(dirname(path));
}

export async function removeIfExists(path: string): Promise<void> {
    if (await exists(path)) {
        await Deno.remove(path, { recursive: true });
    }
}

export async function copyDir(source: string, target: string): Promise<void> {
    await ensureDir(target);

    for await (const entry of Deno.readDir(source)) {
        const sourcePath = `${source}/${entry.name}`;
        const targetPath = `${target}/${entry.name}`;

        if (entry.isDirectory) {
            await copyDir(sourcePath, targetPath);
            continue;
        }

        if (entry.isFile) {
            await ensureParentDir(targetPath);
            await Deno.copyFile(sourcePath, targetPath);
        }
    }
}
