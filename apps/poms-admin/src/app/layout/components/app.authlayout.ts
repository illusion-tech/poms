import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'auth-layout',
    standalone: true,
    imports: [RouterModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <main>
            <router-outlet></router-outlet>
        </main>
    `
})
export class AuthLayout {}
