import type { NavigationItem, UserPayload } from '@poms/shared-contracts';
import { NavigationListDto } from '@poms/api-contracts';
import { Controller, Get, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../../core/auth/decorators/authenticated.decorator';
import { NavigationService } from './navigation.service';

@ApiTags('Navigation')
@ApiBearerAuth()
@Controller('me')
export class NavigationController {
    constructor(private readonly navigationService: NavigationService) {}

    @Get('navigation')
    @Authenticated()
    @ApiOperation({ summary: '获取当前用户可见的导航菜单树' })
    @ApiOkResponse({ type: NavigationListDto })
    getNavigation(@Request() req: { user: UserPayload }): NavigationItem[] {
        return this.navigationService.getNavigationForUser(req.user.permissions);
    }
}
