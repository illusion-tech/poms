import { defineConfig } from '@mikro-orm/postgresql';
import { createBaseMikroOrmOptions } from './app/core/persistence/persistence.config';

export default defineConfig({
    ...createBaseMikroOrmOptions({
        connect: true
    })
});
