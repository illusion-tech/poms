import type {
    MoveOrgUnitRequest,
    NavigationItem,
    NavigationSyncSummary,
    PlatformPermissionList,
    PlatformOrgUnitDetail,
    PlatformOrgUnitSummary,
    PlatformOrgUnitTree,
    PlatformRoleDetail,
    PlatformRoleSummary,
    PlatformUserList,
    UpdateRoleActivationRequest,
    UpdateOrgUnitActivationRequest
} from '@poms/shared-contracts';
import type { UserPayload } from '@poms/shared-contracts';
import {
    AssignRolePermissionsRequestDto,
    AssignUserOrgMembershipsRequestDto,
    AssignUserRolesRequestDto,
    CreateOrgUnitRequestDto,
    CreatePlatformUserRequestDto,
    CreateRoleRequestDto,
    MoveOrgUnitRequestDto,
    NavigationListDto,
    NavigationSyncSummaryDto,
    PlatformPermissionListDto,
    PlatformOrgUnitDetailDto,
    PlatformOrgUnitListDto,
    PlatformOrgUnitSummaryDto,
    PlatformOrgUnitTreeDto,
    PlatformRoleDetailDto,
    PlatformRoleListDto,
    PlatformRoleSummaryDto,
    PlatformUserListDto,
    SanitizedUserWithOrgUnitsDto,
    UpdateOrgUnitActivationRequestDto,
    UpdateRoleActivationRequestDto,
    UpdateRoleRequestDto,
    UpdateOrgUnitRequestDto,
    UpdatePlatformUserActivationRequestDto
} from '@poms/api-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { getRequestId, type RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
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

    @Get('permissions')
    @HasPermissions('platform:roles:manage')
    @ApiOperation({ summary: '获取权限字典（只读）' })
    @ApiOkResponse({ type: PlatformPermissionListDto })
    listPermissions(): PlatformPermissionList {
        return this.platformService.listPermissions();
    }

    @Get('roles/:id')
    @HasPermissions('platform:roles:manage')
    @ApiOperation({ summary: '获取平台角色详情' })
    @ApiOkResponse({ type: PlatformRoleDetailDto })
    getRole(@Param('id') id: string): Promise<PlatformRoleDetail> {
        return this.platformService.getRole(id);
    }

    @Post('roles')
    @HasPermissions('platform:roles:manage')
    @ApiOperation({ summary: '创建平台角色' })
    @ApiOkResponse({ type: PlatformRoleSummaryDto })
    createRole(@Body() body: CreateRoleRequestDto, @Request() req: { user: UserPayload }): Promise<PlatformRoleSummary> {
        return this.platformService.createRole(body, req.user.sub);
    }

    @Patch('roles/:id')
    @HasPermissions('platform:roles:manage')
    @ApiOperation({ summary: '更新平台角色基本信息' })
    @ApiOkResponse({ type: PlatformRoleSummaryDto })
    updateRole(@Param('id') id: string, @Body() body: UpdateRoleRequestDto, @Request() req: { user: UserPayload }): Promise<PlatformRoleSummary> {
        return this.platformService.updateRole(id, body, req.user.sub);
    }

    @Post('roles/:id/activate')
    @HasPermissions('platform:roles:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '启用平台角色' })
    @ApiOkResponse({ type: PlatformRoleSummaryDto })
    activateRole(
        @Param('id') id: string,
        @Body() body: UpdateRoleActivationRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<PlatformRoleSummary> {
        return this.platformService.activateRole(id, body as UpdateRoleActivationRequest, req.user.sub);
    }

    @Post('roles/:id/deactivate')
    @HasPermissions('platform:roles:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '停用平台角色' })
    @ApiOkResponse({ type: PlatformRoleSummaryDto })
    deactivateRole(
        @Param('id') id: string,
        @Body() body: UpdateRoleActivationRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<PlatformRoleSummary> {
        return this.platformService.deactivateRole(id, body as UpdateRoleActivationRequest, req.user.sub);
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

    @Get('org-units/tree')
    @HasPermissions('platform:org-units:manage')
    @ApiOperation({ summary: '获取平台组织树' })
    @ApiOkResponse({ type: PlatformOrgUnitTreeDto })
    async listOrgUnitTree(): Promise<PlatformOrgUnitTree> {
        return this.platformService.listOrgUnitTree();
    }

    @Get('org-units/:id')
    @HasPermissions('platform:org-units:manage')
    @ApiOperation({ summary: '获取组织单元详情' })
    @ApiOkResponse({ type: PlatformOrgUnitDetailDto })
    getOrgUnit(@Param('id') id: string): Promise<PlatformOrgUnitDetail> {
        return this.platformService.getOrgUnit(id);
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

    @Post('org-units/:id/activate')
    @HasPermissions('platform:org-units:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '启用组织单元' })
    @ApiOkResponse({ type: PlatformOrgUnitSummaryDto })
    activateOrgUnit(
        @Param('id') id: string,
        @Body() body: UpdateOrgUnitActivationRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<PlatformOrgUnitSummary> {
        return this.platformService.activateOrgUnit(id, body as UpdateOrgUnitActivationRequest, req.user.sub);
    }

    @Post('org-units/:id/deactivate')
    @HasPermissions('platform:org-units:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '停用组织单元' })
    @ApiOkResponse({ type: PlatformOrgUnitSummaryDto })
    deactivateOrgUnit(
        @Param('id') id: string,
        @Body() body: UpdateOrgUnitActivationRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<PlatformOrgUnitSummary> {
        return this.platformService.deactivateOrgUnit(id, body as UpdateOrgUnitActivationRequest, req.user.sub);
    }

    @Post('org-units/:id/move')
    @HasPermissions('platform:org-units:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '移动组织单元并调整排序' })
    @ApiOkResponse({ type: PlatformOrgUnitSummaryDto })
    moveOrgUnit(@Param('id') id: string, @Body() body: MoveOrgUnitRequestDto, @Request() req: { user: UserPayload }): Promise<PlatformOrgUnitSummary> {
        return this.platformService.moveOrgUnit(id, body as MoveOrgUnitRequest, req.user.sub);
    }

    @Get('navigation')
    @HasPermissions('platform:navigation:manage')
    @ApiOperation({ summary: '获取完整导航树（平台管理员只读视图）' })
    @ApiOkResponse({ type: NavigationListDto })
    getAllNavigationItems(): NavigationItem[] {
        return this.navigationService.getAllNavigationItems();
    }

    @Post('navigation/sync')
    @HasPermissions('platform:navigation:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '记录当前导航 SSOT 的同步审计快照' })
    @ApiOkResponse({ type: NavigationSyncSummaryDto })
    syncNavigation(@Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<NavigationSyncSummary> {
        return this.platformService.syncNavigationAudit(req.user.sub, getRequestId(req));
    }
}
