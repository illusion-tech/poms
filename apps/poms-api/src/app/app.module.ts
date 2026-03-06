import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AuthModule } from './core/auth/auth.module';
import { NavigationModule } from './features/navigation/navigation.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
    imports: [AuthModule, NavigationModule],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_PIPE,
            useClass: ZodValidationPipe
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ZodSerializerInterceptor
        }
    ]
})
export class AppModule {}
