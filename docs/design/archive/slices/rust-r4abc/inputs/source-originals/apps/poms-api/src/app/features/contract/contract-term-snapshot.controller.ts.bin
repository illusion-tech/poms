import { Inject, Controller, Get, NotFoundException, Param, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContractTermSnapshotSummaryDto } from '@poms/api-contracts';
import type { ContractTermSnapshotSummary, UserPayload } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { buildSensitiveFieldProjectionRequestContext } from '../../core/sensitive-field-projection/sensitive-field-projection-request-context';
import { SensitiveFieldProjectionService } from '../../core/sensitive-field-projection/sensitive-field-projection.service';
import type { RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
import { mapSnapshotToSummary } from './contract.controller';
import { ContractTermSnapshotRepository } from './contract.repository';

@ApiTags('contract')
@ApiCookieAuth('pomsSession')
@Controller('contract-term-snapshots')
export class ContractTermSnapshotController {
    constructor(
        @Inject(ContractTermSnapshotRepository) private readonly contractTermSnapshotRepository: ContractTermSnapshotRepository,
        @Inject(SensitiveFieldProjectionService) private readonly sensitiveFieldProjectionService: SensitiveFieldProjectionService
    ) {}

    @Get(':id')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '按 ID 获取合同条款快照' })
    @ApiOkResponse({ type: ContractTermSnapshotSummaryDto })
    async getById(@Param('id') id: string, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<ContractTermSnapshotSummary> {
        const snapshot = await this.contractTermSnapshotRepository.findById(id);
        if (!snapshot) {
            throw new NotFoundException(`ContractTermSnapshot ${id} not found`);
        }
        return mapSnapshotToSummary(snapshot, this.sensitiveFieldProjectionService, req.user, buildSensitiveFieldProjectionRequestContext(req, `/contract-term-snapshots/${id}`));
    }
}
