// 유일하게 완성된 엔드포인트. 서버와 DB 가 살아있는지 확인한다.
// 용어: 헬스체크(health check) / 로드밸런서 / 무중단 배포
//   - 배포 환경에서는 이 엔드포인트가 200 을 줄 때만 트래픽을 보낸다.

import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '서버/DB 상태 확인' })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // 503: 서버는 떠 있지만 의존 서비스(DB)가 준비되지 않음.
      throw new ServiceUnavailableException('database unreachable');
    }
    return { status: 'ok', db: 'ok', timestamp: new Date().toISOString() };
  }
}
