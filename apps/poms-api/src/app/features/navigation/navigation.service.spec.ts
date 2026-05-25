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
        expect(keys).not.toContain('attachments');
        expect(keys).not.toContain('leads');
        expect(keys).not.toContain('contracts');
    });

    it('shows lead menu when lead navigation permission is satisfied', () => {
        const result = service.getNavigationForUser(['nav:leads:view']);

        const keys = collectKeys(result);
        expect(result.map((item) => item.key)).toEqual(['business']);
        expect(keys).toContain('leads');
        expect(keys).not.toContain('projects');
    });

    it('shows attachment center menu when attachment navigation permission is satisfied', () => {
        const result = service.getNavigationForUser(['nav:attachments:view']);

        const keys = collectKeys(result);
        expect(result.map((item) => item.key)).toEqual(['business']);
        expect(keys).toContain('attachments');
        expect(keys).not.toContain('projects');
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

    it('shows platform dictionary menu when dictionary manage permission is satisfied', () => {
        const result = service.getNavigationForUser(['platform:dictionaries:manage']);

        const platform = result.find((item) => item.key === 'platform');
        expect(platform).toBeDefined();
        expect(platform?.children?.some((c) => c.key === 'platform.dictionaries')).toBe(true);
    });

    it('shows platform identity provider menu when identity provider manage permission is satisfied', () => {
        const result = service.getNavigationForUser(['platform:identity-providers:manage']);

        const platform = result.find((item) => item.key === 'platform');
        expect(platform).toBeDefined();
        expect(platform?.children?.some((c) => c.key === 'platform.identity-providers')).toBe(true);
    });

    it('shows platform attachment storage provider menu when attachment storage provider manage permission is satisfied', () => {
        const result = service.getNavigationForUser(['platform:attachment-storage-providers:manage']);

        const platform = result.find((item) => item.key === 'platform');
        expect(platform).toBeDefined();
        expect(platform?.children?.some((c) => c.key === 'platform.attachment-storage-providers')).toBe(true);
    });

    it('shows platform system settings menu when system settings manage permission is satisfied', () => {
        const result = service.getNavigationForUser(['platform:system-settings:manage']);

        const platform = result.find((item) => item.key === 'platform');
        expect(platform).toBeDefined();
        expect(platform?.children?.some((c) => c.key === 'platform.system-settings')).toBe(true);
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
            'nav:leads:view',
            'nav:attachments:view',
            'nav:projects:view',
            'nav:contracts:view',
            'nav:profile:view',
            'platform:users:manage',
            'platform:roles:manage',
            'platform:org-units:manage',
            'platform:dictionaries:manage',
            'platform:identity-providers:manage',
            'platform:attachment-storage-providers:manage',
            'platform:system-settings:manage',
            'platform:navigation:manage'
        ]);

        const keys = collectKeys(result);
        expect(result.map((item) => item.key)).toEqual(['overview', 'business', 'platform', 'account']);
        expect(keys).toContain('dashboard');
        expect(keys).toContain('leads');
        expect(keys).toContain('attachments');
        expect(keys).toContain('projects');
        expect(keys).toContain('contracts');
        expect(keys).toContain('platform');
        expect(keys).toContain('platform.dictionaries');
        expect(keys).toContain('platform.identity-providers');
        expect(keys).toContain('platform.attachment-storage-providers');
        expect(keys).toContain('platform.system-settings');
        expect(keys).toContain('my_profile');
    });

    it('sorts result items by displayOrder', () => {
        const result = service.getNavigationForUser([
            'nav:dashboard:view',
            'nav:leads:view',
            'nav:attachments:view',
            'nav:projects:view',
            'nav:contracts:view',
            'nav:profile:view'
        ]);

        const orders = result.map((item) => item.displayOrder);
        expect(orders).toEqual([...orders].sort((a, b) => a - b));
    });

    describe('getNavigationAuditSnapshot', () => {
        it('returns a valid snapshot structure with a 64-char SHA256 checksum', () => {
            const snapshot = service.getNavigationAuditSnapshot();

            expect(snapshot.targetId).toBe('platform-navigation');
            expect(typeof snapshot.treeChecksum).toBe('string');
            expect(snapshot.treeChecksum).toHaveLength(64);
            expect(snapshot.nodeCount).toBeGreaterThan(0);
            expect(snapshot.routeCount).toBeGreaterThan(0);
            expect(Array.isArray(snapshot.navigationKeys)).toBe(true);
            expect(Array.isArray(snapshot.routeLinks)).toBe(true);
            expect(snapshot.navigationKeys.length).toBe(snapshot.nodeCount);
        });

        it('is deterministic: two calls on the same tree return the same checksum', () => {
            const a = service.getNavigationAuditSnapshot();
            const b = service.getNavigationAuditSnapshot();
            expect(a.treeChecksum).toBe(b.treeChecksum);
        });

        it('includes all leaf route links from the tree', () => {
            const snapshot = service.getNavigationAuditSnapshot();
            expect(snapshot.routeLinks).toContain('/dashboard');
            expect(snapshot.routeLinks).toContain('/leads');
            expect(snapshot.routeLinks).toContain('/attachments');
            expect(snapshot.routeLinks).toContain('/projects');
            expect(snapshot.routeLinks).toContain('/platform/users');
            expect(snapshot.routeLinks).toContain('/platform/dictionaries');
            expect(snapshot.routeLinks).toContain('/platform/identity-providers');
            expect(snapshot.routeLinks).toContain('/platform/attachment-storage-providers');
            expect(snapshot.routeLinks).toContain('/platform/system-settings');
        });
    });
});
