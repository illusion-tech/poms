import { TestBed } from '@angular/core/testing';
import { ApprovalApi, AuthApi, AuthStore, IdentityProvider, NavigationApi, type CurrentAuthSessionView, type EnabledLoginProviderSummary, type SanitizedUserWithOrgUnits } from '@poms/admin-data-access';
import { PomsCsrfTokenStore } from '@poms/admin-data-access/lib/poms-api/poms-csrf-token.store';
import { of } from 'rxjs';

function createUser(overrides: Partial<SanitizedUserWithOrgUnits> = {}): SanitizedUserWithOrgUnits {
    return {
        id: 'user-1',
        displayName: '测试用户',
        username: 'viewer',
        roles: ['项目查看人'],
        permissions: ['nav:dashboard:view', 'nav:projects:view', 'nav:contracts:view', 'nav:profile:view'],
        email: 'viewer@example.com',
        avatarUrl: null,
        isActive: true,
        lastLoginAt: '2026-04-21T09:00:00.000Z',
        emailVerified: true,
        phoneVerified: true,
        phone: '13800000000',
        orgUnits: [],
        ...overrides
    };
}

function createSession(user: SanitizedUserWithOrgUnits): CurrentAuthSessionView {
    return {
        authenticated: true,
        status: 'active',
        user,
        permissions: user.permissions as CurrentAuthSessionView['permissions'],
        expiresAt: '2026-05-07T08:30:00.000Z',
        csrf: {
            cookieName: 'poms_csrf',
            headerName: 'X-CSRF-Token'
        }
    };
}

describe('AuthStore', () => {
    let store: AuthStore;
    let authApiMock: {
        authControllerCreatePasswordAuthSession: jest.Mock;
        authControllerListEnabledLoginProviders: jest.Mock;
        authControllerAuthorizeExternalLogin: jest.Mock;
        authControllerHandleExternalLoginCallback: jest.Mock;
        authControllerCreateExternalLoginSession: jest.Mock;
        authControllerGetCurrentAuthSession: jest.Mock;
        authControllerGetCsrfToken: jest.Mock;
        authControllerLogoutCurrentAuthSession: jest.Mock;
        authControllerGetProfile: jest.Mock;
        authControllerUpdateProfile: jest.Mock;
    };
    let navigationApiMock: {
        navigationControllerGetNavigation: jest.Mock;
    };
    let approvalApiMock: {
        approvalControllerGetMyTodos: jest.Mock;
    };
    let csrfTokenStore: PomsCsrfTokenStore;

    beforeEach(() => {
        authApiMock = {
            authControllerCreatePasswordAuthSession: jest.fn(),
            authControllerListEnabledLoginProviders: jest.fn(),
            authControllerAuthorizeExternalLogin: jest.fn(),
            authControllerHandleExternalLoginCallback: jest.fn(),
            authControllerCreateExternalLoginSession: jest.fn(),
            authControllerGetCurrentAuthSession: jest.fn(),
            authControllerGetCsrfToken: jest.fn().mockReturnValue(of({ token: 'csrf-token', cookieName: 'poms_csrf', headerName: 'X-CSRF-Token', expiresAt: '2026-05-07T08:30:00.000Z' })),
            authControllerLogoutCurrentAuthSession: jest.fn(),
            authControllerGetProfile: jest.fn(),
            authControllerUpdateProfile: jest.fn()
        };
        navigationApiMock = {
            navigationControllerGetNavigation: jest.fn()
        };
        approvalApiMock = {
            approvalControllerGetMyTodos: jest.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                AuthStore,
                {
                    provide: AuthApi,
                    useValue: authApiMock
                },
                {
                    provide: NavigationApi,
                    useValue: navigationApiMock
                },
                {
                    provide: ApprovalApi,
                    useValue: approvalApiMock
                }
            ]
        });

        store = TestBed.inject(AuthStore);
        csrfTokenStore = TestBed.inject(PomsCsrfTokenStore);
    });

    it('creates password sessions through Cookie credentials and refreshes CSRF token', async () => {
        const user = createUser();
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
        authApiMock.authControllerCreatePasswordAuthSession.mockReturnValue(of(createSession(user)));
        navigationApiMock.navigationControllerGetNavigation.mockReturnValue(of([]));
        approvalApiMock.approvalControllerGetMyTodos.mockReturnValue(of([]));

        await expect(store.login('viewer', 'secret')).resolves.toBeUndefined();

        expect(authApiMock.authControllerGetCsrfToken).toHaveBeenCalledTimes(2);
        expect(authApiMock.authControllerCreatePasswordAuthSession).toHaveBeenCalledWith({
            createPasswordAuthSessionRequest: {
                username: 'viewer',
                password: 'secret'
            }
        });
        expect(store.currentUser()).toEqual(user);
        expect(csrfTokenStore.token).toBe('csrf-token');
        expect(localStorage.getItem('poms_access_token')).toBeNull();
        expect(setItemSpy).not.toHaveBeenCalledWith('poms_access_token', expect.anything());

        setItemSpy.mockRestore();
    });

    it('initializes from the current auth session without falling back to profile token reads', async () => {
        const user = createUser();
        authApiMock.authControllerGetCurrentAuthSession.mockReturnValue(of(createSession(user)));
        navigationApiMock.navigationControllerGetNavigation.mockReturnValue(of([]));
        approvalApiMock.approvalControllerGetMyTodos.mockReturnValue(of([]));

        await expect(store.initialize()).resolves.toBeUndefined();

        expect(authApiMock.authControllerGetCurrentAuthSession).toHaveBeenCalledWith();
        expect(authApiMock.authControllerGetCsrfToken).toHaveBeenCalledTimes(1);
        expect(authApiMock.authControllerGetProfile).not.toHaveBeenCalled();
        expect(store.currentUser()).toEqual(user);
        expect(csrfTokenStore.token).toBe('csrf-token');
    });

    it('clears local session state when the current auth session is anonymous', async () => {
        const user = createUser();
        csrfTokenStore.setToken('stale-csrf-token');
        store.currentUser.set(user);
        store.navigationTree.set([
            {
                id: 'nav-dashboard',
                key: 'dashboard',
                type: 'basic',
                title: '工作台',
                icon: 'pi pi-home',
                link: '/dashboard',
                order: 1,
                isHidden: false,
                isDisabled: false,
                disabledReason: null,
                children: []
            }
        ]);
        store.myTodos.set([
            {
                id: 'todo-1',
                type: 'approval',
                status: 'open',
                priority: 'normal',
                title: '待处理审批',
                targetTitle: '合同审批',
                targetRoute: '/contracts/1',
                dueAt: null,
                createdAt: '2026-05-07T08:30:00.000Z'
            }
        ]);
        authApiMock.authControllerGetCurrentAuthSession.mockReturnValue(
            of({
                authenticated: false,
                status: null,
                user: null,
                permissions: [],
                expiresAt: null,
                csrf: {
                    cookieName: 'poms_csrf',
                    headerName: 'X-CSRF-Token'
                }
            } satisfies CurrentAuthSessionView)
        );

        await expect(store.initialize()).resolves.toBeUndefined();

        expect(authApiMock.authControllerGetCsrfToken).not.toHaveBeenCalled();
        expect(csrfTokenStore.token).toBeNull();
        expect(store.currentUser()).toBeNull();
        expect(store.navigationTree()).toEqual([]);
        expect(store.myTodos()).toEqual([]);
    });

    it('updates currentUser from profile self-service response', async () => {
        const updatedUser = createUser({
            displayName: '已更新姓名',
            email: null,
            phone: '13900001111',
            emailVerified: false,
            phoneVerified: false
        });

        store.currentUser.set(createUser());
        authApiMock.authControllerUpdateProfile.mockReturnValue(of(updatedUser));

        await expect(
            store.updateCurrentUserProfile({
                displayName: '已更新姓名',
                email: null,
                phone: '13900001111'
            })
        ).resolves.toEqual(updatedUser);

        expect(authApiMock.authControllerUpdateProfile).toHaveBeenCalledWith({
            updateCurrentUserProfileRequest: {
                displayName: '已更新姓名',
                email: null,
                phone: '13900001111'
            }
        });
        expect(authApiMock.authControllerGetCsrfToken).toHaveBeenCalledTimes(1);
        expect(store.currentUser()).toEqual(updatedUser);
    });

    it('loads enabled external login providers through the generated auth client', async () => {
        const providers: EnabledLoginProviderSummary[] = [
            {
                id: 'identity-provider-1',
                provider: IdentityProvider.Feishu,
                tenantId: null,
                displayName: '飞书生产租户',
                loginScopes: ['contact:user.base:readonly']
            }
        ];
        authApiMock.authControllerListEnabledLoginProviders.mockReturnValue(of(providers));

        await expect(store.loadEnabledLoginProviders()).resolves.toEqual(providers);

        expect(authApiMock.authControllerListEnabledLoginProviders).toHaveBeenCalledWith();
    });

    it('starts external login authorization for the selected provider config', async () => {
        authApiMock.authControllerAuthorizeExternalLogin.mockReturnValue(
            of({
                authorizeUrl: 'https://accounts.feishu.cn/oauth',
                stateExpiresAt: '2026-05-07T08:30:00.000Z'
            })
        );

        await expect(store.authorizeExternalLogin('identity-provider-1')).resolves.toEqual({
            authorizeUrl: 'https://accounts.feishu.cn/oauth',
            stateExpiresAt: '2026-05-07T08:30:00.000Z'
        });

        expect(authApiMock.authControllerAuthorizeExternalLogin).toHaveBeenCalledWith({ id: 'identity-provider-1' });
    });

    it('exchanges external callback ticket for a POMS session and loads user data', async () => {
        const user = createUser();
        authApiMock.authControllerHandleExternalLoginCallback.mockReturnValue(
            of({
                ticket: 'external-login-ticket-value-1234567890',
                expiresAt: '2026-05-07T08:30:00.000Z',
                provider: IdentityProvider.Feishu,
                identityProviderConfigId: 'identity-provider-1',
                pomsUserId: user.id
            })
        );
        authApiMock.authControllerCreateExternalLoginSession.mockReturnValue(of(createSession(user)));
        navigationApiMock.navigationControllerGetNavigation.mockReturnValue(of([]));
        approvalApiMock.approvalControllerGetMyTodos.mockReturnValue(of([]));

        await expect(
            store.completeExternalLoginCallback({
                state: 'callback-state',
                code: 'auth-code',
                error: undefined,
                errorDescription: undefined
            })
        ).resolves.toMatchObject({ ticket: 'external-login-ticket-value-1234567890' });

        expect(authApiMock.authControllerHandleExternalLoginCallback).toHaveBeenCalledWith({
            state: 'callback-state',
            code: 'auth-code',
            error: undefined,
            errorDescription: undefined
        });
        expect(authApiMock.authControllerCreateExternalLoginSession).toHaveBeenCalledWith({
            createExternalLoginSessionRequest: {
                ticket: 'external-login-ticket-value-1234567890'
            }
        });
        expect(authApiMock.authControllerGetCsrfToken).toHaveBeenCalled();
        expect(store.currentUser()).toEqual(user);
    });

    it('revokes the current Cookie session and clears local aggregate state on logout', () => {
        const user = createUser();
        csrfTokenStore.setToken('session-csrf-token');
        store.currentUser.set(user);
        store.navigationTree.set([
            {
                id: 'nav-dashboard',
                key: 'dashboard',
                type: 'basic',
                title: '工作台',
                icon: 'pi pi-home',
                link: '/dashboard',
                order: 1,
                isHidden: false,
                isDisabled: false,
                disabledReason: null,
                children: []
            }
        ]);
        store.myTodos.set([
            {
                id: 'todo-1',
                type: 'approval',
                status: 'open',
                priority: 'normal',
                title: '待处理审批',
                targetTitle: '合同审批',
                targetRoute: '/contracts/1',
                dueAt: null,
                createdAt: '2026-05-07T08:30:00.000Z'
            }
        ]);
        authApiMock.authControllerLogoutCurrentAuthSession.mockReturnValue(of({ success: true }));

        store.logout();

        expect(authApiMock.authControllerLogoutCurrentAuthSession).toHaveBeenCalledWith({ body: {} });
        expect(csrfTokenStore.token).toBeNull();
        expect(store.currentUser()).toBeNull();
        expect(store.navigationTree()).toEqual([]);
        expect(store.myTodos()).toEqual([]);
    });

    it('rejects profile self-service update when the user is not authenticated', async () => {
        await expect(
            store.updateCurrentUserProfile({
                displayName: '未登录用户'
            })
        ).rejects.toThrow('Current user is not authenticated.');

        expect(authApiMock.authControllerUpdateProfile).not.toHaveBeenCalled();
    });
});
