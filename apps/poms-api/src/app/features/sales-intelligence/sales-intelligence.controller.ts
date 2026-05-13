import { Body, Controller, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    CompetitorIntelligenceRecordDto,
    CompetitorIntelligenceRecordListDto,
    CreateCompetitorIntelligenceRecordRequestDto,
    CreateCustomerContactRequestDto,
    CreateOpportunityStakeholderRequestDto,
    CreateSalesDiscoveryRecordRequestDto,
    CustomerContactDto,
    CustomerContactListDto,
    CustomerContactListQueryDto,
    OpportunityContextQueryDto,
    OpportunityStakeholderDto,
    OpportunityStakeholderListDto,
    SalesDiscoveryRecordDto,
    SalesDiscoveryRecordListDto,
    SalesIntelligenceGapListDto,
    UpdateCompetitorIntelligenceRecordRequestDto,
    UpdateCustomerContactRequestDto,
    UpdateOpportunityStakeholderRequestDto,
    UpdateSalesDiscoveryRecordRequestDto
} from '@poms/api-contracts';
import type {
    CompetitorIntelligenceRecordSummary,
    CustomerContactSummary,
    OpportunityStakeholderSummary,
    SalesDiscoveryRecordSummary,
    SalesIntelligenceGapSummary,
    UserPayload
} from '@poms/shared-contracts';
import { HasAnyPermissions } from '../../core/auth/decorators/has-any-permissions.decorator';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { getRequestId, type RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
import { SalesIntelligenceService } from './sales-intelligence.service';

@ApiTags('SalesIntelligence')
@ApiCookieAuth('pomsSession')
@Controller('customer-contacts')
export class CustomerContactController {
    constructor(private readonly salesIntelligenceService: SalesIntelligenceService) {}

    @Get()
    @HasPermissions('customer:read')
    @ApiOperation({ summary: '获取客户联系人列表' })
    @ApiOkResponse({ type: CustomerContactListDto })
    list(@Query() query: CustomerContactListQueryDto): Promise<CustomerContactSummary[]> {
        return this.salesIntelligenceService.listCustomerContacts(query.customerId);
    }

    @Post()
    @HasPermissions('customer:write')
    @ApiOperation({ summary: '创建客户联系人' })
    @ApiCreatedResponse({ type: CustomerContactDto })
    create(@Body() body: CreateCustomerContactRequestDto, @Request() req: { user: UserPayload }): Promise<CustomerContactSummary> {
        return this.salesIntelligenceService.createCustomerContact(
            {
                customerId: body.customerId,
                name: body.name,
                department: body.department,
                title: body.title,
                workPhone: body.workPhone,
                mobile: body.mobile,
                wechat: body.wechat,
                email: body.email,
                remark: body.remark
            },
            req.user.sub
        );
    }

    @Patch(':id')
    @HasPermissions('customer:write')
    @ApiOperation({ summary: '更新客户联系人' })
    @ApiOkResponse({ type: CustomerContactDto })
    update(@Param('id') id: string, @Body() body: UpdateCustomerContactRequestDto, @Request() req: { user: UserPayload } & RuntimeAuditRequestLike): Promise<CustomerContactSummary> {
        return this.salesIntelligenceService.updateCustomerContact(id, body, req.user.sub, getRequestId(req));
    }
}

@ApiTags('SalesIntelligence')
@ApiCookieAuth('pomsSession')
@Controller('opportunity-stakeholders')
export class OpportunityStakeholderController {
    constructor(private readonly salesIntelligenceService: SalesIntelligenceService) {}

    @Get()
    @HasAnyPermissions('lead:read', 'project:read')
    @ApiOperation({ summary: '获取机会关系人列表' })
    @ApiOkResponse({ type: OpportunityStakeholderListDto })
    list(@Query() query: OpportunityContextQueryDto): Promise<OpportunityStakeholderSummary[]> {
        return this.salesIntelligenceService.listOpportunityStakeholders({
            leadId: query.leadId,
            projectId: query.projectId
        });
    }

    @Post()
    @HasAnyPermissions('lead:write', 'project:write')
    @ApiOperation({ summary: '创建机会关系人' })
    @ApiCreatedResponse({ type: OpportunityStakeholderDto })
    create(@Body() body: CreateOpportunityStakeholderRequestDto, @Request() req: { user: UserPayload }): Promise<OpportunityStakeholderSummary> {
        return this.salesIntelligenceService.createOpportunityStakeholder(
            {
                customerId: body.customerId,
                leadId: body.leadId,
                projectId: body.projectId,
                contactId: body.contactId,
                role: body.role,
                attitude: body.attitude,
                influenceLevel: body.influenceLevel,
                accessLevel: body.accessLevel,
                focusAreas: body.focusAreas,
                communicationNotes: body.communicationNotes,
                isPrimary: body.isPrimary
            },
            req.user.sub
        );
    }

    @Patch(':id')
    @HasAnyPermissions('lead:write', 'project:write')
    @ApiOperation({ summary: '更新机会关系人' })
    @ApiOkResponse({ type: OpportunityStakeholderDto })
    update(@Param('id') id: string, @Body() body: UpdateOpportunityStakeholderRequestDto, @Request() req: { user: UserPayload } & RuntimeAuditRequestLike): Promise<OpportunityStakeholderSummary> {
        return this.salesIntelligenceService.updateOpportunityStakeholder(id, body, req.user.sub, getRequestId(req));
    }
}

@ApiTags('SalesIntelligence')
@ApiCookieAuth('pomsSession')
@Controller('competitor-intelligence-records')
export class CompetitorIntelligenceRecordController {
    constructor(private readonly salesIntelligenceService: SalesIntelligenceService) {}

    @Get()
    @HasAnyPermissions('lead:read', 'project:read')
    @ApiOperation({ summary: '获取竞争态势记录列表' })
    @ApiOkResponse({ type: CompetitorIntelligenceRecordListDto })
    list(@Query() query: OpportunityContextQueryDto): Promise<CompetitorIntelligenceRecordSummary[]> {
        return this.salesIntelligenceService.listCompetitorIntelligenceRecords({
            leadId: query.leadId,
            projectId: query.projectId
        });
    }

    @Post()
    @HasAnyPermissions('lead:write', 'project:write')
    @ApiOperation({ summary: '创建竞争态势记录' })
    @ApiCreatedResponse({ type: CompetitorIntelligenceRecordDto })
    create(@Body() body: CreateCompetitorIntelligenceRecordRequestDto, @Request() req: { user: UserPayload }): Promise<CompetitorIntelligenceRecordSummary> {
        return this.salesIntelligenceService.createCompetitorIntelligenceRecord(
            {
                customerId: body.customerId,
                leadId: body.leadId,
                projectId: body.projectId,
                competitorName: body.competitorName,
                position: body.position,
                customerPreference: body.customerPreference,
                competitorStrengths: body.competitorStrengths,
                competitorWeaknesses: body.competitorWeaknesses,
                ourAdvantages: body.ourAdvantages,
                ourRisks: body.ourRisks,
                winProbability: body.winProbability,
                evidence: body.evidence
            },
            req.user.sub
        );
    }

    @Patch(':id')
    @HasAnyPermissions('lead:write', 'project:write')
    @ApiOperation({ summary: '更新竞争态势记录' })
    @ApiOkResponse({ type: CompetitorIntelligenceRecordDto })
    update(@Param('id') id: string, @Body() body: UpdateCompetitorIntelligenceRecordRequestDto, @Request() req: { user: UserPayload } & RuntimeAuditRequestLike): Promise<CompetitorIntelligenceRecordSummary> {
        return this.salesIntelligenceService.updateCompetitorIntelligenceRecord(id, body, req.user.sub, getRequestId(req));
    }
}

@ApiTags('SalesIntelligence')
@ApiCookieAuth('pomsSession')
@Controller('sales-discovery-records')
export class SalesDiscoveryRecordController {
    constructor(private readonly salesIntelligenceService: SalesIntelligenceService) {}

    @Get()
    @HasAnyPermissions('lead:read', 'project:read')
    @ApiOperation({ summary: '获取销售情报记录列表' })
    @ApiOkResponse({ type: SalesDiscoveryRecordListDto })
    list(@Query() query: OpportunityContextQueryDto): Promise<SalesDiscoveryRecordSummary[]> {
        return this.salesIntelligenceService.listSalesDiscoveryRecords({
            leadId: query.leadId,
            projectId: query.projectId
        });
    }

    @Post()
    @HasAnyPermissions('lead:write', 'project:write')
    @ApiOperation({ summary: '创建销售情报记录' })
    @ApiCreatedResponse({ type: SalesDiscoveryRecordDto })
    create(@Body() body: CreateSalesDiscoveryRecordRequestDto, @Request() req: { user: UserPayload }): Promise<SalesDiscoveryRecordSummary> {
        return this.salesIntelligenceService.createSalesDiscoveryRecord(
            {
                customerId: body.customerId,
                leadId: body.leadId,
                projectId: body.projectId,
                procurementProcess: body.procurementProcess,
                budgetSource: body.budgetSource,
                customerPainPoints: body.customerPainPoints,
                decisionCycle: body.decisionCycle,
                nextContactPlan: body.nextContactPlan,
                remark: body.remark
            },
            req.user.sub
        );
    }

    @Patch(':id')
    @HasAnyPermissions('lead:write', 'project:write')
    @ApiOperation({ summary: '更新销售情报记录' })
    @ApiOkResponse({ type: SalesDiscoveryRecordDto })
    update(@Param('id') id: string, @Body() body: UpdateSalesDiscoveryRecordRequestDto, @Request() req: { user: UserPayload } & RuntimeAuditRequestLike): Promise<SalesDiscoveryRecordSummary> {
        return this.salesIntelligenceService.updateSalesDiscoveryRecord(id, body, req.user.sub, getRequestId(req));
    }
}

@ApiTags('SalesIntelligence')
@ApiCookieAuth('pomsSession')
@Controller('sales-intelligence-gaps')
export class SalesIntelligenceGapController {
    constructor(private readonly salesIntelligenceService: SalesIntelligenceService) {}

    @Get()
    @HasAnyPermissions('lead:read', 'project:read')
    @ApiOperation({ summary: '获取销售情报缺口' })
    @ApiOkResponse({ type: SalesIntelligenceGapListDto })
    list(@Query() query: OpportunityContextQueryDto): Promise<SalesIntelligenceGapSummary[]> {
        return this.salesIntelligenceService.getSalesIntelligenceGaps({
            leadId: query.leadId,
            projectId: query.projectId
        });
    }
}
