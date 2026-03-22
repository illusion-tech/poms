import { Body, Controller, Get, NotFoundException, Param, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    ApprovalRecordDto,
    ApproveRecordRequestDto,
    CommandResultDto,
    RejectApprovalRecordRequestDto,
    TodoItemListDto
} from '@poms/api-contracts';
import type { ApprovalRecordSummary, CommandResult, TodoItemSummary, UserPayload } from '@poms/shared-contracts';
import { Authenticated } from '../../core/auth/decorators/authenticated.decorator';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { ApprovalService } from './approval.service';

@ApiTags('Approval')
@ApiBearerAuth()
@Controller()
export class ApprovalController {
    constructor(private readonly approvalService: ApprovalService) {}

    @Get('approval-records/:id')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取审批记录详情' })
    @ApiOkResponse({ type: ApprovalRecordDto })
    async getApprovalRecord(@Param('id') id: string): Promise<ApprovalRecordSummary> {
        const record = await this.approvalService.findApprovalRecordById(id);
        if (!record) {
            throw new NotFoundException(`ApprovalRecord ${id} not found`);
        }

        return record;
    }

    @Post('approval-records/:id/approve')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '审批通过' })
    @ApiOkResponse({ type: CommandResultDto })
    approveRecord(
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: ApproveRecordRequestDto
    ): Promise<CommandResult> {
        return this.approvalService.approveRecord(id, req.user.sub, body);
    }

    @Post('approval-records/:id/reject')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '审批驳回' })
    @ApiOkResponse({ type: CommandResultDto })
    rejectRecord(
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: RejectApprovalRecordRequestDto
    ): Promise<CommandResult> {
        return this.approvalService.rejectRecord(id, req.user.sub, body);
    }

    @Get('me/todos')
    @Authenticated()
    @ApiOperation({ summary: '获取当前用户的统一待办列表' })
    @ApiOkResponse({ type: TodoItemListDto })
    getMyTodos(@Request() req: { user: UserPayload }): Promise<TodoItemSummary[]> {
        return this.approvalService.findOpenTodosForUser(req.user.sub);
    }
}
