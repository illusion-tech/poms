import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access';
import { LayoutService } from '../service/layout.service';
import { AppTopbar } from './app.topbar';

describe('AppTopbar', () => {
    let fixture: ComponentFixture<AppTopbar>;
    let authStoreMock: {
        currentUser: ReturnType<typeof signal>;
        myTodos: ReturnType<typeof signal>;
        openTodosCount: ReturnType<typeof signal>;
        logout: jest.Mock;
    };

    beforeEach(async () => {
        authStoreMock = {
            currentUser: signal(null),
            myTodos: signal([]),
            openTodosCount: signal(0),
            logout: jest.fn()
        };

        await TestBed.configureTestingModule({
            imports: [AppTopbar],
            providers: [
                provideRouter([]),
                {
                    provide: AuthStore,
                    useValue: authStoreMock
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AppTopbar);
        fixture.detectChanges();
    });

    it('hides demo-only config and right menu actions from the business topbar', () => {
        const topbar = fixture.nativeElement as HTMLElement;

        expect(topbar.querySelector('.app-config-button')).toBeNull();
        expect(topbar.querySelector('.pi-cog')).toBeNull();
        expect(topbar.querySelector('.pi-align-right')).toBeNull();
        expect(topbar.querySelector('.pi-search')).not.toBeNull();
        expect(topbar.querySelector('.pi-bell')).not.toBeNull();
    });

    it('keeps the sidebar toggle and search action wired to layout state', () => {
        const topbar = fixture.nativeElement as HTMLElement;
        const layoutService = TestBed.inject(LayoutService);

        (topbar.querySelector('.menu-button') as HTMLElement).click();
        expect(layoutService.layoutState().staticMenuInactive).toBe(true);

        (topbar.querySelector('.pi-search')?.closest('a') as HTMLElement).click();
        expect(layoutService.layoutState().searchBarActive).toBe(true);
    });
});
