import { BadRequestException } from '@nestjs/common';
import { BusinessDiscussionTargetObjectTypeValue, BusinessDiscussionTypeValue } from '@poms/shared-contracts';
import { BusinessDiscussionRepository } from './business-discussion.repository';
import { BusinessDiscussionService } from './business-discussion.service';

describe('BusinessDiscussionService', () => {
    const customerId = '11000000-0000-4000-8000-000000000001';
    const leadId = '50000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const userId = '90000000-0000-4000-8000-000000000001';
    let repository: jest.Mocked<Partial<BusinessDiscussionRepository>>;
    let service: BusinessDiscussionService;

    beforeEach(() => {
        repository = {
            findCustomerById: jest.fn().mockResolvedValue({ id: customerId, displayName: '客户A' }),
            findLeadById: jest.fn().mockResolvedValue({ id: leadId, customerId, leadName: '线索A' }),
            findProjectById: jest.fn().mockResolvedValue({
                id: projectId,
                customerId,
                projectName: '项目A',
                sourceLeadId: leadId
            }),
            findThreadsByTargets: jest.fn(),
            findCommentsByThreadIds: jest.fn(),
            findCustomerContactsByIds: jest.fn().mockResolvedValue([]),
            findPlatformUsersByIds: jest.fn().mockResolvedValue([{ id: userId, displayName: '销售主管' }]),
            findThreadByTarget: jest.fn(),
            findCustomerContactById: jest.fn(),
            findCompetitorRecordById: jest.fn(),
            findFollowUpRecordById: jest.fn(),
            createThread: jest.fn((input) => ({
                ...input,
                createdAt: new Date('2026-05-04T00:00:00.000Z')
            })) as never,
            createComment: jest.fn((input) => ({
                ...input,
                createdAt: new Date('2026-05-04T01:00:00.000Z')
            })) as never,
            saveThreadAndComment: jest.fn(),
            saveComment: jest.fn()
        };
        service = new BusinessDiscussionService(repository as BusinessDiscussionRepository);
    });

    it('lists project discussion together with source lead discussion', async () => {
        repository.findThreadsByTargets?.mockResolvedValue([
            {
                id: '81000000-0000-4000-8000-000000000001',
                targetObjectType: BusinessDiscussionTargetObjectTypeValue.Lead,
                targetObjectId: leadId,
                customerId,
                leadId,
                projectId: null,
                targetTitle: '线索A',
                createdAt: new Date('2026-05-04T00:00:00.000Z'),
                createdBy: userId
            } as never,
            {
                id: '81000000-0000-4000-8000-000000000002',
                targetObjectType: BusinessDiscussionTargetObjectTypeValue.Project,
                targetObjectId: projectId,
                customerId,
                leadId: null,
                projectId,
                targetTitle: '项目A',
                createdAt: new Date('2026-05-04T00:30:00.000Z'),
                createdBy: userId
            } as never
        ]);
        repository.findCommentsByThreadIds?.mockResolvedValue([
            {
                id: '82000000-0000-4000-8000-000000000001',
                threadId: '81000000-0000-4000-8000-000000000001',
                discussionType: BusinessDiscussionTypeValue.DecisionChain,
                body: '转项目之前确认了决策链',
                relatedContactId: null,
                relatedCompetitorRecordId: null,
                relatedFollowUpRecordId: null,
                isPinned: false,
                isKeyConclusion: true,
                createdAt: new Date('2026-05-04T00:10:00.000Z'),
                createdBy: userId
            } as never,
            {
                id: '82000000-0000-4000-8000-000000000002',
                threadId: '81000000-0000-4000-8000-000000000002',
                discussionType: BusinessDiscussionTypeValue.Strategy,
                body: '项目阶段继续推进',
                relatedContactId: null,
                relatedCompetitorRecordId: null,
                relatedFollowUpRecordId: null,
                isPinned: false,
                isKeyConclusion: false,
                createdAt: new Date('2026-05-04T01:10:00.000Z'),
                createdBy: userId
            } as never
        ]);

        const result = await service.listBusinessDiscussionComments({ projectId });

        expect(repository.findThreadsByTargets).toHaveBeenCalledWith([
            { targetObjectType: BusinessDiscussionTargetObjectTypeValue.Project, targetObjectId: projectId },
            { targetObjectType: BusinessDiscussionTargetObjectTypeValue.Lead, targetObjectId: leadId }
        ]);
        expect(result.map((item) => item.targetObjectType)).toEqual([BusinessDiscussionTargetObjectTypeValue.Lead, BusinessDiscussionTargetObjectTypeValue.Project]);
        expect(result[0]).toMatchObject({
            leadId,
            projectId: null,
            body: '转项目之前确认了决策链',
            createdByName: '销售主管'
        });
    });

    it('creates a discussion thread on first comment', async () => {
        repository.findThreadByTarget?.mockResolvedValue(null);

        const result = await service.createBusinessDiscussionComment(
            {
                targetObjectType: BusinessDiscussionTargetObjectTypeValue.Project,
                targetObjectId: projectId,
                discussionType: BusinessDiscussionTypeValue.Risk,
                body: '  需要补齐竞争对手信息  ',
                isPinned: true
            },
            userId
        );

        expect(repository.createThread).toHaveBeenCalledWith(
            expect.objectContaining({
                targetObjectType: BusinessDiscussionTargetObjectTypeValue.Project,
                targetObjectId: projectId,
                customerId,
                leadId: null,
                projectId,
                targetTitle: '项目A'
            })
        );
        expect(repository.createComment).toHaveBeenCalledWith(
            expect.objectContaining({
                body: '需要补齐竞争对手信息',
                discussionType: BusinessDiscussionTypeValue.Risk,
                isPinned: true,
                isKeyConclusion: false
            })
        );
        expect(repository.saveThreadAndComment).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({
            targetObjectType: BusinessDiscussionTargetObjectTypeValue.Project,
            body: '需要补齐竞争对手信息',
            createdByName: '销售主管'
        });
    });

    it('rejects query anchors from different customers', async () => {
        repository.findLeadById?.mockResolvedValue({ id: leadId, customerId: '11000000-0000-4000-8000-000000000099', leadName: '线索B' } as never);

        await expect(service.listBusinessDiscussionComments({ customerId, leadId })).rejects.toThrow(BadRequestException);
    });
});
