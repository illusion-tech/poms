import { isAbsolute, join, resolve } from "jsr:@std/path@^1";

export interface DeployConfig {
    env: string;
    domain: string;
    baseDir: string;
    apiPort: number;
    pm2Name: string;
    archivePrefix: string;
    adminBrowserDistDir: string;
    apiDistDir: string;
    releaseArchiveDir: string;
    stagingDir: string;
    pm2ConfigPath: string;
    nginxSiteName: string;
    nginxSiteTemplatePath: string;
    nginxSitesAvailableDir: string;
    nginxSitesEnabledDir: string;
    repoRoot: string;
    releasesDir: string;
    currentPath: string;
    sharedDir: string;
    apiEnvFile: string;
    sharedLogsDir: string;
    sharedUploadsDir: string;
}

type RawConfig = Partial<Omit<DeployConfig, "repoRoot" | "releasesDir" | "currentPath" | "sharedDir" | "apiEnvFile" | "sharedLogsDir" | "sharedUploadsDir">>;

function stripJsonComments(input: string): string {
    let output = "";
    let inString = false;
    let stringQuote = "";
    let escaped = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < input.length; i++) {
        const current = input[i];
        const next = input[i + 1];

        if (inLineComment) {
            if (current === "\n") {
                inLineComment = false;
                output += current;
            }
            continue;
        }

        if (inBlockComment) {
            if (current === "*" && next === "/") {
                inBlockComment = false;
                i++;
            }
            continue;
        }

        if (inString) {
            output += current;
            if (escaped) {
                escaped = false;
                continue;
            }
            if (current === "\\") {
                escaped = true;
                continue;
            }
            if (current === stringQuote) {
                inString = false;
                stringQuote = "";
            }
            continue;
        }

        if (current === '"' || current === "'") {
            inString = true;
            stringQuote = current;
            output += current;
            continue;
        }

        if (current === "/" && next === "/") {
            inLineComment = true;
            i++;
            continue;
        }

        if (current === "/" && next === "*") {
            inBlockComment = true;
            i++;
            continue;
        }

        output += current;
    }

    return output;
}

function requireString(config: RawConfig, key: keyof RawConfig): string {
    const value = config[key];
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`Deploy config requires string field: ${key}`);
    }
    return value;
}

function repoPath(repoRoot: string, path: string): string {
    return isAbsolute(path) ? path : resolve(repoRoot, path);
}

export async function loadDeployConfig(configPath: string): Promise<DeployConfig> {
    const repoRoot = Deno.cwd();
    const raw = JSON.parse(stripJsonComments(await Deno.readTextFile(configPath))) as RawConfig;

    const env = requireString(raw, "env");
    const domain = requireString(raw, "domain");
    const baseDir = requireString(raw, "baseDir");
    const pm2Name = requireString(raw, "pm2Name");

    const apiPort = typeof raw.apiPort === "number" ? raw.apiPort : 3333;
    const archivePrefix = raw.archivePrefix ?? `poms-${env}`;
    const adminBrowserDistDir = repoPath(repoRoot, raw.adminBrowserDistDir ?? "dist/apps/poms-admin/browser");
    const apiDistDir = repoPath(repoRoot, raw.apiDistDir ?? "dist/apps/poms-api");
    const releaseArchiveDir = repoPath(repoRoot, raw.releaseArchiveDir ?? "dist/releases");
    const stagingDir = repoPath(repoRoot, raw.stagingDir ?? "dist/deploy-stage");
    const pm2ConfigPath = repoPath(repoRoot, raw.pm2ConfigPath ?? `deploy/pm2/poms-api-${env}.ecosystem.config.cjs`);
    const nginxSiteName = raw.nginxSiteName ?? `poms-${env}.conf`;
    const nginxSiteTemplatePath = repoPath(repoRoot, raw.nginxSiteTemplatePath ?? `deploy/nginx/sites-available/${nginxSiteName}`);
    const nginxSitesAvailableDir = raw.nginxSitesAvailableDir ?? "/etc/nginx/sites-available";
    const nginxSitesEnabledDir = raw.nginxSitesEnabledDir ?? "/etc/nginx/sites-enabled";

    return {
        env,
        domain,
        baseDir,
        apiPort,
        pm2Name,
        archivePrefix,
        adminBrowserDistDir,
        apiDistDir,
        releaseArchiveDir,
        stagingDir,
        pm2ConfigPath,
        nginxSiteName,
        nginxSiteTemplatePath,
        nginxSitesAvailableDir,
        nginxSitesEnabledDir,
        repoRoot,
        releasesDir: join(baseDir, "releases"),
        currentPath: join(baseDir, "current"),
        sharedDir: join(baseDir, "shared"),
        apiEnvFile: join(baseDir, "shared", "poms-api.env"),
        sharedLogsDir: join(baseDir, "shared", "logs"),
        sharedUploadsDir: join(baseDir, "shared", "uploads")
    };
}
