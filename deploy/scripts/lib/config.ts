import { parse } from "@std/jsonc";
import { isAbsolute, resolve } from "@std/path";
import * as posix from "@std/path/posix";

export interface DeployConfig {
    env: string;
    domain: string;
    baseDir: string;
    apiPort: number;
    pm2Name: string;
    archivePrefix: string;
    remoteHost: string;
    remoteTmpDir: string;
    remoteDeployDir: string;
    remotePm2ConfigPath: string;
    remoteNginxAvailablePath: string;
    remoteNginxEnabledPath: string;
    remoteSslCertPath: string;
    remoteSslKeyPath: string;
    adminBrowserDistDir: string;
    apiDistDir: string;
    releaseArchiveDir: string;
    stagingDir: string;
    pm2ConfigPath: string;
    nginxSiteName: string;
    nginxSiteTemplatePath: string;
    nginxSitesAvailableDir: string;
    nginxSitesEnabledDir: string;
    migrationEnvFile: string;
    migrationCheckAfterUp: boolean;
    repoRoot: string;
    releasesDir: string;
    currentPath: string;
    sharedDir: string;
    apiEnvFile: string;
    sharedLogsDir: string;
    sharedUploadsDir: string;
}

type RawConfig = Partial<Omit<DeployConfig, "repoRoot" | "releasesDir" | "currentPath" | "sharedDir" | "apiEnvFile" | "sharedLogsDir" | "sharedUploadsDir">>;

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
    const raw = parse(await Deno.readTextFile(configPath)) as RawConfig;

    const env = requireString(raw, "env");
    const domain = requireString(raw, "domain");
    const baseDir = requireString(raw, "baseDir");
    const pm2Name = requireString(raw, "pm2Name");

    const apiPort = typeof raw.apiPort === "number" ? raw.apiPort : 3333;
    const archivePrefix = raw.archivePrefix ?? `poms-${env}`;
    const remoteHost = raw.remoteHost ?? "";
    const remoteTmpDir = raw.remoteTmpDir ?? "/tmp/poms";
    const remoteDeployDir = raw.remoteDeployDir ?? "/opt/poms/deploy";
    const remotePm2ConfigPath = raw.remotePm2ConfigPath ?? posix.join(remoteDeployDir, "pm2", `poms-api-${env}.ecosystem.config.cjs`);
    const remoteNginxAvailablePath = raw.remoteNginxAvailablePath ?? `/etc/nginx/sites-available/poms-${env}.conf`;
    const remoteNginxEnabledPath = raw.remoteNginxEnabledPath ?? `/etc/nginx/sites-enabled/poms-${env}.conf`;
    const remoteSslCertPath = raw.remoteSslCertPath ?? `/etc/nginx/ssl/poms-${env}/fullchain.pem`;
    const remoteSslKeyPath = raw.remoteSslKeyPath ?? `/etc/nginx/ssl/poms-${env}/privkey.pem`;
    const adminBrowserDistDir = repoPath(repoRoot, raw.adminBrowserDistDir ?? "dist/apps/poms-admin/browser");
    const apiDistDir = repoPath(repoRoot, raw.apiDistDir ?? "dist/apps/poms-api");
    const releaseArchiveDir = repoPath(repoRoot, raw.releaseArchiveDir ?? "dist/releases");
    const stagingDir = repoPath(repoRoot, raw.stagingDir ?? "dist/deploy-stage");
    const pm2ConfigPath = repoPath(repoRoot, raw.pm2ConfigPath ?? `deploy/pm2/poms-api-${env}.ecosystem.config.cjs`);
    const nginxSiteName = raw.nginxSiteName ?? `poms-${env}.conf`;
    const nginxSiteTemplatePath = repoPath(repoRoot, raw.nginxSiteTemplatePath ?? `deploy/nginx/sites-available/${nginxSiteName}`);
    const nginxSitesAvailableDir = raw.nginxSitesAvailableDir ?? "/etc/nginx/sites-available";
    const nginxSitesEnabledDir = raw.nginxSitesEnabledDir ?? "/etc/nginx/sites-enabled";
    const migrationEnvFile = repoPath(repoRoot, raw.migrationEnvFile ?? `deploy/private/poms-${env}.env`);
    const migrationCheckAfterUp = typeof raw.migrationCheckAfterUp === "boolean" ? raw.migrationCheckAfterUp : true;

    return {
        env,
        domain,
        baseDir,
        apiPort,
        pm2Name,
        archivePrefix,
        remoteHost,
        remoteTmpDir,
        remoteDeployDir,
        remotePm2ConfigPath,
        remoteNginxAvailablePath,
        remoteNginxEnabledPath,
        remoteSslCertPath,
        remoteSslKeyPath,
        adminBrowserDistDir,
        apiDistDir,
        releaseArchiveDir,
        stagingDir,
        pm2ConfigPath,
        nginxSiteName,
        nginxSiteTemplatePath,
        nginxSitesAvailableDir,
        nginxSitesEnabledDir,
        migrationEnvFile,
        migrationCheckAfterUp,
        repoRoot,
        releasesDir: posix.join(baseDir, "releases"),
        currentPath: posix.join(baseDir, "current"),
        sharedDir: posix.join(baseDir, "shared"),
        apiEnvFile: posix.join(baseDir, "shared", "poms-api.env"),
        sharedLogsDir: posix.join(baseDir, "shared", "logs"),
        sharedUploadsDir: posix.join(baseDir, "shared", "uploads"),
    };
}
