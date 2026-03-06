import { Controller, Get } from '@nestjs/common';
import { Public } from './core/auth/decorators/public.decorator';
import { AppService } from './app.service';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    @Public()
    getData() {
        return this.appService.getData();
    }
}
