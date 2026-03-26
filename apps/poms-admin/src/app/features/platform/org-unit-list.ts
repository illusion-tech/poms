import { CommonModule } from '@angular/common';
import { Component, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { PlatformOrgUnitSummary } from '@poms/admin-data-access';
import { PlatformStore } from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

@Component({
    selector: 'app-org-unit-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, TextareaModule, DialogModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast />
        <div class="flex flex-col bg-surface-0 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
            <!-- Header -->
            <div class="px-6 py-5 border-b border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 class="text-surface-950 dark:text-surface-0 text-lg font-medium leading-7">组织管理</h1>

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <p-iconfield class="w-full sm:w-[217px]">
                        <p-inputicon class="pi pi-search" />
                        <input pInputText [(ngModel)]="searchValue" (input)="onGlobalFilter(dt, $event)" placeholder="搜索组织" class="w-full! py-2! rounded-xl!" />
                    </p-iconfield>
                    <p-button icon="pi pi-plus" label="新建组织" severity="primary" [rounded]="true" (onClick)="openCreateDialog()" class="w-full sm:w-auto cursor-pointer" />
                </div>
            </div>

            <!-- Table -->
            <div class="flex-1 px-6 py-5">
                <p-table
                    #dt
                    [value]="platformStore.orgUnits()"
                    [paginator]="true"
                    [rows]="10"
                    [globalFilterFields]="['name', 'code']"
                    [tableStyle]="{ width: '100%' }"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="显示第 {first} 至 {last} 条，共 {totalRecords} 条"
                    [pt]="{ pcPaginator: { root: { class: 'rounded-none!' } } }"
                >
                    <ng-template #header>
                        <tr>
                            <th pSortableColumn="name">
                                <span class="flex items-center gap-2">组织名称 <p-sortIcon field="name" /></span>
                            </th>
                            <th pSortableColumn="code">
                                <span class="flex items-center gap-2">组织编码 <p-sortIcon field="code" /></span>
                            </th>
                            <th>描述</th>
                            <th style="width: 6rem">操作</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-unit>
                        <tr>
                            <td>
                                <span class="text-surface-950 dark:text-surface-0 text-sm font-medium">{{ unit.name }}</span>
                            </td>
                            <td>
                                <span class="text-surface-400 text-xs font-mono">{{ unit.code ?? '—' }}</span>
                            </td>
                            <td>
                                <span class="text-surface-500 text-sm">{{ unit.description ?? '—' }}</span>
                            </td>
                            <td>
                                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" size="small" severity="secondary" pTooltip="编辑" tooltipPosition="top" (onClick)="openEditDialog(unit)" class="cursor-pointer" />
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="4" class="text-center py-8 text-surface-400">{{ platformStore.loadingOrgUnits() ? '加载中...' : '暂无组织' }}</td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>

            <!-- Create Dialog -->
            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新建组织" [style]="{ width: '28rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">组织名称 *</label>
                        <input pInputText [(ngModel)]="createForm.name" placeholder="如 华北销售部" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">组织编码 *</label>
                        <input pInputText [(ngModel)]="createForm.code" placeholder="如 SALES-NORTH" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">描述</label>
                        <textarea pTextarea [(ngModel)]="createForm.description" rows="3" placeholder="组织简介（可选）" class="w-full"></textarea>
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="createDialogVisible = false" />
                        <p-button label="创建" [loading]="platformStore.savingOrgUnit()" (onClick)="createOrgUnit()" />
                    </div>
                </ng-template>
            </p-dialog>

            <!-- Edit Dialog -->
            <p-dialog [(visible)]="editDialogVisible" [modal]="true" header="编辑组织" [style]="{ width: '28rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">组织名称 *</label>
                        <input pInputText [(ngModel)]="editForm.name" class="w-full" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">组织编码</label>
                        <input pInputText [(ngModel)]="editForm.code" class="w-full" [readonly]="true" />
                        <small class="text-surface-500">组织编码创建后暂不支持修改</small>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">描述</label>
                        <textarea pTextarea [(ngModel)]="editForm.description" rows="3" class="w-full"></textarea>
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="editDialogVisible = false" />
                        <p-button label="保存" [loading]="platformStore.savingOrgUnit()" (onClick)="saveOrgUnit()" />
                    </div>
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class OrgUnitList {
    readonly platformStore = inject(PlatformStore);
    private readonly messageService = inject(MessageService);

    @ViewChild('dt') dt!: Table;

    searchValue = '';

    // ── Create ─────────────────────────────────────────────────────────────

    createDialogVisible = false;
    createForm = { name: '', code: '', description: '' };

    openCreateDialog() {
        this.createForm = { name: '', code: '', description: '' };
        this.createDialogVisible = true;
    }

    async createOrgUnit() {
        if (!this.createForm.name.trim() || !this.createForm.code.trim()) {
            this.messageService.add({ severity: 'warn', summary: '请填写必填项', detail: '组织名称和组织编码为必填项' });
            return;
        }
        try {
            await this.platformStore.createOrgUnit({
                name: this.createForm.name.trim(),
                code: this.createForm.code.trim(),
                description: this.createForm.description.trim() || null
            });
            this.createDialogVisible = false;
            this.messageService.add({ severity: 'success', summary: '创建成功', detail: `组织 ${this.createForm.name} 已创建` });
        } catch {
            this.messageService.add({ severity: 'error', summary: '创建失败', detail: '组织编码可能已存在' });
        }
    }

    // ── Edit ───────────────────────────────────────────────────────────────

    editDialogVisible = false;
    editingId = signal('');
    editForm = { name: '', code: '', description: '' };

    openEditDialog(unit: PlatformOrgUnitSummary) {
        this.editingId.set(unit.id);
        this.editForm = { name: unit.name, code: unit.code ?? '', description: unit.description ?? '' };
        this.editDialogVisible = true;
    }

    async saveOrgUnit() {
        const id = this.editingId();
        if (!id || !this.editForm.name.trim()) return;
        try {
            await this.platformStore.updateOrgUnit(id, {
                name: this.editForm.name.trim(),
                description: this.editForm.description.trim() || null
            });
            this.editDialogVisible = false;
            this.messageService.add({ severity: 'success', summary: '保存成功', detail: '组织信息已更新' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '保存失败', detail: '更新组织失败' });
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    constructor() {
        void this.platformStore.loadOrgUnits();
    }
}
