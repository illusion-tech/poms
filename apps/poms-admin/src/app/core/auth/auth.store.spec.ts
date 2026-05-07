import { TestBed } from '@angular/core/testing';
import { ApprovalApi, AuthApi, AuthStore, IdentityProvider, NavigationApi, type EnabledLoginProviderSummary, type SanitizedUserWithOrgUnits } from '@poms/admin-data-access';
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

describe('AuthStore', () => {
    let store: AuthStore;
    let authApiMock: {
        authControllerLogin: jest.Mock;
        authControllerListEnabledLoginProviders: jest.Mock;
        authControllerAuthorizeExternalLogin: jest.Mock;
        authControllerHandleExternalLoginCallback: jest.Mock;
        authControllerCreateExternalLoginSession: jest.Mock;
        authControllerGetProfile: jest.Mock;
        authControllerUpdateProfile: jest.Mock;
    };
    let navigationApiMock: {
        navigationControllerGetNavigation: jest.Mock;
    };
    let approvalApiMock: {
        approvalControllerGetMyTodos: jest.Mock;
    };

    beforeEach(() => {
        localStorage.clear();

        authApiMock = {
            authControllerLogin: jest.fn(),
            authControllerListEnabledLoginProviders: jest.fn(),
            authControllerAuthorizeExternalLogin: jest.fn(),
            authControllerHandleExternalLoginCallback: jest.fn(),
            authControllerCreateExternalLoginSession: jest.fn(),
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
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('updates currentUser from profile self-service response', async () => {
        const updatedUser = createUser({
            displayName: '已更新姓名',
            email: null,
            phone: '13900001111',
            emailVerified: false,
            phoneVerified: false
        });

        store.token.set('token');
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
        authApiMock.authControllerCreateExternalLoginSession.mockReturnValue(of({ accessToken: 'external-jwt' }));
        authApiMock.authControllerGetProfile.mockReturnValue(of(user));
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
        expect(localStorage.getItem('poms_access_token')).toBe('external-jwt');
        expect(store.token()).toBe('external-jwt');
        expect(store.currentUser()).toEqual(user);
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
