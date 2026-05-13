import { computed, inject, Injectable, signal } from '@angular/core';
import type { PermissionKey } from '@poms/shared-contracts';
import type {
    CurrentAuthSessionView,
    EnabledLoginProviderSummary,
    ExternalLoginAuthorizeResult,
    ExternalLoginCallbackResult,
    NavigationItem,
    SanitizedUserWithOrgUnits,
    TodoItemSummary,
    UpdateCurrentUserProfileRequest
} from '@poms/shared-api-client';
import { ApprovalApi, AuthApi, NavigationApi, NavigationItemType, TodoStatus } from '@poms/shared-api-client';
import { catchError, firstValueFrom, of } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class AuthStore {
    readonly #authApi = inject(AuthApi);
    readonly #navApi = inject(NavigationApi);
    readonly #approvalApi = inject(ApprovalApi);

    readonly currentUser = signal<SanitizedUserWithOrgUnits | null>(null);
    readonly navigationTree = signal<NavigationItem[]>([]);
    readonly myTodos = signal<TodoItemSummary[]>([]);

    readonly isAuthenticated = computed(() => this.currentUser() !== null);
    readonly menuModel = computed(() => this.#toMenuModel(this.navigationTree(), true));
    readonly openTodosCount = computed(() => this.myTodos().filter((t) => t.status === TodoStatus.Open).length);

    hasAnyPermission(requiredPermissions: readonly PermissionKey[]): boolean {
        const currentPermissions = (this.currentUser()?.permissions ?? []) as string[];
        return requiredPermissions.some((permission) => currentPermissions.includes(permission));
    }

    async login(username: string, password: string): Promise<void> {
        const response = await firstValueFrom(this.#authApi.authControllerCreatePasswordAuthSession({ createPasswordAuthSessionRequest: { username, password } }));
        await this.#acceptAuthSession(response);
    }

    async loadEnabledLoginProviders(): Promise<EnabledLoginProviderSummary[]> {
        return (await firstValueFrom(this.#authApi.authControllerListEnabledLoginProviders())) ?? [];
    }

    async authorizeExternalLogin(identityProviderConfigId: string): Promise<ExternalLoginAuthorizeResult> {
        return firstValueFrom(this.#authApi.authControllerAuthorizeExternalLogin({ id: identityProviderConfigId }));
    }

    async completeExternalLoginCallback(input: { state: string; code?: string; error?: string; errorDescription?: string }): Promise<ExternalLoginCallbackResult> {
        const callbackResult = await firstValueFrom(
            this.#authApi.authControllerHandleExternalLoginCallback({
                state: input.state,
                code: input.code,
                error: input.error,
                errorDescription: input.errorDescription
            })
        );
        const session = await firstValueFrom(
            this.#authApi.authControllerCreateExternalLoginSession({
                createExternalLoginSessionRequest: {
                    ticket: callbackResult.ticket
                }
            })
        );
        await this.#acceptAuthSession(session);
        return callbackResult;
    }

    logout(): void {
        if (this.isAuthenticated()) {
            void firstValueFrom(this.#authApi.authControllerLogoutCurrentAuthSession({ body: {} })).catch(() => undefined);
        }
        this.#clearSessionState();
    }

    #clearSessionState(): void {
        this.currentUser.set(null);
        this.navigationTree.set([]);
        this.myTodos.set([]);
    }

    async initialize(): Promise<void> {
        const session = await firstValueFrom(
            this.#authApi.authControllerGetCurrentAuthSession().pipe(
                catchError(() =>
                    of({
                        authenticated: false,
                        status: null,
                        user: null,
                        permissions: [],
                        expiresAt: null,
                        csrf: { cookieName: 'poms_csrf', headerName: 'X-CSRF-Token' }
                    } satisfies CurrentAuthSessionView)
                )
            )
        );
        await this.#acceptAuthSession(session);
    }

    async refreshTodos(): Promise<void> {
        if (!this.isAuthenticated()) {
            this.myTodos.set([]);
            return;
        }

        const todos = await firstValueFrom(this.#approvalApi.approvalControllerGetMyTodos().pipe(catchError(() => of([]))));
        this.myTodos.set(todos ?? []);
    }

    async updateCurrentUserProfile(request: UpdateCurrentUserProfileRequest): Promise<SanitizedUserWithOrgUnits> {
        if (!this.isAuthenticated()) {
            throw new Error('Current user is not authenticated.');
        }

        const user = await firstValueFrom(
            this.#authApi.authControllerUpdateProfile({
                updateCurrentUserProfileRequest: request
            })
        );
        this.currentUser.set(user);
        return user;
    }

    async #loadUserData(sessionUser?: SanitizedUserWithOrgUnits): Promise<void> {
        const [user, nav, todos] = await Promise.all([
            sessionUser ? Promise.resolve(sessionUser) : firstValueFrom(this.#authApi.authControllerGetProfile().pipe(catchError(() => of(null)))),
            firstValueFrom(this.#navApi.navigationControllerGetNavigation().pipe(catchError(() => of([])))),
            firstValueFrom(this.#approvalApi.approvalControllerGetMyTodos().pipe(catchError(() => of([]))))
        ]);
        if (!user) {
            this.#clearSessionState();
            return;
        }
        this.currentUser.set(user);
        this.navigationTree.set(nav ?? []);
        this.myTodos.set(todos ?? []);
    }

    async #acceptAuthSession(session: CurrentAuthSessionView): Promise<void> {
        if (!session.authenticated || !session.user) {
            this.#clearSessionState();
            return;
        }
        await this.#loadUserData(session.user);
    }

    #toMenuModel(items: NavigationItem[], isRoot = false): MenuItem[] {
        const result: MenuItem[] = [];
        for (const item of items) {
            if (item.isHidden) continue;

            if (item.type === NavigationItemType.Divider) {
                // 避免在已有 separator 后再次插入
                if (result.length > 0 && !result[result.length - 1].separator) {
                    result.push({ separator: true });
                }
                continue;
            }

            const menuItem: MenuItem = {
                label: item.title ?? undefined,
                icon: item.icon ?? undefined,
                disabled: item.isDisabled
            };

            if (item.type === NavigationItemType.Basic && item.link) {
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
