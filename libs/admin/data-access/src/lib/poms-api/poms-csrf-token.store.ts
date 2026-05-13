import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PomsCsrfTokenStore {
    #token: string | null = null;

    get token(): string | null {
        return this.#token;
    }

    setToken(token: string): void {
        this.#token = token;
    }

    clear(): void {
        this.#token = null;
    }
}
