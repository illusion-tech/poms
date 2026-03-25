import { computed, inject, Injectable, signal } from '@angular/core';
import type { PlatformUserList } from '@poms/shared-api-client';
import { PlatformApi } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PlatformStore {
    readonly #platformApi = inject(PlatformApi);

    readonly #users = signal<PlatformUserList>([]);
    readonly #loadingUsers = signal(false);
    readonly #loadedUsers = signal(false);

    readonly users = this.#users.asReadonly();
    readonly loadingUsers = this.#loadingUsers.asReadonly();
    readonly loadedUsers = this.#loadedUsers.asReadonly();
    readonly activeUsersCount = computed(() => this.#users().filter((user) => user.isActive).length);

    async loadUsers() {
        this.#loadingUsers.set(true);

        try {
            const users = await firstValueFrom(this.#platformApi.platformControllerListUsers());
            this.#users.set(users ?? []);
            this.#loadedUsers.set(true);
            return users;
        } finally {
            this.#loadingUsers.set(false);
        }
    }
}
