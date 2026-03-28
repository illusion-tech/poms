import type { NavigationItem, PlatformOrgUnitSummary, PlatformRoleSummary, PlatformUserList } from '@poms/shared-contracts';
import type { UserPayload } from '@poms/shared-contracts';
import {
    AssignRolePermissionsRequestDto,
    AssignUserOrgMembershipsRequestDto,
    AssignUserRolesRequestDto,
    CreateOrgUnitRequestDto,
    CreatePlatformUserRequestDto,
    CreateRoleRequestDto,
    NavigationListDto,
    PlatformOrgUnitListDto,
    PlatformOrgUnitSummaryDto,
    PlatformRoleListDto,
    PlatformRoleSummaryDto,
    PlatformUserListDto,
    SanitizedUserWithOrgUnitsDto,
    UpdateOrgUnitRequestDto,
    UpdatePlatformUserActivationRequestDto
} from '@poms/api-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { NavigationService } from '../navigation/navigation.service';
import { PlatformService } from './platform.service';

@ApiTags('Platform')
@ApiBearerAuth()
@Controller('platform')
export class PlatformController {
    constructor(
        private readonly platformService: PlatformService,
        private readonly navigationService: NavigationService
    ) {}

    @Get('users')
    @HasPermissions('platform:users:manage')
    @ApiOperation({ summary: '获取平台用户列表' })
    @ApiOkResponse({ type: PlatformUserListDto })
    listUsers(): Promise<PlatformUserList> {
        return this.platformService.listUsers();
    }

    @Post('users')
    @HasPermissions('platform:users:manage')
    @ApiOperation({ summary: '创建平台用户' })
    @ApiOkResponse({ schema: { type: 'object' } })
    createUser(@Body() body: CreatePlatformUserRequestDto, @Request() req: { user: UserPayload }) {
        return this.platformService.createUser(body, req.user.sub);
    }

    @Post('users/:id/activate')
    @HasPermissions('platform:users:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '启用平台用户' })
    @ApiOkResponse({ schema: { type: 'object' } })
    activateUser(@Param('id') id: string, @Body() body: UpdatePlatformUserActivationRequestDto, @Request() req: { user: UserPayload }) {
        return this.platformService.activateUser(id, body, req.user.sub);
    }

    @Post('users/:id/deactivate')
    @HasPermissions('platform:users:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '停用平台用户' })
    @ApiOkResponse({ schema: { type: 'object' } })
    deactivateUser(@Param('id') id: string, @Body() body: UpdatePlatformUserActivationRequestDto, @Request() req: { user: UserPayload }) {
        return this.platformService.deactivateUser(id, body, req.user.sub);
    }

    @Post('users/:id/roles')
    @HasPermissions('platform:users:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '分配用户角色' })
    @ApiOkResponse({ type: SanitizedUserWithOrgUnitsDto })
    assignUserRoles(@Param('id') id: string, @Body() body: AssignUserRolesRequestDto, @Request() req: { user: UserPayload }) {
        return this.platformService.assignUserRoles(id, body, req.user.sub);
    }

    @Post('users/:id/org-memberships')
    @HasPermissions('platform:users:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '分配用户组织关系' })
    @ApiOkResponse({ type: SanitizedUserWithOrgUnitsDto })
    assignUserOrgMemberships(@Param('id') id: string, @Body() body: AssignUserOrgMembershipsRequestDto, @Request() req: { user: UserPayload }) {
        return this.platformService.assignUserOrgMemberships(id, body, req.user.sub);
    }

    @Get('roles')
    @HasPermissions('platform:roles:manage')
    @ApiOperation({ summary: '获取平台角色列表（基础查询）' })
    @ApiOkResponse({ type: PlatformRoleListDto })
    async listRoles(): Promise<PlatformRoleSummary[]> {
        return this.platformService.listRoles();
    }

    @Post('roles')
    @HasPermissions('platform:roles:manage')
    @ApiOperation({ summary: '创建平台角色' })
    @ApiOkResponse({ type: PlatformRoleSummaryDto })
    createRole(@Body() body: CreateRoleRequestDto, @Request() req: { user: UserPayload }): Promise<PlatformRoleSummary> {
        return this.platformService.createRole(body, req.user.sub);
    }

    @Post('roles/:id/permissions')
    @HasPermissions('platform:roles:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '分配角色权限（全量替换）' })
    @ApiOkResponse({ type: PlatformRoleSummaryDto })
    assignRolePermissions(@Param('id') id: string, @Body() body: AssignRolePermissionsRequestDto, @Request() req: { user: UserPayload }): Promise<PlatformRoleSummary> {
        return this.platformService.assignRolePermissions(id, body, req.user.sub);
    }

    @Get('org-units')
    @HasPermissions('platform:org-units:manage')
    @ApiOperation({ summary: '获取平台组织列表（基础查询）' })
    @ApiOkResponse({ type: PlatformOrgUnitListDto })
    async listOrgUnits(): Promise<PlatformOrgUnitSummary[]> {
        return this.platformService.listOrgUnits();
    }

    @Post('org-units')
    @HasPermissions('platform:org-units:manage')
    @ApiOperation({ summary: '创建组织单元' })
    @ApiOkResponse({ type: PlatformOrgUnitSummaryDto })
    createOrgUnit(@Body() body: CreateOrgUnitRequestDto, @Request() req: { user: UserPayload }): Promise<PlatformOrgUnitSummary> {
        return this.platformService.createOrgUnit(body, req.user.sub);
    }

    @Patch('org-units/:id')
    @HasPermissions('platform:org-units:manage')
    @ApiOperation({ summary: '更新组织单元基本信息' })
    @ApiOkResponse({ type: PlatformOrgUnitSummaryDto })
    updateOrgUnit(@Param('id') id: string, @Body() body: UpdateOrgUnitRequestDto, @Request() req: { user: UserPayload }): Promise<PlatformOrgUnitSummary> {
        return this.platformService.updateOrgUnit(id, body, req.user.sub);
    }

    @Get('navigation')
    @HasPermissions('platform:navigation:manage')
    @ApiOperation({ summary: '获取完整导航树（平台管理员只读视图）' })
    @ApiOkResponse({ type: NavigationListDto })
    getAllNavigationItems(): NavigationItem[] {
        return this.navigationService.getAllNavigationItems();
    }
}
