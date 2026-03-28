import { NavigationService } from './navigation.service';

describe('NavigationService', () => {
    let service: NavigationService;

    const collectKeys = (items: ReturnType<NavigationService['getNavigationForUser']>): string[] =>
        items.flatMap((item) => [item.key, ...(item.children ? collectKeys(item.children) : [])]);

    beforeEach(() => {
        service = new NavigationService();
    });

    it('returns only items whose requiredPermissions are satisfied', () => {
        const result = service.getNavigationForUser(['nav:dashboard:view', 'nav:projects:view']);

        const keys = collectKeys(result);
        expect(result.map((item) => item.key)).toEqual(['overview', 'business']);
        expect(keys).toContain('dashboard');
        expect(keys).toContain('projects');
        expect(keys).not.toContain('contracts');
    });

    it('hides platform group when no child permissions are satisfied', () => {
        const result = service.getNavigationForUser(['nav:dashboard:view']);

        const keys = result.map((item) => item.key);
        expect(keys).not.toContain('platform');
    });

    it('shows platform group when at least one child permission is satisfied', () => {
        const result = service.getNavigationForUser(['platform:users:manage']);

        const platform = result.find((item) => item.key === 'platform');
        expect(platform).toBeDefined();
        expect(platform?.children?.some((c) => c.key === 'platform.users')).toBe(true);
    });

    it('filters out children whose permissions are not satisfied within a visible group', () => {
        const result = service.getNavigationForUser(['platform:users:manage']);

        const platform = result.find((item) => item.key === 'platform');
        expect(platform?.children?.some((c) => c.key === 'platform.roles')).toBe(false);
        expect(platform?.children?.some((c) => c.key === 'platform.org-units')).toBe(false);
    });

    it('returns empty array when user has no permissions', () => {
        const result = service.getNavigationForUser([]);

        expect(result).toHaveLength(0);
    });

    it('returns full visible tree for platform admin with all permissions', () => {
        const result = service.getNavigationForUser([
            'nav:dashboard:view',
            'nav:projects:view',
            'nav:contracts:view',
            'nav:profile:view',
            'platform:users:manage',
            'platform:roles:manage',
            'platform:org-units:manage',
            'platform:navigation:manage'
        ]);

        const keys = collectKeys(result);
        expect(result.map((item) => item.key)).toEqual(['overview', 'business', 'platform', 'account']);
        expect(keys).toContain('dashboard');
        expect(keys).toContain('projects');
        expect(keys).toContain('contracts');
        expect(keys).toContain('platform');
        expect(keys).toContain('my_profile');
    });

    it('sorts result items by displayOrder', () => {
        const result = service.getNavigationForUser([
            'nav:dashboard:view',
            'nav:projects:view',
            'nav:contracts:view',
            'nav:profile:view'
        ]);

        const orders = result.map((item) => item.displayOrder);
        expect(orders).toEqual([...orders].sort((a, b) => a - b));
    });
});
