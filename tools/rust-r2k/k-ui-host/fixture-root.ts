import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '@poms/shared-api-client/api/auth.service';
import type { CurrentAuthSessionView } from '@poms/shared-api-client/model/current-auth-session-view';
import { ProjectWorkspaceStore } from '@poms/admin-data-access';
import { PomsCsrfTokenStore } from '@poms/admin-data-access/lib/poms-api/poms-csrf-token.store';
import { KOriginalSection } from './original-k-section';

@Component({
    selector: 'app-root',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, KOriginalSection],
    providers: [ProjectWorkspaceStore],
    styles: `
        :host { display: block; max-width: 1440px; margin: 0 auto; padding: 24px; }
        header, form { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
        form label { display: grid; gap: 6px; }
        input, button { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; }
        .scope { color: #64748b; margin-bottom: 16px; }
        .error { color: #b91c1c; margin: 12px 0; }
    `,
    template: `
        <header>
            <h1>POMS K 原片段验收</h1><span data-testid="k-ui-backend">{{ backend }}</span>
            @if (authenticated()) {
                <span data-testid="k-ui-user">已登录：{{ current()?.user?.username }}</span>
                <button type="button" (click)="logout()" [disabled]="busy()">退出</button>
            }
        </header>
        <p class="scope">此宿主仅承载原附件移交清单、原 store 和真实 K 请求；不代表完整 R4 页面或移交写链已迁移。</p>
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        @if (!authenticated()) {
            <form (ngSubmit)="login()">
                <label for="kUsername">账号<input id="kUsername" name="username" autocomplete="username" required [ngModel]="username()" (ngModelChange)="username.set($event)" /></label>
                <label for="kPassword">密码<input id="kPassword" name="password" type="password" autocomplete="current-password" required [ngModel]="password()" (ngModelChange)="password.set($event)" /></label>
                <button type="submit" [disabled]="busy()">{{ busy() ? '登录中' : '登录验收账号' }}</button>
            </form>
        } @else if (handoverId) {
            <p class="scope" data-testid="k-ui-handover-id">移交定位：{{ handoverId }}</p>
            <app-k-original-section [handoverId]="handoverId" />
        } @else {
            <p role="status">请提供本轮真实移交对象的 handoverId。</p>
        }
    `
})
export class KFixtureRoot implements OnInit {
    readonly #auth = inject(AuthApi);
    readonly #csrf = inject(PomsCsrfTokenStore);
    readonly #workspace = inject(ProjectWorkspaceStore);
    readonly backend = new URLSearchParams(globalThis.location.search).get('backend') ?? globalThis.sessionStorage.getItem('r2kBackend') ?? '';
    readonly handoverId = new URLSearchParams(globalThis.location.search).get('handoverId') ?? '';
    readonly username = signal('');
    readonly password = signal('');
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);
    readonly current = signal<CurrentAuthSessionView | null>(null);
    readonly authenticated = computed(() => this.current()?.authenticated === true && this.current()?.user !== null);

    ngOnInit(): void {
        if (!['nest', 'rust'].includes(this.backend) || (this.handoverId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.handoverId))) {
            this.error.set('测试宿主参数无效'); return;
        }
        void this.restore();
    }
    async restore(): Promise<void> {
        try {
            const current = await firstValueFrom(this.#auth.authControllerGetCurrentAuthSession());
            this.current.set(current);
            if (current.authenticated) await this.refreshCsrf();
        } catch (error) { this.fail(error); }
    }
    async refreshCsrf(): Promise<void> {
        const token = await firstValueFrom(this.#auth.authControllerGetCsrfToken());
        this.#csrf.setToken(token.token);
    }
    async login(): Promise<void> {
        this.busy.set(true); this.error.set(null);
        try {
            await this.refreshCsrf();
            const current = await firstValueFrom(this.#auth.authControllerCreatePasswordAuthSession({ createPasswordAuthSessionRequest: { username: this.username().trim(), password: this.password() } }));
            await this.refreshCsrf(); this.#workspace.clear(); this.current.set(current); this.password.set('');
        } catch (error) { this.fail(error); }
        finally { this.busy.set(false); }
    }
    async logout(): Promise<void> {
        this.busy.set(true);
        try {
            await firstValueFrom(this.#auth.authControllerLogoutCurrentAuthSession({ body: {} }));
            this.current.set(null); this.#csrf.clear(); this.#workspace.clear();
        } catch (error) { this.fail(error); }
        finally { this.busy.set(false); }
    }
    fail(error: unknown): void {
        this.error.set(error instanceof HttpErrorResponse ? `请求失败（${error.status}）` : '验收宿主请求失败');
    }
}
