import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStore, type SanitizedUserWithOrgUnits } from '@poms/admin-data-access';
import { CurrentUserProfile } from './current-user-profile';

function createUser(overrides: Partial<SanitizedUserWithOrgUnits> = {}): SanitizedUserWithOrgUnits {
    return {
        id: 'user-1',
        displayName: '张三',
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

describe('CurrentUserProfile', () => {
    let fixture: ComponentFixture<CurrentUserProfile>;
    let component: CurrentUserProfile;
    let currentUser: ReturnType<typeof signal<SanitizedUserWithOrgUnits | null>>;
    let authStoreMock: {
        currentUser: typeof currentUser;
        updateCurrentUserProfile: jest.Mock;
    };
    let routerMock: {
        navigate: jest.Mock;
    };

    beforeEach(async () => {
        currentUser = signal<SanitizedUserWithOrgUnits | null>(createUser());
        authStoreMock = {
            currentUser,
            updateCurrentUserProfile: jest.fn()
        };
        routerMock = {
            navigate: jest.fn()
        };

        await TestBed.configureTestingModule({
            imports: [CurrentUserProfile],
            providers: [
                {
                    provide: AuthStore,
                    useValue: authStoreMock
                },
                {
                    provide: Router,
                    useValue: routerMock
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CurrentUserProfile);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('normalizes blank contact fields to null before saving', async () => {
        const updated = createUser({
            displayName: '李四',
            email: null,
            phone: null
        });
        authStoreMock.updateCurrentUserProfile.mockImplementation(async (request) => {
            currentUser.set({
                ...updated,
                displayName: request.displayName ?? updated.displayName,
                email: request.email ?? null,
                phone: request.phone ?? null
            });
            const nextUser = currentUser();
            if (!nextUser) {
                throw new Error('expected current user after profile update');
            }
            return nextUser;
        });

        component.openEditDialog();
        component.editForm.displayName = '  李四  ';
        component.editForm.email = '   ';
        component.editForm.phone = ' ';

        await component.saveProfile();
        fixture.detectChanges();

        expect(authStoreMock.updateCurrentUserProfile).toHaveBeenCalledWith({
            displayName: '李四',
            email: null,
            phone: null
        });
        expect(component.editDialogVisible).toBe(false);
        expect(fixture.nativeElement.textContent).toContain('李四');
    });

    it('blocks submit when email format is invalid', async () => {
        component.openEditDialog();
        component.editForm.displayName = '有效姓名';
        component.editForm.email = 'invalid-email';

        await component.saveProfile();
        fixture.detectChanges();

        expect(authStoreMock.updateCurrentUserProfile).not.toHaveBeenCalled();
        expect(component.formErrors.email).toBe('请输入有效的邮箱地址。');
        expect(component.editDialogVisible).toBe(true);
    });
});
