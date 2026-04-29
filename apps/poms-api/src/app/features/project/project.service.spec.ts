import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BusinessNumberService } from '../business-number/business-number.service';
import { CustomerService } from '../customer/customer.service';
import { Project } from './project.entity';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
    const projectId = '20000000-0000-4000-8000-000000000001';
    const customerId = '11000000-0000-4000-8000-000000000001';
    const nextCustomerId = '11000000-0000-4000-8000-000000000002';
    const userId = '00000000-0000-4000-8000-000000000001';

    let service: ProjectService;
    let projectRepository: {
        findByNo: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        findById: jest.Mock;
        findAll: jest.Mock;
        findMany: jest.Mock;
        getEntityManager: jest.Mock;
        findPlatformUserById: jest.Mock;
        findOrgUnitById: jest.Mock;
        findAcceptanceRecordById: jest.Mock;
        createAcceptanceRecord: jest.Mock;
        saveAcceptanceRecord: jest.Mock;
        createProjectCompletionRecord: jest.Mock;
        saveProjectCompletionRecord: jest.Mock;
        findLatestConfirmedProjectCompletionRecordByProjectId: jest.Mock;
        findLatestRecordedProjectArchiveRecordByProjectId: jest.Mock;
        findProjectArchiveRecordById: jest.Mock;
        createProjectArchiveRecord: jest.Mock;
        saveProjectArchiveRecord: jest.Mock;
        saveProjectArchiveRecordReplacement: jest.Mock;
        createProjectOwnerReassignmentRecord: jest.Mock;
        saveProjectOwnerReassignment: jest.Mock;
        findCurrentProjectBidCommercialProcessByProjectId: jest.Mock;
        createProjectBidCommercialProcess: jest.Mock;
        createProjectBidCommercialMaterialItem: jest.Mock;
        createProjectBidCommercialTimelineItem: jest.Mock;
        saveProjectBidCommercialProcess: jest.Mock;
        findCurrentProjectPricingMarginReviewByProjectId: jest.Mock;
        createProjectPricingMarginReview: jest.Mock;
        createProjectPricingMarginConditionItem: jest.Mock;
        saveProjectPricingMarginReview: jest.Mock;
        findCurrentProjectTechnicalCostPackageByProjectId: jest.Mock;
        createProjectTechnicalCostPackage: jest.Mock;
        createProjectTechnicalScopeItem: jest.Mock;
        createProjectTechnicalRiskItem: jest.Mock;
        createProjectTechnicalCostItem: jest.Mock;
        saveProjectTechnicalCostPackage: jest.Mock;
    };
    let businessNumberService: jest.Mocked<Pick<BusinessNumberService, 'next'>>;
    let customerService: jest.Mocked<Pick<CustomerService, 'requireActiveCustomer'>>;
    let entityManager: {
        create: jest.Mock;
        persist: jest.Mock;
        flush: jest.Mock;
    };

    beforeEach(() => {
        entityManager = {
            create: jest.fn((_, input) => createProjectEntity(input)),
            persist: jest.fn(),
            flush: jest.fn()
        };
        projectRepository = {
            findByNo: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            findMany: jest.fn(),
            getEntityManager: jest.fn(() => ({
                transactional: jest.fn((work) => work(entityManager))
            })),
            findPlatformUserById: jest.fn(),
            findOrgUnitById: jest.fn(),
            findAcceptanceRecordById: jest.fn(),
            createAcceptanceRecord: jest.fn(),
            saveAcceptanceRecord: jest.fn(),
            createProjectCompletionRecord: jest.fn(),
            saveProjectCompletionRecord: jest.fn(),
            findLatestConfirmedProjectCompletionRecordByProjectId: jest.fn(),
            findLatestRecordedProjectArchiveRecordByProjectId: jest.fn().mockResolvedValue(null),
            findProjectArchiveRecordById: jest.fn(),
            createProjectArchiveRecord: jest.fn(),
            saveProjectArchiveRecord: jest.fn(),
            saveProjectArchiveRecordReplacement: jest.fn(),
            createProjectOwnerReassignmentRecord: jest.fn(),
            saveProjectOwnerReassignment: jest.fn(),
            findCurrentProjectBidCommercialProcessByProjectId: jest.fn(),
            createProjectBidCommercialProcess: jest.fn(),
            createProjectBidCommercialMaterialItem: jest.fn(),
            createProjectBidCommercialTimelineItem: jest.fn(),
            saveProjectBidCommercialProcess: jest.fn(),
            findCurrentProjectPricingMarginReviewByProjectId: jest.fn(),
            createProjectPricingMarginReview: jest.fn(),
            createProjectPricingMarginConditionItem: jest.fn(),
            saveProjectPricingMarginReview: jest.fn(),
            findCurrentProjectTechnicalCostPackageByProjectId: jest.fn(),
            createProjectTechnicalCostPackage: jest.fn(),
            createProjectTechnicalScopeItem: jest.fn(),
            createProjectTechnicalRiskItem: jest.fn(),
            createProjectTechnicalCostItem: jest.fn(),
            saveProjectTechnicalCostPackage: jest.fn()
        };
        businessNumberService = {
            next: jest.fn(async () => 'PRJ-2026-000001')
        } as jest.Mocked<Pick<BusinessNumberService, 'next'>>;
        customerService = {
            requireActiveCustomer: jest.fn(async (id: string) => ({
                id,
                displayName: id === nextCustomerId ? '新的客户名称' : '华南地铁集团'
            }) as never)
        };

        service = new ProjectService(projectRepository as never, businessNumberService as never, customerService as never);
    });

    it('creates a project with default assessment stage and operator ownership', async () => {
        projectRepository.findPlatformUserById.mockResolvedValue({
            id: userId,
            primaryOrgUnitId: '10000000-0000-4000-8000-000000000001'
        });

        const result = await service.createAndSave(
            {
                projectName: 'POMS 首期项目主链路样例',
                customerId
            },
            userId
        );

        expect(customerService.requireActiveCustomer).toHaveBeenCalledWith(customerId);
        expect(businessNumberService.next).toHaveBeenCalledWith('project', expect.any(Date), entityManager);
        expect(entityManager.create).toHaveBeenCalledWith(Project, {
            projectNo: 'PRJ-2026-000001',
            projectName: 'POMS 首期项目主链路样例',
            sourceLeadId: null,
            customerId,
            customerName: '华南地铁集团',
            customerProjectNo: null,
            status: 'active',
            currentStage: 'assessment',
            ownerOrgId: '10000000-0000-4000-8000-000000000001',
            ownerUserId: userId,
            plannedSignAt: null,
            createdBy: userId,
            updatedBy: userId
        });
        expect(entityManager.persist).toHaveBeenCalledWith(result);
        expect(entityManager.flush).toHaveBeenCalled();
    });

    it('rejects project creation when operator user does not exist', async () => {
        projectRepository.findPlatformUserById.mockResolvedValue(null);

        await expect(
            service.createAndSave(
                {
                    projectName: 'Duplicate',
                    customerId
                },
                userId
            )
        ).rejects.toThrow(NotFoundException);

        expect(customerService.requireActiveCustomer).not.toHaveBeenCalled();
        expect(businessNumberService.next).not.toHaveBeenCalled();
        expect(entityManager.persist).not.toHaveBeenCalled();
    });

    it('rejects basic info updates for non-editable status', async () => {
        projectRepository.findById.mockResolvedValue(
            createProjectEntity({
                status: 'closed'
            })
        );

        await expect(
            service.updateBasicInfo(projectId, {
                projectName: 'Updated name',
                updatedBy: userId
            })
        ).rejects.toThrow(BadRequestException);
    });

    it('updates basic info and allows plannedSignAt to be cleared', async () => {
        const project = createProjectEntity({
            plannedSignAt: new Date('2026-04-15T00:00:00.000Z')
        });
        projectRepository.findById.mockResolvedValue(project);
        projectRepository.save.mockResolvedValue(undefined);

        const result = await service.updateBasicInfo(
            projectId,
            {
                projectName: 'Updated project name',
                customerId: nextCustomerId,
                plannedSignAt: null
            },
            userId
        );

        expect(customerService.requireActiveCustomer).toHaveBeenCalledWith(nextCustomerId);
        expect(project.projectName).toBe('Updated project name');
        expect(project.customerId).toBe(nextCustomerId);
        expect(project.customerName).toBe('新的客户名称');
        expect(project.plannedSignAt).toBeNull();
        expect(project.updatedBy).toBe(userId);
        expect(projectRepository.save).toHaveBeenCalledWith(project);
        expect(result).toBe(project);
    });

    it('preserves plannedSignAt when update payload leaves it undefined', async () => {
        const plannedSignAt = new Date('2026-04-15T00:00:00.000Z');
        const project = createProjectEntity({
            plannedSignAt
        });
        projectRepository.findById.mockResolvedValue(project);
        projectRepository.save.mockResolvedValue(undefined);

        await service.updateBasicInfo(projectId, {}, userId);

        expect(project.plannedSignAt).toBe(plannedSignAt);
    });

    it('throws when updating a missing project', async () => {
        projectRepository.findById.mockResolvedValue(null);

        await expect(service.updateBasicInfo(projectId, {}, userId)).rejects.toThrow(NotFoundException);
    });

    it('reassigns project owner and appends an owner reassignment record', async () => {
        const targetOwnerId = '00000000-0000-4000-8000-000000000002';
        const targetOrgId = '10000000-0000-4000-8000-000000000002';
        const previousOwnerUserId = '00000000-0000-4000-8000-000000000003';
        const previousOwnerOrgId = '10000000-0000-4000-8000-000000000003';
        const project = createProjectEntity({
            ownerUserId: previousOwnerUserId,
            ownerOrgId: previousOwnerOrgId,
            rowVersion: 4
        });
        projectRepository.findById.mockResolvedValue(project);
        projectRepository.findPlatformUserById.mockResolvedValue({
            id: targetOwnerId,
            primaryOrgUnitId: targetOrgId
        });
        projectRepository.findOrgUnitById.mockResolvedValue({
            id: targetOrgId,
            name: '华南销售二部'
        });
        projectRepository.createProjectOwnerReassignmentRecord.mockImplementation((input) => input);
        projectRepository.saveProjectOwnerReassignment.mockResolvedValue(undefined);

        const result = await service.reassignOwner(
            projectId,
            {
                ownerUserId: targetOwnerId,
                reason: '  客户经理调整  ',
                expectedVersion: 4
            },
            userId
        );

        expect(projectRepository.findOrgUnitById).toHaveBeenCalledWith(targetOrgId);
        expect(projectRepository.createProjectOwnerReassignmentRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                id: expect.any(String),
                projectId,
                previousOwnerUserId,
                previousOwnerOrgId,
                newOwnerUserId: targetOwnerId,
                newOwnerOrgId: targetOrgId,
                reason: '客户经理调整',
                reassignedAt: expect.any(Date),
                reassignedBy: userId,
                createdBy: userId
            })
        );
        expect(project.ownerUserId).toBe(targetOwnerId);
        expect(project.ownerOrgId).toBe(targetOrgId);
        expect(project.updatedBy).toBe(userId);
        expect(projectRepository.saveProjectOwnerReassignment).toHaveBeenCalledWith({
            project,
            record: expect.objectContaining({
                newOwnerUserId: targetOwnerId
            })
        });
        expect(result).toEqual({
            targetId: projectId,
            projectOwnerReassignmentRecordId: expect.any(String),
            previousOwnerUserId,
            previousOwnerOrgId,
            newOwnerUserId: targetOwnerId,
            newOwnerOrgId: targetOrgId,
            businessStatusAfter: 'active'
        });
    });

    it('rejects owner reassignment when project version is stale', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ rowVersion: 5 }));

        await expect(
            service.reassignOwner(
                projectId,
                {
                    ownerUserId: '00000000-0000-4000-8000-000000000002',
                    reason: '客户经理调整',
                    expectedVersion: 4
                },
                userId
            )
        ).rejects.toThrow(ConflictException);

        expect(projectRepository.findPlatformUserById).not.toHaveBeenCalled();
        expect(projectRepository.createProjectOwnerReassignmentRecord).not.toHaveBeenCalled();
    });

    it('rejects owner reassignment for non-active project status', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ status: 'completed' }));

        await expect(
            service.reassignOwner(
                projectId,
                {
                    ownerUserId: '00000000-0000-4000-8000-000000000002',
                    reason: '客户经理调整'
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.findPlatformUserById).not.toHaveBeenCalled();
        expect(projectRepository.createProjectOwnerReassignmentRecord).not.toHaveBeenCalled();
    });

    it('rejects owner reassignment when the target owner does not exist', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity());
        projectRepository.findPlatformUserById.mockResolvedValue(null);

        await expect(
            service.reassignOwner(
                projectId,
                {
                    ownerUserId: '00000000-0000-4000-8000-000000000002',
                    reason: '客户经理调整'
                },
                userId
            )
        ).rejects.toThrow(NotFoundException);

        expect(projectRepository.createProjectOwnerReassignmentRecord).not.toHaveBeenCalled();
    });

    it('rejects owner reassignment when the target owner is inactive', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity());
        projectRepository.findPlatformUserById.mockResolvedValue({
            id: '00000000-0000-4000-8000-000000000002',
            primaryOrgUnitId: null,
            isActive: false
        });

        await expect(
            service.reassignOwner(
                projectId,
                {
                    ownerUserId: '00000000-0000-4000-8000-000000000002',
                    reason: '客户经理调整'
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.createProjectOwnerReassignmentRecord).not.toHaveBeenCalled();
    });

    it('rejects owner reassignment when the target owner org does not exist', async () => {
        const targetOrgId = '10000000-0000-4000-8000-000000000002';
        projectRepository.findById.mockResolvedValue(createProjectEntity());
        projectRepository.findPlatformUserById.mockResolvedValue({
            id: '00000000-0000-4000-8000-000000000002',
            primaryOrgUnitId: null
        });
        projectRepository.findOrgUnitById.mockResolvedValue(null);

        await expect(
            service.reassignOwner(
                projectId,
                {
                    ownerUserId: '00000000-0000-4000-8000-000000000002',
                    ownerOrgId: targetOrgId,
                    reason: '客户经理调整'
                },
                userId
            )
        ).rejects.toThrow(NotFoundException);

        expect(projectRepository.findOrgUnitById).toHaveBeenCalledWith(targetOrgId);
        expect(projectRepository.createProjectOwnerReassignmentRecord).not.toHaveBeenCalled();
    });

    it('creates a confirmed acceptance record only from acceptance stage', async () => {
        const record = {
            id: '36000000-0000-4000-8000-000000000001',
            projectId,
            acceptanceType: 'stage-acceptance',
            acceptanceResult: 'accepted',
            status: 'confirmed'
        };
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'acceptance' }));
        projectRepository.createAcceptanceRecord.mockReturnValue(record);
        projectRepository.saveAcceptanceRecord.mockResolvedValue(undefined);

        const result = await service.createAcceptanceRecord(
            projectId,
            {
                acceptanceType: 'stage-acceptance',
                acceptanceResult: 'accepted',
                scopeSummary: '阶段成果验收范围',
                evidenceSummary: '客户验收单',
                comment: ' 确认通过 '
            },
            userId
        );

        expect(projectRepository.createAcceptanceRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                projectId,
                acceptanceType: 'stage-acceptance',
                acceptanceResult: 'accepted',
                status: 'confirmed',
                scopeSummary: '阶段成果验收范围',
                evidenceSummary: '客户验收单',
                comment: '确认通过',
                confirmationRecordId: null,
                confirmedBy: userId,
                createdBy: userId,
                updatedBy: userId
            })
        );
        expect(projectRepository.createAcceptanceRecord.mock.calls[0][0].confirmedAt).toEqual(expect.any(Date));
        expect(projectRepository.saveAcceptanceRecord).toHaveBeenCalledWith(record);
        expect(result).toBe(record);
    });

    it('rejects acceptance record creation before acceptance stage', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'execution' }));

        await expect(
            service.createAcceptanceRecord(
                projectId,
                {
                    acceptanceType: 'stage-acceptance',
                    acceptanceResult: 'accepted',
                    scopeSummary: '阶段成果验收范围',
                    evidenceSummary: '客户验收单'
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.createAcceptanceRecord).not.toHaveBeenCalled();
        expect(projectRepository.saveAcceptanceRecord).not.toHaveBeenCalled();
    });

    it('creates a completion record from an effective acceptance source and moves project to completed', async () => {
        const completedAt = new Date('2026-04-20T10:00:00.000Z');
        const project = createProjectEntity({ currentStage: 'acceptance', status: 'active' });
        const record = {
            id: '37000000-0000-4000-8000-000000000001',
            projectId,
            acceptanceRecordId: '36000000-0000-4000-8000-000000000001',
            completionResult: 'completed',
            status: 'confirmed'
        };
        projectRepository.findById.mockResolvedValue(project);
        projectRepository.findAcceptanceRecordById.mockResolvedValue({
            id: '36000000-0000-4000-8000-000000000001',
            projectId,
            status: 'confirmed',
            acceptanceResult: 'accepted'
        });
        projectRepository.createProjectCompletionRecord.mockReturnValue(record);
        projectRepository.saveProjectCompletionRecord.mockResolvedValue(undefined);

        const result = await service.createProjectCompletionRecord(
            projectId,
            {
                acceptanceRecordId: '36000000-0000-4000-8000-000000000001',
                completionResult: 'completed',
                completedAt,
                completionSummary: '项目交付完成',
                evidenceSummary: '完成确认单'
            },
            userId
        );

        expect(projectRepository.createProjectCompletionRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                projectId,
                acceptanceRecordId: '36000000-0000-4000-8000-000000000001',
                completionResult: 'completed',
                status: 'confirmed',
                completedAt,
                completedBy: userId,
                completionSummary: '项目交付完成',
                evidenceSummary: '完成确认单',
                createdBy: userId,
                updatedBy: userId
            })
        );
        expect(project.currentStage).toBe('completed');
        expect(project.status).toBe('completed');
        expect(project.updatedBy).toBe(userId);
        expect(projectRepository.saveProjectCompletionRecord).toHaveBeenCalledWith(record, project);
        expect(result).toBe(record);
    });

    it('rejects completion record creation without an effective acceptance source', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'acceptance', status: 'active' }));
        projectRepository.findAcceptanceRecordById.mockResolvedValue({
            id: '36000000-0000-4000-8000-000000000001',
            projectId,
            status: 'confirmed',
            acceptanceResult: 'rejected'
        });

        await expect(
            service.createProjectCompletionRecord(
                projectId,
                {
                    acceptanceRecordId: '36000000-0000-4000-8000-000000000001',
                    completionResult: 'completed',
                    completedAt: new Date('2026-04-20T10:00:00.000Z'),
                    completionSummary: '项目交付完成',
                    evidenceSummary: '完成确认单'
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.createProjectCompletionRecord).not.toHaveBeenCalled();
        expect(projectRepository.saveProjectCompletionRecord).not.toHaveBeenCalled();
    });

    it('rejects completion record creation before acceptance stage', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'execution', status: 'active' }));

        await expect(
            service.createProjectCompletionRecord(
                projectId,
                {
                    acceptanceRecordId: '36000000-0000-4000-8000-000000000001',
                    completionResult: 'completed',
                    completedAt: new Date('2026-04-20T10:00:00.000Z'),
                    completionSummary: '项目交付完成',
                    evidenceSummary: '完成确认单'
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.findAcceptanceRecordById).not.toHaveBeenCalled();
        expect(projectRepository.createProjectCompletionRecord).not.toHaveBeenCalled();
        expect(projectRepository.saveProjectCompletionRecord).not.toHaveBeenCalled();
    });

    it('creates an archive record from a completed project and anchors it to the latest completion source', async () => {
        const archivedAt = new Date('2026-04-22T10:00:00.000Z');
        const project = createProjectEntity({ currentStage: 'completed', status: 'completed' });
        const completionRecord = {
            id: '37000000-0000-4000-8000-000000000002',
            projectId,
            status: 'confirmed'
        };
        const archiveRecord = {
            id: '38000000-0000-4000-8000-000000000001',
            projectId,
            archiveAnchorStage: 'completed',
            archiveAnchorSourceType: 'project-completion-record',
            archiveAnchorSourceId: completionRecord.id,
            status: 'recorded'
        };
        projectRepository.findById.mockResolvedValue(project);
        projectRepository.findLatestConfirmedProjectCompletionRecordByProjectId.mockResolvedValue(completionRecord);
        projectRepository.createProjectArchiveRecord.mockReturnValue(archiveRecord);
        projectRepository.saveProjectArchiveRecord.mockResolvedValue(undefined);

        const result = await service.createProjectArchiveRecord(
            projectId,
            {
                archivedAt,
                archiveSummary: '项目资料归档完成',
                evidenceSummary: '归档清单与交付包'
            },
            userId
        );

        expect(projectRepository.createProjectArchiveRecord).toHaveBeenCalledWith({
            projectId,
            archiveAnchorStage: 'completed',
            archiveAnchorSourceType: 'project-completion-record',
            archiveAnchorSourceId: completionRecord.id,
            status: 'recorded',
            archivedAt,
            archivedBy: userId,
            archiveSummary: '项目资料归档完成',
            evidenceSummary: '归档清单与交付包',
            createdBy: userId,
            updatedBy: userId
        });
        expect(projectRepository.saveProjectArchiveRecord).toHaveBeenCalledWith(archiveRecord);
        expect(result).toBe(archiveRecord);
    });

    it('creates an archive record from a closed project and anchors it to the project close fact', async () => {
        const archivedAt = new Date('2026-04-22T10:00:00.000Z');
        const project = createProjectEntity({
            currentStage: 'closed-terminated',
            status: 'closed',
            closedAt: new Date('2026-04-21T10:00:00.000Z')
        });
        const archiveRecord = {
            id: '38000000-0000-4000-8000-000000000002',
            projectId,
            archiveAnchorStage: 'closed-terminated',
            archiveAnchorSourceType: 'project',
            archiveAnchorSourceId: projectId,
            status: 'recorded'
        };
        projectRepository.findById.mockResolvedValue(project);
        projectRepository.createProjectArchiveRecord.mockReturnValue(archiveRecord);
        projectRepository.saveProjectArchiveRecord.mockResolvedValue(undefined);

        const result = await service.createProjectArchiveRecord(
            projectId,
            {
                archivedAt,
                archiveSummary: '终止项目资料归档完成',
                evidenceSummary: '终止结论与归档清单'
            },
            userId
        );

        expect(projectRepository.findLatestConfirmedProjectCompletionRecordByProjectId).not.toHaveBeenCalled();
        expect(projectRepository.createProjectArchiveRecord).toHaveBeenCalledWith({
            projectId,
            archiveAnchorStage: 'closed-terminated',
            archiveAnchorSourceType: 'project',
            archiveAnchorSourceId: projectId,
            status: 'recorded',
            archivedAt,
            archivedBy: userId,
            archiveSummary: '终止项目资料归档完成',
            evidenceSummary: '终止结论与归档清单',
            createdBy: userId,
            updatedBy: userId
        });
        expect(projectRepository.saveProjectArchiveRecord).toHaveBeenCalledWith(archiveRecord);
        expect(result).toBe(archiveRecord);
    });

    it('rejects archive creation when a current archive record already exists', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'completed', status: 'completed' }));
        projectRepository.findLatestRecordedProjectArchiveRecordByProjectId.mockResolvedValue({
            id: '38000000-0000-4000-8000-000000000010',
            projectId,
            status: 'recorded'
        });

        await expect(
            service.createProjectArchiveRecord(
                projectId,
                {
                    archivedAt: new Date('2026-04-22T10:00:00.000Z'),
                    archiveSummary: '项目资料归档完成',
                    evidenceSummary: '归档清单与交付包'
                },
                userId
            )
        ).rejects.toThrow(ConflictException);

        expect(projectRepository.findLatestConfirmedProjectCompletionRecordByProjectId).not.toHaveBeenCalled();
        expect(projectRepository.createProjectArchiveRecord).not.toHaveBeenCalled();
    });

    it('replaces current archive record and marks the old one superseded', async () => {
        const archivedAt = new Date('2026-04-23T10:00:00.000Z');
        const supersededRecord = {
            id: '38000000-0000-4000-8000-000000000001',
            projectId,
            archiveAnchorStage: 'completed',
            archiveAnchorSourceType: 'project-completion-record',
            archiveAnchorSourceId: '37000000-0000-4000-8000-000000000002',
            status: 'recorded',
            rowVersion: 3,
            updatedBy: null
        };
        const replacementRecord = {
            id: '38000000-0000-4000-8000-000000000002',
            projectId,
            status: 'recorded',
            supersedesArchiveRecordId: supersededRecord.id
        };
        projectRepository.findProjectArchiveRecordById.mockResolvedValue(supersededRecord);
        projectRepository.findLatestRecordedProjectArchiveRecordByProjectId.mockResolvedValue(supersededRecord);
        projectRepository.createProjectArchiveRecord.mockReturnValue(replacementRecord);
        projectRepository.saveProjectArchiveRecordReplacement.mockResolvedValue(undefined);

        const result = await service.replaceProjectArchiveRecord(
            supersededRecord.id,
            {
                archivedAt,
                archiveSummary: '归档包已更新',
                evidenceSummary: '新版归档清单',
                replacementReason: '归档资料补充',
                expectedVersion: 3
            },
            userId
        );

        expect(supersededRecord.status).toBe('superseded');
        expect(supersededRecord.updatedBy).toBe(userId);
        expect(projectRepository.createProjectArchiveRecord).toHaveBeenCalledWith({
            projectId,
            archiveAnchorStage: 'completed',
            archiveAnchorSourceType: 'project-completion-record',
            archiveAnchorSourceId: '37000000-0000-4000-8000-000000000002',
            status: 'recorded',
            archivedAt,
            archivedBy: userId,
            archiveSummary: '归档包已更新',
            evidenceSummary: '新版归档清单',
            supersedesArchiveRecordId: supersededRecord.id,
            replacementReason: '归档资料补充',
            createdBy: userId,
            updatedBy: userId
        });
        expect(projectRepository.saveProjectArchiveRecordReplacement).toHaveBeenCalledWith({
            supersededRecord,
            replacementRecord
        });
        expect(result).toBe(replacementRecord);
    });

    it('voids current archive record with reason and operator evidence', async () => {
        const record = {
            id: '38000000-0000-4000-8000-000000000001',
            projectId,
            status: 'recorded',
            rowVersion: 2,
            voidedAt: null,
            voidedBy: null,
            voidReason: null,
            updatedBy: null
        };
        projectRepository.findProjectArchiveRecordById.mockResolvedValue(record);
        projectRepository.findLatestRecordedProjectArchiveRecordByProjectId.mockResolvedValue(record);
        projectRepository.saveProjectArchiveRecord.mockResolvedValue(undefined);

        const result = await service.voidProjectArchiveRecord(
            record.id,
            {
                reason: '客户要求重新归档',
                comment: '资料包撤回',
                expectedVersion: 2
            },
            userId
        );

        expect(record.status).toBe('voided');
        expect(record.voidedAt).toEqual(expect.any(Date));
        expect(record.voidedBy).toBe(userId);
        expect(record.voidReason).toBe('客户要求重新归档: 资料包撤回');
        expect(record.updatedBy).toBe(userId);
        expect(projectRepository.saveProjectArchiveRecord).toHaveBeenCalledWith(record);
        expect(result).toBe(record);
    });

    it('rejects archive replacement when expected version is stale', async () => {
        projectRepository.findProjectArchiveRecordById.mockResolvedValue({
            id: '38000000-0000-4000-8000-000000000001',
            projectId,
            status: 'recorded',
            rowVersion: 4
        });

        await expect(
            service.replaceProjectArchiveRecord(
                '38000000-0000-4000-8000-000000000001',
                {
                    archivedAt: new Date('2026-04-23T10:00:00.000Z'),
                    archiveSummary: '归档包已更新',
                    evidenceSummary: '新版归档清单',
                    replacementReason: '归档资料补充',
                    expectedVersion: 3
                },
                userId
            )
        ).rejects.toThrow(ConflictException);

        expect(projectRepository.createProjectArchiveRecord).not.toHaveBeenCalled();
    });

    it('rejects archive record creation when completed project has no effective completion source', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'completed', status: 'completed' }));
        projectRepository.findLatestConfirmedProjectCompletionRecordByProjectId.mockResolvedValue(null);

        await expect(
            service.createProjectArchiveRecord(
                projectId,
                {
                    archivedAt: new Date('2026-04-22T10:00:00.000Z'),
                    archiveSummary: '项目资料归档完成',
                    evidenceSummary: '归档清单与交付包'
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.createProjectArchiveRecord).not.toHaveBeenCalled();
        expect(projectRepository.saveProjectArchiveRecord).not.toHaveBeenCalled();
    });

    it('rejects archive record creation when closed project has no effective close fact', async () => {
        projectRepository.findById.mockResolvedValue(
            createProjectEntity({
                currentStage: 'closed-lost',
                status: 'closed',
                closedAt: null
            })
        );

        await expect(
            service.createProjectArchiveRecord(
                projectId,
                {
                    archivedAt: new Date('2026-04-22T10:00:00.000Z'),
                    archiveSummary: '丢单项目资料归档完成',
                    evidenceSummary: '丢单结论与归档清单'
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.createProjectArchiveRecord).not.toHaveBeenCalled();
        expect(projectRepository.saveProjectArchiveRecord).not.toHaveBeenCalled();
    });

    it('rejects archive record creation for non-terminal project stage', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'execution', status: 'active' }));

        await expect(
            service.createProjectArchiveRecord(
                projectId,
                {
                    archivedAt: new Date('2026-04-22T10:00:00.000Z'),
                    archiveSummary: '项目资料归档完成',
                    evidenceSummary: '归档清单与交付包'
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.findLatestConfirmedProjectCompletionRecordByProjectId).not.toHaveBeenCalled();
        expect(projectRepository.createProjectArchiveRecord).not.toHaveBeenCalled();
        expect(projectRepository.saveProjectArchiveRecord).not.toHaveBeenCalled();
    });

    it('creates a bid commercial process with a new version and supersedes the previous current process', async () => {
        const previousProcess = {
            id: '3a000000-0000-4000-8000-000000000001',
            projectId,
            version: 1,
            isCurrent: true,
            status: 'effective',
            updatedBy: null
        };
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'commercial-closure', status: 'active' }));
        projectRepository.findCurrentProjectBidCommercialProcessByProjectId.mockResolvedValue(previousProcess);
        projectRepository.createProjectBidCommercialProcess.mockImplementation((input) => ({
            ...input,
            createdAt: input.effectiveAt,
            updatedAt: input.effectiveAt,
            rowVersion: 1
        }));
        projectRepository.createProjectBidCommercialMaterialItem.mockImplementation((input) => input);
        projectRepository.createProjectBidCommercialTimelineItem.mockImplementation((input) => input);
        projectRepository.saveProjectBidCommercialProcess.mockResolvedValue(undefined);

        const result = await service.createProjectBidCommercialProcess(
            projectId,
            {
                bidMode: 'public-tender',
                currentStage: 'preparation',
                decision: 'participate',
                resultStatus: 'pending',
                processSummary: '公开招标资料准备中。',
                decisionSummary: '客户要求正式投标，决定参与。',
                resultSummary: null,
                ownerRole: '商务负责人',
                materialItems: [
                    {
                        materialKey: 'bid-bond',
                        label: '投标保证金确认',
                        materialStatus: 'in-progress',
                        responsibleRole: '商务负责人',
                        blocksNextStep: true,
                        navigationHint: '/projects/current/workspace/bid-commercial'
                    }
                ],
                timelineItems: [
                    {
                        eventKey: 'tender-announced',
                        label: '招标公告',
                        summary: '客户已发布招标公告。',
                        timelineStatus: 'done',
                        occurredAt: '2026-04-24T02:00:00.000Z'
                    }
                ]
            },
            userId
        );

        expect(previousProcess).toEqual(
            expect.objectContaining({
                isCurrent: false,
                status: 'superseded',
                updatedBy: userId
            })
        );
        expect(projectRepository.createProjectBidCommercialProcess).toHaveBeenCalledWith(
            expect.objectContaining({
                projectId,
                version: 2,
                isCurrent: true,
                supersedesId: previousProcess.id,
                status: 'effective',
                bidMode: 'public-tender',
                currentStage: 'preparation',
                decision: 'participate',
                resultStatus: 'pending',
                blockerCount: 1,
                createdBy: userId,
                updatedBy: userId
            })
        );
        expect(projectRepository.createProjectBidCommercialMaterialItem).toHaveBeenCalledWith(
            expect.objectContaining({
                materialKey: 'bid-bond',
                materialStatus: 'in-progress',
                blocksNextStep: true,
                sortOrder: 1
            })
        );
        expect(projectRepository.createProjectBidCommercialTimelineItem).toHaveBeenCalledWith(
            expect.objectContaining({
                eventKey: 'tender-announced',
                timelineStatus: 'done',
                occurredAt: new Date('2026-04-24T02:00:00.000Z'),
                sortOrder: 1
            })
        );
        expect(projectRepository.saveProjectBidCommercialProcess).toHaveBeenCalledWith({
            currentProcess: result,
            previousProcess,
            materialItems: [expect.objectContaining({ materialKey: 'bid-bond' })],
            timelineItems: [expect.objectContaining({ eventKey: 'tender-announced' })]
        });
    });

    it('rejects inconsistent not-required bid commercial process input', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'assessment', status: 'active' }));

        await expect(
            service.createProjectBidCommercialProcess(
                projectId,
                {
                    bidMode: 'not-required',
                    currentStage: 'closed',
                    decision: 'participate',
                    resultStatus: 'not-applicable',
                    processSummary: '项目不需要竞标。'
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.findCurrentProjectBidCommercialProcessByProjectId).not.toHaveBeenCalled();
        expect(projectRepository.createProjectBidCommercialProcess).not.toHaveBeenCalled();
    });

    it('rejects bid commercial process creation outside pre-signing stages', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'execution', status: 'active' }));

        await expect(
            service.createProjectBidCommercialProcess(
                projectId,
                {
                    bidMode: 'direct-commercial',
                    currentStage: 'not-started',
                    decision: 'participate',
                    resultStatus: 'pending',
                    processSummary: '执行期不应补签约前竞标过程。'
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.findCurrentProjectBidCommercialProcessByProjectId).not.toHaveBeenCalled();
        expect(projectRepository.createProjectBidCommercialProcess).not.toHaveBeenCalled();
    });

    it('creates a pricing margin review with references, blockers and a superseded previous review', async () => {
        const previousReview = {
            id: '3d000000-0000-4000-8000-000000000001',
            projectId,
            version: 1,
            isCurrent: true,
            status: 'effective',
            updatedBy: null
        };
        const technicalCostPackage = {
            id: '39000000-0000-4000-8000-000000000003',
            projectId,
            status: 'effective',
            isCurrent: true,
            currencyCode: 'CNY'
        };
        const bidCommercialProcess = {
            id: '3a000000-0000-4000-8000-000000000003',
            projectId,
            status: 'effective',
            isCurrent: true,
            bidMode: 'public-tender',
            resultStatus: 'won'
        };
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'commercial-closure', status: 'active' }));
        projectRepository.findCurrentProjectTechnicalCostPackageByProjectId.mockResolvedValue(technicalCostPackage);
        projectRepository.findCurrentProjectBidCommercialProcessByProjectId.mockResolvedValue(bidCommercialProcess);
        projectRepository.findCurrentProjectPricingMarginReviewByProjectId.mockResolvedValue(previousReview);
        projectRepository.createProjectPricingMarginReview.mockImplementation((input) => ({
            ...input,
            createdAt: input.effectiveAt,
            updatedAt: input.effectiveAt,
            rowVersion: 1
        }));
        projectRepository.createProjectPricingMarginConditionItem.mockImplementation((input) => input);
        projectRepository.saveProjectPricingMarginReview.mockResolvedValue(undefined);

        const result = await service.createProjectPricingMarginReview(
            projectId,
            {
                technicalCostPackageId: technicalCostPackage.id,
                bidCommercialProcessId: bidCommercialProcess.id,
                commercialReleaseBaselineId: '33000000-0000-4000-8000-000000000001',
                pricingPath: 'bid',
                quoteVersion: 'Q-2026-001',
                currencyCode: 'CNY',
                quoteAmountTaxInclusive: '11300.00',
                quoteAmountTaxExclusive: '10000.00',
                taxRate: '0.13000000',
                taxConditionSummary: '按 13% 增值税报价。',
                paymentTermsSummary: '首付款 30%，验收后 60%，质保金 10%。',
                grossMarginRate: '0.28000000',
                grossMarginBand: 'watch',
                grossMarginSummary: '毛利率处于关注区间，需要关闭回款条件项。',
                decision: 'conditional-release',
                decisionSummary: '条件放行，需补齐低首付风险说明。',
                approvalScenarioKey: 'pricing-margin-review',
                summaryPackageKey: 'pricing-margin-summary',
                summarySnapshotId: '37000000-0000-4000-8000-000000000001',
                projectionLevel: 'manager',
                exportPolicy: 'controlled',
                ownerRole: '销售 / 财务',
                conditionItems: [
                    {
                        conditionKey: 'down-payment-risk',
                        conditionType: 'payment',
                        label: '首付款条件确认',
                        conditionSummary: '首付款比例低于标准，需要财务确认。',
                        conditionStatus: 'open',
                        requiredForContracting: true,
                        responsibleRole: '财务'
                    }
                ]
            },
            userId
        );

        expect(previousReview).toEqual(expect.objectContaining({ isCurrent: false, status: 'superseded', updatedBy: userId }));
        expect(projectRepository.createProjectPricingMarginReview).toHaveBeenCalledWith(
            expect.objectContaining({
                projectId,
                version: 2,
                isCurrent: true,
                supersedesId: previousReview.id,
                technicalCostPackageId: technicalCostPackage.id,
                bidCommercialProcessId: bidCommercialProcess.id,
                commercialReleaseBaselineId: '33000000-0000-4000-8000-000000000001',
                pricingPath: 'bid',
                quoteAmountTaxInclusive: '11300.00',
                quoteAmountTaxExclusive: '10000.00',
                decision: 'conditional-release',
                readyForContracting: false,
                blockerCount: 1,
                createdBy: userId,
                updatedBy: userId
            })
        );
        expect(projectRepository.createProjectPricingMarginConditionItem).toHaveBeenCalledWith(
            expect.objectContaining({
                conditionKey: 'down-payment-risk',
                conditionStatus: 'open',
                requiredForContracting: true,
                sortOrder: 1
            })
        );
        expect(projectRepository.saveProjectPricingMarginReview).toHaveBeenCalledWith({
            currentReview: result,
            previousReview,
            conditionItems: [expect.objectContaining({ conditionKey: 'down-payment-risk' })]
        });
    });

    it('rejects pricing margin review when the technical cost package is not current', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'commercial-closure', status: 'active' }));
        projectRepository.findCurrentProjectTechnicalCostPackageByProjectId.mockResolvedValue({
            id: '39000000-0000-4000-8000-000000000099',
            projectId,
            currencyCode: 'CNY'
        });

        await expect(
            service.createProjectPricingMarginReview(
                projectId,
                {
                    technicalCostPackageId: '39000000-0000-4000-8000-000000000003',
                    pricingPath: 'direct-commercial',
                    quoteVersion: 'Q-2026-001',
                    currencyCode: 'CNY',
                    quoteAmountTaxInclusive: '11300.00',
                    quoteAmountTaxExclusive: '10000.00',
                    taxRate: '0.13000000',
                    taxConditionSummary: '按 13% 增值税报价。',
                    paymentTermsSummary: '首付款 30%。',
                    grossMarginBand: 'target',
                    grossMarginSummary: '毛利达标。',
                    decision: 'pending',
                    decisionSummary: '待评审。'
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.findCurrentProjectBidCommercialProcessByProjectId).not.toHaveBeenCalled();
        expect(projectRepository.createProjectPricingMarginReview).not.toHaveBeenCalled();
    });

    it('rejects released pricing margin review without approval summary and baseline references', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'commercial-closure', status: 'active' }));
        projectRepository.findCurrentProjectTechnicalCostPackageByProjectId.mockResolvedValue({
            id: '39000000-0000-4000-8000-000000000003',
            projectId,
            currencyCode: 'CNY'
        });
        projectRepository.findCurrentProjectBidCommercialProcessByProjectId.mockResolvedValue(null);

        await expect(
            service.createProjectPricingMarginReview(
                projectId,
                {
                    technicalCostPackageId: '39000000-0000-4000-8000-000000000003',
                    pricingPath: 'direct-commercial',
                    quoteVersion: 'Q-2026-001',
                    currencyCode: 'CNY',
                    quoteAmountTaxInclusive: '11300.00',
                    quoteAmountTaxExclusive: '10000.00',
                    taxRate: '0.13000000',
                    taxConditionSummary: '按 13% 增值税报价。',
                    paymentTermsSummary: '首付款 30%。',
                    grossMarginRate: '0.32000000',
                    grossMarginBand: 'target',
                    grossMarginSummary: '毛利达标。',
                    decision: 'released',
                    decisionSummary: '可放行。'
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.findCurrentProjectPricingMarginReviewByProjectId).not.toHaveBeenCalled();
        expect(projectRepository.createProjectPricingMarginReview).not.toHaveBeenCalled();
    });

    it('creates a technical cost package with a new version and supersedes the previous current package', async () => {
        const previousPackage = {
            id: '39000000-0000-4000-8000-000000000001',
            projectId,
            version: 2,
            isCurrent: true,
            status: 'effective',
            updatedBy: null
        };
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'scope-confirmation', status: 'active' }));
        projectRepository.findCurrentProjectTechnicalCostPackageByProjectId.mockResolvedValue(previousPackage);
        projectRepository.createProjectTechnicalCostPackage.mockImplementation((input) => ({
            ...input,
            createdAt: input.effectiveAt,
            updatedAt: input.effectiveAt,
            rowVersion: 1
        }));
        projectRepository.createProjectTechnicalScopeItem.mockImplementation((input) => input);
        projectRepository.createProjectTechnicalRiskItem.mockImplementation((input) => input);
        projectRepository.createProjectTechnicalCostItem.mockImplementation((input) => input);
        projectRepository.saveProjectTechnicalCostPackage.mockResolvedValue(undefined);

        const result = await service.createProjectTechnicalCostPackage(
            projectId,
            {
                technicalFeasibilityDecision: 'conditional',
                technicalConclusionSummary: '范围可实施，但集成风险需要持续跟踪。',
                allowNextStage: false,
                currencyCode: 'CNY',
                taxAssumptionSummary: '按 6% 增值税估算。',
                taxReviewStatus: 'pending',
                scopeItems: [
                    {
                        scopeType: 'in-scope',
                        label: '核心接口联调',
                        description: '覆盖合同签约前必须确认的接口范围。'
                    }
                ],
                riskItems: [
                    {
                        riskCategory: '集成风险',
                        riskLevel: 'R3',
                        riskDescription: '客户接口文档尚未冻结。',
                        impactScope: '影响报价边界和交付计划。',
                        mitigationPlan: '由售前推动接口清单冻结。',
                        ownerRole: '售前技术负责人',
                        riskStatus: 'open',
                        blocksNextStage: true
                    }
                ],
                costItems: [
                    {
                        costCategory: '人力',
                        costSubcategory: '售前支持',
                        costDescription: '售前技术方案与接口联调评估。',
                        estimationBasis: '2 人 5 天。',
                        quantity: '10.0000',
                        unit: 'person-day',
                        unitPrice: '1500.0000',
                        amountExcludingTax: '15000.00',
                        taxCostAmount: '900.00',
                        amountIncludingTax: '15900.00',
                        currencyCode: 'CNY',
                        confidenceLevel: 'medium',
                        highUncertainty: true,
                        responsibleRole: '售前技术负责人'
                    }
                ]
            },
            userId
        );

        expect(previousPackage).toEqual(
            expect.objectContaining({
                isCurrent: false,
                status: 'superseded',
                updatedBy: userId
            })
        );
        expect(projectRepository.createProjectTechnicalCostPackage).toHaveBeenCalledWith(
            expect.objectContaining({
                projectId,
                version: 3,
                isCurrent: true,
                supersedesId: previousPackage.id,
                status: 'effective',
                totalEstimatedAmountExcludingTax: '15000.00',
                totalTaxCostAmount: '900.00',
                totalEstimatedAmountIncludingTax: '15900.00',
                highestRiskLevel: 'R3',
                blockerCount: 2,
                createdBy: userId,
                updatedBy: userId
            })
        );
        expect(projectRepository.createProjectTechnicalScopeItem).toHaveBeenCalledWith(
            expect.objectContaining({
                scopeType: 'in-scope',
                sortOrder: 1
            })
        );
        expect(projectRepository.createProjectTechnicalRiskItem).toHaveBeenCalledWith(
            expect.objectContaining({
                riskLevel: 'R3',
                blocksNextStage: true,
                sortOrder: 1
            })
        );
        expect(projectRepository.createProjectTechnicalCostItem).toHaveBeenCalledWith(
            expect.objectContaining({
                costCategory: '人力',
                amountExcludingTax: '15000.00',
                taxCostAmount: '900.00',
                amountIncludingTax: '15900.00',
                sortOrder: 1
            })
        );
        expect(projectRepository.saveProjectTechnicalCostPackage).toHaveBeenCalledWith({
            currentPackage: result,
            previousPackage,
            scopeItems: [expect.objectContaining({ scopeType: 'in-scope' })],
            riskItems: [expect.objectContaining({ riskLevel: 'R3' })],
            costItems: [expect.objectContaining({ costCategory: '人力' })]
        });
    });

    it('rejects a technical cost package when cost item currency differs from the package currency', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'scope-confirmation', status: 'active' }));

        await expect(
            service.createProjectTechnicalCostPackage(
                projectId,
                {
                    technicalFeasibilityDecision: 'feasible',
                    technicalConclusionSummary: '技术可行。',
                    allowNextStage: true,
                    currencyCode: 'CNY',
                    taxAssumptionSummary: '无需额外税务成本。',
                    taxReviewStatus: 'reviewed',
                    scopeItems: [],
                    riskItems: [],
                    costItems: [
                        {
                            costCategory: '外采',
                            costDescription: '外部组件预估。',
                            estimationBasis: '供应商初步报价。',
                            amountExcludingTax: '1000.00',
                            taxCostAmount: '60.00',
                            amountIncludingTax: '1060.00',
                            currencyCode: 'USD',
                            confidenceLevel: 'high',
                            highUncertainty: false
                        }
                    ]
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.createProjectTechnicalCostPackage).not.toHaveBeenCalled();
        expect(projectRepository.saveProjectTechnicalCostPackage).not.toHaveBeenCalled();
    });

    it('rejects technical cost package creation outside pre-signing stages', async () => {
        projectRepository.findById.mockResolvedValue(createProjectEntity({ currentStage: 'execution', status: 'active' }));

        await expect(
            service.createProjectTechnicalCostPackage(
                projectId,
                {
                    technicalFeasibilityDecision: 'feasible',
                    technicalConclusionSummary: '技术可行。',
                    allowNextStage: true,
                    currencyCode: 'CNY',
                    taxAssumptionSummary: '无需额外税务成本。',
                    taxReviewStatus: 'reviewed',
                    scopeItems: [],
                    riskItems: [],
                    costItems: [
                        {
                            costCategory: '人力',
                            costDescription: '执行期成本不应进入签约前估算。',
                            estimationBasis: '测试数据。',
                            amountExcludingTax: '1000.00',
                            taxCostAmount: '60.00',
                            amountIncludingTax: '1060.00',
                            currencyCode: 'CNY',
                            confidenceLevel: 'high',
                            highUncertainty: false
                        }
                    ]
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);

        expect(projectRepository.findCurrentProjectTechnicalCostPackageByProjectId).not.toHaveBeenCalled();
        expect(projectRepository.createProjectTechnicalCostPackage).not.toHaveBeenCalled();
    });

    function createProjectEntity(overrides: Record<string, unknown> = {}) {
        return {
            id: projectId,
            projectNo: 'PRJ-2026-001',
            projectName: 'POMS 首期项目主链路样例',
            sourceLeadId: null,
            customerId,
            customerName: '华南地铁集团',
            status: 'active',
            currentStage: 'commercial-closure',
            ownerOrgId: null,
            ownerUserId: null,
            plannedSignAt: null,
            closedAt: null,
            closedReason: null,
            rowVersion: 1,
            createdAt: new Date('2026-03-22T10:00:00.000Z'),
            createdBy: userId,
            updatedAt: new Date('2026-03-22T10:00:00.000Z'),
            updatedBy: userId,
            ...overrides
        };
    }
});
