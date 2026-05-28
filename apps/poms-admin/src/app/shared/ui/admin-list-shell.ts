import { Component } from '@angular/core';

@Component({
    selector: 'app-admin-list-shell',
    standalone: true,
    template: `<ng-content />`,
    host: {
        class: 'card block overflow-hidden p-0!'
    }
})
export class AdminListShell {}
