import { NavigationService } from '../navigation/navigation.service';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

describe('PlatformController', () => {
    let controller: PlatformController;
    let service: jest.Mocked<PlatformService>;
    let navigationService: jest.Mocked<NavigationService>;

    beforeEach(() => {
        service = {
            listUsers: jest.fn(),
            getSanitizedUserProfile: jest.fn(),
            listRoles: jest.fn(),
            listOrgUnits: jest.fn(),
            createUser: jest.fn(),
            activateUser: jest.fn(),
            deactivateUser: jest.fn(),
            assignUserRoles: jest.fn(),
            assignUserOrgMemberships: jest.fn(),
            createRole: jest.fn(),
            assignRolePermissions: jest.fn(),
            createOrgUnit: jest.fn(),
            updateOrgUnit: jest.fn()
        } as unknown as jest.Mocked<PlatformService>;

        navigationService = {
            getNavigationForUser: jest.fn(),
            getAllNavigationItems: jest.fn()
        } as unknown as jest.Mocked<NavigationService>;

        controller = new PlatformController(service, navigationService);
    });

    it('returns platform users from service', async () => {
        service.listUsers.mockResolvedValue([
            {
                id: '00000000-0000-0000-0000-000000000001',
                username: 'admin',
                displayName: '超级管理员',
                email: null,
                phone: null,
                isActive: true,
                primaryOrgUnitId: '10000000-0000-4000-8000-000000000001',
                primaryOrgUnitName: '销售管理中心',
                roleNames: ['平台管理员'],
                createdAt: '2026-03-25T10:00:00.000Z',
                updatedAt: '2026-03-25T10:00:00.000Z'
            }
        ]);

        const result = await controller.listUsers();

        expect(service.listUsers).toHaveBeenCalled();
        expect(result).toHaveLength(1);
    });

    it('returns platform roles from service', async () => {
        service.listRoles.mockResolvedValue([{ id: '30000000-0000-4000-8000-000000000001', roleKey: 'platform-admin', name: '平台管理员' } as never]);

        const result = await controller.listRoles();

        expect(service.listRoles).toHaveBeenCalled();
        expect(result).toHaveLength(1);
    });

    it('returns org units from service', async () => {
        service.listOrgUnits.mockResolvedValue([{ id: '10000000-0000-4000-8000-000000000001', name: '销售管理中心', code: 'SALES-HQ' } as never]);

        const result = await controller.listOrgUnits();

        expect(service.listOrgUnits).toHaveBeenCalled();
        expect(result).toHaveLength(1);
    });

    it('delegates createUser to service with request body', async () => {
        const body = { username: 'newuser', displayName: '新用户', email: null, phone: null, primaryOrgUnitId: null, initialRoleIds: [] };
        const created = { id: '00000000-0000-0000-0000-000000000002', username: 'newuser' };
        service.createUser.mockResolvedValue(created as never);

        const result = await controller.createUser(body as never);

        expect(service.createUser).toHaveBeenCalledWith(body);
        expect(result).toBe(created);
    });

    it('delegates activateUser to service with id and body', async () => {
        const user = { id: '00000000-0000-0000-0000-000000000001', isActive: true };
        service.activateUser.mockResolvedValue(user as never);

        const result = await controller.activateUser('00000000-0000-0000-0000-000000000001', {} as never);

        expect(service.activateUser).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', {});
        expect(result).toBe(user);
    });

    it('delegates deactivateUser to service with id and body', async () => {
        const user = { id: '00000000-0000-0000-0000-000000000001', isActive: false };
        service.deactivateUser.mockResolvedValue(user as never);

        const result = await controller.deactivateUser('00000000-0000-0000-0000-000000000001', {} as never);

        expect(service.deactivateUser).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', {});
        expect(result).toBe(user);
    });

    it('delegates assignUserRoles to service with id and body', async () => {
        const body = { roleIds: ['30000000-0000-4000-8000-000000000001'] };
        const profile = { id: '00000000-0000-0000-0000-000000000001', roles: ['平台管理员'] };
        service.assignUserRoles.mockResolvedValue(profile as never);

        const result = await controller.assignUserRoles('00000000-0000-0000-0000-000000000001', body as never);

        expect(service.assignUserRoles).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', body);
        expect(result).toBe(profile);
    });

    it('delegates assignUserOrgMemberships to service with id and body', async () => {
        const body = { primaryOrgUnitId: '10000000-0000-4000-8000-000000000001', secondaryOrgUnitIds: [] };
        const profile = { id: '00000000-0000-0000-0000-000000000001', orgUnits: [] };
        service.assignUserOrgMemberships.mockResolvedValue(profile as never);

        const result = await controller.assignUserOrgMemberships('00000000-0000-0000-0000-000000000001', body as never);

        expect(service.assignUserOrgMemberships).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', body);
        expect(result).toBe(profile);
    });

    it('delegates createRole to service with body', async () => {
        const body = { roleKey: 'sales-manager', name: '销售经理' };
        const created = { id: '30000000-0000-4000-8000-000000000002', roleKey: 'sales-manager' };
        service.createRole.mockResolvedValue(created as never);

        const result = await controller.createRole(body as never);

        expect(service.createRole).toHaveBeenCalledWith(body);
        expect(result).toBe(created);
    });

    it('delegates assignRolePermissions to service with id and body', async () => {
        const body = { permissionKeys: ['project:read'] };
        const role = { id: '30000000-0000-4000-8000-000000000001' };
        service.assignRolePermissions.mockResolvedValue(role as never);

        const result = await controller.assignRolePermissions('30000000-0000-4000-8000-000000000001', body as never);

        expect(service.assignRolePermissions).toHaveBeenCalledWith('30000000-0000-4000-8000-000000000001', body);
        expect(result).toBe(role);
    });

    it('delegates createOrgUnit to service with body', async () => {
        const body = { name: '华北销售部', code: 'SALES-NORTH' };
        const created = { id: '10000000-0000-4000-8000-000000000003', code: 'SALES-NORTH' };
        service.createOrgUnit.mockResolvedValue(created as never);

        const result = await controller.createOrgUnit(body as never);

        expect(service.createOrgUnit).toHaveBeenCalledWith(body);
        expect(result).toBe(created);
    });

    it('delegates updateOrgUnit to service with id and body', async () => {
        const body = { name: '销售总部' };
        const updated = { id: '10000000-0000-4000-8000-000000000001', name: '销售总部' };
        service.updateOrgUnit.mockResolvedValue(updated as never);

        const result = await controller.updateOrgUnit('10000000-0000-4000-8000-000000000001', body as never);

        expect(service.updateOrgUnit).toHaveBeenCalledWith('10000000-0000-4000-8000-000000000001', body);
        expect(result).toBe(updated);
    });

    it('returns full navigation tree from navigationService', () => {
        const fullTree = [{ id: 'nav-dashboard', key: 'dashboard' }];
        navigationService.getAllNavigationItems.mockReturnValue(fullTree as never);

        const result = controller.getAllNavigationItems();

        expect(navigationService.getAllNavigationItems).toHaveBeenCalled();
        expect(result).toBe(fullTree);
    });
});
