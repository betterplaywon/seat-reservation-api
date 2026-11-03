// TODO [3단계] JwtModule 등록.
//   pnpm add @nestjs/jwt bcrypt && pnpm add -D @types/bcrypt
//   (bcrypt 는 pnpm-workspace.yaml 의 onlyBuiltDependencies 에 이미 허용돼 있다)
//   JwtModule.registerAsync({ useFactory: (config: ConfigService) => ({ secret: ..., signOptions: { expiresIn: ... } }) })
//   - secret 을 코드에 적지 않고 ConfigService 에서 읽는 이유를 설명할 수 있어야 한다.

import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
