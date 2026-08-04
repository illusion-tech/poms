import { Inject, Controller, Delete, HttpCode, HttpStatus, Param, ParseUUIDPipe, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiNoContentResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { UserPayload } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { getRequestId, type RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
import { CustomerService } from './customer.service';

@ApiTags('customer')
@ApiCookieAuth('pomsSession')
@Controller('customer-aliases')
export class CustomerAliasController {
    constructor(@Inject(CustomerService) private readonly customerService: CustomerService) {}

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @HasPermissions('customer:write')
    @ApiOperation({ summary: '删除客户别名' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiNoContentResponse({ description: '客户别名已删除' })
    delete(@Param('id', new ParseUUIDPipe()) id: string, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<void> {
        return this.customerService.deleteAlias(id, req.user.sub, getRequestId(req));
    }
}
