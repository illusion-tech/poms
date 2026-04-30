import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SalesFollowUpStore, type SalesFollowUpRecordSummary } from '@poms/admin-data-access';
import { SalesFollowUpPanel } from './sales-follow-up-panel';

function createFollowUp(overrides: Partial<SalesFollowUpRecordSummary> = {}): SalesFollowUpRecordSummary {
    return {
        id: 'follow-up-1',
        customerId: 'customer-1',
        customerName: '华南地铁集团',
        leadId: 'lead-1',
        leadName: '华南地铁线索',
        projectId: null,
        projectName: null,
        followUpType: 'meeting' as SalesFollowUpRecordSummary['followUpType'],
        occurredAt: '2026-05-01T09:00:00.000Z',
        summary: '完成预算口径确认',
        detail: '客户确认预算口径，下周补充范围清单。',
        outcome: 'progress' as SalesFollowUpRecordSummary['outcome'],
        nextFollowUpAt: '2026-05-08T09:00:00.000Z',
        ownerOrgId: 'org-1',
        ownerOrgName: '华南销售一部',
        ownerUserId: 'user-1',
        ownerName: '张销售',
        rowVersion: 1,
        createdAt: '2026-05-01T09:05:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-05-01T09:05:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

describe('SalesFollowUpPanel', () => {
    let fixture: ComponentFixture<SalesFollowUpPanel>;
    let component: SalesFollowUpPanel;
    let followUps: ReturnType<typeof signal<SalesFollowUpRecordSummary[]>>;
    let salesFollowUpStoreMock: {
        followUps: typeof followUps;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadFollowUps: jest.Mock;
        createFollowUp: jest.Mock;
        clearFollowUps: jest.Mock;
    };

    beforeEach(async () => {
        followUps = signal<SalesFollowUpRecordSummary[]>([createFollowUp()]);
        salesFollowUpStoreMock = {
            followUps,
            loading: signal(false),
            saving: signal(false),
            loaded: signal(true),
            loadFollowUps: jest.fn().mockResolvedValue(followUps()),
            createFollowUp: jest.fn().mockResolvedValue(createFollowUp({ id: 'follow-up-2' })),
            clearFollowUps: jest.fn()
        };

        await TestBed.configureTestingModule({
            imports: [SalesFollowUpPanel]
        })
            .overrideComponent(SalesFollowUpPanel, {
                set: {
                    providers: [
                        {
                            provide: SalesFollowUpStore,
                            useValue: salesFollowUpStoreMock
                        }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(SalesFollowUpPanel);
        component = fixture.componentInstance;
    });

    it('loads follow-ups with customer, source lead and project anchors', async () => {
        fixture.componentRef.setInput('customerId', 'customer-1');
        fixture.componentRef.setInput('leadId', 'lead-1');
        fixture.componentRef.setInput('projectId', 'project-1');
        fixture.detectChanges();
        await fixture.whenStable();

        expect(salesFollowUpStoreMock.loadFollowUps).toHaveBeenCalledWith({
            customerId: 'customer-1',
            leadId: 'lead-1',
            projectId: 'project-1'
        });
        expect(fixture.nativeElement.textContent).toContain('完成预算口径确认');
        expect(fixture.nativeElement.textContent).toContain('线索跟进');
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
            outcome: 'progress',
            nextFollowUpAt: null
        });
        expect(component.dialogVisible).toBe(false);
    });
});
