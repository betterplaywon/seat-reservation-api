// 날짜('YYYY-MM-DD')만 다루는 유틸. 이 프로젝트의 예약은 "날짜" 단위라 시각이 없다 (R1).
// 이 파일은 완성본이다. 학습 대상이 아니라 "함정을 한 곳에 가둬두는" 용도.
// 용어: 타임존, UTC, ISO 8601, DATE 타입
//
// 함정: JS 의 Date 는 항상 "시각"이다. new Date('2026-11-10') 은 UTC 자정이 되고,
// 한국(UTC+9)에서 toString() 하면 11월 10일 09:00 으로 보인다. 서버가 UTC 로 돌면 "오늘"이 한국과 다를 수도 있다.
// 그래서 (1) 앱 전체는 'YYYY-MM-DD' 문자열만 주고받고, (2) DB(@db.Date)와의 변환과 "오늘" 계산은 여기서만 한다.

/** "오늘"을 판단할 타임존. ConfigService 를 쓰지 않는 이유: 유틸 함수에서 DI 를 받기 어렵고, 부팅 중 한 번만 읽으면 되기 때문. */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? 'Asia/Seoul';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** '2026-11-10' 처럼 형식이 맞고 실제로 존재하는 날짜인지 ('2026-02-30' 은 false) */
export function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** 'YYYY-MM-DD' → Prisma @db.Date 컬럼에 넣을 Date (UTC 자정) */
export function toDbDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Prisma @db.Date 컬럼에서 읽은 Date → 'YYYY-MM-DD' */
export function fromDbDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** 특정 타임존의 "오늘"을 'YYYY-MM-DD' 로. 서버가 UTC 로 돌아도 한국 기준 오늘이 나온다. */
export function todayIn(timeZone: string = APP_TIMEZONE, now: Date = new Date()): string {
  // en-CA 로케일은 날짜를 YYYY-MM-DD 로 표기한다.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** 'YYYY-MM-DD' 에 n일 더하기 (음수면 빼기) */
export function addDays(value: string, days: number): string {
  const d = toDbDate(value);
  d.setUTCDate(d.getUTCDate() + days);
  return fromDbDate(d);
}

/** 문자열 비교로 날짜 순서를 판단할 수 있는 이유: 'YYYY-MM-DD' 는 자릿수가 고정이라 사전순 == 시간순 */
export function isBefore(a: string, b: string): boolean {
  return a < b;
}
