import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PlatformController } from './platform.controller';
import { OrgUnit } from './org-unit.entity';
import { PlatformRole } from './role.entity';
import { PlatformUser } from './platform-user.entity';
import { PlatformRepository } from './platform.repository';
import { PlatformService } from './platform.service';
import { UserRoleAssignment } from './user-role-assignment.entity';
import { UserOrgMembership } from './user-org-membership.entity';
import { RolePermissionAssignment } from './role-permission-assignment.entity';

@Module({
    imports: [MikroOrmModule.forFeature([OrgUnit, PlatformRole, PlatformUser, UserRoleAssignment, UserOrgMembership, RolePermissionAssignment])],
    controllers: [PlatformController],
    providers: [PlatformRepository, PlatformService],
    exports: [MikroOrmModule, PlatformService]
})
export class PlatformModule {}
