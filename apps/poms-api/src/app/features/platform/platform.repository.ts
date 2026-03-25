import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { OrgUnit } from './org-unit.entity';
import { PlatformRole } from './role.entity';
import { PlatformUser } from './platform-user.entity';
import { UserRoleAssignment } from './user-role-assignment.entity';
import { UserOrgMembership } from './user-org-membership.entity';
import { RolePermissionAssignment } from './role-permission-assignment.entity';

@Injectable()
export class PlatformRepository {
    constructor(
        @InjectRepository(PlatformUser)
        private readonly userRepository: EntityRepository<PlatformUser>,
        @InjectRepository(PlatformRole)
        private readonly roleRepository: EntityRepository<PlatformRole>,
        @InjectRepository(OrgUnit)
        private readonly orgUnitRepository: EntityRepository<OrgUnit>,
        @InjectRepository(UserRoleAssignment)
        private readonly userRoleAssignmentRepository: EntityRepository<UserRoleAssignment>,
        @InjectRepository(UserOrgMembership)
        private readonly userOrgMembershipRepository: EntityRepository<UserOrgMembership>,
        @InjectRepository(RolePermissionAssignment)
        private readonly rolePermissionAssignmentRepository: EntityRepository<RolePermissionAssignment>
    ) {}

    async findAllUsers(): Promise<PlatformUser[]> {
        return this.userRepository.findAll({
            orderBy: { createdAt: QueryOrder.DESC }
        });
    }

    async findUserById(id: string): Promise<PlatformUser | null> {
        return this.userRepository.findOne({ id });
    }

    async findUserByUsername(username: string): Promise<PlatformUser | null> {
        return this.userRepository.findOne({ username });
    }

    async findActiveUserByUsername(username: string): Promise<PlatformUser | null> {
        return this.userRepository.findOne({ username, isActive: true });
    }

    async findAllRoles(): Promise<PlatformRole[]> {
        return this.roleRepository.findAll({
            orderBy: { displayOrder: QueryOrder.ASC, createdAt: QueryOrder.ASC }
        });
    }

    async findRoleById(id: string): Promise<PlatformRole | null> {
        return this.roleRepository.findOne({ id });
    }

    async findRoleByKey(roleKey: string): Promise<PlatformRole | null> {
        return this.roleRepository.findOne({ roleKey });
    }

    createRole(input: ConstructorParameters<typeof PlatformRole>[0]): PlatformRole {
        return this.roleRepository.create(input);
    }

    createRolePermissionAssignment(input: ConstructorParameters<typeof RolePermissionAssignment>[0]): RolePermissionAssignment {
        return this.rolePermissionAssignmentRepository.create(input);
    }

    async deleteRolePermissionAssignments(roleId: string): Promise<void> {
        await this.rolePermissionAssignmentRepository.nativeDelete({ roleId });
    }

    async findAllOrgUnits(): Promise<OrgUnit[]> {
        return this.orgUnitRepository.findAll({
            orderBy: { displayOrder: QueryOrder.ASC, createdAt: QueryOrder.ASC }
        });
    }

    async findOrgUnitById(id: string): Promise<OrgUnit | null> {
        return this.orgUnitRepository.findOne({ id });
    }

    async findOrgUnitByCode(code: string): Promise<OrgUnit | null> {
        return this.orgUnitRepository.findOne({ code });
    }

    createOrgUnit(input: ConstructorParameters<typeof OrgUnit>[0]): OrgUnit {
        return this.orgUnitRepository.create(input);
    }

    async findActiveUserRoleAssignments(): Promise<UserRoleAssignment[]> {
        return this.userRoleAssignmentRepository.find({ status: 'active' });
    }

    async findActiveUserOrgMemberships(): Promise<UserOrgMembership[]> {
        return this.userOrgMembershipRepository.find({ status: 'active' });
    }

    async findActiveRolePermissionAssignments(): Promise<RolePermissionAssignment[]> {
        return this.rolePermissionAssignmentRepository.find({ status: 'active' });
    }

    createUser(input: ConstructorParameters<typeof PlatformUser>[0]): PlatformUser {
        return this.userRepository.create(input);
    }

    createUserRoleAssignment(input: ConstructorParameters<typeof UserRoleAssignment>[0]): UserRoleAssignment {
        return this.userRoleAssignmentRepository.create(input);
    }

    createUserOrgMembership(input: ConstructorParameters<typeof UserOrgMembership>[0]): UserOrgMembership {
        return this.userOrgMembershipRepository.create(input);
    }

    async saveAll(entities: object[]): Promise<void> {
        await this.userRepository.getEntityManager().persist(entities).flush();
    }

    async deleteUserRoleAssignments(userId: string): Promise<void> {
        await this.userRoleAssignmentRepository.nativeDelete({ userId });
    }

    async deleteUserOrgMemberships(userId: string): Promise<void> {
        await this.userOrgMembershipRepository.nativeDelete({ userId });
    }
}
