import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Global, Module } from '@nestjs/common';
import { createNestMikroOrmOptions } from './persistence.config';

@Global()
@Module({
    imports: [MikroOrmModule.forRoot(createNestMikroOrmOptions())],
    exports: [MikroOrmModule]
})
export class PersistenceModule {}
