import { Component, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlatformStore, type PlatformUserDetail, type PlatformUserSummary } from '@poms/admin-data-access';
import { UserExternalIdentityPanel } from './user-external-identity-panel';
import { UserList } from './user-list';

@Component({
    selector: 'app-user-external-identity-panel',
    standalone: true,
    template: `<span class="external-identity-stub">{{ userId() }} / {{ userDisplayName() }}</span>`
})
class UserExternalIdentityPanelStub {
    readonly userId = input.required<string>();
    readonly userDisplayName = input.required<string>();
}

function createUserSummary(overrides: Partial<PlatformUserSummary> = {}): PlatformUserSummary {
    return {
        id: 'user-1',
        username: 'zhangsan',
        displayName: '张三',
        email: null,
        phone: null,
        isActive: true,
        primaryOrgUnitId: null,
        primaryOrgUnitName: null,
        roleNames: ['平台管理员'],
        createdAt: '2026-05-07T08:00:00.000Z',
        updatedAt: '2026-05-07T08:00:00.000Z',
        ...overrides
    };
}

function createUserDetail(overrides: Partial<PlatformUserDetail> = {}): PlatformUserDetail {
    return {
        ...createUserSummary(),
        avatarUrl: null,
        lastLoginAt: null,
        emailVerified: false,
        phoneVerified: false,
        orgUnits: [],
        ...overrides
    };
}

describe('UserList', () => {
    let fixture: ComponentFixture<UserList>;
    let component: UserList;
    let activeUserDetail: ReturnType<typeof signal<PlatformUserDetail | null>>;
    let platformStoreMock: {
        users: ReturnType<typeof signal<PlatformUserSummary[]>>;
        roles: ReturnType<typeof signal<[]>>;
        orgUnits: ReturnType<typeof signal<[]>>;
        loadingUsers: ReturnType<typeof signal<boolean>>;
        savingUser: ReturnType<typeof signal<boolean>>;
        activeUserDetail: typeof activeUserDetail;
        loadingUserDetail: ReturnType<typeof signal<boolean>>;
        savingUserDetail: ReturnType<typeof signal<boolean>>;
        loadUsers: jest.Mock;
        loadRoles: jest.Mock;
        loadOrgUnits: jest.Mock;
        loadUserDetail: jest.Mock;
        clearActiveUserDetail: jest.Mock;
    };

    beforeEach(async () => {
        activeUserDetail = signal<PlatformUserDetail | null>(null);
        platformStoreMock = {
            users: signal([createUserSummary()]),
            roles: signal([]),
            orgUnits: signal([]),
            loadingUsers: signal(false),
            savingUser: signal(false),
            activeUserDetail,
            loadingUserDetail: signal(false),
            savingUserDetail: signal(false),
            loadUsers: jest.fn().mockResolvedValue([]),
            loadRoles: jest.fn().mockResolvedValue([]),
            loadOrgUnits: jest.fn().mockResolvedValue([]),
            loadUserDetail: jest.fn().mockImplementation(async () => {
                const detail = createUserDetail();
                activeUserDetail.set(detail);
                return detail;
            }),
            clearActiveUserDetail: jest.fn(() => activeUserDetail.set(null))
        };

        await TestBed.configureTestingModule({
            imports: [UserList],
            providers: [{ provide: PlatformStore, useValue: platformStoreMock }]
        })
            .overrideComponent(UserList, {
                remove: { imports: [UserExternalIdentityPanel] },
                add: { imports: [UserExternalIdentityPanelStub] }
            })
            .compileComponents();

        fixture = TestBed.createComponent(UserList);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('passes the active user identity into the external identity panel', async () => {
        await component.openUserDetailDialog('user-1');
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;

        expect(platformStoreMock.loadUserDetail).toHaveBeenCalledWith('user-1');
        expect(text).toContain('user-1 / 张三');
    });
});
