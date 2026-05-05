jest.mock('@mikro-orm/nestjs', () => ({
    InjectRepository: () => () => undefined
}));

import { ConflictException } from '@nestjs/common';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { LeadScoreOverride, LeadScoreSnapshot } from './lead-score-history.entity';
import { Lead } from './lead.entity';
import { LeadScoreService } from './lead-score.service';

describe('LeadScoreService', () => {
    const leadId = '50000000-0000-4000-8000-000000000001';
    const overrideId = '54000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000003';
    const baseDate = new Date('2026-04-25T10:00:00.000Z');

    let service: LeadScoreService;
    let leadRepository: { findOne: jest.Mock };
    let snapshotRepository: { find: jest.Mock; findOne: jest.Mock; getEntityManager: jest.Mock };
    let overrideRepository: { find: jest.Mock; findOne: jest.Mock; getEntityManager: jest.Mock };
    let runtimeAuditService: jest.Mocked<Pick<RuntimeAuditService, 'recordAuditLog'>>;
    let entityManager: {
        findOne: jest.Mock;
        create: jest.Mock;
        persist: jest.Mock;
        flush: jest.Mock;
    };

    beforeEach(() => {
        entityManager = {
            findOne: jest.fn(),
            create: jest.fn((entity, input) => Object.assign(new entity(), input)),
            persist: jest.fn(),
            flush: jest.fn()
        };
        leadRepository = {
            findOne: jest.fn()
        };
        snapshotRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            getEntityManager: jest.fn(() => entityManager)
        };
        overrideRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            getEntityManager: jest.fn(() => ({
                transactional: jest.fn((work) => work(entityManager))
            }))
        };
        runtimeAuditService = {
            recordAuditLog: jest.fn().mockResolvedValue(undefined)
        };

        service = new LeadScoreService(leadRepository as never, snapshotRepository as never, overrideRepository as never, runtimeAuditService as never);
    });

    it('submits a pending score override with system score snapshot at request time', async () => {
        const lead = createLeadEntity({ rowVersion: 3, score: 70, rating: 'B' });
        entityManager.findOne.mockImplementation((entity, where) => {
            if (entity === Lead && where.id === leadId) return Promise.resolve(lead);
            if (entity === LeadScoreOverride && where.status === 'pending') return Promise.resolve(null);
            return Promise.resolve(null);
        });

        const result = await service.submitLeadScoreOverride(
            leadId,
            { score: 88, reason: '客户战略价值高', expectedLeadRowVersion: 3 },
            userId,
            'req-1'
        );

        expect(result.status).toBe('pending');
        expect(result.requestedScore).toBe(88);
        expect(result.requestedRating).toBe('A');
        expect(result.systemScoreAtRequest).toBe(70);
        expect(entityManager.persist).toHaveBeenCalledWith(expect.any(LeadScoreOverride));
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'lead-score-override.submitted',
                targetType: 'lead-score-override',
                operatorId: userId,
                requestId: 'req-1'
            })
        );
    });

    it('rejects submit when expected lead row version is stale', async () => {
        entityManager.findOne.mockResolvedValue(createLeadEntity({ rowVersion: 4 }));

        await expect(
            service.submitLeadScoreOverride(leadId, { score: 88, reason: '客户战略价值高', expectedLeadRowVersion: 3 }, userId)
        ).rejects.toThrow(ConflictException);
        expect(entityManager.persist).not.toHaveBeenCalled();
    });

    it('approves a pending override and records manual effective score snapshot', async () => {
        const override = createOverrideEntity();
        const lead = createLeadEntity({ score: 70, rating: 'B' });
        entityManager.findOne.mockImplementation((entity, where) => {
            if (entity === LeadScoreOverride && where.id === overrideId) return Promise.resolve(override);
            if (entity === LeadScoreOverride && where.status === 'approved') return Promise.resolve(null);
            if (entity === Lead && where.id === leadId) return Promise.resolve(lead);
            return Promise.resolve(null);
        });

        const result = await service.approveLeadScoreOverride(overrideId, { expectedOverrideRowVersion: 1, note: '同意覆盖' }, userId);

        expect(result.status).toBe('approved');
        expect(result.approvalNote).toBe('同意覆盖');
        expect(entityManager.create).toHaveBeenCalledWith(
            LeadScoreSnapshot,
            expect.objectContaining({
                leadId,
                snapshotKind: 'manual-override',
                overrideId,
                effectiveScore: 88,
                effectiveRating: 'A',
                effectiveScoreSource: 'manual-override'
            })
        );
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'lead-score-override.approved',
                targetId: overrideId
            })
        );
    });

    it('resolves effective score from active override first', () => {
        const effectiveScore = service.resolveEffectiveScore(createLeadEntity({ score: 70, rating: 'B' }), createOverrideEntity({ status: 'approved' }));

        expect(effectiveScore).toEqual({
            effectiveScore: 88,
            effectiveRating: 'A',
            effectiveScoreReason: '人工覆盖评分：客户战略价值高',
            effectiveScoreSource: 'manual-override',
            activeScoreOverrideId: overrideId
        });
    });

    function createLeadEntity(overrides: Partial<Lead> = {}): Lead {
        return Object.assign(new Lead(), {
            id: leadId,
            leadNo: 'LEAD-2026-001',
            leadName: '华南地铁线索',
            customerId: '11000000-0000-4000-8000-000000000001',
            customerName: '华南地铁集团',
            sourceId: '51000000-0000-4000-8000-000000000001',
            sourceChannel: '客户拜访',
            demandDescription: '客户需要建设地铁运维平台。',
            budgetStatus: 'budget-confirmed',
            estimatedAmount: '1000000.00',
            urgency: 'high',
            expectedDecisionDate: '2026-05-01',
            score: 95,
            rating: 'A',
            scoreReason: '来源+10；需求+15；预算+20；金额+15；紧迫+15；决策日期+10；主责+10',
            scoreUpdatedAt: baseDate,
            status: 'registered',
            ownerOrgId: '10000000-0000-4000-8000-000000000002',
            ownerUserId: userId,
            qualificationSummary: null,
            qualifiedAt: null,
            qualifiedBy: null,
            closedReason: null,
            closedAt: null,
            closedBy: null,
            convertedProjectId: null,
            convertedAt: null,
            convertedBy: null,
            rowVersion: 1,
            createdAt: baseDate,
            createdBy: userId,
            updatedAt: baseDate,
            updatedBy: userId,
            ...overrides
        });
    }

    function createOverrideEntity(overrides: Partial<LeadScoreOverride> = {}): LeadScoreOverride {
        return Object.assign(new LeadScoreOverride(), {
            id: overrideId,
            leadId,
            requestedScore: 88,
            requestedRating: 'A',
            reason: '客户战略价值高',
            status: 'pending',
            systemScoreAtRequest: 70,
            systemRatingAtRequest: 'B',
            requestedBy: userId,
            requestedAt: baseDate,
            approvedBy: null,
            approvedAt: null,
            approvalNote: null,
            rejectedBy: null,
            rejectedAt: null,
            rejectReason: null,
            revokedBy: null,
            revokedAt: null,
            revokeReason: null,
            supersededById: null,
            createdAt: baseDate,
            updatedAt: baseDate,
            updatedBy: userId,
            rowVersion: 1,
            ...overrides
        });
    }
});
