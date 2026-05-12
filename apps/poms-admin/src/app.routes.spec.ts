import type { Route } from '@angular/router';
import { permissionGuard } from './app/core/auth/permission.guard';
import { appRoutes } from './app.routes';

function getAppRoute(path: string): Route {
    const rootRoute = appRoutes.find((route) => route.path === '');
    const route = rootRoute?.children?.find((child) => child.path === path);

    expect(route).toBeDefined();
    return route as Route;
}

function getChildRoute(parentPath: string, childPath: string): Route {
    const route = getAppRoute(parentPath).children?.find((child) => child.path === childPath);

    expect(route).toBeDefined();
    return route as Route;
}

function getAuthRoute(path: string): Route {
    const authRoute = appRoutes.find((route) => route.path === 'auth');
    const route = authRoute?.children?.find((child) => child.path === path);

    expect(route).toBeDefined();
    return route as Route;
}

function expectAllModePermissions(route: Route, requiredPermissions: string[]): void {
    expect(route.canActivate).toContain(permissionGuard);
    expect(route.data?.['requiredPermissions']).toEqual(requiredPermissions);
    expect(route.data?.['requiredPermissionsMode']).toBe('all');
}

describe('appRoutes project permissions', () => {
    it('guards lead list with lead read access', () => {
        expectAllModePermissions(getAppRoute('leads'), ['lead:read']);
    });

    it('guards project list, detail, workspace and commission shells with project read access', () => {
        expectAllModePermissions(getAppRoute('projects'), ['project:read']);
        expectAllModePermissions(getAppRoute('projects/:id'), ['project:read']);
        expectAllModePermissions(getAppRoute('projects/:id/workspace'), ['project:read']);
        expectAllModePermissions(getAppRoute('projects/:id/commission'), ['project:read']);
    });

    it('keeps finance workspace pages behind project read and contract finance access', () => {
        expectAllModePermissions(getChildRoute('projects/:id/workspace', 'pre-signing'), ['project:read']);
        expectAllModePermissions(getChildRoute('projects/:id/workspace', 'technical-cost'), ['project:read']);
        expectAllModePermissions(getChildRoute('projects/:id/workspace', 'bid-commercial'), ['project:read']);
        expectAllModePermissions(getChildRoute('projects/:id/workspace', 'pricing-margin'), ['project:read']);
        expectAllModePermissions(getChildRoute('projects/:id/workspace', 'contract-handover'), ['project:read']);
        expectAllModePermissions(getChildRoute('projects/:id/workspace', 'operating-overview'), ['project:read', 'contract:finance:manage']);
        expectAllModePermissions(getChildRoute('projects/:id/workspace', 'variance-risk'), ['project:read', 'contract:finance:manage']);
    });

    it('keeps commission pages behind their business permission combinations', () => {
        expectAllModePermissions(getChildRoute('projects/:id/commission', 'freeze-binding'), ['project:read', 'commission:assignments:manage']);
        expectAllModePermissions(getChildRoute('projects/:id/commission', 'gate-overview'), ['project:read', 'contract:finance:manage']);
        expectAllModePermissions(getChildRoute('projects/:id/commission', 'final-settlement'), ['project:read', 'commission:payouts:manage']);
        expectAllModePermissions(getChildRoute('projects/:id/commission', 'rule-explanation'), ['project:read', 'commission:payouts:manage']);
        expectAllModePermissions(getChildRoute('projects/:id/commission', 'operations'), [
            'project:read',
            'commission:rule-versions:manage',
            'commission:calculations:manage',
            'commission:payouts:manage',
            'commission:adjustments:manage'
        ]);
    });

    it('guards platform dictionary management with dictionary manage permission', () => {
        const route = getAppRoute('platform/dictionaries');

        expect(route.canActivate).toContain(permissionGuard);
        expect(route.data?.['breadcrumb']).toBe('业务字典');
        expect(route.data?.['requiredPermissions']).toEqual(['platform:dictionaries:manage']);
    });

    it('guards platform identity provider management with provider manage permission', () => {
        const route = getAppRoute('platform/identity-providers');

        expect(route.canActivate).toContain(permissionGuard);
        expect(route.data?.['breadcrumb']).toBe('外部身份提供商');
        expect(route.data?.['requiredPermissions']).toEqual(['platform:identity-providers:manage']);
    });

    it('guards platform attachment storage provider management with provider manage permission', () => {
        const route = getAppRoute('platform/attachment-storage-providers');

        expect(route.canActivate).toContain(permissionGuard);
        expect(route.data?.['breadcrumb']).toBe('附件存储提供商');
        expect(route.data?.['requiredPermissions']).toEqual(['platform:attachment-storage-providers:manage']);
    });

    it('exposes the public external identity provider callback route under auth layout', () => {
        const route = getAuthRoute('identity-providers:callback');

        expect(route.canActivate).toBeUndefined();
        expect(route.loadComponent).toBeDefined();
    });
});
