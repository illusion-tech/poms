import { Component, effect, HostBinding, inject, input, signal } from '@angular/core';
import { LayoutService } from '../../../../layout/service/layout.service';
import { DataPoint, sampleDataReductionByArray, TimeUnit } from '../../../../shared/utils/utils';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import 'chartjs-adapter-date-fns';

type MultiSeriesPoint = DataPoint & {
    y: number[];
};

type MultiLineDataset = {
    label: string;
    data: Array<{
        x: string | Date;
        y: number;
    }>;
    fill: boolean;
    borderColor: string;
    tension: number;
    borderWidth: number;
    pointBorderColor: string;
    pointBackgroundColor: string;
    pointHoverBackgroundColor: string;
    pointHoverBorderColor: string;
    pointBorderWidth: number;
    hideInLegendAndTooltip: boolean;
    pointStyle: string;
    pointRadius: number;
    backgroundColor: (context: GradientBackgroundContext) => CanvasGradient | undefined;
};

type GradientBackgroundContext = {
    chart: {
        chartArea?: {
            top: number;
            bottom: number;
        };
        ctx: CanvasRenderingContext2D;
    };
};

type HoverLineChart = {
    ctx: CanvasRenderingContext2D;
    tooltip?: {
        _active: unknown[];
        dataPoints: Array<{
            raw: {
                x: string | Date;
            };
        }>;
    };
    chartArea: {
        bottom: number;
    };
    scales: {
        x: {
            getPixelForValue(value: string | Date): number;
        };
    };
};

type ExternalTooltipPoint = {
    element: {
        x: number;
        y: number;
    };
    formattedValue: string;
    dataset: {
        borderColor: string;
        label: string;
    };
};

type ExternalTooltipContext = {
    chart: {
        canvas: HTMLCanvasElement;
        width: number;
        height: number;
    };
    tooltip: {
        opacity: number;
        dataPoints: ExternalTooltipPoint[];
        body?: unknown[];
        title: string[];
        options: {
            bodyFont: {
                string: string;
            };
        };
    };
};

@Component({
    selector: 'multi-line-chart',
    standalone: true,
    imports: [CommonModule, ChartModule],
    template: ` <p-chart type="line" [data]="chartData()" [plugins]="plugins()" [options]="chartOptions()" />`,
    host: {
        class: 'max-h-80! min-h-72 min-w-[640px] w-full overflow-auto h-full cursor-pointer'
    },
    styles: `
        :host ::ng-deep {
            p-chart {
                height: 100%;

                canvas {
                    height: 100%;
                }
            }
        }
    `
})
export class MultiLineChart {
    @HostBinding('class') get styleClass() {
        return this.class();
    }

    layoutService = inject(LayoutService);

    class = input<string>('');

    labels = input<string[]>([]);

    datasets = input<MultiSeriesPoint[]>([]);

    bgColors = input<string[][] | undefined | null>();

    borderColors = input<string[] | undefined | null>();

    show = input<number>(12);

    tooltipPrefix = input<string>('$');

    option = input<TimeUnit>('month');

    stepSize = input<number>(2000);

    dataReduction = input<boolean>(true);

    data = signal<MultiSeriesPoint[]>([]);

    plugins = signal<unknown[]>([]);

    chartData = signal<Record<string, unknown>>({});

    chartOptions = signal<Record<string, unknown>>({});

    chartEffect = effect(() => {
        this.layoutService.layoutConfig().darkTheme;
        this.option();
        setTimeout(() => this.initChart(), 150);
    });

    initChart() {
        this.chartData.set(this.setChartData(this.option()));
        this.chartOptions.set(this.setChartOptions(this.tooltipPrefix()));
        this.plugins.set(this.setChartPlugins());
    }

    setChartData(option: TimeUnit) {
        const sampledData = (this.dataReduction() ? sampleDataReductionByArray(this.datasets(), option, this.show()) : this.datasets()) as MultiSeriesPoint[];
        if (sampledData.length <= 0) {
            this.data.set([]);

            return {
                datasets: []
            };
        }
        const darkMode = this.layoutService.isDarkTheme() ?? false;
        const rootStyles = getComputedStyle(document.documentElement);
        const surface0Color = rootStyles.getPropertyValue('--p-surface-0');
        const surface950Color = rootStyles.getPropertyValue('--p-surface-950');

        const lineCount = sampledData[0].y.length;
        const dataArr: MultiLineDataset[] = Array(lineCount)
            .fill(null)
            .map((_, index) => {
                return {
                    label: this.labels()[index] ?? 'dataset' + index,
                    data: [],
                    fill: true,
                    borderColor: this.borderColors()?.[index] ?? (darkMode ? '#FAFAFA' : '#030616'),
                    tension: 0.3,
                    borderWidth: 1.2,
                    pointBorderColor: 'rgba(0, 0, 0, 0)',
                    pointBackgroundColor: 'rgba(0, 0, 0, 0)',
                    pointHoverBackgroundColor: this.borderColors()?.[index] ?? (darkMode ? surface0Color : surface950Color),
                    pointHoverBorderColor: darkMode ? surface950Color : surface0Color,
                    pointBorderWidth: 12,
                    hideInLegendAndTooltip: false,
                    pointStyle: 'circle',
                    pointRadius: 4,
                    backgroundColor: (context: GradientBackgroundContext) => {
                        const backgroundColors = this.bgColors();
                        const defaultColor = [darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(3, 6, 22, 0.06)', darkMode ? 'rgba(255, 255, 255, 0)' : 'rgba(3, 6, 22, 0)'];
                        const bg = backgroundColors?.[index] !== undefined ? backgroundColors[index] : defaultColor;

                        if (!context.chart.chartArea) {
                            return;
                        }

                        const {
                            ctx,
                            chartArea: { top, bottom }
                        } = context.chart;
                        const gradientBg = ctx.createLinearGradient(0, top, 0, bottom);
                        const colorTranches = 1 / (bg.length - 1);

                        for (let i = 0; i < bg.length; i++) {
                            gradientBg.addColorStop(0 + i * colorTranches, bg[i]);
                        }

                        return gradientBg;
                    }
                };
            });
        sampledData.forEach(({ x, y }) => {
            Array(lineCount)
                .fill(null)
                .forEach((_, i) => {
                    dataArr[i].data.push({ x, y: y[i] });
                });
        });
        this.data.set(sampledData);
        return {
            datasets: dataArr
        };
    }

    setChartPlugins() {
        const hoverLine = {
            id: 'hoverLine',
            beforeDatasetsDraw: (chart: HoverLineChart) => {
                const {
                    ctx,
                    tooltip,
                    chartArea: { bottom },
                    scales: { x }
                } = chart;
                if (tooltip && tooltip._active.length > 0) {
                    const xCoor = x.getPixelForValue(tooltip.dataPoints[0].raw.x);
                    ctx.save();
                    ctx.beginPath();
                    ctx.lineWidth = 1.2;
                    const rootStyles = getComputedStyle(document.documentElement);
                    const surface500Color = rootStyles.getPropertyValue('--p-surface-500');
                    ctx.strokeStyle = surface500Color;
                    ctx.setLineDash([4, 4]);
                    ctx.moveTo(xCoor, 0);
                    ctx.lineTo(xCoor, bottom + 8);
                    ctx.stroke();
                    ctx.closePath();
                    ctx.restore();
                }
            }
        };

        return [hoverLine];
    }

    setChartOptions(tooltipPrefix: string) {
        const darkMode = this.layoutService.isDarkTheme() ?? false;
        const rootStyles = getComputedStyle(document.documentElement);
        const surface400Color = rootStyles.getPropertyValue('--p-surface-400');
        const surface200Color = rootStyles.getPropertyValue('--p-surface-200');

        const dataValue = this.data();
        if (dataValue.length === 0) {
            return {
                responsive: true,
                maintainAspectRatio: false
            };
        }
        const endDate = new Date(dataValue[dataValue.length - 1].x);
        const startDate = new Date(dataValue[0].x);
        return {
            interaction: {
                intersect: false,
                mode: 'index'
            },
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 0
            },
            plugins: {
                tooltip: {
                    enabled: false,
                    position: 'nearest',
                    external: function (context: ExternalTooltipContext) {
                        const { chart, tooltip } = context;
                        const parentElement = chart.canvas.parentElement;
                        if (!parentElement) {
                            return;
                        }
                        let tooltipEl = parentElement.querySelector<HTMLDivElement>('div.chartjs-tooltip');
                        if (!tooltipEl) {
                            tooltipEl = document.createElement('div');
                            tooltipEl.classList.add(
                                'chartjs-tooltip',
                                'dark:bg-surface-950',
                                'bg-surface-0',
                                'rounded-[8px]',
                                'overflow-hidden',
                                'opacity-100',
                                'border',
                                'border-surface',
                                'absolute',
                                'transition-all',
                                'duration-[0.05s]',
                                'pointer-events-none',
                                'shadow-[0px_16px_32px_-12px_rgba(88,92,95,0.10)]'
                            );
                            parentElement.appendChild(tooltipEl);
                        }

                        if (tooltip.opacity === 0) {
                            tooltipEl.style.opacity = '0';
                            return;
                        }
                        const datasetPointsX = tooltip.dataPoints.map((dp) => dp.element.x);
                        const avgX = datasetPointsX.reduce((sum, value) => sum + value, 0) / datasetPointsX.length;

                        const datasetPointsY = tooltip.dataPoints.map((dp) => dp.element.y);
                        const avgY = datasetPointsY.reduce((sum, value) => sum + value, 0) / datasetPointsY.length;

                        if (tooltip.body) {
                            tooltipEl.innerHTML = '';
                            const tooltipHeader = document.createElement('div');
                            tooltipHeader.classList.add('bg-surface-100', 'dark:bg-surface-900', 'px-3', 'py-2.5', 'border-b', 'border-surface', 'text-left', 'label-xsmall');
                            tooltipHeader.appendChild(document.createTextNode(tooltip.title[0]));
                            tooltipEl.appendChild(tooltipHeader);
                            const tooltipBody = document.createElement('div');
                            tooltipBody.classList.add('flex', 'flex-col', 'gap-2', 'px-3', 'py-2', 'min-w-50');
                            tooltip.dataPoints.forEach((body) => {
                                const row = document.createElement('div');
                                row.classList.add('flex', 'items-center', 'gap-2', 'w-full');
                                const point = document.createElement('div');
                                point.classList.add('w-2.5', 'h-2.5', 'rounded-full');
                                point.style.backgroundColor = body.dataset.borderColor;
                                row.appendChild(point);
                                const label = document.createElement('span');
                                label.appendChild(document.createTextNode(body.dataset.label));
                                label.classList.add('text-base', 'text-surface-950', 'dark:text-surface-0', 'flex-1', 'text-left', 'capitalize');
                                row.appendChild(label);
                                const value = document.createElement('span');
                                value.appendChild(document.createTextNode(tooltipPrefix + body.formattedValue));
                                value.classList.add('text-base', 'text-surface-950', 'dark:text-surface-0', 'text-right');
                                row.appendChild(value);
                                tooltipBody.appendChild(row);
                            });
                            tooltipEl.appendChild(tooltipBody);
                        }

                        const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;

                        tooltipEl.style.opacity = '1';
                        tooltipEl.style.font = tooltip.options.bodyFont.string;
                        tooltipEl.style.padding = '0px';

                        const chartWidth = chart.width;
                        const tooltipWidth = tooltipEl.offsetWidth;
                        const chartHeight = chart.height;
                        const tooltipHeight = tooltipEl.offsetHeight;

                        let tooltipX = positionX + avgX + 20;
                        let tooltipY = positionY + avgY - tooltipHeight / 2;

                        if (tooltipX + tooltipWidth > chartWidth) {
                            tooltipX = positionX + avgX - tooltipWidth - 20;
                        }

                        if (tooltipY < 0) {
                            tooltipY = 0;
                        } else if (tooltipY + tooltipHeight > chartHeight) {
                            tooltipY = chartHeight - tooltipHeight;
                        }

                        tooltipEl.style.left = tooltipX + 'px';
                        tooltipEl.style.top = tooltipY + 'px';
                    }
                },
                legend: {
                    display: false
                },
                title: {
                    display: false
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: this.option(),
                        tooltipFormat: 'MM/dd/yyyy HH:mm'
                    },
                    min: startDate,
                    max: endDate,
                    offset: false,
                    grid: {
                        display: true,
                        lineWidth: 1.2,
                        color: 'rgba(255,255,255,0)'
                    },
                    ticks: {
                        color: darkMode ? 'rgba(255, 255, 255, 0.40)' : surface400Color,
                        autoSkip: false,
                        maxRotation: 0,
                        source: 'auto'
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    display: true,
                    min: 0,
                    border: {
                        display: false
                    },
                    ticks: {
                        color: darkMode ? 'rgba(255, 255, 255, 0.40)' : surface400Color,
                        autoSkip: false,
                        maxRotation: 0,
                        source: 'auto',
                        stepSize: this.stepSize(),
                        callback: function (value: number | string) {
                            const numericValue = Number(value);
                            if (numericValue > 1000) {
                                return numericValue / 1000 + 'K';
                            }
                            return numericValue;
                        }
                    },
                    grid: {
                        display: true,
                        lineWidth: 1,
                        color: darkMode ? 'rgba(255, 255, 255, 0.08)' : surface200Color
                    }
                }
            }
        };
    }
}
