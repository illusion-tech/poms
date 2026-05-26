const releaseIdPattern = /^[0-9A-Za-z][0-9A-Za-z._-]*$/;

export function assertReleaseId(value: string): string {
    if (!releaseIdPattern.test(value)) {
        throw new Error(`Invalid release id: ${value}. Use only letters, numbers, dots, underscores, or dashes.`);
    }
    return value;
}
