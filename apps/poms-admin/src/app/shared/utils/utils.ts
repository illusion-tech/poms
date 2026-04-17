export type DataPoint = {
    x: string | Date;
    y: number | number[];
};

type ReducedTimeUnit = 'week' | 'month' | 'quarter' | 'year';
type HeatmapDataPoint = {
    x: string;
    y: string;
    d: string;
    v: number;
};

export type TimeUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

const TIME_UNITS: Record<TimeUnit, number> = {
    millisecond: 1,
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    quarter: 90 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000
};

const SLICE_UNITS: Record<ReducedTimeUnit, number> = {
    week: 7,
    month: 30,
    quarter: 90,
    year: 365 / 2
};

const GROUP_INTERVAL_DAYS: Record<ReducedTimeUnit, number> = {
    week: 7,
    month: 30,
    quarter: 90,
    year: 365
};

const isReducedTimeUnit = (value: TimeUnit): value is ReducedTimeUnit => value in SLICE_UNITS;

const averageValues = (values: Array<number | number[]>): number | number[] => {
    if (values.length === 0) {
        return 0;
    }

    if (typeof values[0] === 'number') {
        return (values as number[]).reduce((acc, value) => acc + value, 0) / values.length;
    }

    const tuples = values as number[][];
    const tupleLength = tuples[0].length;

    return Array.from({ length: tupleLength }, (_, index) => tuples.reduce((acc, value) => acc + Number(value[index]), 0) / tuples.length);
};

export const parseDate = (dateStr: string | Date): Date => {
    return typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
};

export const sampleDataReduction = (data: DataPoint[], option: TimeUnit, show: number): DataPoint[] => {
    const sampledData: DataPoint[] = [];
    const dataLength: number = data.length;

    if (dataLength === 0) return sampledData;

    const selectedMultiplier: number = TIME_UNITS[option];
    const endDate: Date = parseDate(data[dataLength - 1].x);
    const firstData: Date = parseDate(data[0].x);
    const calculatedDate: Date = new Date(endDate.getTime() - show * selectedMultiplier);
    const startDate: Date = firstData.getTime() > calculatedDate.getTime() ? firstData : calculatedDate;
    let tempData: DataPoint[] = data.filter((item) => parseDate(item.x) >= startDate);

    const tempLen: number = tempData.length;

    if (['minute', 'second', 'millisecond'].includes(option)) {
        if (tempLen < show) {
            const adjustedStartDate: Date = new Date(endDate);
            adjustedStartDate.setHours(endDate.getHours() - 4);
            tempData = data.filter((item) => parseDate(item.x) >= adjustedStartDate);
        }
        return tempData;
    } else if (['day', 'hour'].includes(option)) {
        return tempData;
    } else if (isReducedTimeUnit(option)) {
        const selectedSlicer = SLICE_UNITS[option];
        for (let i = 0; i < tempLen; i += selectedSlicer) {
            const range = tempData.slice(i, i + selectedSlicer);
            const rangeAverage = range.reduce((sum, value) => sum + (value.y as number), 0) / range.length;

            sampledData.push({ x: range[0].x, y: rangeAverage });
        }
        return sampledData;
    }

    return data; // Default fallback
};

export const sampleDataReductionByArray = (data: DataPoint[], option: TimeUnit, show: number): DataPoint[] => {
    const sampledData: DataPoint[] = [];
    const dataLength: number = data.length;

    if (dataLength === 0) return sampledData;

    const selectedMultiplier: number = TIME_UNITS[option];
    const endDate: Date = parseDate(data[dataLength - 1].x);
    const firstData: Date = parseDate(data[0].x);
    const calculatedDate: Date = new Date(endDate.getTime() - show * selectedMultiplier);
    const startDate: Date = firstData.getTime() > calculatedDate.getTime() ? firstData : calculatedDate;

    let tempData: DataPoint[] = data.filter((item) => parseDate(item.x) >= startDate);
    const tempLen: number = tempData.length;

    if (['minute', 'second', 'millisecond'].includes(option)) {
        if (tempLen < show) {
            const adjustedStartDate: Date = new Date(endDate);
            adjustedStartDate.setHours(endDate.getHours() - 4);
            tempData = data.filter((item) => parseDate(item.x) >= adjustedStartDate);
        }
        return tempData;
    } else if (['day', 'hour'].includes(option)) {
        return tempData;
    } else if (isReducedTimeUnit(option)) {
        const selectedSlicer = option === 'year' ? 366 / 2 : SLICE_UNITS[option];
        for (let i = 0; i < tempLen; i += selectedSlicer) {
            const sampledPointY = Array.isArray(tempData[i].y) ? [...tempData[i].y] : tempData[i].y;

            sampledData.push({ x: tempData[i].x, y: sampledPointY });
        }
        return sampledData;
    }

    return data;
};

// Function 3: sampleDataByFixedLength
export const sampleDataByFixedLength = (data: DataPoint[], option: TimeUnit, show: number): DataPoint[] => {
    const sampledData: DataPoint[] = [];
    const dataLength = data.length;

    if (dataLength === 0) return sampledData;

    const parseFixedDate = (dateStr: string | Date) => new Date(dateStr);

    let tempData: DataPoint[] = [];
    let currentUnit: number | null = null;

    for (let i = dataLength - 1; i >= 0; i--) {
        const dataPoint = data[i];
        const date = parseFixedDate(dataPoint.x);

        let unit: number | null = null;
        if (option === 'day') {
            unit = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
        } else if (option === 'week') {
            unit = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
        } else if (option === 'month') {
            unit = date.getFullYear() * 12 + date.getMonth();
        } else if (option === 'year') {
            unit = date.getFullYear();
        } else if (option === 'hour') {
            unit = Math.floor(date.getTime() / (60 * 60 * 1000));
        } else if (option === 'minute') {
            unit = Math.floor(date.getTime() / (60 * 1000));
        } else if (option === 'second') {
            unit = Math.floor(date.getTime() / 1000);
        } else if (option === 'millisecond') {
            unit = Math.floor(date.getTime());
        } else if (option === 'quarter') {
            unit = date.getFullYear() * 4 + Math.floor(date.getMonth() / 3);
        }

        if (currentUnit === null) {
            currentUnit = unit;
        }

        if (unit !== currentUnit) {
            const avgValues = averageValues(tempData.map((item) => item.y));
            sampledData.unshift({ x: tempData[0].x, y: avgValues });
            tempData = [];
            currentUnit = unit;
        }

        tempData.push(dataPoint);

        if (sampledData.length >= show) {
            break;
        }
    }

    if (tempData.length > 0) {
        const avgValues = averageValues(tempData.map((item) => item.y));
        sampledData.unshift({ x: tempData[0].x, y: avgValues });
    }

    if (isReducedTimeUnit(option)) {
        const dayCn = 24 * 60 * 60 * 1000;
        const lastPoint = sampledData[sampledData.length - 1];
        const previousPoint = sampledData[sampledData.length - 2];

        if (lastPoint && previousPoint) {
            if (new Date(lastPoint.x).getTime() / dayCn - new Date(previousPoint.x).getTime() / dayCn < GROUP_INTERVAL_DAYS[option]) {
                sampledData.pop();
            } else {
                sampledData.shift();
            }
        }
    }

    return sampledData;
};

// Function 4: generateRandomData
export const generateRandomData = (startDate: string | Date, endDate: string | Date, intervalHours: number, minValue: number, maxValue: number): DataPoint[] => {
    const data: DataPoint[] = [];
    let currentDate: Date = parseDate(startDate);
    const end: Date = parseDate(endDate);

    while (currentDate <= end) {
        const currentValue: number = minValue + Math.random() * (maxValue - minValue);
        data.push({ x: new Date(currentDate), y: parseFloat(currentValue.toFixed(2)) });
        currentDate = new Date(currentDate.getTime() + intervalHours * 60 * 60 * 1000);
    }

    return data;
};

// Function 5: generateRandomMultiData
export const generateRandomMultiData = (startDate: string | Date, endDate: string | Date, intervalHours: number, minValue: number, maxValue: number, datasetsCount: number = 2, inter: boolean = false): DataPoint[] => {
    const data: DataPoint[] = [];
    let currentDate: Date = parseDate(startDate);
    const end: Date = parseDate(endDate);

    while (currentDate <= end) {
        let currentValues: number[];
        if (inter) {
            const incr = maxValue;
            currentValues = Array(datasetsCount)
                .fill(null)
                .map((_, i) => {
                    return Number((minValue + Math.random() * (maxValue - minValue) + incr * (datasetsCount - i * 1.2)).toFixed(0));
                });
        } else {
            currentValues = Array(datasetsCount)
                .fill(null)
                .map(() => {
                    return Number((minValue + Math.random() * (maxValue - minValue)).toFixed(0));
                });
        }
        data.push({ x: new Date(currentDate), y: [...currentValues] });

        currentDate = new Date(currentDate.getTime() + intervalHours * 60 * 60 * 1000);
    }
    return data;
};

export const trackByFn = (): string => {
    const timestamp = Date.now();
    const randomNum = Math.random().toString(36).substring(2, 8);
    const uniqueId = `${timestamp}-${randomNum}`;

    return uniqueId;
};

export function isoDayOfWeek(dt: Date) {
    let wd = dt.getDay();
    wd = ((wd + 6) % 7) + 1;
    return '' + wd;
}

export const generateRandomHeatmapData = (): HeatmapDataPoint[] => {
    const today = new Date(2024, 8, 20);
    const end = today;
    let dt = new Date(end);
    dt.setDate(end.getDate() - 81);
    const data2: HeatmapDataPoint[] = [];

    while (dt <= end) {
        const iso = dt.toISOString().substring(0, 10);
        data2.push({
            x: iso,
            y: isoDayOfWeek(dt),
            d: iso,
            v: Math.floor(Math.random() * (1501 - 200)) + 200
        });
        dt = new Date(dt.setDate(dt.getDate() + 1));
    }
    return data2;
};
