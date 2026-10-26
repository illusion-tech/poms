import type { Route, Routes } from '@angular/router';
import type { AppMenuItemModel } from './app.menuitem';

function matchingRouteChain(routes: Routes, segments: readonly string[]): Route[] | null {
    for (const route of routes) {
        // A fallback entry must resolve to a real local route. Redirects,
        // custom matchers and wildcard/not-found routes grant no visibility.
        if (route.redirectTo !== undefined || route.matcher || route.path === undefined || route.path === '**') continue;
        const parts = route.path.split('/').filter(Boolean);
        if (parts.length > segments.length || parts.some((part, index) => part.startsWith(':') || part !== segments[index])) continue;
        const remainder = segments.slice(parts.length);
        if (remainder.length === 0 && (route.component || route.loadComponent)) return [route];
        if (route.children) {
            const child = matchingRouteChain(route.children, remainder);
            if (child) return [route, ...child];
        }
    }
    return null;
}

function routeAllows(item: AppMenuItemModel, routes: Routes, permissions: readonly string[]): boolean {
    const link = item.routerLink;
    if (!link || link.length !== 1 || !link[0].startsWith('/') || link[0].startsWith('//') || /[?#\\]/.test(link[0])) return false;
    const chain = matchingRouteChain(routes, link[0].split('/').filter(Boolean));
    if (!chain) return false;
    return chain.every((route) => {
        const required: unknown = route.data?.['requiredPermissions'];
        if (required === undefined) return true;
        if (!Array.isArray(required) || required.some((permission) => typeof permission !== 'string')) return false;
        if (required.length === 0) return true;
        return route.data?.['requiredPermissionsMode'] === 'all' ? required.every((permission: string) => permissions.includes(permission)) : required.some((permission: string) => permissions.includes(permission));
    });
}

/** Only the failure/empty-navigation fallback uses this filter. Router.config
 * remains the permission authority; this module contains no permission table.
 * null denotes anonymous, while [] is an authenticated user without grants. */
export function filterFallbackMenu(items: readonly AppMenuItemModel[], routes: Routes, permissions: readonly string[] | null): AppMenuItemModel[] {
    if (permissions === null) return [];
    const result: AppMenuItemModel[] = [];
    for (const item of items) {
        if (item.separator) {
            if (result.length > 0 && !result[result.length - 1].separator) result.push({ ...item });
            continue;
        }
        if (item.items) {
            const children = filterFallbackMenu(item.items, routes, permissions);
            if (children.length > 0) result.push({ ...item, items: children });
        } else if (routeAllows(item, routes, permissions)) {
            result.push({ ...item });
        }
    }
    if (result[result.length - 1]?.separator) result.pop();
    return result;
}
