import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 201 Created: 리소스(사용자)가 새로 만들어졌다.
  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  // POST 의 기본 응답은 201 이지만 로그인은 리소스를 만들지 않으므로 200 으로 바꾼다.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인 → accessToken 발급' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
