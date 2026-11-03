// 이 프로젝트의 핵심 파일. 여기서 트랜잭션·락·동시성을 배운다.
// 규칙 번호(R1~R8)는 docs/DOMAIN.md 참고.

import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO [4단계] 예약 생성 (R1~R5, R7). 아래 순서로 세 번에 나눠 구현하고,
  //   매번 `pnpm test:concurrency` 와 `SCENARIO=user pnpm test:concurrency` 를 돌려 README 표에 기록할 것.
  //
  //   v1. 보호 없음: "그 좌석·날짜에 CONFIRMED 있나?" + "그 사용자·날짜에 CONFIRMED 있나?" 조회 → 둘 다 없으면 insert.
  //       → seat 시나리오에서 201 이 몇 개 나오는가? user 시나리오에서는?
  //       → 왜 "조회해서 없길래 넣었는데" 중복이 생기는가? (용어: 레이스 컨디션, check-then-act)
  //
  //   v2. 트랜잭션 + 비관적 락: this.prisma.$transaction(async (tx) => { ... })
  //       - 좌석 행을 잠근다:   tx.$queryRaw`SELECT id FROM seats WHERE id = ${seatId} FOR UPDATE`
  //       - 사용자 행도 잠근다: tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`  (R3 때문)
  //       - 잠근 "다음에" 중복 조회 → insert. 잠그기 전에 조회하면 v1 과 다를 게 없다.
  //       → 두 행을 잠그는 순서가 요청마다 다르면 무슨 일이 생기나? (용어: 데드락, 락 순서) 항상 같은 순서로.
  //       → 왜 reservations 테이블에서 "아직 없는 행"을 FOR UPDATE 하는 것으로는 부족한가? (용어: 갭 락)
  //       → 존재하는 부모 행(seats, users)을 잠그는 이유가 여기 있다.
  //
  //   v3. DB 제약으로 막기: schema.prisma 의 [4단계] TODO → 유니크 제약 2개 → P2002 에러를 ConflictException(409) 으로.
  //       - 취소 후 재예약(R7)과 충돌하는 문제를 어떻게 풀었는지, 왜 그렇게 했는지 README 에 적는다.
  //       - v2 와 비교: 코드가 단순한 쪽은? "DB 가 보장"과 "앱이 보장"의 차이는? 둘 다 쓰는 선택은 어떤가?
  //
  //   공통 검증 (순서대로, 트랜잭션 밖에서 먼저 걸러도 되는 것부터)
  //     1. date 형식 → isDateOnly 아니면 400
  //     2. date 범위 (R4): todayIn() <= date <= addDays(todayIn(), RESERVATION_WINDOW_DAYS) 아니면 400
  //        → RESERVATION_WINDOW_DAYS 는 ConfigService 로 읽는다.
  //     3. 좌석 존재 → 404. 좌석 또는 층이 비활성(R5) → 400
  //     4. 중복 (R2, R3) → 409
  //   응답(201): { id, seat: { id, code }, date: 'YYYY-MM-DD', status }  ← date 는 fromDbDate 로 변환해서 내려준다.
  //   scripts/concurrency-test.ts 가 응답의 id 로 뒷정리(취소)를 하므로 id 는 꼭 포함할 것.
  async create(_userId: number, _dto: CreateReservationDto) {
    throw new NotImplementedException('ReservationsService.create');
  }

  // TODO [4단계] 내 예약 목록: 오늘(KST) 이후 전부(취소 포함), 날짜 오름차순, 좌석 코드와 층 이름 포함.
  //   - 응답: [{ id, date, status, seat: { id, code, floor: { id, name } } }]
  //   - 먼저 반복문으로 seat 와 floor 를 따로 조회하는 식으로 짜고 쿼리 로그 개수를 세어본 뒤, include 로 바꿔 다시 센다.
  //     (용어: N+1 문제, include vs select)
  //   - 이 조회가 schema.prisma 의 [2단계] 인덱스 TODO 중 두 번째와 연결된다.
  async findMine(_userId: number) {
    throw new NotImplementedException('ReservationsService.findMine');
  }

  // TODO [3단계] 날짜별 전체 예약 현황 (R8, ADMIN 전용). RolesGuard 가 동작하는지 확인하는 용도로 3단계에서 먼저 만든다.
  //   - 응답: [{ id, status, seat: { code, floor: { name } }, user: { id, name, email } }]
  //   - 쿼리 자체는 단순하다. 핵심은 USER 권한으로 호출했을 때 403 이 나는 것.
  async findAllByDate(_date: string) {
    throw new NotImplementedException('ReservationsService.findAllByDate');
  }

  // TODO [4단계] 예약 취소 (R6).
  //   - 예약이 없으면 404
  //   - 본인 것이 아니면 403 (용어: 소유권 검증, 인가. "남의 예약이 존재한다"는 사실을 숨기려면 404 로 통일하는 선택도 있다. 어느 쪽을 택했고 왜인지 적을 것)
  //   - 이미 CANCELLED 면 409 (용어: 상태 전이, 멱등성 — 취소 버튼을 두 번 눌렀을 때 409 가 맞나, 200 이 맞나?)
  //   - 예약일이 오늘(KST)보다 과거면 400
  //   - 삭제하지 않고 status 만 바꾼다 (용어: 소프트 삭제). v3 를 택했다면 유니크용 컬럼도 함께 바꿔야 R7 이 성립한다.
  //   - 응답(200): { id, status: 'CANCELLED' }
  async cancel(_userId: number, _reservationId: number) {
    throw new NotImplementedException('ReservationsService.cancel');
  }
}
