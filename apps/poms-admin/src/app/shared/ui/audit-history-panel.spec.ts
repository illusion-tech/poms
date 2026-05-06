import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditHistoryStore, type EntityAuditHistoryRecord } from '@poms/admin-data-access';
import { AuditHistoryPanel } from './audit-history-panel';

describe('AuditHistoryPanel', () => {
    let fixture: ComponentFixture<AuditHistoryPanel>;
    let component: AuditHistoryPanel;
    let storeMock: {
        records: ReturnType<typeof signal<EntityAuditHistoryRecord[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        error: ReturnType<typeof signal<string | null>>;
        loadEntityAuditLogs: jest.Mock;
        clear: jest.Mock;
    };

    async function setup(records: EntityAuditHistoryRecord[] = []) {
        storeMock = {
            records: signal(records),
            loading: signal(false),
            error: signal(null),
            loadEntityAuditLogs: jest.fn().mockResolvedValue(records),
            clear: jest.fn()
        };

        await TestBed.configureTestingModule({
            imports: [AuditHistoryPanel]
        })
            .overrideComponent(AuditHistoryPanel, {
                set: {
                    providers: [
                        {
                            provide: AuditHistoryStore,
                            useValue: storeMock
                        }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(AuditHistoryPanel);
        component = fixture.componentInstance;
        component.targetType = 'lead';
        component.targetId = 'lead-1';
        component.targetTitle = '重点线索';
        fixture.detectChanges();
    }

    beforeEach(() => {
        TestBed.resetTestingModule();
    });

    it('loads entity audit records with the current target when opened', async () => {
        await setup();

        component.openDialog();

        expect(component.dialogVisible).toBe(true);
        expect(storeMock.loadEntityAuditLogs).toHaveBeenCalledWith({
            targetType: 'lead',
            targetId: 'lead-1',
            limit: 50
        });
    });

    it('uses backend-declared changed fields for snapshot presentation', async () => {
        const record: EntityAuditHistoryRecord = {
            id: 'audit-1',
            eventType: 'lead.updated',
            targetType: 'lead',
            targetId: 'lead-1',
            operatorId: 'user-1',
            requestId: 'request-1',
            result: 'success',
            reason: null,
            beforeSnapshot: { leadName: '旧线索' },
            afterSnapshot: { leadName: '新线索' },
            metadata: { changedFields: ['leadName'] },
            occurredAt: '2026-05-06T08:00:00.000Z'
        };

        await setup([
            record
        ]);

        expect(component.changedFields(record)).toEqual(['leadName']);
        expect(component.fieldLabel('leadName')).toBe('线索名称');
        expect(component.snapshotValue(record.beforeSnapshot, 'leadName')).toBe('旧线索');
        expect(component.snapshotValue(record.afterSnapshot, 'leadName')).toBe('新线索');
    });
});
