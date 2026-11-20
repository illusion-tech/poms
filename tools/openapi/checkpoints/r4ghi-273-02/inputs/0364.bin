import { createHash } from 'node:crypto';

export function stableUuid(input: string): string {
    const hex = createHash('sha256').update(input).digest('hex');
    const version = '4';
    const variant = (8 + (Number.parseInt(hex[16] ?? '0', 16) % 4)).toString(16);

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${version}${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function sqlValue(value: string): string {
    return `'${value.replaceAll("'", "''")}'`;
}

export function sqlText(value: string | null): string {
    return value === null ? 'null' : sqlValue(value);
}

export function sqlUuid(value: string | null): string {
    return value === null ? 'null' : sqlValue(value);
}

export function sqlTimestamp(value: string | null): string {
    return value === null ? 'null' : `${sqlValue(value)}::timestamptz`;
}

export function sqlDate(value: string | null): string {
    return value === null ? 'null' : `${sqlValue(value.slice(0, 10))}::date`;
}
