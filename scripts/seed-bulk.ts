// EXPLAIN 실험용 대량 데이터 생성 (완성본). 실행: pnpm seed:bulk
//
// 좌석 80개 × 1년치 예약을 넣어 수만 건을 만든다. 데이터가 수십 건이면 인덱스가 있든 없든 EXPLAIN 결과가 비슷해서 비교가 안 된다.
// 옵션(환경변수)
//   USERS  테스트 사용자 수 (기본 150) — bulk-user-001@gapsang.test ... 로그인은 불가 (비밀번호 해시가 가짜)
//   DAYS   생성할 날짜 수 (기본 365) — 오늘 기준 과거 (DAYS-30)일 ~ 미래 30일
//   FILL   하루 좌석 점유율 (기본 0.7)
//   FORCE  이미 대량 데이터가 있어도 다시 생성 (기본 꺼짐)
//
// 용어: 시드 데이터, createMany(벌크 insert), 배치(batch), 멱등성
//   - 하루 안에서 좌석과 사용자를 모두 "서로 다르게" 뽑으므로 R2/R3 를 위반하는 행은 만들지 않는다.
//   - 2단계 시점(유니크 제약 없음)에는 다시 실행하면 데이터가 두 배가 되므로, 이미 있으면 중단한다.
//     전부 지우고 다시 시작하려면: pnpm prisma migrate reset (모든 테이블을 비우고 seed 를 다시 실행한다)
//   - [4단계]에서 유니크용 컬럼을 추가했다면 아래 row 생성 부분에도 그 컬럼을 채워야 한다.

import { PrismaClient } from '@prisma/client';
import { addDays, toDbDate, todayIn } from '../src/common/utils/date';

const prisma = new PrismaClient();
const USERS = Number(process.env.USERS ?? 150);
const DAYS = Number(process.env.DAYS ?? 365);
const FILL = Number(process.env.FILL ?? 0.7);
const FORCE = process.env.FORCE === '1';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  const existing = await prisma.reservation.count({ where: { user: { email: { startsWith: 'bulk-user-' } } } });
  if (existing > 0 && !FORCE) {
    console.log(`이미 대량 데이터 ${existing}건이 있다. 다시 만들려면 FORCE=1 pnpm seed:bulk, 전부 초기화하려면 pnpm prisma migrate reset`);
    return;
  }

  // 1. 사용자
  const userRows = Array.from({ length: USERS }, (_, i) => ({
    email: `bulk-user-${String(i + 1).padStart(3, '0')}@gapsang.test`,
    passwordHash: 'bulk-seed-user-cannot-login',
    name: `테스트사용자${i + 1}`,
  }));
  await prisma.user.createMany({ data: userRows, skipDuplicates: true });
  const users: { id: number }[] = await prisma.user.findMany({
    where: { email: { startsWith: 'bulk-user-' } },
    select: { id: true },
  });

  // 2. 좌석
  const seats: { id: number }[] = await prisma.seat.findMany({ where: { isActive: true }, select: { id: true } });
  if (seats.length === 0) throw new Error('좌석이 없다. 먼저 pnpm db:seed 를 실행할 것.');

  const perDay = Math.min(Math.floor(seats.length * FILL), users.length);
  const start = addDays(todayIn(), -(DAYS - 30));

  // 3. 날짜별 예약을 2,000건씩 끊어서 insert
  let total = 0;
  let batch: { seatId: number; userId: number; date: Date; status: 'CONFIRMED' | 'CANCELLED' }[] = [];
  const flush = async () => {
    if (batch.length === 0) return;
    const res = await prisma.reservation.createMany({ data: batch, skipDuplicates: true });
    total += res.count;
    batch = [];
  };

  for (let d = 0; d < DAYS; d++) {
    const date = toDbDate(addDays(start, d));
    const daySeats = shuffle(seats).slice(0, perDay);
    const dayUsers = shuffle(users).slice(0, perDay);
    for (let i = 0; i < perDay; i++) {
      batch.push({
        seatId: daySeats[i].id,
        userId: dayUsers[i].id,
        date,
        status: Math.random() < 0.1 ? 'CANCELLED' : 'CONFIRMED',
      });
    }
    if (batch.length >= 2000) await flush();
  }
  await flush();

  const sampleDate = addDays(start, Math.floor(DAYS / 2));
  console.log(`사용자 ${users.length}명, 좌석 ${seats.length}개, 예약 ${total}건 생성 (${start} ~ ${addDays(start, DAYS - 1)})`);
  console.log('\nMySQL 에 접속해서 인덱스 추가 전/후로 아래를 실행하고 type / key / rows 를 비교할 것:');
  console.log('  docker exec -it seat-mysql mysql -uapp -papp1234 seat_reservation\n');
  console.log(`  -- 좌석 현황 (GET /floors/1/seats?date=${sampleDate})`);
  console.log(`  EXPLAIN SELECT s.id, s.code, r.id AS reservation_id`);
  console.log(`    FROM seats s LEFT JOIN reservations r`);
  console.log(`      ON r.seat_id = s.id AND r.date = '${sampleDate}' AND r.status = 'CONFIRMED'`);
  console.log(`   WHERE s.floor_id = 1;\n`);
  console.log(`  -- 내 예약 (GET /reservations/me)`);
  console.log(`  EXPLAIN SELECT * FROM reservations WHERE user_id = ${users[0]?.id ?? 1} AND date >= '${todayIn()}' ORDER BY date;`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
