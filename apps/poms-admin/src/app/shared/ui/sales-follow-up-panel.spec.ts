import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActiveInactiveStatus,
  DictionaryDomain,
  type DictionaryItemSummary,
  DictionaryStore,
  SalesFollowUpOutcome,
  SalesFollowUpRecordLifecycleScope,
  SalesFollowUpRecordStatus,
  type SalesFollowUpRecordSummary,
  SalesFollowUpStore,
} from '@poms/admin-data-access';
import { SalesFollowUpPanel } from './sales-follow-up-panel';

function createDictionaryItem(code: string, name: string, sortOrder = 0): DictionaryItemSummary {
  return {
    id: `dictionary-${code}`,
    domain: DictionaryDomain.SalesFollowUpType,
    code,
    name,
    description: null,
    status: ActiveInactiveStatus.Active,
    sortOrder,
    isSystem: true,
    usageCount: 0,
    rowVersion: 1,
    createdAt: '2026-05-01T00:00:00.000Z',
    createdBy: null,
    updatedAt: '2026-05-01T00:00:00.000Z',
    updatedBy: null,
  };
}

function createFollowUp(overrides: Partial<SalesFollowUpRecordSummary> = {}): SalesFollowUpRecordSummary {
  return {
    id: 'follow-up-1',
    customerId: 'customer-1',
    customerName: '华南地铁集团',
    leadId: 'lead-1',
    leadName: '华南地铁线索',
    projectId: null,
    projectName: null,
    followUpType: 'meeting',
    status: SalesFollowUpRecordStatus.Active,
    occurredAt: '2026-05-01T09:00:00.000Z',
    summary: '完成预算口径确认',
    detail: '客户确认预算口径，下周补充范围清单。',
    outcome: SalesFollowUpOutcome.Progress,
    nextFollowUpAt: '2026-05-08T09:00:00.000Z',
    ownerOrgId: 'org-1',
    ownerOrgName: '华南销售一部',
    ownerUserId: 'user-1',
    ownerName: '张销售',
    supersedesId: null,
    replacedById: null,
    replacementReason: null,
    voidedAt: null,
    voidedBy: null,
    voidedByName: null,
    voidReason: null,
    rowVersion: 1,
    createdAt: '2026-05-01T09:05:00.000Z',
    createdBy: 'user-1',
    updatedAt: '2026-05-01T09:05:00.000Z',
    updatedBy: 'user-1',
    ...overrides,
  };
}

describe('SalesFollowUpPanel', () => {
  let fixture: ComponentFixture<SalesFollowUpPanel>;
  let component: SalesFollowUpPanel;
  let followUps: ReturnType<typeof signal<SalesFollowUpRecordSummary[]>>;
  let dictionaryItems: ReturnType<typeof signal<DictionaryItemSummary[]>>;
  let salesFollowUpStoreMock: {
    followUps: typeof followUps;
    loading: ReturnType<typeof signal<boolean>>;
    saving: ReturnType<typeof signal<boolean>>;
    loaded: ReturnType<typeof signal<boolean>>;
    loadFollowUps: jest.Mock;
    createFollowUp: jest.Mock;
    replaceFollowUp: jest.Mock;
    voidFollowUp: jest.Mock;
    clearFollowUps: jest.Mock;
  };
  let dictionaryStoreMock: {
    items: typeof dictionaryItems;
    activeItems: typeof dictionaryItems;
    loading: ReturnType<typeof signal<boolean>>;
    saving: ReturnType<typeof signal<boolean>>;
    loaded: ReturnType<typeof signal<boolean>>;
    loadItems: jest.Mock;
    clearItems: jest.Mock;
  };

  beforeEach(async () => {
    followUps = signal<SalesFollowUpRecordSummary[]>([createFollowUp()]);
    dictionaryItems = signal([createDictionaryItem('meeting', '会议'), createDictionaryItem('phone', '电话', 10)]);
    salesFollowUpStoreMock = {
      followUps,
      loading: signal(false),
      saving: signal(false),
      loaded: signal(true),
      loadFollowUps: jest.fn().mockResolvedValue(followUps()),
      createFollowUp: jest.fn().mockResolvedValue(createFollowUp({ id: 'follow-up-2' })),
      replaceFollowUp: jest.fn().mockResolvedValue(createFollowUp({ id: 'follow-up-2' })),
      voidFollowUp: jest.fn().mockResolvedValue(createFollowUp({ status: SalesFollowUpRecordStatus.Voided })),
      clearFollowUps: jest.fn(),
    };
    dictionaryStoreMock = {
      items: dictionaryItems,
      activeItems: dictionaryItems,
      loading: signal(false),
      saving: signal(false),
      loaded: signal(true),
      loadItems: jest.fn().mockResolvedValue(dictionaryItems()),
      clearItems: jest.fn(() => dictionaryItems.set([])),
    };

    await TestBed.configureTestingModule({
      imports: [SalesFollowUpPanel],
    })
      .overrideComponent(SalesFollowUpPanel, {
        set: {
          providers: [
            {
              provide: SalesFollowUpStore,
              useValue: salesFollowUpStoreMock,
            },
            {
              provide: DictionaryStore,
              useValue: dictionaryStoreMock,
            },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SalesFollowUpPanel);
    component = fixture.componentInstance;
  });

  it('loads follow-ups with customer, source lead and project anchors', async () => {
    fixture.componentRef.setInput('customerId', 'customer-1');
    fixture.componentRef.setInput('leadId', 'lead-1');
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.componentRef.setInput('title', '客户销售跟进');
    fixture.componentRef.setInput('description', '记录客户沟通和下一步动作。');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(salesFollowUpStoreMock.loadFollowUps).toHaveBeenCalledWith({
      customerId: 'customer-1',
      leadId: 'lead-1',
      projectId: 'project-1',
      lifecycleScope: SalesFollowUpRecordLifecycleScope.Active,
    });
    expect(fixture.nativeElement.textContent).toContain('完成预算口径确认');
    expect(fixture.nativeElement.textContent).toContain('线索跟进');
    expect(fixture.nativeElement.textContent).toContain('客户销售跟进');
    expect(fixture.nativeElement.textContent).toContain('记录客户沟通和下一步动作。');
    expect(fixture.nativeElement.textContent).not.toContain('[object Object]');
  });

  it('creates project-context follow-up without reattaching the source lead', async () => {
    fixture.componentRef.setInput('customerId', 'customer-1');
    fixture.componentRef.setInput('leadId', 'lead-1');
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.componentRef.setInput('canWrite', true);
    fixture.detectChanges();
    await fixture.whenStable();

    component.showDialog();
    component.updateDate('occurredAt', new Date('2026-05-02T10:30:00.000Z'));
    component.updateText('summary', '  项目推进会完成  ');
    component.updateText('detail', '  客户确认交付窗口  ');

    await component.createFollowUp();

    expect(salesFollowUpStoreMock.createFollowUp).toHaveBeenCalledWith({
      customerId: 'customer-1',
      leadId: null,
      projectId: 'project-1',
      followUpType: 'meeting',
      occurredAt: '2026-05-02T10:30:00.000Z',
      summary: '项目推进会完成',
      detail: '客户确认交付窗口',
      outcome: SalesFollowUpOutcome.Progress,
      nextFollowUpAt: null,
    });
    expect(component.dialogVisible).toBe(false);
  });

  it('reloads with full lifecycle history when history is enabled', async () => {
    fixture.componentRef.setInput('customerId', 'customer-1');
    fixture.componentRef.setInput('leadId', 'lead-1');
    fixture.detectChanges();
    await fixture.whenStable();

    component.toggleHistory(true);
    await fixture.whenStable();

    expect(salesFollowUpStoreMock.loadFollowUps).toHaveBeenLastCalledWith({
      customerId: 'customer-1',
      leadId: 'lead-1',
      projectId: undefined,
      lifecycleScope: SalesFollowUpRecordLifecycleScope.All,
    });
  });

  it('replaces an active follow-up by creating a new version with expected rowVersion', async () => {
    const current = createFollowUp({ rowVersion: 4 });
    followUps.set([current]);
    fixture.componentRef.setInput('customerId', 'customer-1');
    fixture.componentRef.setInput('leadId', 'lead-1');
    fixture.componentRef.setInput('canWrite', true);
    fixture.detectChanges();
    await fixture.whenStable();

    component.showReplaceDialog(current);
    component.updateText('summary', '  更正后的摘要  ');
    component.updateText('detail', '  更正后的详情  ');
    component.updateReplacementReason('  原记录摘要不完整  ');
    await component.createFollowUp();

    expect(salesFollowUpStoreMock.replaceFollowUp).toHaveBeenCalledWith('follow-up-1', {
      followUpType: 'meeting',
      occurredAt: '2026-05-01T09:00:00.000Z',
      summary: '更正后的摘要',
      detail: '更正后的详情',
      outcome: SalesFollowUpOutcome.Progress,
      nextFollowUpAt: '2026-05-08T09:00:00.000Z',
      ownerOrgId: 'org-1',
      ownerUserId: 'user-1',
      replacementReason: '原记录摘要不完整',
      expectedVersion: 4,
    });
    expect(component.dialogVisible).toBe(false);
  });

  it('voids an active follow-up with expected rowVersion', async () => {
    const current = createFollowUp({ rowVersion: 5 });
    fixture.componentRef.setInput('customerId', 'customer-1');
    fixture.componentRef.setInput('leadId', 'lead-1');
    fixture.componentRef.setInput('canWrite', true);
    fixture.detectChanges();
    await fixture.whenStable();

    component.showVoidDialog(current);
    component.updateVoidReason('  重复录入  ');
    component.updateVoidComment('  已有会议纪要记录  ');
    await component.voidFollowUp();

    expect(salesFollowUpStoreMock.voidFollowUp).toHaveBeenCalledWith('follow-up-1', {
      reason: '重复录入',
      comment: '已有会议纪要记录',
      expectedVersion: 5,
    });
    expect(component.voidDialogVisible).toBe(false);
  });
});
