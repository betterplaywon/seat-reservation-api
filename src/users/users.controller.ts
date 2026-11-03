import { Controller, Get, NotImplementedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // TODO [3단계] 내 정보 조회.
  //   - @UseGuards(JwtAuthGuard) 로 보호하고 @CurrentUser() 로 payload 를 받는다.
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보 조회 (인증 필요)' })
  async me() {
    throw new NotImplementedException('GET /users/me');
  }
}
