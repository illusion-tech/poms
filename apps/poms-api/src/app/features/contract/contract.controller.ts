import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    ActivateContractRequestDto,
    ApprovalRecordDto,
    CommandResultDto,
    ContractDetailViewDto,
    ContractDto,
    ContractListDto,
    ContractListQueryDto,
    CreateContractRequestDto,
    SubmitContractReviewRequestDto,
    UpdateContractBasicInfoRequestDto
} from '@poms/api-contracts';
import type { ApprovalRecordSummary, CommandResult, ContractDetailView, ContractListQuery, ContractSummary, ContractTermSnapshotSummary, UserPayload } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { buildSensitiveFieldProjectionRequestContext } from '../../core/sensitive-field-projection/sensitive-field-projection-request-context';
import { SensitiveFieldProjectionService, type SensitiveFieldProjectionRequestContext } from '../../core/sensitive-field-projection/sensitive-field-projection.service';
import type { RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
import { ApprovalService } from '../approval/approval.service';
import { Project } from '../project/project.entity';
import { ProjectService } from '../project/project.service';
import { Contract, ContractTermSnapshot } from './contract.entity';
import { ContractService } from './contract.service';
import { ContractTermSnapshotRepository } from './contract.repository';

@ApiTags('contract')
@ApiCookieAuth('pomsSession')
@Controller('contracts')
export class ContractController {
    constructor(
        private readonly contractService: ContractService,
        private readonly approvalService: ApprovalService,
        private readonly projectService: ProjectService,
        private readonly contractTermSnapshotRepository: ContractTermSnapshotRepository,
        private readonly sensitiveFieldProjectionService: SensitiveFieldProjectionService
    ) {}

    @Get()
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取合同列表' })
    @ApiOkResponse({ type: ContractListDto })
    async list(@Query() query: ContractListQueryDto, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<ContractSummary[]> {
        const listQuery: ContractListQuery = {
            projectId: query.projectId,
            status: query.status,
            keyword: query.keyword
        };

        const contracts = await this.contractService.findMany(listQuery);
        const projectIds = [...new Set(contracts.map((c) => c.projectId))];
        const projects = await this.projectService.findByIds(projectIds);
        const projectMap = new Map(projects.map((p) => [p.id, p]));
        const requestContext = buildSensitiveFieldProjectionRequestContext(req, '/contracts');

        return Promise.all(contracts.map((c) => mapContractToSummary(c, projectMap.get(c.projectId) ?? null, this.sensitiveFieldProjectionService, req.user, requestContext)));
    }

    @Get('no/:contractNo')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '按合同编号获取详情' })
    @ApiOkResponse({ type: ContractDetailViewDto })
    async getByNo(@Param('contractNo') contractNo: string, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<ContractDetailView> {
        const contract = await this.contractService.findByNo(contractNo);
        if (!contract) {
            throw new NotFoundException(`Contract no ${contractNo} not found`);
        }

        const [project, snapshot] = await Promise.all([this.projectService.findById(contract.projectId), contract.currentSnapshotId ? this.contractTermSnapshotRepository.findById(contract.currentSnapshotId) : Promise.resolve(null)]);
        return mapContractToDetailView(contract, project, snapshot, this.sensitiveFieldProjectionService, req.user, buildSensitiveFieldProjectionRequestContext(req, `/contracts/no/${contractNo}`));
    }

    @Get(':id')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '按 ID 获取合同详情' })
    @ApiOkResponse({ type: ContractDetailViewDto })
    async getById(@Param('id') id: string, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<ContractDetailView> {
        const contract = await this.contractService.findById(id);
        if (!contract) {
            throw new NotFoundException(`Contract ${id} not found`);
        }

        const [project, snapshot] = await Promise.all([this.projectService.findById(contract.projectId), contract.currentSnapshotId ? this.contractTermSnapshotRepository.findById(contract.currentSnapshotId) : Promise.resolve(null)]);
        return mapContractToDetailView(contract, project, snapshot, this.sensitiveFieldProjectionService, req.user, buildSensitiveFieldProjectionRequestContext(req, `/contracts/${id}`));
    }

    @Get(':id/approval-record')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取合同当前审批摘要' })
    @ApiOkResponse({ type: ApprovalRecordDto })
    async getCurrentApproval(@Param('id') id: string): Promise<ApprovalRecordSummary> {
        const approvalRecord = await this.approvalService.findLatestApprovalForTarget('contract', id);
        if (!approvalRecord) {
            throw new NotFoundException(`No approval record found for contract ${id}`);
        }

        return approvalRecord;
    }

    @Post()
    @HasPermissions('project:write')
    @ApiOperation({ summary: '创建合同基础台账' })
    @ApiCreatedResponse({ type: ContractDto })
    async create(@Body() body: CreateContractRequestDto, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<ContractSummary> {
        const contract = await this.contractService.createAndSave({
            projectId: body.projectId,
            customerContractNo: body.customerContractNo,
            status: body.status,
            signedAmount: body.signedAmount,
            currencyCode: body.currencyCode,
            signedAt: body.signedAt ? new Date(body.signedAt) : null,
            retentionDueDate: body.retentionDueDate ?? null,
            createdBy: body.createdBy,
            updatedBy: body.updatedBy
        });

        const project = await this.projectService.findById(contract.projectId);
        return mapContractToSummary(contract, project, this.sensitiveFieldProjectionService, req.user, buildSensitiveFieldProjectionRequestContext(req, '/contracts'));
    }

    @Patch(':id')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '更新合同基础信息' })
    @ApiOkResponse({ type: ContractDto })
    async updateBasicInfo(@Param('id') id: string, @Body() body: UpdateContractBasicInfoRequestDto, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<ContractSummary> {
        const contract = await this.contractService.updateBasicInfo(id, {
            customerContractNo: body.customerContractNo,
            signedAmount: body.signedAmount,
            currencyCode: body.currencyCode,
            signedAt: body.signedAt === undefined ? undefined : body.signedAt === null ? null : new Date(body.signedAt),
            retentionDueDate: body.retentionDueDate,
            updatedBy: body.updatedBy
        });

        const project = await this.projectService.findById(contract.projectId);
        return mapContractToSummary(contract, project, this.sensitiveFieldProjectionService, req.user, buildSensitiveFieldProjectionRequestContext(req, `/contracts/${id}`));
    }

    @Post(':id\\:submitReview')
    @HasPermissions('project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '提交合同审核' })
    @ApiOkResponse({ type: CommandResultDto })
    submitReview(@Param('id') id: string, @Request() req: { user: UserPayload }, @Body() body: SubmitContractReviewRequestDto): Promise<CommandResult> {
        return this.approvalService.submitContractReview(id, req.user.sub, body);
    }

    @Post(':id\\:activate')
    @HasPermissions('project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '确认合同生效' })
    @ApiOkResponse({ type: CommandResultDto })
    activate(@Param('id') id: string, @Request() req: { user: UserPayload }, @Body() body: ActivateContractRequestDto): Promise<CommandResult> {
        return this.contractService.activate(id, req.user.sub, body);
    }
}

async function mapContractToSummary(contract: Contract, project: Project | null, sensitiveFieldProjectionService: SensitiveFieldProjectionService, user: UserPayload, requestContext: SensitiveFieldProjectionRequestContext): Promise<ContractSummary> {
    const signedAmountProjection = await sensitiveFieldProjectionService.projectStringField({
        fieldPackageKey: 'contract-finance',
        rawValue: contract.signedAmount,
        displayTextWhenFull: `${contract.signedAmount} ${contract.currencyCode}`,
        user,
        targetType: 'contract',
        targetId: contract.id,
        requestContext
    });

    return {
        id: contract.id,
        projectId: contract.projectId,
        projectName: project?.projectName ?? '',
        customerName: project?.customerName ?? null,
        contractNo: contract.contractNo,
        customerContractNo: contract.customerContractNo ?? null,
        status: contract.status,
        signedAmountProjection,
        currencyCode: contract.currencyCode,
        currentSnapshotId: contract.currentSnapshotId ?? null,
        signedAt: contract.signedAt?.toISOString() ?? null,
        retentionDueDate: contract.retentionDueDate ?? null,
        rowVersion: contract.rowVersion,
        createdAt: contract.createdAt.toISOString(),
        createdBy: contract.createdBy ?? null,
        updatedAt: contract.updatedAt.toISOString(),
        updatedBy: contract.updatedBy ?? null
    };
}

export async function mapSnapshotToSummary(
    snapshot: ContractTermSnapshot,
    sensitiveFieldProjectionService: SensitiveFieldProjectionService,
    user: UserPayload,
    requestContext: SensitiveFieldProjectionRequestContext
): Promise<ContractTermSnapshotSummary> {
    const { amountTaxInclusiveProjection, amountTaxExclusiveProjection, taxRateProjection, downPaymentRateProjection, retentionRateProjection, paymentTermsProjection } = await sensitiveFieldProjectionService.projectStringFields({
        fieldPackageKey: 'contract-finance',
        user,
        targetType: 'ContractSnapshot',
        targetId: snapshot.id,
        requestContext,
        fields: [
            {
                key: 'amountTaxInclusiveProjection',
                rawValue: snapshot.amountTaxInclusive ?? null,
                displayTextWhenFull: snapshot.amountTaxInclusive ?? null
            },
            {
                key: 'amountTaxExclusiveProjection',
                rawValue: snapshot.amountTaxExclusive ?? null,
                displayTextWhenFull: snapshot.amountTaxExclusive ?? null
            },
            {
                key: 'taxRateProjection',
                rawValue: snapshot.taxRate ?? null,
                displayTextWhenFull: snapshot.taxRate ?? null
            },
            {
                key: 'downPaymentRateProjection',
                rawValue: snapshot.downPaymentRate ?? null,
                displayTextWhenFull: snapshot.downPaymentRate ?? null
            },
            {
                key: 'retentionRateProjection',
                rawValue: snapshot.retentionRate ?? null,
                displayTextWhenFull: snapshot.retentionRate ?? null
            },
            {
                key: 'paymentTermsProjection',
                rawValue: snapshot.paymentTerms ?? null,
                displayTextWhenFull: snapshot.paymentTerms ?? null
            }
        ]
    });

    return {
        id: snapshot.id,
        contractId: snapshot.contractId,
        effectiveAt: snapshot.effectiveAt.toISOString(),
        effectiveBy: snapshot.effectiveBy ?? null,
        retentionDueDate: snapshot.retentionDueDate ?? null,
        amountTaxInclusiveProjection,
        amountTaxExclusiveProjection,
        taxRateProjection,
        downPaymentRateProjection,
        retentionRateProjection,
        paymentTermsProjection,
        sourceReadinessId: snapshot.sourceReadinessId ?? null,
        sourceBaselineId: snapshot.sourceBaselineId ?? null,
        version: snapshot.version,
        snapshotStatus: snapshot.snapshotStatus,
        createdAt: snapshot.createdAt.toISOString(),
        createdBy: snapshot.createdBy ?? null,
        rowVersion: snapshot.rowVersion
    };
}

async function mapContractToDetailView(
    contract: Contract,
    project: Project | null,
    snapshot: ContractTermSnapshot | null,
    sensitiveFieldProjectionService: SensitiveFieldProjectionService,
    user: UserPayload,
    requestContext: SensitiveFieldProjectionRequestContext
): Promise<ContractDetailView> {
    return {
        ...(await mapContractToSummary(contract, project, sensitiveFieldProjectionService, user, requestContext)),
        currentTermSnapshot: snapshot ? await mapSnapshotToSummary(snapshot, sensitiveFieldProjectionService, user, requestContext) : null
    };
}
