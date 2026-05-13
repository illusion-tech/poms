import { Body, Controller, Get, Post, Query, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessDiscussionCommentDto, BusinessDiscussionCommentListDto, BusinessDiscussionListQueryDto, CreateBusinessDiscussionCommentRequestDto } from '@poms/api-contracts';
import type { BusinessDiscussionCommentSummary, BusinessDiscussionListQuery, UserPayload } from '@poms/shared-contracts';
import { HasAnyPermissions } from '../../core/auth/decorators/has-any-permissions.decorator';
import { BusinessDiscussionService } from './business-discussion.service';

@ApiTags('BusinessDiscussion')
@ApiCookieAuth('pomsSession')
@Controller('business-discussions')
export class BusinessDiscussionController {
    constructor(private readonly businessDiscussionService: BusinessDiscussionService) {}

    @Get()
    @HasAnyPermissions('customer:read', 'lead:read', 'project:read')
    @ApiOperation({ summary: '获取业务对象讨论列表' })
    @ApiOkResponse({ type: BusinessDiscussionCommentListDto })
    list(@Query() query: BusinessDiscussionListQueryDto): Promise<BusinessDiscussionCommentSummary[]> {
        const listQuery: BusinessDiscussionListQuery = {
            customerId: query.customerId,
            leadId: query.leadId,
            projectId: query.projectId
        };
        return this.businessDiscussionService.listBusinessDiscussionComments(listQuery);
    }

    @Post()
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @ApiOperation({ summary: '创建业务对象讨论' })
    @ApiCreatedResponse({ type: BusinessDiscussionCommentDto })
    create(@Body() body: CreateBusinessDiscussionCommentRequestDto, @Request() req: { user: UserPayload }): Promise<BusinessDiscussionCommentSummary> {
        return this.businessDiscussionService.createBusinessDiscussionComment(
            {
                targetObjectType: body.targetObjectType,
                targetObjectId: body.targetObjectId,
                discussionType: body.discussionType,
                body: body.body,
                relatedContactId: body.relatedContactId,
                relatedCompetitorRecordId: body.relatedCompetitorRecordId,
                relatedFollowUpRecordId: body.relatedFollowUpRecordId,
                isPinned: body.isPinned,
                isKeyConclusion: body.isKeyConclusion
            },
            req.user.sub
        );
    }
}
