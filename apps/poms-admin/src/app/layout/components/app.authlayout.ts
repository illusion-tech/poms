import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'auth-layout',
    standalone: true,
    imports: [RouterModule],
    template: `
        <main>
            <router-outlet></router-outlet>
        </main>
    `
})
export class AuthLayout {}
