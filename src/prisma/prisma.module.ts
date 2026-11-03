// @Global: 어디서든 PrismaService 를 주입받을 수 있다.
// 질문해볼 것: 왜 PrismaClient 인스턴스는 앱 전체에서 하나여야 할까? (용어: 커넥션 풀, 싱글턴)

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
