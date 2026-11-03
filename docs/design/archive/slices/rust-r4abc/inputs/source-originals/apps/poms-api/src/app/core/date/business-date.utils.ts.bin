export const BUSINESS_DATE_TIME_ZONE = 'Asia/Hong_Kong';

export function toBusinessDateString(value: Date, timeZone = BUSINESS_DATE_TIME_ZONE): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(value);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
        throw new RangeError('Unable to format business date');
    }

    return `${year}-${month}-${day}`;
}

export function toBusinessDateOnly(value: Date | string | null | undefined, timeZone = BUSINESS_DATE_TIME_ZONE): string | null {
    if (!value) {
        return null;
    }

    return typeof value === 'string' ? value.slice(0, 10) : toBusinessDateString(value, timeZone);
}
