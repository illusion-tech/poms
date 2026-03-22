import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

export class DatabaseSeeder extends Seeder {
    async run(_em: EntityManager): Promise<void> {
        console.log('POMS seeders are not implemented yet. This is the phase-1 seeder entrypoint.');
    }
}
