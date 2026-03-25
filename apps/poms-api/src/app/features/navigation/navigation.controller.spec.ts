import type { NavigationItem } from '@poms/shared-contracts';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';

describe('NavigationController', () => {
    let controller: NavigationController;
    let service: jest.Mocked<NavigationService>;

    beforeEach(() => {
        service = {
            getNavigationForUser: jest.fn()
        } as unknown as jest.Mocked<NavigationService>;

        controller = new NavigationController(service);
    });

    it('returns navigation tree filtered by user permissions', () => {
        const mockTree: NavigationItem[] = [
            {
                id: 'nav-dashboard',
                key: 'dashboard',
                type: 'basic',
                title: '工作台',
                subtitle: null,
                link: '/dashboard',
                icon: 'pi pi-home',
                displayOrder: 0,
                isHidden: false,
                isDisabled: false,
                requiredPermissions: ['nav:dashboard:view'],
                meta: null,
                children: null
            }
        ];
        service.getNavigationForUser.mockReturnValue(mockTree);

        const result = controller.getNavigation({
            user: { sub: '00000000-0000-0000-0000-000000000001', username: 'admin', permissions: ['nav:dashboard:view'] }
        });

        expect(service.getNavigationForUser).toHaveBeenCalledWith(['nav:dashboard:view']);
        expect(result).toBe(mockTree);
    });
});
