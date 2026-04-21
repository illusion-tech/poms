import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Access } from './access';

describe('Access', () => {
    let fixture: ComponentFixture<Access>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Access]
        }).compileComponents();

        fixture = TestBed.createComponent(Access);
        fixture.detectChanges();
    });

    it('uses business Chinese for the permission denied page', () => {
        const text = fixture.nativeElement.textContent;

        expect(text).toContain('无权访问');
        expect(text).toContain('当前账号不能打开这个页面。请返回工作台，或联系管理员调整权限。');
        expect(text).toContain('返回工作台');
        expect(text).not.toContain('Access Denied');
        expect(text).not.toContain('permissions');
        expect(text).not.toContain('Dashboard');
    });
});

