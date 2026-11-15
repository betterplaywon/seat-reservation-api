// date.ts 의 계약을 고정한다. "오늘" 은 서버 시간대가 아니라 APP_TIMEZONE 기준이고 (R4), 호출 시점에 읽는다 (REVIEW 3번).
import { addDays, fromDbDate, isBefore, isDateOnly, toDbDate, todayIn } from './date';

describe('date utils', () => {
  it('isDateOnly 는 형식이 맞고 실제로 있는 날짜만 통과시킨다', () => {
    expect(isDateOnly('2026-11-10')).toBe(true);
    expect(isDateOnly('2026-02-30')).toBe(false);
    expect(isDateOnly('2026-1-1')).toBe(false);
    expect(isDateOnly('')).toBe(false);
    expect(isDateOnly(undefined)).toBe(false);
  });

  it('toDbDate 와 fromDbDate 는 서로 되돌린다', () => {
    expect(toDbDate('2026-11-10').toISOString()).toBe('2026-11-10T00:00:00.000Z');
    expect(fromDbDate(toDbDate('2026-11-10'))).toBe('2026-11-10');
  });

  it('todayIn 은 넘겨받은 타임존의 날짜를 돌려준다', () => {
    // UTC 15:00 = 서울(UTC+9) 다음 날 00:00
    const now = new Date('2026-11-10T15:00:00.000Z');
    expect(todayIn('UTC', now)).toBe('2026-11-10');
    expect(todayIn('Asia/Seoul', now)).toBe('2026-11-11');
  });

  it('addDays 는 달과 해를 넘긴다', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('isBefore 는 문자열 비교로 날짜 순서를 판단한다', () => {
    expect(isBefore('2026-11-09', '2026-11-10')).toBe(true);
    expect(isBefore('2026-11-10', '2026-11-10')).toBe(false);
  });
});
