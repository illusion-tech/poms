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
    readonly menuModel = computed(() => this.#toMenuModel(this.navigationTree()));

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

    #toMenuModel(items: NavigationItem[]): MenuItem[] {
        return items.map((item) => {
            if (item.type === 'divider') {
                return { separator: true };
            }
            const menuItem: MenuItem = {
                label: item.title ?? undefined,
                icon: item.icon ?? undefined,
                disabled: item.isDisabled,
            };
            if (item.link) {
                menuItem.routerLink = [item.link];
            }
            if (item.children && item.children.length > 0) {
                menuItem.items = this.#toMenuModel(item.children);
            }
            return menuItem;
        });
    }
}
