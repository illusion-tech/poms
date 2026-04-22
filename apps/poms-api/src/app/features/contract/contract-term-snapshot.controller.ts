import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContractTermSnapshotSummaryDto } from '@poms/api-contracts';
import type { ContractTermSnapshotSummary } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { mapSnapshotToSummary } from './contract.controller';
import { ContractTermSnapshotRepository } from './contract.repository';

@ApiTags('Contract')
@ApiBearerAuth()
@Controller('contract-term-snapshots')
export class ContractTermSnapshotController {
    constructor(private readonly contractTermSnapshotRepository: ContractTermSnapshotRepository) {}

    @Get(':id')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '按 ID 获取合同条款快照' })
    @ApiOkResponse({ type: ContractTermSnapshotSummaryDto })
    async getById(@Param('id') id: string): Promise<ContractTermSnapshotSummary> {
        const snapshot = await this.contractTermSnapshotRepository.findById(id);
        if (!snapshot) {
            throw new NotFoundException(`ContractTermSnapshot ${id} not found`);
        }
        return mapSnapshotToSummary(snapshot);
    }
}
