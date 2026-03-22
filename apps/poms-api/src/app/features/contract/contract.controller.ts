import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    ActivateContractRequestDto,
    CommandResultDto,
    ContractDto,
    ContractListDto,
    ContractListQueryDto,
    CreateContractRequestDto,
    SubmitContractReviewRequestDto,
    UpdateContractBasicInfoRequestDto
} from '@poms/api-contracts';
import type { CommandResult, ContractListQuery, ContractSummary, UserPayload } from '@poms/shared-contracts';
import { ApprovalService } from '../approval/approval.service';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { Contract } from './contract.entity';
import { ContractService } from './contract.service';

@ApiTags('Contract')
@ApiBearerAuth()
@Controller('contracts')
export class ContractController {
    constructor(
        private readonly contractService: ContractService,
        private readonly approvalService: ApprovalService
    ) {}

    @Get()
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取合同列表' })
    @ApiOkResponse({ type: ContractListDto })
    async list(@Query() query: ContractListQueryDto): Promise<ContractSummary[]> {
        const listQuery: ContractListQuery = {
            projectId: query.projectId,
            status: query.status,
            keyword: query.keyword
        };

        const contracts = await this.contractService.findMany(listQuery);

        return contracts.map(mapContractToSummary);
    }

    @Get('no/:contractNo')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '按合同编号获取详情' })
    @ApiOkResponse({ type: ContractDto })
    async getByNo(@Param('contractNo') contractNo: string): Promise<ContractSummary> {
        const contract = await this.contractService.findByNo(contractNo);
        if (!contract) {
            throw new NotFoundException(`Contract no ${contractNo} not found`);
        }

        return mapContractToSummary(contract);
    }

    @Get(':id')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '按 ID 获取合同详情' })
    @ApiOkResponse({ type: ContractDto })
    async getById(@Param('id') id: string): Promise<ContractSummary> {
        const contract = await this.contractService.findById(id);
        if (!contract) {
            throw new NotFoundException(`Contract ${id} not found`);
        }

        return mapContractToSummary(contract);
    }

    @Post()
    @HasPermissions('project:write')
    @ApiOperation({ summary: '创建合同基础台账' })
    @ApiCreatedResponse({ type: ContractDto })
    async create(@Body() body: CreateContractRequestDto): Promise<ContractSummary> {
        const contract = await this.contractService.createAndSave({
            projectId: body.projectId,
            contractNo: body.contractNo,
            status: body.status,
            signedAmount: body.signedAmount,
            currencyCode: body.currencyCode,
            currentSnapshotId: body.currentSnapshotId,
            signedAt: body.signedAt ? new Date(body.signedAt) : null,
            createdBy: body.createdBy,
            updatedBy: body.updatedBy
        });

        return mapContractToSummary(contract);
    }

    @Patch(':id/basic')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '更新合同基础信息' })
    @ApiOkResponse({ type: ContractDto })
    async updateBasicInfo(@Param('id') id: string, @Body() body: UpdateContractBasicInfoRequestDto): Promise<ContractSummary> {
        const contract = await this.contractService.updateBasicInfo(id, {
            signedAmount: body.signedAmount,
            currencyCode: body.currencyCode,
            currentSnapshotId: body.currentSnapshotId,
            signedAt: body.signedAt === undefined ? undefined : body.signedAt === null ? null : new Date(body.signedAt),
            updatedBy: body.updatedBy
        });

        return mapContractToSummary(contract);
    }

    @Post(':id/submit-review')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '提交合同审核' })
    @ApiOkResponse({ type: CommandResultDto })
    submitReview(
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: SubmitContractReviewRequestDto,
    ): Promise<CommandResult> {
        return this.approvalService.submitContractReview(id, req.user.sub, body);
    }

    @Post(':id/activate')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '确认合同生效' })
    @ApiOkResponse({ type: CommandResultDto })
    activate(
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: ActivateContractRequestDto
    ): Promise<CommandResult> {
        return this.contractService.activate(id, req.user.sub, body);
    }
}

function mapContractToSummary(contract: Contract): ContractSummary {
    return {
        id: contract.id,
        projectId: contract.projectId,
        contractNo: contract.contractNo,
        status: contract.status,
        signedAmount: contract.signedAmount,
        currencyCode: contract.currencyCode,
        currentSnapshotId: contract.currentSnapshotId ?? null,
        signedAt: contract.signedAt?.toISOString() ?? null,
        rowVersion: contract.rowVersion,
        createdAt: contract.createdAt.toISOString(),
        createdBy: contract.createdBy ?? null,
        updatedAt: contract.updatedAt.toISOString(),
        updatedBy: contract.updatedBy ?? null
    };
}
