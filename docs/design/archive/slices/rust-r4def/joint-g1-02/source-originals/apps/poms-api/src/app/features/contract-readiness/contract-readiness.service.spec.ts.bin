import { ConflictException } from '@nestjs/common';
import { ProjectService } from '../project/project.service';
import { CommercialReleaseBaselineRepository } from './commercial-release-baseline.repository';
import { ContractReadinessPackageRepository } from './contract-readiness-package.repository';

jest.mock('@mikro-orm/nestjs', () => ({
    InjectRepository: () => () => undefined
}));

import { ContractReadinessService } from './contract-readiness.service';

const projectId = '20000000-0000-4000-8000-000000000001';
const baselineId = '30000000-0000-4000-8000-000000000001';
const diffResultId = '40000000-0000-4000-8000-000000000001';
const packageId = '50000000-0000-4000-8000-000000000001';
const actorUserId = '00000000-0000-4000-8000-000000000001';

describe('ContractReadinessService', () => {
    let service: ContractReadinessService;
    let projectService: jest.Mocked<ProjectService>;
    let commercialReleaseBaselineRepository: jest.Mocked<CommercialReleaseBaselineRepository>;
    let contractReadinessPackageRepository: jest.Mocked<ContractReadinessPackageRepository>;
    let diffItemRepository: {
        find: jest.Mock;
    };

    beforeEach(() => {
        projectService = {
            findById: jest.fn()
        } as unknown as jest.Mocked<ProjectService>;
        commercialReleaseBaselineRepository = {
            findCurrentByProjectId: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            getEntityManager: jest.fn(),
            findDiffResultById: jest.fn(),
            findReviewHistory: jest.fn()
        } as unknown as jest.Mocked<CommercialReleaseBaselineRepository>;
        contractReadinessPackageRepository = {
            findById: jest.fn(),
            findCurrentByProjectId: jest.fn(),
            create: jest.fn(),
            findItems: jest.fn(),
            getEntityManager: jest.fn()
        } as unknown as jest.Mocked<ContractReadinessPackageRepository>;
        diffItemRepository = {
            find: jest.fn()
        };

        service = new ContractReadinessService(
            projectService,
            commercialReleaseBaselineRepository,
            contractReadinessPackageRepository,
            diffItemRepository as never
        );
    });

    it('creates an effective baseline with a pending review diff result', async () => {
        projectService.findById.mockResolvedValue({ id: projectId } as never);
        commercialReleaseBaselineRepository.findCurrentByProjectId.mockResolvedValue(null);

        const entityManager = createEntityManagerMock();
        commercialReleaseBaselineRepository.getEntityManager.mockReturnValue({
            transactional: async (callback: (em: ReturnType<typeof createEntityManagerMock>) => unknown) => callback(entityManager)
        } as never);

        const result = await service.createCommercialReleaseBaseline({
            projectId,
            baselineCode: 'BL-2026-001',
            diffLevel: 'review-required',
            diffSummary: '首付款比例发生变化',
            diffItems: [
                {
                    fieldKey: 'downPaymentRate',
                    fieldLabel: '首付款比例',
                    diffLevel: 'review-required'
                }
            ],
            createdBy: actorUserId,
            updatedBy: actorUserId
        });

        expect(result.projectId).toBe(projectId);
        expect(result.reviewStatus).toBe('pending-review');
        expect(result.diffLevel).toBe('review-required');
        expect(result.latestDiffResultId).toBeTruthy();
    });

    it('rejects creating an allowed readiness package when diff review is still pending', async () => {
        projectService.findById.mockResolvedValue({ id: projectId } as never);
        commercialReleaseBaselineRepository.findById.mockResolvedValue(
            createBaselineEntity({
                id: baselineId,
                projectId,
                latestDiffResultId: diffResultId
            }) as never
        );
        commercialReleaseBaselineRepository.findDiffResultById.mockResolvedValue(
            createDiffResultEntity({
                id: diffResultId,
                baselineId,
                projectId,
                diffLevel: 'review-required',
                reviewStatus: 'pending-review'
            }) as never
        );

        await expect(
            service.createContractReadinessPackage({
                projectId,
                sourceBaselineId: baselineId,
                latestDiffResultId: diffResultId,
                packageStatus: 'ready',
                guardDecision: 'allowed',
                items: []
            })
        ).rejects.toThrow(ConflictException);
    });

    it('reviews the current diff and allows activation once readiness is current', async () => {
        const baseline = createBaselineEntity({
            id: baselineId,
            projectId,
            latestDiffResultId: diffResultId,
            rowVersion: 2
        });
        const diffResult = createDiffResultEntity({
            id: diffResultId,
            baselineId,
            projectId,
            diffLevel: 'review-required',
            reviewStatus: 'pending-review'
        });
        commercialReleaseBaselineRepository.findById.mockResolvedValue(baseline as never);
        commercialReleaseBaselineRepository.findDiffResultById.mockResolvedValue(diffResult as never);
        commercialReleaseBaselineRepository.getEntityManager.mockReturnValue({
            transactional: async (callback: (em: { findOne: jest.Mock; create: jest.Mock; persist: jest.Mock; flush: jest.Mock }) => unknown) =>
                callback({
                    findOne: jest
                        .fn()
                        .mockResolvedValueOnce(baseline)
                        .mockResolvedValueOnce(diffResult),
                    create: jest.fn().mockImplementation((_cls, input) => ({
                        id: '60000000-0000-4000-8000-000000000001',
                        createdAt: new Date('2026-04-05T12:30:00.000Z'),
                        ...input
                    })),
                    persist: jest.fn(),
                    flush: jest.fn().mockResolvedValue(undefined)
                })
        } as never);

        const reviewResult = await service.reviewCommercialReleaseBaselineDiff(baselineId, actorUserId, {
            diffDecision: 'approved',
            reviewedFieldKeys: ['downPaymentRate'],
            expectedVersion: 2
        });

        expect(reviewResult.baselineReviewDecision).toBe('approved');

        contractReadinessPackageRepository.findCurrentByProjectId.mockResolvedValue(
            createReadinessPackageEntity({
                id: packageId,
                projectId,
                latestDiffResultId: diffResultId,
                sourceBaselineId: baselineId,
                guardDecision: 'allowed',
                packageStatus: 'ready'
            }) as never
        );
        commercialReleaseBaselineRepository.findDiffResultById.mockResolvedValue(
            createDiffResultEntity({
                id: diffResultId,
                baselineId,
                projectId,
                diffLevel: 'review-required',
                reviewStatus: 'approved'
            }) as never
        );

        const readiness = await service.resolveActivationReadiness(projectId);
        expect(readiness.allowed).toBe(true);
        expect(readiness.sourceReadinessId).toBe(packageId);
    });

    it('initializes contract snapshot references from an allowed readiness package', async () => {
        const readinessPackage = createReadinessPackageEntity({
            id: packageId,
            projectId,
            sourceBaselineId: baselineId,
            latestDiffResultId: diffResultId,
            guardDecision: 'allowed',
            packageStatus: 'ready',
            rowVersion: 3
        });
        contractReadinessPackageRepository.findById.mockResolvedValue(readinessPackage as never);
        commercialReleaseBaselineRepository.findDiffResultById.mockResolvedValue(
            createDiffResultEntity({
                id: diffResultId,
                baselineId,
                projectId,
                diffLevel: 'review-required',
                reviewStatus: 'approved'
            }) as never
        );
        contractReadinessPackageRepository.getEntityManager.mockReturnValue({
            transactional: async (callback: (em: { findOne: jest.Mock; persist: jest.Mock; flush: jest.Mock }) => unknown) =>
                callback({
                    findOne: jest.fn().mockResolvedValue(readinessPackage),
                    persist: jest.fn(),
                    flush: jest.fn().mockResolvedValue(undefined)
                })
        } as never);

        const result = await service.initializeContractSnapshot(packageId, actorUserId, 3);

        expect(result.sourceReadinessId).toBe(packageId);
        expect(result.snapshotId).toBeTruthy();
        expect(readinessPackage.initializedContractSnapshotId).toBe(result.snapshotId);
    });
});

function createEntityManagerMock() {
    let idCounter = 1;
    const now = new Date('2026-04-05T12:00:00.000Z');

    return {
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation((_cls, input) => ({
            id: `00000000-0000-4000-8000-${String(idCounter++).padStart(12, '0')}`,
            rowVersion: 1,
            createdAt: now,
            updatedAt: now,
            ...input
        })),
        persist: jest.fn(),
        flush: jest.fn().mockResolvedValue(undefined)
    };
}

function createBaselineEntity(overrides: Record<string, unknown>) {
    return {
        id: baselineId,
        projectId,
        baselineCode: 'BL-2026-001',
        quotationReviewId: null,
        baselineStatus: 'effective',
        isCurrent: true,
        grossMarginSummary: null,
        paymentTermsSummary: null,
        latestDiffResultId: diffResultId,
        rowVersion: 1,
        createdAt: new Date('2026-04-05T12:00:00.000Z'),
        createdBy: actorUserId,
        updatedAt: new Date('2026-04-05T12:00:00.000Z'),
        updatedBy: actorUserId,
        ...overrides
    };
}

function createDiffResultEntity(overrides: Record<string, unknown>) {
    return {
        id: diffResultId,
        baselineId,
        projectId,
        diffLevel: 'review-required',
        reviewStatus: 'pending-review',
        diffSummary: '测试差异',
        currentReviewDecision: null,
        reviewedAt: null,
        createdAt: new Date('2026-04-05T12:00:00.000Z'),
        ...overrides
    };
}

function createReadinessPackageEntity(overrides: Record<string, unknown>) {
    return {
        id: packageId,
        projectId,
        sourceBaselineId: baselineId,
        latestDiffResultId: diffResultId,
        packageStatus: 'ready',
        guardDecision: 'allowed',
        currentEffectiveDecisionSummary: '已满足签约条件',
        blockingReasonSummary: null,
        missingPrerequisiteCount: 0,
        initializedContractSnapshotId: null,
        initializedReceivablePlanVersionId: null,
        contractSnapshotInitializedAt: null,
        receivablePlanInitializedAt: null,
        isCurrent: true,
        rowVersion: 1,
        createdAt: new Date('2026-04-05T12:00:00.000Z'),
        createdBy: actorUserId,
        updatedAt: new Date('2026-04-05T12:00:00.000Z'),
        updatedBy: actorUserId,
        ...overrides
    };
}
