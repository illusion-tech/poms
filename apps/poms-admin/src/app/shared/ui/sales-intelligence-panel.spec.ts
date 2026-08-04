import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import {
  type CompetitorIntelligenceRecordSummary,
  CompetitorPosition,
  CustomerContactGender,
  CustomerContactStatus,
  type CustomerContactSummary,
  CustomerPreference,
  OpportunityStakeholderAccessLevel,
  OpportunityStakeholderAttitude,
  OpportunityStakeholderInfluenceLevel,
  OpportunityStakeholderRole,
  type OpportunityStakeholderSummary,
  type SalesDiscoveryRecordSummary,
  SalesIntelligenceGapItem,
  SalesIntelligenceGapSeverity,
  type SalesIntelligenceGapSummary,
  SalesIntelligenceStore,
  WinProbabilityLevel,
} from '@poms/admin-data-access';
import { SalesIntelligencePanel } from './sales-intelligence-panel';

function createContact(overrides: Partial<CustomerContactSummary> = {}): CustomerContactSummary {
  return {
    id: 'contact-1',
    customerId: 'customer-1',
    customerName: '华南地铁集团',
    name: '王主任',
    gender: CustomerContactGender.Female,
    department: '采购部',
    title: '主任',
    workPhone: '020-12345678',
    mobile: null,
    wechat: 'wang-director',
    email: 'wang@example.com',
    remark: '关注采购流程。',
    status: CustomerContactStatus.Active,
    rowVersion: 1,
    createdAt: '2026-05-04T08:00:00.000Z',
    createdBy: 'user-1',
    updatedAt: '2026-05-04T08:00:00.000Z',
    updatedBy: 'user-1',
    ...overrides,
  };
}

function createStakeholder(overrides: Partial<OpportunityStakeholderSummary> = {}): OpportunityStakeholderSummary {
  return {
    id: 'stakeholder-1',
    customerId: 'customer-1',
    customerName: '华南地铁集团',
    leadId: 'lead-1',
    leadName: '华南地铁线索',
    projectId: null,
    projectName: null,
    contactId: 'contact-1',
    contactName: '王主任',
    contactDepartment: '采购部',
    contactTitle: '主任',
    role: OpportunityStakeholderRole.DecisionMaker,
    attitude: OpportunityStakeholderAttitude.Supportive,
    influenceLevel: OpportunityStakeholderInfluenceLevel.High,
    accessLevel: OpportunityStakeholderAccessLevel.Direct,
    focusAreas: ['预算', '采购流程'],
    communicationNotes: '需要尽早确认采购路径。',
    isPrimary: true,
    rowVersion: 1,
    createdAt: '2026-05-04T08:00:00.000Z',
    createdBy: 'user-1',
    updatedAt: '2026-05-04T08:00:00.000Z',
    updatedBy: 'user-1',
    ...overrides,
  };
}

function createCompetitor(
  overrides: Partial<CompetitorIntelligenceRecordSummary> = {},
): CompetitorIntelligenceRecordSummary {
  return {
    id: 'competitor-1',
    customerId: 'customer-1',
    customerName: '华南地铁集团',
    leadId: 'lead-1',
    leadName: '华南地铁线索',
    projectId: null,
    projectName: null,
    competitorName: '既有供应商',
    position: CompetitorPosition.Incumbent,
    customerPreference: CustomerPreference.Neutral,
    competitorStrengths: '存量关系',
    competitorWeaknesses: null,
    ourAdvantages: '技术方案匹配',
    ourRisks: '采购流程未确认',
    winProbability: WinProbabilityLevel.Medium,
    evidence: '客户会议纪要',
    rowVersion: 1,
    createdAt: '2026-05-04T08:00:00.000Z',
    createdBy: 'user-1',
    updatedAt: '2026-05-04T08:00:00.000Z',
    updatedBy: 'user-1',
    ...overrides,
  };
}

function createDiscovery(overrides: Partial<SalesDiscoveryRecordSummary> = {}): SalesDiscoveryRecordSummary {
  return {
    id: 'discovery-1',
    customerId: 'customer-1',
    customerName: '华南地铁集团',
    leadId: 'lead-1',
    leadName: '华南地铁线索',
    projectId: null,
    projectName: null,
    procurementProcess: '公开招标',
    budgetSource: '年度专项预算',
    customerPainPoints: '设备维护响应慢',
    decisionCycle: '二季度定标',
    nextContactPlan: '约采购部确认招标节奏',
    remark: null,
    rowVersion: 1,
    createdAt: '2026-05-04T08:00:00.000Z',
    createdBy: 'user-1',
    updatedAt: '2026-05-04T08:00:00.000Z',
    updatedBy: 'user-1',
    ...overrides,
  };
}

function createGap(overrides: Partial<SalesIntelligenceGapSummary> = {}): SalesIntelligenceGapSummary {
  return {
    item: SalesIntelligenceGapItem.DecisionMaker,
    label: '决策链',
    isMissing: true,
    explanation: '缺少关键决策人。',
    severity: SalesIntelligenceGapSeverity.High,
    ...overrides,
  };
}

describe('SalesIntelligencePanel', () => {
  let fixture: ComponentFixture<SalesIntelligencePanel>;
  let component: SalesIntelligencePanel;
  let storeMock: {
    contacts: ReturnType<typeof signal<CustomerContactSummary[]>>;
    stakeholders: ReturnType<typeof signal<OpportunityStakeholderSummary[]>>;
    competitors: ReturnType<typeof signal<CompetitorIntelligenceRecordSummary[]>>;
    discoveryRecords: ReturnType<typeof signal<SalesDiscoveryRecordSummary[]>>;
    gaps: ReturnType<typeof signal<SalesIntelligenceGapSummary[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    saving: ReturnType<typeof signal<boolean>>;
    loaded: ReturnType<typeof signal<boolean>>;
    loadContext: jest.Mock;
    createCustomerContact: jest.Mock;
    updateCustomerContact: jest.Mock;
    createOpportunityStakeholder: jest.Mock;
    createCompetitorIntelligenceRecord: jest.Mock;
    createSalesDiscoveryRecord: jest.Mock;
    clearContext: jest.Mock;
  };

  beforeEach(async () => {
    storeMock = {
      contacts: signal([createContact()]),
      stakeholders: signal([createStakeholder()]),
      competitors: signal([createCompetitor()]),
      discoveryRecords: signal([createDiscovery()]),
      gaps: signal([createGap()]),
      loading: signal(false),
      saving: signal(false),
      loaded: signal(true),
      loadContext: jest.fn().mockResolvedValue(undefined),
      createCustomerContact: jest.fn().mockResolvedValue(createContact()),
      updateCustomerContact: jest.fn().mockResolvedValue(createContact()),
      createOpportunityStakeholder: jest.fn().mockResolvedValue(createStakeholder()),
      createCompetitorIntelligenceRecord: jest.fn().mockResolvedValue(createCompetitor()),
      createSalesDiscoveryRecord: jest.fn().mockResolvedValue(createDiscovery()),
      clearContext: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SalesIntelligencePanel],
    })
      .overrideComponent(SalesIntelligencePanel, {
        set: {
          providers: [
            {
              provide: SalesIntelligenceStore,
              useValue: storeMock,
            },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SalesIntelligencePanel);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('customerId', 'customer-1');
    fixture.componentRef.setInput('leadId', 'lead-1');
    fixture.componentRef.setInput('canWrite', true);
    fixture.componentRef.setInput('canWriteCustomerContact', true);
    fixture.componentRef.setInput('title', '客户关系');
    fixture.componentRef.setInput('description', '维护客户联系人和决策链事实。');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('loads and renders sales intelligence from the current opportunity context', () => {
    const text = fixture.nativeElement.textContent;

    expect(storeMock.loadContext).toHaveBeenCalledWith('customer-1', {
      leadId: 'lead-1',
      projectId: undefined,
    });
    expect(text).toContain('王主任');
    expect(text).toContain('女');
    expect(text).toContain('决策链关系人');
    expect(text).toContain('既有供应商');
    expect(text).toContain('公开招标');
    expect(text).toContain('缺少关键决策人。');
    expect(text).toContain('客户关系');
    expect(text).toContain('维护客户联系人和决策链事实。');
    expect(text).not.toContain('[object Object]');
  });

  it('creates project-scoped opportunity facts when project id is present', async () => {
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.detectChanges();
    await fixture.whenStable();

    component.showStakeholderDialog();
    component.updateStakeholderContact('contact-1');
    component.updateStakeholderText('focusAreas', '预算,采购流程');

    await component.createStakeholder();

    expect(storeMock.createOpportunityStakeholder).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'customer-1',
        projectId: 'project-1',
        contactId: 'contact-1',
        focusAreas: ['预算', '采购流程'],
      }),
    );
    expect(storeMock.createOpportunityStakeholder.mock.calls[0][0]).not.toHaveProperty('leadId');
  });

  it('creates customer contacts with gender from the contact form', async () => {
    component.showContactDialog();
    component.updateContactField('name', '李经理');
    component.updateContactGender(CustomerContactGender.Male);

    await component.createContact();

    expect(storeMock.createCustomerContact).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'customer-1',
        name: '李经理',
        gender: CustomerContactGender.Male,
      }),
    );
  });

  it('opens the edit dialog with the complete contact snapshot', () => {
    component.showContactEditDialog(createContact());

    expect(component.contactDialogVisible).toBe(true);
    expect(component.contactDialogTitle()).toBe('编辑客户联系人');
    expect(component.contactSubmitLabel()).toBe('保存修改');
    expect(component.editingContact()?.id).toBe('contact-1');
    expect(component.contactForm()).toEqual({
      name: '王主任',
      gender: CustomerContactGender.Female,
      department: '采购部',
      title: '主任',
      workPhone: '020-12345678',
      mobile: '',
      wechat: 'wang-director',
      email: 'wang@example.com',
      remark: '关注采购流程。',
      status: CustomerContactStatus.Active,
    });
    expect(component.contactSubmitDisabled()).toBe(true);
  });

  it('updates only changed contact fields and closes after the store reload succeeds', async () => {
    component.showContactEditDialog(createContact());
    component.updateContactField('mobile', ' 13900000000 ');
    component.updateContactField('remark', '');
    component.updateContactStatus(CustomerContactStatus.Inactive);

    await component.saveContact();

    expect(storeMock.updateCustomerContact).toHaveBeenCalledWith('contact-1', 'customer-1', {
      mobile: '13900000000',
      remark: null,
      status: CustomerContactStatus.Inactive,
    });
    expect(component.contactDialogVisible).toBe(false);
  });

  it('does not send an update when the normalized contact form has no changes', async () => {
    component.showContactEditDialog(createContact());
    component.updateContactField('name', '  王主任  ');

    expect(component.contactSubmitDisabled()).toBe(true);

    await component.saveContact();

    expect(storeMock.updateCustomerContact).not.toHaveBeenCalled();
    expect(component.contactDialogVisible).toBe(true);
  });

  it('keeps the edit dialog and entered values when the update fails', async () => {
    storeMock.updateCustomerContact.mockRejectedValueOnce(new Error('forbidden'));
    component.showContactEditDialog(createContact());
    component.updateContactField('title', '采购总监');

    await component.saveContact();

    expect(component.contactDialogVisible).toBe(true);
    expect(component.contactForm().title).toBe('采购总监');
    expect(component.contactError()).toContain('客户维护权限');
  });

  it('uses customer write permission independently from opportunity write permission', async () => {
    expect(fixture.nativeElement.querySelector('[aria-label="编辑客户联系人 王主任"]')).not.toBeNull();

    fixture.componentRef.setInput('canWriteCustomerContact', false);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[aria-label="编辑客户联系人 王主任"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('关系人');

    component.showContactEditDialog(createContact());
    expect(component.contactDialogVisible).toBe(false);
  });
});
