// PrismaClient 를 Nest 생명주기에 연결한다.
// 용어: 생명주기 훅(onModuleInit / onModuleDestroy) / 커넥션 풀
//   - $connect 는 DB 연결을 "미리" 맺어 첫 요청이 느려지는 걸 막는다.
//   - 풀 크기는 DATABASE_URL 에 ?connection_limit=N 으로 조절할 수 있다.
//     → 풀을 키우면 항상 빨라질까? MySQL 의 max_connections 와 함께 생각해볼 것.

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
