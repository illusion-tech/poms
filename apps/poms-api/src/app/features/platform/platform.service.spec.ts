jest.mock('@mikro-orm/core', () => ({
    QueryOrder: {
        ASC: 'ASC',
        DESC: 'DESC'
    }
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn()
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { PlatformService } from './platform.service';

const mockCompare = compare as jest.MockedFunction<typeof compare>;

describe('PlatformService', () => {
    let service: PlatformService;
    let repository: {
        findAllUsers: jest.Mock;
        findUserById: jest.Mock;
        findUserByUsername: jest.Mock;
        findActiveUserByUsername: jest.Mock;
        findAllRoles: jest.Mock;
        findAllOrgUnits: jest.Mock;
        findActiveUserRoleAssignments: jest.Mock;
        findActiveUserOrgMemberships: jest.Mock;
        findActiveRolePermissionAssignments: jest.Mock;
        createUser: jest.Mock;
        createUserRoleAssignment: jest.Mock;
        createUserOrgMembership: jest.Mock;
        saveAll: jest.Mock;
        deleteUserRoleAssignments: jest.Mock;
        deleteUserOrgMemberships: jest.Mock;
        findRoleById: jest.Mock;
        findRoleByKey: jest.Mock;
        createRole: jest.Mock;
        createRolePermissionAssignment: jest.Mock;
        deleteRolePermissionAssignments: jest.Mock;
        findOrgUnitById: jest.Mock;
        findOrgUnitByCode: jest.Mock;
        createOrgUnit: jest.Mock;
    };

    beforeEach(() => {
        repository = {
            findAllUsers: jest.fn(),
            findUserById: jest.fn(),
            findUserByUsername: jest.fn(),
            findActiveUserByUsername: jest.fn(),
            findAllRoles: jest.fn(),
            findAllOrgUnits: jest.fn(),
            findActiveUserRoleAssignments: jest.fn(),
            findActiveUserOrgMemberships: jest.fn(),
            findActiveRolePermissionAssignments: jest.fn(),
            createUser: jest.fn(),
            createUserRoleAssignment: jest.fn(),
            createUserOrgMembership: jest.fn(),
            saveAll: jest.fn().mockResolvedValue(undefined),
            deleteUserRoleAssignments: jest.fn().mockResolvedValue(undefined),
            deleteUserOrgMemberships: jest.fn().mockResolvedValue(undefined),
            findRoleById: jest.fn(),
            findRoleByKey: jest.fn(),
            createRole: jest.fn(),
            createRolePermissionAssignment: jest.fn(),
            deleteRolePermissionAssignments: jest.fn().mockResolvedValue(undefined),
            findOrgUnitById: jest.fn(),
            findOrgUnitByCode: jest.fn(),
            createOrgUnit: jest.fn()
        };

        service = new PlatformService(repository as never);
    });

    it('aggregates platform users with real role names and primary org names', async () => {
        repository.findAllUsers.mockResolvedValue([
            createUser({ id: '00000000-0000-0000-0000-000000000001', username: 'admin', displayName: '超级管理员', primaryOrgUnitId: '10000000-0000-4000-8000-000000000001' })
        ]);
        repository.findAllRoles.mockResolvedValue([
            createRole({ id: '30000000-0000-4000-8000-000000000001', name: '平台管理员' })
        ]);
        repository.findAllOrgUnits.mockResolvedValue([
            createOrgUnit({ id: '10000000-0000-4000-8000-000000000001', name: '销售管理中心', code: 'SALES-HQ' })
        ]);
        repository.findActiveUserRoleAssignments.mockResolvedValue([
            { userId: '00000000-0000-0000-0000-000000000001', roleId: '30000000-0000-4000-8000-000000000001' }
        ]);
        repository.findActiveUserOrgMemberships.mockResolvedValue([
            { userId: '00000000-0000-0000-0000-000000000001', orgUnitId: '10000000-0000-4000-8000-000000000001', membershipType: 'primary' }
        ]);

        const result = await service.listUsers();

        expect(result).toEqual([
            expect.objectContaining({
                username: 'admin',
                displayName: '超级管理员',
                primaryOrgUnitName: '销售管理中心',
                roleNames: ['平台管理员']
            })
        ]);
    });

    it('returns sanitized profile from real platform data when user exists', async () => {
        repository.findAllUsers.mockResolvedValue([]);
        repository.findAllRoles.mockResolvedValue([
            createRole({ id: '30000000-0000-4000-8000-000000000001', name: '平台管理员' })
        ]);
        repository.findAllOrgUnits.mockResolvedValue([
            createOrgUnit({ id: '10000000-0000-4000-8000-000000000001', name: '销售管理中心', code: 'SALES-HQ' })
        ]);
        repository.findActiveUserRoleAssignments.mockResolvedValue([
            { userId: '00000000-0000-0000-0000-000000000001', roleId: '30000000-0000-4000-8000-000000000001' }
        ]);
        repository.findActiveUserOrgMemberships.mockResolvedValue([
            { userId: '00000000-0000-0000-0000-000000000001', orgUnitId: '10000000-0000-4000-8000-000000000001', membershipType: 'primary' }
        ]);
        repository.findUserById.mockResolvedValue(
            createUser({ id: '00000000-0000-0000-0000-000000000001', username: 'admin', displayName: '超级管理员', primaryOrgUnitId: '10000000-0000-4000-8000-000000000001' })
        );

        const result = await service.getSanitizedUserProfile('00000000-0000-0000-0000-000000000001', {
            username: 'admin',
            permissions: ['platform:users:manage']
        });

        expect(result).toEqual(
            expect.objectContaining({
                username: 'admin',
                displayName: '超级管理员',
                roles: ['平台管理员'],
                orgUnits: [
                    expect.objectContaining({
                        name: '销售管理中心',
                        code: 'SALES-HQ'
                    })
                ]
            })
        );
    });

    it('returns null when real platform user does not exist', async () => {
        repository.findAllUsers.mockResolvedValue([]);
        repository.findAllRoles.mockResolvedValue([]);
        repository.findAllOrgUnits.mockResolvedValue([]);
        repository.findActiveUserRoleAssignments.mockResolvedValue([]);
        repository.findActiveUserOrgMemberships.mockResolvedValue([]);
        repository.findUserById.mockResolvedValue(null);

        await expect(
            service.getSanitizedUserProfile('00000000-0000-0000-0000-000000000099', {
                username: 'ghost',
                permissions: []
            })
        ).resolves.toBeNull();
    });

    describe('createUser', () => {
        it('creates user with role assignments and primary org membership', async () => {
            repository.findUserByUsername.mockResolvedValue(null);
            const createdUser = createUser({ id: '00000000-0000-0000-0000-000000000002', username: 'newuser', displayName: '新用户' });
            repository.createUser.mockReturnValue(createdUser);
            repository.createUserRoleAssignment.mockReturnValue({});
            repository.createUserOrgMembership.mockReturnValue({});

            const result = await service.createUser({
                username: 'newuser',
                displayName: '新用户',
                email: null,
                phone: null,
                primaryOrgUnitId: '10000000-0000-4000-8000-000000000001',
                initialRoleIds: ['30000000-0000-4000-8000-000000000001']
            });

            expect(repository.findUserByUsername).toHaveBeenCalledWith('newuser');
            expect(repository.createUserOrgMembership).toHaveBeenCalledWith(
                expect.objectContaining({ orgUnitId: '10000000-0000-4000-8000-000000000001', membershipType: 'primary' })
            );
            expect(repository.createUserRoleAssignment).toHaveBeenCalledWith(
                expect.objectContaining({ roleId: '30000000-0000-4000-8000-000000000001' })
            );
            expect(repository.saveAll).toHaveBeenCalled();
            expect(result).toBe(createdUser);
        });

        it('throws ConflictException when username already exists', async () => {
            repository.findUserByUsername.mockResolvedValue(createUser({ username: 'admin' }));

            await expect(
                service.createUser({
                    username: 'admin',
                    displayName: '管理员',
                    email: null,
                    phone: null,
                    primaryOrgUnitId: null,
                    initialRoleIds: []
                })
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('activateUser', () => {
        it('sets user isActive to true and saves', async () => {
            const user = createUser({ id: '00000000-0000-0000-0000-000000000001', isActive: false });
            repository.findUserById.mockResolvedValue(user);

            const result = await service.activateUser('00000000-0000-0000-0000-000000000001', {});

            expect(result.isActive).toBe(true);
            expect(repository.saveAll).toHaveBeenCalledWith([user]);
        });

        it('throws NotFoundException when user does not exist', async () => {
            repository.findUserById.mockResolvedValue(null);

            await expect(
                service.activateUser('00000000-0000-0000-0000-000000000099', {})
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('deactivateUser', () => {
        it('sets user isActive to false and saves', async () => {
            const user = createUser({ id: '00000000-0000-0000-0000-000000000001', isActive: true });
            repository.findUserById.mockResolvedValue(user);

            const result = await service.deactivateUser('00000000-0000-0000-0000-000000000001', {});

            expect(result.isActive).toBe(false);
            expect(repository.saveAll).toHaveBeenCalledWith([user]);
        });

        it('throws NotFoundException when user does not exist', async () => {
            repository.findUserById.mockResolvedValue(null);

            await expect(
                service.deactivateUser('00000000-0000-0000-0000-000000000099', {})
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('assignUserRoles', () => {
        it('deletes existing assignments and saves new role assignments', async () => {
            const user = createUser({ id: '00000000-0000-0000-0000-000000000001' });
            repository.findUserById.mockResolvedValue(user);
            repository.createUserRoleAssignment.mockReturnValue({});
            repository.findAllUsers.mockResolvedValue([]);
            repository.findAllRoles.mockResolvedValue([]);
            repository.findAllOrgUnits.mockResolvedValue([]);
            repository.findActiveUserRoleAssignments.mockResolvedValue([]);
            repository.findActiveUserOrgMemberships.mockResolvedValue([]);

            await service.assignUserRoles('00000000-0000-0000-0000-000000000001', {
                roleIds: ['30000000-0000-4000-8000-000000000001']
            });

            expect(repository.deleteUserRoleAssignments).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001');
            expect(repository.createUserRoleAssignment).toHaveBeenCalledWith(
                expect.objectContaining({ userId: '00000000-0000-0000-0000-000000000001', roleId: '30000000-0000-4000-8000-000000000001' })
            );
            expect(repository.saveAll).toHaveBeenCalled();
        });

        it('throws NotFoundException when user does not exist', async () => {
            repository.findUserById.mockResolvedValue(null);

            await expect(
                service.assignUserRoles('00000000-0000-0000-0000-000000000099', { roleIds: [] })
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('assignUserOrgMemberships', () => {
        it('deletes existing memberships and saves primary and secondary memberships', async () => {
            const user = createUser({ id: '00000000-0000-0000-0000-000000000001' });
            repository.findUserById.mockResolvedValue(user);
            repository.createUserOrgMembership.mockReturnValue({});
            repository.findAllUsers.mockResolvedValue([]);
            repository.findAllRoles.mockResolvedValue([]);
            repository.findAllOrgUnits.mockResolvedValue([]);
            repository.findActiveUserRoleAssignments.mockResolvedValue([]);
            repository.findActiveUserOrgMemberships.mockResolvedValue([]);

            await service.assignUserOrgMemberships('00000000-0000-0000-0000-000000000001', {
                primaryOrgUnitId: '10000000-0000-4000-8000-000000000001',
                secondaryOrgUnitIds: ['10000000-0000-4000-8000-000000000002']
            });

            expect(repository.deleteUserOrgMemberships).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001');
            expect(repository.createUserOrgMembership).toHaveBeenCalledTimes(2);
            expect(repository.createUserOrgMembership).toHaveBeenCalledWith(
                expect.objectContaining({ orgUnitId: '10000000-0000-4000-8000-000000000001', membershipType: 'primary' })
            );
            expect(repository.createUserOrgMembership).toHaveBeenCalledWith(
                expect.objectContaining({ orgUnitId: '10000000-0000-4000-8000-000000000002', membershipType: 'secondary' })
            );
            expect(repository.saveAll).toHaveBeenCalled();
        });

        it('throws NotFoundException when user does not exist', async () => {
            repository.findUserById.mockResolvedValue(null);

            await expect(
                service.assignUserOrgMemberships('00000000-0000-0000-0000-000000000099', {
                    primaryOrgUnitId: '10000000-0000-4000-8000-000000000001',
                    secondaryOrgUnitIds: []
                })
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('verifyCredentials', () => {
        it('returns userId, username and permissions when credentials are valid', async () => {
            const user = createUser({ id: '00000000-0000-0000-0000-000000000001', username: 'admin', passwordHash: '$2b$10$hash', isActive: true });
            repository.findActiveUserByUsername.mockResolvedValue(user);
            mockCompare.mockResolvedValue(true as never);
            repository.findActiveUserRoleAssignments.mockResolvedValue([
                { userId: '00000000-0000-0000-0000-000000000001', roleId: '30000000-0000-4000-8000-000000000001' }
            ]);
            repository.findActiveRolePermissionAssignments.mockResolvedValue([
                { roleId: '30000000-0000-4000-8000-000000000001', permissionKey: 'project:read' },
                { roleId: '30000000-0000-4000-8000-000000000001', permissionKey: 'project:write' }
            ]);

            const result = await service.verifyCredentials('admin', 'admin123');

            expect(result).toEqual({
                userId: '00000000-0000-0000-0000-000000000001',
                username: 'admin',
                permissions: ['project:read', 'project:write']
            });
        });

        it('returns null when user is not found', async () => {
            repository.findActiveUserByUsername.mockResolvedValue(null);

            const result = await service.verifyCredentials('unknown', 'password');

            expect(result).toBeNull();
        });

        it('returns null when user has no passwordHash', async () => {
            const user = createUser({ username: 'admin', passwordHash: null });
            repository.findActiveUserByUsername.mockResolvedValue(user);

            const result = await service.verifyCredentials('admin', 'admin123');

            expect(result).toBeNull();
        });

        it('returns null when password does not match', async () => {
            const user = createUser({ username: 'admin', passwordHash: '$2b$10$hash' });
            repository.findActiveUserByUsername.mockResolvedValue(user);
            mockCompare.mockResolvedValue(false as never);

            const result = await service.verifyCredentials('admin', 'wrongpassword');

            expect(result).toBeNull();
        });
    });

    describe('getPermissionsForUser', () => {
        it('returns deduplicated permissions from all assigned roles', async () => {
            repository.findActiveUserRoleAssignments.mockResolvedValue([
                { userId: '00000000-0000-0000-0000-000000000001', roleId: '30000000-0000-4000-8000-000000000001' },
                { userId: '00000000-0000-0000-0000-000000000001', roleId: '30000000-0000-4000-8000-000000000002' }
            ]);
            repository.findActiveRolePermissionAssignments.mockResolvedValue([
                { roleId: '30000000-0000-4000-8000-000000000001', permissionKey: 'project:read' },
                { roleId: '30000000-0000-4000-8000-000000000001', permissionKey: 'project:write' },
                { roleId: '30000000-0000-4000-8000-000000000002', permissionKey: 'project:read' }
            ]);

            const result = await service.getPermissionsForUser('00000000-0000-0000-0000-000000000001');

            expect(result).toEqual(expect.arrayContaining(['project:read', 'project:write']));
            expect(result).toHaveLength(2); // deduplicated
        });

        it('returns empty array when user has no role assignments', async () => {
            repository.findActiveUserRoleAssignments.mockResolvedValue([]);

            const result = await service.getPermissionsForUser('00000000-0000-0000-0000-000000000001');

            expect(result).toEqual([]);
        });
    });

    describe('createRole', () => {
        it('creates role when roleKey does not exist', async () => {
            repository.findRoleByKey.mockResolvedValue(null);
            const created = createRole({ id: '30000000-0000-4000-8000-000000000002', roleKey: 'sales-manager', name: '销售经理' });
            repository.createRole.mockReturnValue(created);

            const result = await service.createRole({ roleKey: 'sales-manager', name: '销售经理' });

            expect(repository.findRoleByKey).toHaveBeenCalledWith('sales-manager');
            expect(repository.saveAll).toHaveBeenCalled();
            expect(result).toBe(created);
        });

        it('throws ConflictException when roleKey already exists', async () => {
            repository.findRoleByKey.mockResolvedValue(createRole({ roleKey: 'platform-admin' }));

            await expect(
                service.createRole({ roleKey: 'platform-admin', name: '平台管理员' })
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('assignRolePermissions', () => {
        it('replaces role permission assignments', async () => {
            const role = createRole({ id: '30000000-0000-4000-8000-000000000001' });
            repository.findRoleById.mockResolvedValue(role);
            repository.createRolePermissionAssignment.mockReturnValue({});

            await service.assignRolePermissions('30000000-0000-4000-8000-000000000001', {
                permissionKeys: ['project:read', 'project:write']
            });

            expect(repository.deleteRolePermissionAssignments).toHaveBeenCalledWith('30000000-0000-4000-8000-000000000001');
            expect(repository.createRolePermissionAssignment).toHaveBeenCalledTimes(2);
            expect(repository.saveAll).toHaveBeenCalled();
        });

        it('throws NotFoundException when role does not exist', async () => {
            repository.findRoleById.mockResolvedValue(null);

            await expect(
                service.assignRolePermissions('30000000-0000-4000-8000-000000000099', { permissionKeys: [] })
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('createOrgUnit', () => {
        it('creates org unit when code does not exist', async () => {
            repository.findOrgUnitByCode.mockResolvedValue(null);
            const created = createOrgUnit({ id: '10000000-0000-4000-8000-000000000003', name: '华北销售部', code: 'SALES-NORTH' });
            repository.createOrgUnit.mockReturnValue(created);

            const result = await service.createOrgUnit({ name: '华北销售部', code: 'SALES-NORTH' });

            expect(repository.findOrgUnitByCode).toHaveBeenCalledWith('SALES-NORTH');
            expect(repository.saveAll).toHaveBeenCalled();
            expect(result).toBe(created);
        });

        it('throws ConflictException when code already exists', async () => {
            repository.findOrgUnitByCode.mockResolvedValue(createOrgUnit({ code: 'SALES-HQ' }));

            await expect(
                service.createOrgUnit({ name: '重复销售中心', code: 'SALES-HQ' })
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('updateOrgUnit', () => {
        it('updates org unit fields and saves', async () => {
            const orgUnit = createOrgUnit({ id: '10000000-0000-4000-8000-000000000001', name: '销售管理中心', displayOrder: 0 });
            repository.findOrgUnitById.mockResolvedValue(orgUnit);

            const result = await service.updateOrgUnit('10000000-0000-4000-8000-000000000001', {
                name: '销售总部',
                displayOrder: 1
            });

            expect(result.name).toBe('销售总部');
            expect(result.displayOrder).toBe(1);
            expect(repository.saveAll).toHaveBeenCalledWith([orgUnit]);
        });

        it('throws NotFoundException when org unit does not exist', async () => {
            repository.findOrgUnitById.mockResolvedValue(null);

            await expect(
                service.updateOrgUnit('10000000-0000-4000-8000-000000000099', { name: '不存在' })
            ).rejects.toThrow(NotFoundException);
        });
    });
});

function createUser(overrides: Record<string, unknown> = {}) {
    return {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'admin',
        displayName: '超级管理员',
        email: null,
        phone: null,
        avatarUrl: null,
        isActive: true,
        primaryOrgUnitId: null,
        lastLoginAt: null,
        createdAt: new Date('2026-03-25T10:00:00.000Z'),
        updatedAt: new Date('2026-03-25T10:00:00.000Z'),
        ...overrides
    };
}

function createRole(overrides: Record<string, unknown> = {}) {
    return {
        id: '30000000-0000-4000-8000-000000000001',
        roleKey: 'platform-admin',
        name: '平台管理员',
        createdAt: new Date('2026-03-25T10:00:00.000Z'),
        ...overrides
    };
}

function createOrgUnit(overrides: Record<string, unknown> = {}) {
    return {
        id: '10000000-0000-4000-8000-000000000001',
        name: '销售管理中心',
        code: 'SALES-HQ',
        description: '默认组织',
        createdAt: new Date('2026-03-25T10:00:00.000Z'),
        ...overrides
    };
}