import { Component, Input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import type { UiTagSeverity } from './ui-severity';
import { WorkspaceFactGrid, type WorkspaceFactGridItem } from './workspace-fact-grid';
import { WorkspaceFeedback } from './workspace-feedback';

export interface WorkspaceVersionHistoryRow {
    id: string;
    versionLabel: string;
    isCurrent: boolean;
    statusLabel: string;
    statusSeverity: UiTagSeverity;
    primaryLabel: string;
    primaryValue: string;
    primarySeverity?: UiTagSeverity;
    secondaryLabel: string;
    secondaryValue: string;
    secondarySeverity?: UiTagSeverity;
    outcomeLabel: string;
    outcomeValue: string;
    outcomeSeverity?: UiTagSeverity;
    effectiveAt: string;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
    supersedesLabel: string;
    rowVersionLabel: string;
}

@Component({
    selector: 'app-workspace-version-history',
    standalone: true,
    imports: [TableModule, TagModule, WorkspaceFactGrid, WorkspaceFeedback],
    template: `
        <section class="card">
            <div>
                <h4 class="text-lg font-medium text-surface-950 dark:text-surface-0">{{ title }}</h4>
                <p class="mt-1 text-sm text-surface-500">{{ description }}</p>
            </div>

            @if (error) {
                <app-workspace-feedback class="mt-4 block" severity="warn" summary="版本历史暂不可用" [detail]="error" />
            }

            @if (summaryItems.length > 0) {
                <app-workspace-fact-grid class="mt-4 block" [items]="summaryItems" [columns]="4" />
            }

            <p-table
                class="mt-4 block"
                styleClass="p-datatable-sm"
                [value]="rows"
                [loading]="loading"
                [rowHover]="true"
                [paginator]="rows.length > rowsPerPage"
                [rows]="rowsPerPage"
                [scrollable]="true"
                [tableStyle]="{ 'min-width': '86rem' }"
                dataKey="id"
                responsiveLayout="scroll"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                [currentPageReportTemplate]="pageReportTemplate"
            >
                <ng-template #header>
                    <tr>
                        <th>版本</th>
                        <th>当前</th>
                        <th>状态</th>
                        <th>{{ primaryColumnHeader }}</th>
                        <th>{{ secondaryColumnHeader }}</th>
                        <th>{{ outcomeColumnHeader }}</th>
                        <th>生效时间</th>
                        <th>创建时间</th>
                        <th>操作人 ID</th>
                        <th>替代关系</th>
                        <th>Row version</th>
                    </tr>
                </ng-template>
                <ng-template #body let-row>
                    <tr>
                        <td class="font-medium text-surface-950 dark:text-surface-0">{{ row.versionLabel }}</td>
                        <td>
                            <p-tag [value]="row.isCurrent ? '当前' : '历史'" [severity]="row.isCurrent ? 'success' : 'secondary'" styleClass="rounded-[6px]!" />
                        </td>
                        <td>
                            <p-tag [value]="row.statusLabel" [severity]="row.statusSeverity" styleClass="rounded-[6px]!" />
                        </td>
                        <td>
                            <div class="text-xs text-surface-500 dark:text-surface-400">{{ row.primaryLabel }}</div>
                            @if (row.primarySeverity) {
                                <p-tag [value]="row.primaryValue" [severity]="row.primarySeverity" styleClass="mt-1 rounded-[6px]!" />
                            } @else {
                                <div class="mt-1 text-sm font-medium text-surface-900 dark:text-surface-0">{{ row.primaryValue }}</div>
                            }
                        </td>
                        <td>
                            <div class="text-xs text-surface-500 dark:text-surface-400">{{ row.secondaryLabel }}</div>
                            @if (row.secondarySeverity) {
                                <p-tag [value]="row.secondaryValue" [severity]="row.secondarySeverity" styleClass="mt-1 rounded-[6px]!" />
                            } @else {
                                <div class="mt-1 text-sm font-medium text-surface-900 dark:text-surface-0">{{ row.secondaryValue }}</div>
                            }
                        </td>
                        <td>
                            <div class="text-xs text-surface-500 dark:text-surface-400">{{ row.outcomeLabel }}</div>
                            @if (row.outcomeSeverity) {
                                <p-tag [value]="row.outcomeValue" [severity]="row.outcomeSeverity" styleClass="mt-1 rounded-[6px]!" />
                            } @else {
                                <div class="mt-1 text-sm font-medium text-surface-900 dark:text-surface-0">{{ row.outcomeValue }}</div>
                            }
                        </td>
                        <td>{{ row.effectiveAt }}</td>
                        <td>{{ row.createdAt }}</td>
                        <td>
                            <div class="text-sm text-surface-900 dark:text-surface-0">创建 {{ row.createdBy }}</div>
                            <div class="mt-1 text-xs text-surface-500 dark:text-surface-400">更新 {{ row.updatedBy }}</div>
                        </td>
                        <td>{{ row.supersedesLabel }}</td>
                        <td>{{ row.rowVersionLabel }}</td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td colspan="11" class="px-6 py-10 text-center text-surface-500 dark:text-surface-400">{{ emptyMessage }}</td>
                    </tr>
                </ng-template>
                <ng-template #loadingbody>
                    <tr>
                        <td colspan="11" class="px-6 py-10 text-center text-surface-500 dark:text-surface-400">{{ loadingMessage }}</td>
                    </tr>
                </ng-template>
            </p-table>
        </section>
    `
})
export class WorkspaceVersionHistory {
    @Input() title = '版本历史';
    @Input() description = '查看当前版本、历史版本和审计 metadata。';
    @Input() rows: WorkspaceVersionHistoryRow[] = [];
    @Input() summaryItems: WorkspaceFactGridItem[] = [];
    @Input() loading = false;
    @Input() error: string | null = null;
    @Input() emptyMessage = '当前没有历史版本。';
    @Input() loadingMessage = '正在读取版本历史';
    @Input() rowsPerPage = 6;
    @Input() primaryColumnHeader = '关键字段';
    @Input() secondaryColumnHeader = '判断';
    @Input() outcomeColumnHeader = '结果';

    get pageReportTemplate(): string {
        return `显示 {first} 到 {last}，共 {totalRecords} 条版本记录`;
    }
}
