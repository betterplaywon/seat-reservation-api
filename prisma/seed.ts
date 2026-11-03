// 초기 데이터: 가상 회사 Gapsang Korea 의 층과 좌석. 실행: pnpm db:seed
// 용어: 시드(seed) 데이터 / 멱등성(idempotency)
//   - 여러 번 실행해도 결과가 같아야 한다. 그래서 upsert 를 쓴다.
//
// 좌석 코드 규칙: {층}F-{구역}-{번호}. 구역 A/B 각 20석 → 층당 40석, 두 층 총 80석.
// 임직원 약 150명에 좌석 80석이라 "자리가 모자라서 예약이 필요한" 상황이다 (docs/DOMAIN.md).

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const floors = [
  { id: 1, no: 7, name: '본사 7층' },
  { id: 2, no: 8, name: '본사 8층' },
];

function seatCodes(floorNo: number): string[] {
  const codes: string[] = [];
  for (const zone of ['A', 'B']) {
    for (let n = 1; n <= 20; n++) {
      codes.push(`${floorNo}F-${zone}-${String(n).padStart(2, '0')}`);
    }
  }
  return codes;
}

async function main() {
  let seatCount = 0;
  for (const floor of floors) {
    await prisma.floor.upsert({
      where: { id: floor.id },
      update: { name: floor.name },
      create: { id: floor.id, name: floor.name },
    });
    for (const code of seatCodes(floor.no)) {
      await prisma.seat.upsert({
        where: { code },
        update: { floorId: floor.id },
        create: { code, floorId: floor.id },
      });
      seatCount++;
    }
  }
  console.log(`seeded ${floors.length} floors, ${seatCount} seats`);

  // TODO [3단계] 관리자(총무팀) 계정 1개 시드 추가.
  //   - 비밀번호는 bcrypt 로 해싱해서 passwordHash 에 저장한다.
  //   - 이메일/비밀번호는 환경변수(ADMIN_EMAIL / ADMIN_PASSWORD)에서 읽는다. .env.example 에도 추가할 것.
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
