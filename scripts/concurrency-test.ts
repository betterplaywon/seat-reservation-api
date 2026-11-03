// 동시성 테스트 (완성본). 규칙 R2/R3 가 동시 요청에서도 지켜지는지 확인한다.
//
//   SCENARIO=seat (기본): 서로 다른 사용자 N명이 같은 좌석·같은 날짜를 동시에 예약 → 201 은 정확히 1개여야 한다 (R2)
//   SCENARIO=user       : 한 사용자가 서로 다른 좌석 N개를 같은 날짜에 동시에 예약     → 201 은 정확히 1개여야 한다 (R3)
//
// 테스트용 사용자는 스크립트가 직접 가입시킨다 (race-user-01@gapsang.test ...). 이미 있으면 로그인만 한다.
// 실행 후 생성된 예약은 자동으로 취소해서 같은 날짜로 다시 돌릴 수 있게 한다 (CLEANUP=0 으로 끌 수 있음).
//
// 실행:
//   pnpm test:concurrency
//   SCENARIO=user pnpm test:concurrency
// 옵션(환경변수): BASE_URL(기본 http://localhost:3000), SEAT_ID(기본 1), DATE(기본 내일 KST), REQUESTS(기본 10), PASSWORD
//
// 용어: 레이스 컨디션, 동시성(concurrency) vs 병렬성(parallelism), 부하 테스트
//   - Promise.all 은 요청을 "거의 동시에" 보낼 뿐 완벽히 동시는 아니다. 그래도 레이스를 재현하기엔 충분하다.
//   - 더 정밀한 측정(RPS, p95)이 필요하면 k6 같은 도구를 쓴다.

import { addDays, todayIn } from '../src/common/utils/date';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const SCENARIO = (process.env.SCENARIO ?? 'seat') as 'seat' | 'user';
const SEAT_ID = Number(process.env.SEAT_ID ?? 1);
const REQUESTS = Number(process.env.REQUESTS ?? 10);
const DATE = process.env.DATE ?? addDays(todayIn(), 1);
const PASSWORD = process.env.PASSWORD ?? 'race-test-1234';
const CLEANUP = process.env.CLEANUP !== '0';

interface Res {
  status: number;
  body: any;
}

async function call(method: string, path: string, body?: unknown, token?: string): Promise<Res> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: any = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* 본문이 JSON 이 아니면 문자열 그대로 */
    }
    return { status: res.status, body: parsed };
  } catch (err) {
    return { status: 0, body: String(err) };
  }
}

async function ensureToken(email: string): Promise<string> {
  // 가입. 이미 있으면 409 가 오지만 무시하고 로그인으로 넘어간다.
  await call('POST', '/auth/signup', { email, password: PASSWORD, name: email.split('@')[0] });
  const res = await call('POST', '/auth/login', { email, password: PASSWORD });
  if (res.status !== 200 || !res.body?.accessToken) {
    throw new Error(
      `로그인 실패 (${email}): ${res.status} ${JSON.stringify(res.body)}\n` +
        `→ 3단계(인증)가 구현되어 있어야 이 테스트를 돌릴 수 있다. 서버가 떠 있는지도 확인할 것.`,
    );
  }
  return res.body.accessToken as string;
}

interface Job {
  label: string;
  token: string;
  seatId: number;
}

async function main() {
  console.log(
    `시나리오: ${SCENARIO === 'seat' ? 'seat — 여러 사용자 → 같은 좌석' : 'user — 한 사용자 → 여러 좌석'}` +
      `  |  date=${DATE}  |  요청 ${REQUESTS}개  |  ${BASE_URL}\n`,
  );

  let jobs: Job[];
  if (SCENARIO === 'seat') {
    const tokens: string[] = [];
    for (let i = 0; i < REQUESTS; i++) {
      tokens.push(await ensureToken(`race-user-${String(i + 1).padStart(2, '0')}@gapsang.test`));
    }
    jobs = tokens.map((token, i) => ({ label: `user-${String(i + 1).padStart(2, '0')}`, token, seatId: SEAT_ID }));
  } else {
    const token = await ensureToken('race-user-01@gapsang.test');
    jobs = Array.from({ length: REQUESTS }, (_, i) => ({ label: `seat-${SEAT_ID + i}`, token, seatId: SEAT_ID + i }));
  }

  const results = await Promise.all(
    jobs.map(async (job) => {
      const started = performance.now();
      const res = await call('POST', '/reservations', { seatId: job.seatId, date: DATE }, job.token);
      return { ...job, ...res, ms: Math.round(performance.now() - started) };
    }),
  );

  const byStatus = new Map<number, number>();
  for (const r of results) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);

  console.log('status  count');
  for (const [status, count] of [...byStatus.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`${String(status).padEnd(7)} ${count}`);
  }

  const created = results.filter((r) => r.status === 201);
  const verdict =
    created.length === 1
      ? 'OK — 정확히 1개만 성공'
      : created.length === 0
        ? '모두 실패 — 인증/검증/날짜 범위를 확인 (이미 그 날짜에 예약이 있으면 전부 409 가 정상)'
        : `규칙 위반! ${created.length}개가 성공 (${created.map((r) => r.label).join(', ')})`;
  console.log(`\n201 Created: ${created.length}개  →  ${verdict}`);
  console.log(`가장 느린 응답: ${Math.max(...results.map((r) => r.ms))}ms`);

  const sample = results.find((r) => r.status !== 201);
  if (sample) console.log(`\n실패 응답 예시 (${sample.status}):\n${JSON.stringify(sample.body, null, 2)}`);

  if (CLEANUP && created.length > 0) {
    let cancelled = 0;
    for (const r of created) {
      const id = r.body?.id;
      if (!id) continue;
      const res = await call('PATCH', `/reservations/${id}/cancel`, undefined, r.token);
      if (res.status === 200) cancelled++;
    }
    console.log(
      cancelled === created.length
        ? `\n정리: 생성된 예약 ${cancelled}건을 취소했다. 같은 DATE 로 다시 실행할 수 있다.`
        : `\n정리 실패: ${created.length}건 중 ${cancelled}건만 취소됨. 취소 API 가 아직 없거나 응답에 id 가 없다. 다음 실행은 DATE 를 바꿀 것.`,
    );
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
