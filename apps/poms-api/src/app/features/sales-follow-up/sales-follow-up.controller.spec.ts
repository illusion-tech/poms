import { SalesFollowUpController } from './sales-follow-up.controller';
import { SalesFollowUpService } from './sales-follow-up.service';

describe('SalesFollowUpController', () => {
    const customerId = '11000000-0000-4000-8000-000000000001';
    const leadId = '50000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000003';

    let controller: SalesFollowUpController;
    let service: jest.Mocked<SalesFollowUpService>;

    beforeEach(() => {
        service = {
            listSalesFollowUpRecords: jest.fn(),
            createSalesFollowUpRecord: jest.fn(),
            replaceSalesFollowUpRecord: jest.fn(),
            voidSalesFollowUpRecord: jest.fn()
        } as unknown as jest.Mocked<SalesFollowUpService>;
        controller = new SalesFollowUpController(service);
    });

    it('passes anchor filters to the service', async () => {
        service.listSalesFollowUpRecords.mockResolvedValue([]);

        await controller.list({ customerId, leadId, projectId, lifecycleScope: 'all' });

        expect(service.listSalesFollowUpRecords).toHaveBeenCalledWith({
            customerId,
            leadId,
            projectId,
            lifecycleScope: 'all'
        });
    });

    it('creates a follow-up record with operator id', async () => {
        service.createSalesFollowUpRecord.mockResolvedValue(createSummary());

        const result = await controller.create(
            {
                customerId,
                projectId,
                followUpType: 'meeting',
                occurredAt: '2026-04-30T09:00:00.000Z',
                summary: '与客户确认项目推进节奏',
                detail: '客户要求下周提交范围确认材料。',
                outcome: 'progress',
                nextFollowUpAt: '2026-05-06T02:00:00.000Z',
                ownerOrgId: null,
                ownerUserId: null
            },
            { user: { sub: userId } } as never
        );

        expect(service.createSalesFollowUpRecord).toHaveBeenCalledWith(
            {
                customerId,
                leadId: undefined,
                projectId,
                followUpType: 'meeting',
                occurredAt: '2026-04-30T09:00:00.000Z',
                summary: '与客户确认项目推进节奏',
                detail: '客户要求下周提交范围确认材料。',
                outcome: 'progress',
                nextFollowUpAt: '2026-05-06T02:00:00.000Z',
                ownerOrgId: null,
                ownerUserId: null
            },
            userId
        );
        expect(result.projectId).toBe(projectId);
    });

    it('replaces a follow-up record with request id and operator id', async () => {
        service.replaceSalesFollowUpRecord.mockResolvedValue(createSummary({ summary: '更正后的记录' }));

        const result = await controller.replace(
            '57000000-0000-4000-8000-000000000001',
            {
                followUpType: 'meeting',
                occurredAt: '2026-04-30T10:00:00.000Z',
                summary: '更正后的记录',
                detail: null,
                outcome: 'progress',
                nextFollowUpAt: null,
                ownerOrgId: null,
                ownerUserId: null,
                replacementReason: '原摘要不完整',
                expectedVersion: 1
            },
            { user: { sub: userId }, headers: { 'x-request-id': 'req-1' } } as never
        );

        expect(service.replaceSalesFollowUpRecord).toHaveBeenCalledWith(
            '57000000-0000-4000-8000-000000000001',
            {
                followUpType: 'meeting',
                occurredAt: '2026-04-30T10:00:00.000Z',
                summary: '更正后的记录',
                detail: null,
                outcome: 'progress',
                nextFollowUpAt: null,
                ownerOrgId: null,
                ownerUserId: null,
                replacementReason: '原摘要不完整',
                expectedVersion: 1
            },
            userId,
            'req-1'
        );
        expect(result.summary).toBe('更正后的记录');
    });

    it('voids a follow-up record with request id and operator id', async () => {
        service.voidSalesFollowUpRecord.mockResolvedValue(createSummary({ status: 'voided', voidReason: '登记错误' }));

        const result = await controller.void(
            '57000000-0000-4000-8000-000000000001',
            {
                reason: '登记错误',
                comment: null,
                expectedVersion: 1
            },
            { user: { sub: userId }, headers: { 'x-request-id': 'req-2' } } as never
        );

        expect(service.voidSalesFollowUpRecord).toHaveBeenCalledWith(
            '57000000-0000-4000-8000-000000000001',
            {
                reason: '登记错误',
                comment: null,
                expectedVersion: 1
            },
            userId,
            'req-2'
        );
        expect(result.status).toBe('voided');
    });

    function createSummary(overrides: Partial<ReturnType<typeof createSummaryBase>> = {}) {
        return {
            ...createSummaryBase(),
            ...overrides
        } as const;
    }

    function createSummaryBase() {
        return {
            id: '57000000-0000-4000-8000-000000000001',
            customerId,
            customerName: '华南地铁集团',
            leadId: null,
            leadName: null,
            projectId,
            projectName: '华南地铁项目',
            followUpType: 'meeting',
            status: 'active',
            occurredAt: '2026-04-30T09:00:00.000Z',
            summary: '与客户确认项目推进节奏',
            detail: '客户要求下周提交范围确认材料。',
            outcome: 'progress',
            nextFollowUpAt: '2026-05-06T02:00:00.000Z',
            ownerOrgId: null,
            ownerOrgName: null,
            ownerUserId: null,
            ownerName: null,
            supersedesId: null,
            replacedById: null,
            replacementReason: null,
            voidedAt: null,
            voidedBy: null,
            voidedByName: null,
            voidReason: null,
            rowVersion: 1,
            createdAt: '2026-04-30T09:00:00.000Z',
            createdBy: userId,
            updatedAt: '2026-04-30T09:00:00.000Z',
            updatedBy: userId
        } as const;
    }
});
