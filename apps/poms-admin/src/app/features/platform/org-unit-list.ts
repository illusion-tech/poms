import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { OrgUnitTreeNode, PlatformOrgUnitSummary } from '@poms/admin-data-access';
import { PlatformStore } from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import type { TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TreeTableModule } from 'primeng/treetable';
import { AdminTableCard } from '../../shared/ui/admin-table-card';

type OrgUnitTreeTableNode = TreeNode<OrgUnitTreeNode>;

interface TreeTableNodeEvent {
    node?: OrgUnitTreeTableNode;
}

@Component({
    selector: 'app-org-unit-list',
    standalone: true,
    imports: [CommonModule, FormsModule, TreeTableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, TextareaModule, DialogModule, ToastModule, TooltipModule, TagModule, AdminTableCard],
    providers: [MessageService],
    template: `
        <p-toast />
        <div class="flex flex-col gap-5">
            <app-admin-table-card>
                <p-button adminToolbarStart icon="pi pi-plus" class="mr-2" severity="secondary" text ariaLabel="新建组织" pTooltip="新建组织" tooltipPosition="top" (onClick)="openCreateDialog()" />

                <p-iconfield adminToolbarCenter class="w-full md:w-80">
                    <p-inputicon class="pi pi-search" />
                    <input pInputText [ngModel]="searchQuery()" (ngModelChange)="updateSearchQuery($event)" placeholder="搜索组织名称或编码" class="w-full! rounded-md! py-2!" />
                </p-iconfield>

                <span adminToolbarEnd class="text-sm text-surface-500 dark:text-surface-400">共 {{ visibleOrgUnitCount() }} / {{ platformStore.orgUnits().length }} 个组织</span>

                <p-treetable
                    [value]="treeTableNodes()"
                    dataKey="key"
                    (onNodeExpand)="onNodeExpand($event)"
                    (onNodeCollapse)="onNodeCollapse($event)"
                    [scrollable]="true"
                    [tableStyle]="{ width: '100%', 'min-width': '64rem' }"
                    [pt]="{ root: { class: 'border-none!' } }"
                >
                    <ng-template #header>
                        <tr>
                            <th>组织名称</th>
                            <th>组织编码</th>
                            <th>排序</th>
                            <th>状态</th>
                            <th>描述</th>
                            <th style="width: 12rem">操作</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-rowNode let-unit="rowData">
                        <tr [ttRow]="rowNode">
                            <td>
                                <div class="flex items-center gap-2">
                                    <p-treeTableToggler [rowNode]="rowNode" />
                                    <div class="min-w-0">
                                        <div class="text-surface-950 dark:text-surface-0 text-sm font-medium">{{ unit.name }}</div>
                                        <div class="text-surface-400 text-xs font-mono md:hidden">{{ unit.code ?? '—' }}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="text-surface-400 text-xs font-mono">{{ unit.code ?? '—' }}</span>
                            </td>
                            <td>
                                <span class="text-surface-500 text-sm">{{ unit.displayOrder }}</span>
                            </td>
                            <td>
                                <p-tag [value]="unit.isActive ? '启用' : '停用'" [severity]="unit.isActive ? 'success' : 'warn'" />
                            </td>
                            <td>
                                <span class="text-surface-500 text-sm">{{ unit.description ?? '—' }}</span>
                            </td>
                            <td>
                                <div class="flex items-center gap-1">
                                    <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" size="small" severity="secondary" pTooltip="编辑" tooltipPosition="top" (onClick)="openEditDialog(unit)" class="cursor-pointer" ariaLabel="编辑组织" />
                                    <p-button
                                        icon="pi pi-share-alt"
                                        [rounded]="true"
                                        [text]="true"
                                        size="small"
                                        severity="secondary"
                                        pTooltip="移动"
                                        tooltipPosition="top"
                                        (onClick)="openMoveDialog(unit)"
                                        class="cursor-pointer"
                                        ariaLabel="移动组织"
                                    />
                                    <p-button
                                        [icon]="unit.isActive ? 'pi pi-ban' : 'pi pi-check'"
                                        [rounded]="true"
                                        [text]="true"
                                        size="small"
                                        [severity]="unit.isActive ? 'danger' : 'success'"
                                        [pTooltip]="unit.isActive ? '停用' : '启用'"
                                        tooltipPosition="top"
                                        (onClick)="toggleOrgUnit(unit)"
                                        class="cursor-pointer"
                                        [ariaLabel]="unit.isActive ? '停用组织' : '启用组织'"
                                    />
                                </div>
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="6" class="text-center py-8 text-surface-400">{{ emptyTreeMessage() }}</td>
                        </tr>
                    </ng-template>
                </p-treetable>
            </app-admin-table-card>

            <!-- Create Dialog -->
            <p-dialog [(visible)]="createDialogVisible" [modal]="true" header="新建组织" [style]="{ width: '28rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">组织名称 *</label>
                        <input pInputText [(ngModel)]="createForm.name" placeholder="如 华北销售部" class="w-full" aria-label="新建组织名称" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">组织编码 *</label>
                        <input pInputText [(ngModel)]="createForm.code" placeholder="如 SALES-NORTH" class="w-full" aria-label="新建组织编码" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">描述</label>
                        <textarea pTextarea [(ngModel)]="createForm.description" rows="3" placeholder="组织简介（可选）" class="w-full" aria-label="新建组织描述"></textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">上级组织</label>
                        <select [(ngModel)]="createForm.parentId" class="w-full rounded-xl border border-surface-300 px-3 py-2" aria-label="新建组织上级组织">
                            <option [ngValue]="null">作为根节点</option>
                            @for (unit of selectableParents(); track unit.id) {
                                <option [ngValue]="unit.id">{{ unit.name }}</option>
                            }
                        </select>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">排序</label>
                        <input pInputText type="number" [(ngModel)]="createForm.displayOrder" class="w-full" aria-label="新建组织排序" />
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
                        <input pInputText [(ngModel)]="editForm.name" class="w-full" aria-label="编辑组织名称" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">组织编码</label>
                        <input pInputText [(ngModel)]="editForm.code" class="w-full" aria-label="编辑组织编码" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">描述</label>
                        <textarea pTextarea [(ngModel)]="editForm.description" rows="3" class="w-full" aria-label="编辑组织描述"></textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">排序</label>
                        <input pInputText type="number" [(ngModel)]="editForm.displayOrder" class="w-full" aria-label="编辑组织排序" />
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="editDialogVisible = false" />
                        <p-button label="保存" [loading]="platformStore.savingOrgUnit()" (onClick)="saveOrgUnit()" />
                    </div>
                </ng-template>
            </p-dialog>

            <p-dialog [(visible)]="moveDialogVisible" [modal]="true" header="移动组织" [style]="{ width: '28rem' }" styleClass="p-fluid">
                <div class="flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">上级组织</label>
                        <select [(ngModel)]="moveForm.parentId" class="w-full rounded-xl border border-surface-300 px-3 py-2" aria-label="移动组织上级组织">
                            <option [ngValue]="null">移动到根节点</option>
                            @for (unit of selectableParents(movingId()); track unit.id) {
                                <option [ngValue]="unit.id">{{ unit.name }}</option>
                            }
                        </select>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="font-medium">排序</label>
                        <input pInputText type="number" [(ngModel)]="moveForm.displayOrder" class="w-full" aria-label="移动组织排序" />
                    </div>
                </div>
                <ng-template #footer>
                    <div class="flex justify-end gap-2">
                        <p-button label="取消" severity="secondary" [outlined]="true" (onClick)="moveDialogVisible = false" />
                        <p-button label="保存位置" [loading]="platformStore.savingOrgUnit()" (onClick)="moveOrgUnit()" />
                    </div>
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class OrgUnitList {
    readonly platformStore = inject(PlatformStore);
    private readonly messageService = inject(MessageService);

    readonly searchQuery = signal('');
    readonly expandedKeys = signal<Record<string, boolean>>({});
    readonly normalizedSearchQuery = computed(() => this.searchQuery().trim().toLocaleLowerCase());
    readonly filteredOrgUnitTree = computed(() => {
        const query = this.normalizedSearchQuery();
        const tree = this.platformStore.orgUnitTree();

        return query ? this.filterOrgUnitTree(tree, query) : tree;
    });
    readonly treeTableNodes = computed<OrgUnitTreeTableNode[]>(() => this.toTreeTableNodes(this.filteredOrgUnitTree()));
    readonly visibleOrgUnitCount = computed(() => this.countOrgUnitTree(this.filteredOrgUnitTree()));
    readonly searchExpandedKeys = computed(() => {
        const query = this.normalizedSearchQuery();
        if (!query) return {};

        const keys: Record<string, boolean> = {};
        this.collectSearchExpansionKeys(this.platformStore.orgUnitTree(), query, [], keys);
        return keys;
    });
    readonly effectiveExpandedKeys = computed(() => (this.normalizedSearchQuery() ? { ...this.expandedKeys(), ...this.searchExpandedKeys() } : this.expandedKeys()));

    // ── Create ─────────────────────────────────────────────────────────────

    createDialogVisible = false;
    createForm = { name: '', code: '', description: '', parentId: null as string | null, displayOrder: 0 };

    openCreateDialog() {
        this.createForm = { name: '', code: '', description: '', parentId: null, displayOrder: 0 };
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
                description: this.createForm.description.trim() || null,
                parentId: this.createForm.parentId,
                displayOrder: Number(this.createForm.displayOrder ?? 0)
            });
            this.expandNode(this.createForm.parentId);
            this.createDialogVisible = false;
            this.messageService.add({ severity: 'success', summary: '创建成功', detail: `组织 ${this.createForm.name} 已创建` });
        } catch {
            this.messageService.add({ severity: 'error', summary: '创建失败', detail: '组织编码可能已存在' });
        }
    }

    // ── Edit ───────────────────────────────────────────────────────────────

    editDialogVisible = false;
    editingId = signal('');
    editForm = { name: '', code: '', description: '', displayOrder: 0 };

    openEditDialog(unit: PlatformOrgUnitSummary) {
        this.editingId.set(unit.id);
        this.editForm = { name: unit.name, code: unit.code ?? '', description: unit.description ?? '', displayOrder: unit.displayOrder ?? 0 };
        this.editDialogVisible = true;
    }

    async saveOrgUnit() {
        const id = this.editingId();
        if (!id || !this.editForm.name.trim() || !this.editForm.code.trim()) return;
        try {
            await this.platformStore.updateOrgUnit(id, {
                name: this.editForm.name.trim(),
                code: this.editForm.code.trim(),
                description: this.editForm.description.trim() || null,
                displayOrder: Number(this.editForm.displayOrder ?? 0)
            });
            this.editDialogVisible = false;
            this.messageService.add({ severity: 'success', summary: '保存成功', detail: '组织信息已更新' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '保存失败', detail: '更新组织失败' });
        }
    }

    // ── Move / Activation ───────────────────────────────────────────────────

    moveDialogVisible = false;
    movingId = signal('');
    moveForm = { parentId: null as string | null, displayOrder: 0 };

    openMoveDialog(unit: PlatformOrgUnitSummary) {
        this.movingId.set(unit.id);
        this.moveForm = {
            parentId: unit.parentId ?? null,
            displayOrder: unit.displayOrder ?? 0
        };
        this.moveDialogVisible = true;
    }

    async moveOrgUnit() {
        const id = this.movingId();
        if (!id) return;
        try {
            await this.platformStore.moveOrgUnit(id, {
                parentId: this.moveForm.parentId,
                displayOrder: Number(this.moveForm.displayOrder ?? 0)
            });
            this.expandNode(this.moveForm.parentId);
            this.moveDialogVisible = false;
            this.messageService.add({ severity: 'success', summary: '移动成功', detail: '组织位置已更新' });
        } catch {
            this.messageService.add({ severity: 'error', summary: '移动失败', detail: '请检查目标父级和排序设置' });
        }
    }

    async toggleOrgUnit(unit: PlatformOrgUnitSummary) {
        try {
            if (unit.isActive) {
                await this.platformStore.deactivateOrgUnit(unit.id, {});
            } else {
                await this.platformStore.activateOrgUnit(unit.id, {});
            }
            this.messageService.add({
                severity: 'success',
                summary: '状态已更新',
                detail: `组织 ${unit.name} 已${unit.isActive ? '停用' : '启用'}`
            });
        } catch {
            this.messageService.add({ severity: 'error', summary: '状态更新失败', detail: '请检查组织层级状态后重试' });
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    updateSearchQuery(value: string) {
        this.searchQuery.set(value);
    }

    onNodeExpand(event: TreeTableNodeEvent) {
        const key = event.node?.key;
        if (typeof key !== 'string') return;

        this.expandedKeys.update((keys) => ({ ...keys, [key]: true }));
    }

    onNodeCollapse(event: TreeTableNodeEvent) {
        const key = event.node?.key;
        if (typeof key !== 'string') return;

        this.expandedKeys.update((keys) => {
            const next = { ...keys };
            delete next[key];
            return next;
        });
    }

    emptyTreeMessage(): string {
        if (this.platformStore.loadingOrgUnits() || this.platformStore.loadingOrgUnitTree()) return '加载中...';
        return this.normalizedSearchQuery() ? '没有匹配的组织' : '暂无组织';
    }

    selectableParents(excludedId?: string): PlatformOrgUnitSummary[] {
        const excludedIds = excludedId ? this.excludedParentIds(excludedId) : new Set<string>();
        return this.platformStore.orgUnits().filter((unit) => !excludedIds.has(unit.id));
    }

    constructor() {
        void this.loadOrgUnitManagementData();
    }

    private async loadOrgUnitManagementData() {
        await this.platformStore.loadOrgUnitManagementData();
        this.expandRootNodesIfIdle();
    }

    private toTreeTableNodes(nodes: OrgUnitTreeNode[]): OrgUnitTreeTableNode[] {
        const expandedKeys = this.effectiveExpandedKeys();
        return nodes.map((node) => ({
            key: node.id,
            data: node,
            expanded: expandedKeys[node.id] === true,
            children: this.toTreeTableNodes(node.children ?? [])
        }));
    }

    private filterOrgUnitTree(nodes: OrgUnitTreeNode[], query: string): OrgUnitTreeNode[] {
        return nodes.flatMap((node) => {
            const matches = this.orgUnitMatchesSearch(node, query);
            const filteredChildren = this.filterOrgUnitTree(node.children ?? [], query);

            if (!matches && filteredChildren.length === 0) {
                return [];
            }

            return [
                {
                    ...node,
                    children: matches ? (node.children ?? []) : filteredChildren
                }
            ];
        });
    }

    private collectSearchExpansionKeys(nodes: OrgUnitTreeNode[], query: string, ancestors: string[], keys: Record<string, boolean>): boolean {
        let branchHasMatch = false;

        for (const node of nodes) {
            const childHasMatch = this.collectSearchExpansionKeys(node.children ?? [], query, [...ancestors, node.id], keys);
            const selfMatches = this.orgUnitMatchesSearch(node, query);

            if (selfMatches || childHasMatch) {
                for (const ancestorId of ancestors) {
                    keys[ancestorId] = true;
                }
                if ((node.children?.length ?? 0) > 0) {
                    keys[node.id] = true;
                }
                branchHasMatch = true;
            }
        }

        return branchHasMatch;
    }

    private orgUnitMatchesSearch(unit: Pick<OrgUnitTreeNode, 'name' | 'code'>, query: string): boolean {
        return unit.name.toLocaleLowerCase().includes(query) || (unit.code ?? '').toLocaleLowerCase().includes(query);
    }

    private countOrgUnitTree(nodes: OrgUnitTreeNode[]): number {
        return nodes.reduce((total, node) => total + 1 + this.countOrgUnitTree(node.children ?? []), 0);
    }

    private expandRootNodesIfIdle() {
        if (this.normalizedSearchQuery() || Object.keys(this.expandedKeys()).length > 0) return;

        const rootKeys = Object.fromEntries(this.platformStore.orgUnitTree().filter((node) => (node.children?.length ?? 0) > 0).map((node) => [node.id, true]));
        this.expandedKeys.set(rootKeys);
    }

    private expandNode(id: string | null) {
        if (!id) return;
        this.expandedKeys.update((keys) => ({ ...keys, [id]: true }));
    }

    private excludedParentIds(unitId: string): Set<string> {
        const excludedIds = new Set<string>([unitId]);
        const node = this.findOrgUnitTreeNode(this.platformStore.orgUnitTree(), unitId);
        this.collectDescendantIds(node?.children ?? [], excludedIds);
        return excludedIds;
    }

    private findOrgUnitTreeNode(nodes: OrgUnitTreeNode[], id: string): OrgUnitTreeNode | null {
        for (const node of nodes) {
            if (node.id === id) return node;
            const child = this.findOrgUnitTreeNode(node.children ?? [], id);
            if (child) return child;
        }
        return null;
    }

    private collectDescendantIds(nodes: OrgUnitTreeNode[], ids: Set<string>) {
        for (const node of nodes) {
            ids.add(node.id);
            this.collectDescendantIds(node.children ?? [], ids);
        }
    }
}
