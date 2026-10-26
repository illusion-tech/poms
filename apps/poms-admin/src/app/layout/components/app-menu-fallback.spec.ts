import type { Routes } from '@angular/router';
import { PERMISSION_KEYS } from '@poms/shared-contracts';
import { appRoutes } from '../../../app.routes';
import { filterFallbackMenu } from './app-menu-fallback';
import type { AppMenuItemModel } from './app.menuitem';

const entries: AppMenuItemModel[] = [
    { separator: true },
    {
        label: 'home',
        items: [
            { label: 'dashboard', routerLink: ['/dashboard'] },
            { label: 'profile', routerLink: ['/profile'] }
        ]
    },
    { separator: true },
    {
        label: 'business',
        items: [
            { label: 'leads', routerLink: ['/leads'] },
            { label: 'projects', routerLink: ['/projects'] },
            { label: 'attachments', routerLink: ['/attachments'] }
        ]
    },
    { separator: true },
    {
        label: 'platform',
        items: [
            { label: 'users', routerLink: ['/platform/users'] },
            { label: 'sync', routerLink: ['/platform/external-org-sync'] }
        ]
    },
    { separator: true },
    { label: 'unknown', items: [{ label: 'unregistered', routerLink: ['/platform/not-a-route'] }] },
    { separator: true }
];

function leaves(items: readonly AppMenuItemModel[]): string[] {
    return items.flatMap((item) => (item.items ? leaves(item.items) : item.routerLink ? [item.routerLink[0]] : []));
}

describe('permission-safe static navigation fallback', () => {
    it('uses actual app route metadata for admin, viewer, no-grant and anonymous sessions', () => {
        expect(leaves(filterFallbackMenu(entries, appRoutes, PERMISSION_KEYS))).toEqual(['/dashboard', '/profile', '/leads', '/projects', '/attachments', '/platform/users', '/platform/external-org-sync']);
        expect(leaves(filterFallbackMenu(entries, appRoutes, ['project:read']))).toEqual(['/dashboard', '/profile', '/projects', '/attachments']);
        expect(leaves(filterFallbackMenu(entries, appRoutes, []))).toEqual(['/dashboard', '/profile']);
        expect(filterFallbackMenu(entries, appRoutes, null)).toEqual([]);
    });

    it('honors attachments any mode with each single grant from the actual route', () => {
        const entry = [{ routerLink: ['/attachments'] }];
        for (const permission of ['customer:read', 'lead:read', 'project:read']) expect(leaves(filterFallbackMenu(entry, appRoutes, [permission]))).toEqual(['/attachments']);
        expect(filterFallbackMenu(entry, appRoutes, [])).toEqual([]);
    });

    it('requires both existing external-org-sync all-mode grants', () => {
        const entry = [{ routerLink: ['/platform/external-org-sync'] }];
        for (const permission of ['platform:org-units:manage', 'platform:org-sync:manage']) expect(filterFallbackMenu(entry, appRoutes, [permission])).toEqual([]);
        expect(leaves(filterFallbackMenu(entry, appRoutes, ['platform:org-units:manage', 'platform:org-sync:manage']))).toEqual(['/platform/external-org-sync']);
    });

    it('removes empty groups and leading, adjacent and trailing separators without mutating the source', () => {
        const before = JSON.stringify(entries);
        const filtered = filterFallbackMenu(entries, appRoutes, []);
        expect(filtered.map((item) => item.label)).toEqual(['home']);
        expect(JSON.stringify(entries)).toBe(before);
        const viewer = filterFallbackMenu(entries, appRoutes, ['project:read']);
        expect(viewer.map((item) => item.label ?? '|')).toEqual(['home', '|', 'business']);
    });

    it('fails closed for unknown, redirect, parameter, non-local and malformed permission entries', () => {
        const routes: Routes = [
            { path: 'known', loadComponent: async () => (await import('../../features/auth/access')).Access },
            { path: 'redirect', redirectTo: 'known' },
            { path: ':id', loadComponent: async () => (await import('../../features/auth/access')).Access },
            { path: 'bad', loadComponent: async () => (await import('../../features/auth/access')).Access, data: { requiredPermissions: 'project:read' } }
        ];
        const items = ['/unknown', '/redirect', '/any-id', '/bad', '//outside', '/known?secret', '/known#fragment', '/known\\suffix'].map((path) => ({ routerLink: [path] }));
        expect(filterFallbackMenu(items, routes, PERMISSION_KEYS)).toEqual([]);
    });

    it('checks inherited permissions and accepts changes to the route authority without a second table', () => {
        const routes: Routes = [
            {
                path: 'parent',
                data: { requiredPermissions: ['parent'], requiredPermissionsMode: 'all' },
                children: [{ path: 'child', loadComponent: async () => (await import('../../features/auth/access')).Access, data: { requiredPermissions: ['child'] } }]
            }
        ];
        const entry = [{ routerLink: ['/parent/child'] }];
        expect(filterFallbackMenu(entry, routes, ['child'])).toEqual([]);
        expect(leaves(filterFallbackMenu(entry, routes, ['parent', 'child']))).toEqual(['/parent/child']);
        const child = routes[0].children?.[0];
        if (!child) throw new Error('Expected the controlled child route');
        child.data = { requiredPermissions: ['changed'] };
        expect(filterFallbackMenu(entry, routes, ['parent', 'child'])).toEqual([]);
    });
});
