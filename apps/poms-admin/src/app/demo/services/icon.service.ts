import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

type IconDefinition = Record<string, unknown>;

interface IconsResponse {
    icons: IconDefinition[];
}

@Injectable()
export class IconService {
    constructor(private http: HttpClient) {}

    icons: IconDefinition[] = [];

    selectedIcon: IconDefinition | null = null;

    apiUrl = 'public/demo/data/icons.json';

    getIcons() {
        return this.http.get(this.apiUrl).pipe(
            map((response: IconsResponse) => {
                this.icons = response.icons;
                return this.icons;
            })
        );
    }
}
