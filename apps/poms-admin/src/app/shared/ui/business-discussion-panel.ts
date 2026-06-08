import { CommonModule } from '@angular/common';
import { Component, Input, inject, type OnChanges, type SimpleChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BusinessDiscussionStore,
  type BusinessDiscussionTargetObjectType,
  BusinessDiscussionType,
} from '@poms/admin-data-access';
import {
  BusinessDiscussionTargetObjectTypeLabel,
  BusinessDiscussionTypeLabel,
  BusinessDiscussionTypeOptions,
} from '@poms/shared-contracts';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SectionCard } from './sectioncard';
import { WorkspaceFeedback } from './workspace-feedback';

interface BusinessDiscussionOption<T extends string> {
  label: string;
  value: T;
}

interface DiscussionForm {
  discussionType: BusinessDiscussionType;
  body: string;
  isPinned: boolean;
  isKeyConclusion: boolean;
}

const DISCUSSION_TYPE_LABELS = BusinessDiscussionTypeLabel as Record<BusinessDiscussionType, string>;
const DISCUSSION_TARGET_LABELS = BusinessDiscussionTargetObjectTypeLabel as Record<
  BusinessDiscussionTargetObjectType,
  string
>;
const DISCUSSION_TYPE_OPTIONS = [
  ...(BusinessDiscussionTypeOptions as ReadonlyArray<BusinessDiscussionOption<BusinessDiscussionType>>),
];

const EMPTY_DISCUSSION_FORM: DiscussionForm = {
  discussionType: BusinessDiscussionType.General,
  body: '',
  isPinned: false,
  isKeyConclusion: false,
};

@Component({
  selector: 'app-business-discussion-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    SectionCard,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
    WorkspaceFeedback,
  ],
  providers: [BusinessDiscussionStore],
  template: `
        <section-card>
            <ng-template #title>{{ heading }}</ng-template>
            <ng-template #description>{{ descriptionText }}</ng-template>
            <ng-template #action>
                <div class="flex max-w-full flex-wrap gap-2">
                    <p-button icon="pi pi-refresh" label="刷新" severity="secondary" [outlined]="true" styleClass="rounded-md!" [loading]="store.loading()" [disabled]="!canReadContext()" (onClick)="reload()" />
                    @if (canWrite) {
                        <p-button icon="pi pi-comment" label="新增讨论" severity="primary" [outlined]="true" styleClass="rounded-md!" [disabled]="!canCreateDiscussion()" (onClick)="showDialog()" />
                    }
                </div>
            </ng-template>

            <div class="mt-4 flex flex-col gap-3">
                @if (!canReadContext()) {
                    <app-workspace-feedback severity="warn" summary="暂时不能读取讨论" detail="当前业务对象缺少客户、线索或项目标识，无法形成讨论查询上下文。" />
                } @else if (error()) {
                    <app-workspace-feedback severity="error" summary="业务讨论暂时无法处理" [detail]="error()" />
                } @else if (store.loading()) {
                    <app-workspace-feedback severity="info" summary="正在读取业务讨论" detail="请稍候。" />
                } @else if (store.comments().length) {
                    <div class="flex flex-col divide-y divide-surface-200 rounded-[8px] border border-surface-200 dark:divide-surface-700 dark:border-surface-700">
                        @for (comment of store.comments(); track comment.id) {
                            <article class="px-4 py-3">
                                <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div class="min-w-0">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <p-tag [value]="discussionTypeLabel(comment.discussionType)" severity="secondary" class="rounded-[6px]" />
                                            @if (comment.isPinned) {
                                                <p-tag value="置顶" severity="contrast" class="rounded-[6px]" />
                                            }
                                            @if (comment.isKeyConclusion) {
                                                <p-tag value="关键结论" severity="success" class="rounded-[6px]" />
                                            }
                                        </div>
                                        <div class="mt-2 whitespace-pre-line text-sm leading-6 text-surface-700 dark:text-surface-200">{{ comment.body }}</div>
                                    </div>
                                    <div class="shrink-0 text-left text-xs leading-5 text-surface-500 dark:text-surface-400 sm:text-right">
                                        <div>{{ comment.createdAt | date: 'yyyy-MM-dd HH:mm' }}</div>
                                        <div>{{ displayText(comment.createdByName, '未确认') }}</div>
                                        <div>{{ discussionTargetLabel(comment.targetObjectType) }} · {{ comment.targetTitle }}</div>
                                    </div>
                                </div>
                                @if (comment.relatedContactName) {
                                    <div class="mt-2 text-xs text-surface-500 dark:text-surface-400">关联联系人：{{ comment.relatedContactName }}</div>
                                }
                            </article>
                        }
                    </div>
                } @else if (canReadContext()) {
                    <div class="rounded-[8px] border border-dashed border-surface-300 p-4 text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">暂无业务讨论。</div>
                }
            </div>
        </section-card>

        <p-dialog [(visible)]="dialogVisible" [modal]="true" appendTo="body" header="新增业务讨论" [style]="{ width: 'min(36rem, 92vw)' }" styleClass="p-fluid" (onHide)="resetDialog()">
            <div class="flex flex-col gap-4 py-2">
                @if (error()) {
                    <app-workspace-feedback severity="error" summary="讨论没有保存成功" [detail]="error()" />
                }
                <app-workspace-feedback severity="info" summary="讨论对象" [detail]="discussionTargetLabel(targetObjectType) + ' · ' + targetTitle" />

                <div class="flex flex-col gap-2">
                    <label for="businessDiscussionType" class="text-sm font-medium text-surface-900 dark:text-surface-0">讨论类型</label>
                    <p-select inputId="businessDiscussionType" [ngModel]="form().discussionType" (ngModelChange)="updateDiscussionType($event)" [options]="discussionTypeOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                </div>

                <div class="flex flex-col gap-2">
                    <label for="businessDiscussionBody" class="text-sm font-medium text-surface-900 dark:text-surface-0">讨论内容</label>
                    <textarea pTextarea id="businessDiscussionBody" rows="5" [ngModel]="form().body" (ngModelChange)="updateBody($event)" class="w-full rounded-md!"></textarea>
                    @if (attempted() && !form().body.trim()) {
                        <span class="text-xs text-red-600 dark:text-red-300">请填写讨论内容。</span>
                    }
                </div>

                <div class="flex flex-wrap gap-4">
                    <label class="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-200">
                        <p-toggleswitch [ngModel]="form().isPinned" (ngModelChange)="updateToggle('isPinned', $event)" />
                        <span>置顶</span>
                    </label>
                    <label class="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-200">
                        <p-toggleswitch [ngModel]="form().isKeyConclusion" (ngModelChange)="updateToggle('isKeyConclusion', $event)" />
                        <span>关键结论</span>
                    </label>
                </div>
            </div>

            <ng-template #footer>
                <div class="flex justify-end gap-2">
                    <p-button label="取消" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="dialogVisible = false" />
                    <p-button label="发布讨论" [loading]="store.saving()" [disabled]="!canSubmit()" styleClass="rounded-md!" (onClick)="createDiscussion()" />
                </div>
            </ng-template>
        </p-dialog>
    `,
})
export class BusinessDiscussionPanel implements OnChanges {
  readonly store = inject(BusinessDiscussionStore);

  @Input() customerId: string | null = null;
  @Input() leadId: string | null = null;
  @Input() projectId: string | null = null;
  @Input({ required: true }) targetObjectType!: BusinessDiscussionTargetObjectType;
  @Input({ required: true }) targetObjectId!: string | null;
  @Input() targetTitle = '';
  @Input() canWrite = false;
  @Input('title') heading = '业务讨论';
  @Input('description') descriptionText = '沉淀项目推进判断、关键结论、风险和补充信息。';

  readonly form = signal<DiscussionForm>({ ...EMPTY_DISCUSSION_FORM });
  readonly attempted = signal(false);
  readonly error = signal<string | null>(null);

  dialogVisible = false;
  readonly discussionTypeOptions = DISCUSSION_TYPE_OPTIONS;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerId'] || changes['leadId'] || changes['projectId']) {
      void this.reload();
    }
  }

  async reload(): Promise<void> {
    if (!this.canReadContext()) {
      this.store.clearComments();
      return;
    }

    this.error.set(null);
    try {
      await this.store.loadComments(this.readFilters());
    } catch {
      this.error.set('业务讨论没有读取成功，请稍后重试。');
    }
  }

  showDialog(): void {
    if (!this.canCreateDiscussion()) {
      return;
    }

    this.form.set({ ...EMPTY_DISCUSSION_FORM });
    this.attempted.set(false);
    this.error.set(null);
    this.dialogVisible = true;
  }

  resetDialog(): void {
    this.attempted.set(false);
    this.error.set(null);
  }

  updateDiscussionType(value: BusinessDiscussionType | null | undefined): void {
    this.form.update(form => ({
      ...form,
      discussionType: value ?? BusinessDiscussionType.General,
    }));
    this.error.set(null);
  }

  updateBody(value: string): void {
    this.form.update(form => ({
      ...form,
      body: value,
    }));
    this.error.set(null);
  }

  updateToggle(field: 'isPinned' | 'isKeyConclusion', value: boolean): void {
    this.form.update(form => ({
      ...form,
      [field]: Boolean(value),
    }));
    this.error.set(null);
  }

  async createDiscussion(): Promise<void> {
    this.attempted.set(true);
    const form = this.form();

    if (!this.canSubmit()) {
      return;
    }

    try {
      await this.store.createComment(
        {
          targetObjectType: this.targetObjectType,
          targetObjectId: this.targetObjectId ?? '',
          discussionType: form.discussionType,
          body: form.body.trim(),
          isPinned: form.isPinned,
          isKeyConclusion: form.isKeyConclusion,
        },
        this.readFilters(),
      );
      this.dialogVisible = false;
    } catch {
      this.error.set('请确认当前讨论对象仍然有效，或稍后重试。');
    }
  }

  canReadContext(): boolean {
    return Boolean(this.customerId || this.leadId || this.projectId);
  }

  canCreateDiscussion(): boolean {
    return Boolean(this.canWrite && this.targetObjectType && this.targetObjectId);
  }

  canSubmit(): boolean {
    return Boolean(this.canCreateDiscussion() && this.form().body.trim());
  }

  discussionTypeLabel(type: BusinessDiscussionType): string {
    return DISCUSSION_TYPE_LABELS[type] ?? type;
  }

  discussionTargetLabel(type: BusinessDiscussionTargetObjectType): string {
    return DISCUSSION_TARGET_LABELS[type] ?? type;
  }

  displayText(value: string | null | undefined, fallback: string): string {
    return value?.trim() ? value : fallback;
  }

  private readFilters() {
    return {
      customerId: this.customerId ?? undefined,
      leadId: this.leadId ?? undefined,
      projectId: this.projectId ?? undefined,
    };
  }
}
