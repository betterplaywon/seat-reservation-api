// 루트 모듈. NestJS 앱은 모듈의 트리다.
// 용어: 모듈(Module) / 프로바이더(Provider) / 의존성 주입(DI) / 싱글턴
//   - 어떤 모듈이 어떤 모듈을 import 하는지 그려보면 앱 구조가 보인다.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { FloorsModule } from './floors/floors.module';
import { ReservationsModule } from './reservations/reservations.module';

@Module({
  imports: [
    // isGlobal: 모든 모듈에서 ConfigService 를 별도 import 없이 주입받을 수 있게 한다.
    // TODO [1단계] validationSchema 옵션으로 필수 환경변수가 없을 때 부팅을 실패시키기 (joi 사용)
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    FloorsModule,
    ReservationsModule,
  ],
})
export class AppModule {}
