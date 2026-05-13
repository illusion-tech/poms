import { BindUserExternalIdentityRequestDto, ExternalIdentityBindingDto, ExternalIdentityBindingListDto, UnbindExternalIdentityRequestDto } from '@poms/api-contracts';
import type { ExternalIdentityBindingList, ExternalIdentityBindingSummary, UserPayload } from '@poms/shared-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { IdentityProviderService } from './identity-provider.service';

@ApiTags('External Identity')
@ApiCookieAuth('pomsSession')
@Controller('platform')
export class ExternalIdentityController {
    constructor(private readonly identityProviderService: IdentityProviderService) {}

    @Get('users/:id/external-identities')
    @HasPermissions('platform:users:manage')
    @ApiOperation({ summary: '获取平台用户外部身份绑定列表' })
    @ApiOkResponse({ type: ExternalIdentityBindingListDto })
    listUserExternalIdentities(@Param('id') id: string): Promise<ExternalIdentityBindingList> {
        return this.identityProviderService.listUserExternalIdentities(id);
    }

    @Post('users/:id/external-identities')
    @HasPermissions('platform:users:manage')
    @ApiOperation({ summary: '绑定平台用户外部身份' })
    @ApiCreatedResponse({ type: ExternalIdentityBindingDto })
    bindUserExternalIdentity(@Param('id') id: string, @Body() body: BindUserExternalIdentityRequestDto, @Request() req: { user: UserPayload }): Promise<ExternalIdentityBindingSummary> {
        return this.identityProviderService.bindUserExternalIdentity(id, body, req.user.sub);
    }

    @Post('external-identities/:id\\:unbind')
    @HasPermissions('platform:users:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '解绑外部身份' })
    @ApiOkResponse({ type: ExternalIdentityBindingDto })
    unbindExternalIdentity(@Param('id') id: string, @Body() body: UnbindExternalIdentityRequestDto, @Request() req: { user: UserPayload }): Promise<ExternalIdentityBindingSummary> {
        return this.identityProviderService.unbindExternalIdentity(id, body, req.user.sub);
    }
}
