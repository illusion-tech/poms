import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Global, Module } from '@nestjs/common';
import { createNestMikroOrmOptions } from './persistence.config';

@Global()
@Module({
    imports: [MikroOrmModule.forRoot(createNestMikroOrmOptions())]
})
export class PersistenceModule {}
