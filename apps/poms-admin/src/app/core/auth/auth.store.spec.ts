import { TestBed } from '@angular/core/testing';
import { ApprovalApi, AuthApi, AuthStore, NavigationApi, type SanitizedUserWithOrgUnits } from '@poms/admin-data-access';
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

    it('rejects profile self-service update when the user is not authenticated', async () => {
        await expect(
            store.updateCurrentUserProfile({
                displayName: '未登录用户'
            })
        ).rejects.toThrow('Current user is not authenticated.');

        expect(authApiMock.authControllerUpdateProfile).not.toHaveBeenCalled();
    });
});
