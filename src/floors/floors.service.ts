// 층·좌석 조회. 이 프로젝트에서 "읽기" 쪽 학습(조인, 인덱스, EXPLAIN, N+1)은 전부 여기서 일어난다.

import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SeatStatus = 'AVAILABLE' | 'RESERVED' | 'UNAVAILABLE';

@Injectable()
export class FloorsService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO [2단계] 활성 층 목록 + 각 층의 활성 좌석 수. 1주차에 AI 없이 직접 작성하는 첫 쿼리.
  //   - 응답: [{ id, name, seatCount }]
  //   - Prisma 의 _count 를 써보고, 실제로 어떤 SQL 이 나가는지 로그로 확인할 것
  //     (PrismaService 생성자에서 super({ log: ['query'] }) 로 켤 수 있다)
  async findAll() {
    throw new NotImplementedException('FloorsService.findAll');
  }

  // TODO [2단계] 특정 날짜의 층 좌석 현황. 좌석맵이 그대로 그릴 수 있는 형태로 내려준다.
  //   - 입력: floorId, date('YYYY-MM-DD'), currentUserId(3단계 이후, 그 전에는 undefined)
  //   - 응답: { floor: { id, name }, date, seats: [{ id, code, status, reservedByMe }] }
  //       status: 'UNAVAILABLE' = 좌석 또는 층이 비활성 (R5)
  //               'RESERVED'    = 그 날짜에 CONFIRMED 예약이 있음
  //               'AVAILABLE'   = 그 외
  //       reservedByMe: 그 예약이 현재 사용자 것이면 true
  //   - 층이 없으면 NotFoundException(404)
  //   - 쿼리 전략 두 가지를 직접 짜서 비교해볼 것:
  //       (a) seats 조회 1번 + 그 날짜의 CONFIRMED reservations 조회 1번 → 앱에서 Map 으로 합치기
  //       (b) seats 에 include: { reservations: { where: { date, status: 'CONFIRMED' } } } 한 번 → Prisma 가 만드는 SQL 확인
  //   - 이 조회가 schema.prisma 의 [2단계] 인덱스 TODO 와 연결된다.
  //     `pnpm seed:bulk` 로 수만 건을 넣은 뒤 EXPLAIN 전/후를 README 에 기록할 것.
  //   - 용어: 조인(LEFT JOIN), N+1, 복합 인덱스, 범위 조회, DATE 타입
  async getSeatStatus(_floorId: number, _date: string, _currentUserId?: number) {
    throw new NotImplementedException('FloorsService.getSeatStatus');
  }
}
