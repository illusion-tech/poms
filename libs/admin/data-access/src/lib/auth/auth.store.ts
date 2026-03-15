import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import type { NavigationItem, SanitizedUserWithOrgUnits } from '@poms/shared-api-client';
import { AuthApi, NavigationApi } from '@poms/shared-api-client';

export interface MenuItem {
    label?: string;
    icon?: string;
    routerLink?: string[];
    url?: string;
    target?: string;
    items?: MenuItem[];
    separator?: boolean;
    disabled?: boolean;
}

const TOKEN_STORAGE_KEY = 'poms_access_token';

@Injectable({ providedIn: 'root' })
export class AuthStore {
    readonly #authApi = inject(AuthApi);
    readonly #navApi = inject(NavigationApi);

    readonly token = signal<string | null>(
        typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null,
    );
    readonly currentUser = signal<SanitizedUserWithOrgUnits | null>(null);
    readonly navigationTree = signal<NavigationItem[]>([]);

    readonly isAuthenticated = computed(() => this.token() !== null);
    readonly menuModel = computed(() => this.#toMenuModel(this.navigationTree(), true));

    async login(username: string, password: string): Promise<void> {
        const response = await firstValueFrom(
            this.#authApi.authControllerLogin({ loginRequest: { username, password } }),
        );
        const { accessToken } = response;
        localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
        this.token.set(accessToken);
        await this.#loadUserData();
    }

    logout(): void {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        this.token.set(null);
        this.currentUser.set(null);
        this.navigationTree.set([]);
    }

    async initialize(): Promise<void> {
        if (!this.token()) return;
        await this.#loadUserData();
    }

    async #loadUserData(): Promise<void> {
        const [user, nav] = await Promise.all([
            firstValueFrom(
                this.#authApi.authControllerGetProfile().pipe(catchError(() => of(null))),
            ),
            firstValueFrom(
                this.#navApi.navigationControllerGetNavigation().pipe(catchError(() => of([]))),
            ),
        ]);
        if (!user) {
            // Token 失效，清除本地状态
            this.logout();
            return;
        }
        this.currentUser.set(user);
        this.navigationTree.set(nav ?? []);
    }

    #toMenuModel(items: NavigationItem[], isRoot = false): MenuItem[] {
        const result: MenuItem[] = [];
        for (const item of items) {
            if (item.isHidden) continue;

            if (item.type === 'divider') {
                // 避免在已有 separator 后再次插入
                if (result.length > 0 && !result[result.length - 1].separator) {
                    result.push({ separator: true });
                }
                continue;
            }

            const menuItem: MenuItem = {
                label: item.title ?? undefined,
                icon: item.icon ?? undefined,
                disabled: item.isDisabled,
            };

            if (item.type === 'basic' && item.link) {
                menuItem.routerLink = [item.link];
            }

            if (item.children && item.children.length > 0) {
                menuItem.items = this.#toMenuModel(item.children);
            }

            // 根层级的 group/collapsable 之间若没有 divider，自动补分隔符
            if (isRoot && result.length > 0 && !result[result.length - 1].separator) {
                result.push({ separator: true });
            }

            result.push(menuItem);
        }
        return result;
    }
}
