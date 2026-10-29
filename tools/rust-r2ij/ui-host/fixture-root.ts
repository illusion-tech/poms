import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '@poms/shared-api-client/api/auth.service';
import type { CurrentAuthSessionView } from '@poms/shared-api-client/model/current-auth-session-view';
import type { AttachmentTargetType } from '@poms/admin-data-access';
import { PomsCsrfTokenStore } from '@poms/admin-data-access/lib/poms-api/poms-csrf-token.store';
import { AttachmentPanel } from '../../../apps/poms-admin/src/app/shared/ui/attachment-panel';
import { AttachmentCenter } from '../../../apps/poms-admin/src/app/features/attachment/attachment-center';
import { AttachmentStorageProviderList } from '../../../apps/poms-admin/src/app/features/platform/attachment-storage-provider-list';

@Component({
    selector: 'app-root',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, RouterOutlet, AttachmentPanel, AttachmentCenter, AttachmentStorageProviderList],
    styles: `
        :host { display: block; max-width: 1440px; margin: 0 auto; padding: 24px; }
        .fixture-heading, .fixture-nav, .fixture-login { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
        .fixture-login label { display: grid; gap: 6px; }
        .fixture-login input, .fixture-heading button, .fixture-nav button { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; }
        .fixture-nav button[aria-pressed='true'] { color: white; background: #1d4ed8; }
        .fixture-note { color: #64748b; margin-bottom: 16px; }
        .fixture-error { color: #b91c1c; margin: 12px 0; }
    `,
    template: `
        <header class="fixture-heading">
            <h1>POMS 原组件验收</h1><span data-testid="fixture-backend">{{ backend }}</span>
            @if (authenticated()) {
                <span data-testid="fixture-user">已登录：{{ current()?.user?.username }}</span>
                <button type="button" (click)="logout()" [disabled]="busy()">退出</button>
            }
        </header>
        <p class="fixture-note">此工具承载原组件与真实测试对象；客户、项目等业务页面由后续切片验收。</p>
        @if (error()) { <p class="fixture-error" role="alert">{{ error() }}</p> }
        @if (!authenticated()) {
            <form class="fixture-login" (ngSubmit)="login()">
                <label for="fixtureUsername">账号<input id="fixtureUsername" name="username" autocomplete="username" required [ngModel]="username()" (ngModelChange)="username.set($event)" /></label>
                <label for="fixturePassword">密码<input id="fixturePassword" name="password" type="password" autocomplete="current-password" required [ngModel]="password()" (ngModelChange)="password.set($event)" /></label>
                <button type="submit" [disabled]="busy()">{{ busy() ? '登录中' : '登录验收账号' }}</button>
            </form>
        } @else {
            <nav class="fixture-nav" aria-label="原组件">
                <button type="button" [attr.aria-pressed]="view() === 'providers'" (click)="show('providers')">存储配置</button>
                <button type="button" [attr.aria-pressed]="view() === 'panel'" (click)="show('panel')">附件面板</button>
                <button type="button" [attr.aria-pressed]="view() === 'center'" (click)="show('center')">附件中心</button>
            </nav>
            @switch (view()) {
                @case ('providers') { <app-attachment-storage-provider-list /> }
                @case ('panel') {
                    @if (targetId) { <app-attachment-panel [targetType]="targetType" [targetId]="targetId" [canWrite]="canWrite()" /> }
                    @else { <p role="status">请提供本轮测试对象。</p> }
                }
                @case ('center') { <app-attachment-center /> }
            }
            <router-outlet />
        }
    `
})
export class FixtureRoot implements OnInit {
    readonly #auth = inject(AuthApi);
    readonly #csrf = inject(PomsCsrfTokenStore);
    readonly #router = inject(Router);
    readonly backend = new URLSearchParams(globalThis.location.search).get('backend') ?? globalThis.sessionStorage.getItem('r2ijBackend') ?? '';
    readonly targetType = (new URLSearchParams(globalThis.location.search).get('targetType') ?? 'customer') as AttachmentTargetType;
    readonly targetId = new URLSearchParams(globalThis.location.search).get('targetId') ?? '';
    readonly username = signal('');
    readonly password = signal('');
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);
    readonly current = signal<CurrentAuthSessionView | null>(null);
    readonly authenticated = computed(() => this.current()?.authenticated === true && this.current()?.user !== null);
    readonly view = signal<'providers' | 'panel' | 'center'>('providers');
    readonly canWrite = computed(() => {
        const permissions: readonly string[] = this.current()?.permissions ?? [];
        const domain = this.targetType === 'customer' ? 'customer' : this.targetType === 'lead' ? 'lead' : 'project';
        return this.targetType === 'sales-follow-up'
            ? ['customer:write', 'lead:write', 'project:write'].some(key => permissions.includes(key))
            : permissions.includes(domain + ':write');
    });
    ngOnInit(): void {
        if (!['nest', 'rust'].includes(this.backend) || !['customer', 'lead', 'project', 'contract', 'sales-follow-up', 'project-handover'].includes(this.targetType) || (this.targetId && !/^[0-9a-f-]{36}$/i.test(this.targetId))) {
            this.error.set('测试宿主参数无效'); return;
        }
        void this.restore();
    }
    async restore(): Promise<void> {
        try {
            const current = await firstValueFrom(this.#auth.authControllerGetCurrentAuthSession());
            this.current.set(current); if (current.authenticated) await this.refreshCsrf();
        } catch (error) { this.fail(error); }
    }
    async refreshCsrf(): Promise<void> {
        const token = await firstValueFrom(this.#auth.authControllerGetCsrfToken()); this.#csrf.setToken(token.token);
    }
    async login(): Promise<void> {
        this.busy.set(true); this.error.set(null);
        try {
            await this.refreshCsrf();
            const current = await firstValueFrom(this.#auth.authControllerCreatePasswordAuthSession({ createPasswordAuthSessionRequest: { username: this.username().trim(), password: this.password() } }));
            await this.refreshCsrf(); this.current.set(current); this.password.set('');
        } catch (error) { this.fail(error); }
        finally { this.busy.set(false); }
    }
    async logout(): Promise<void> {
        this.busy.set(true);
        try {
            await firstValueFrom(this.#auth.authControllerLogoutCurrentAuthSession({ body: {} }));
            this.current.set(null); this.#csrf.clear();
        } catch (error) { this.fail(error); }
        finally { this.busy.set(false); }
    }
    show(view: 'providers' | 'panel' | 'center'): void { this.view.set(view); void this.#router.navigateByUrl('/'); }
    fail(error: unknown): void { this.error.set(error instanceof HttpErrorResponse ? `请求失败（${error.status}）` : '测试宿主请求失败'); }
}
