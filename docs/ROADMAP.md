# 확장 로드맵

MVP 이후에 추가할 기능 목록. 각 항목은 **이 섹션 + `docs/DOMAIN.md`** 를 컨텍스트로 주면 바로 구현에 들어갈 수 있을 만큼 적어두었다.
MVP(1~6단계)가 끝나기 전에는 손대지 않는다.

## 사용법

1. 항목 하나를 고른다. Tier 순서를 권장하지만 강제는 아니다.
2. 구현 전에 DOMAIN.md 의 규칙(R1~R8)과 충돌하는지 본다. 충돌하면 규칙을 먼저 고치고 새 번호(R9…)를 붙인다.
3. 스키마 변경은 반드시 마이그레이션으로(`pnpm prisma:migrate`). 기존 데이터를 어떻게 옮길지도 적는다.
4. 구현이 끝나면 DOMAIN.md 의 ERD·API 표·결정 기록을 갱신하고, 이 문서에서 해당 항목을 맨 아래 "완료" 로 옮긴다.
5. AI 에게 맡길 때: 항목 본문 + DOMAIN.md 를 함께 준다. "생성된 코드를 설명할 수 있을 때만 커밋" 규칙은 그대로.

## 어떤 기능을 추가하더라도 지킬 것

- **R2/R3(중복 금지)는 깨지면 안 된다.** 예약을 만드는 새 경로(반복 예약, 관리자 대리 예약 등)는 반드시 `ReservationsService.create` 를 거친다. 다른 곳에서 `prisma.reservation.create` 를 직접 부르지 않는다.
- 날짜는 `'YYYY-MM-DD'` 문자열로만 주고받고, `Date` 변환과 "오늘" 계산은 `src/common/utils/date.ts` 에서만 한다.
- 삭제 대신 상태 변경(소프트 삭제). 상태를 추가하면 `ReservationStatus` enum 에 넣고 상태 전이표를 이 문서에 적는다.
- 새 API 는 Swagger 데코레이터(`@ApiOperation`, `@ApiBearerAuth` 등)를 함께 붙인다.
- 새로 등장한 용어는 `docs/TERMS.md` 에 추가한다.

---

## Tier 1 — MVP 직후

### #1 관리자 좌석·층 관리

- **목적**: 총무팀이 고장·공사 좌석을 막거나, 좌석·층을 추가·수정한다. 지금은 시드 스크립트로만 가능하다.
- **사용자 스토리**: 총무팀 담당자로서, 7F-A-03 의자가 고장 나서 수리될 때까지 예약을 막고 싶다.
- **API** (모두 ADMIN)
  - `POST /floors` `{ name }` → 201
  - `PATCH /floors/:id` `{ name?, isActive? }`
  - `POST /floors/:id/seats` `{ codes: string[] }` — 여러 좌석을 한 번에 (코드 중복 시 409, 전체 롤백)
  - `PATCH /seats/:id` `{ isActive?, code? }`
- **규칙 추가 필요 (R9)**: 좌석/층을 비활성화할 때 **오늘 이후 CONFIRMED 예약이 있으면** 어떻게 할지 결정한다. 권장: 기본은 409 로 거부하고 영향받는 예약 수를 응답에 포함, `?force=true` 면 그 예약들을 트랜잭션 안에서 `CANCELLED` 로 바꾸고 비활성화한다. (알림이 없으므로 응답에 취소된 예약 목록을 돌려준다)
- **스키마**: 변경 없음.
- **영향 파일**: `src/floors/*` (컨트롤러·서비스에 메서드 추가), 새 모듈 `src/seats/*` 또는 floors 에 포함, `RolesGuard`.
- **학습 포인트**: 트랜잭션 안에서 여러 테이블 갱신, `updateMany`, 벌크 insert 와 부분 실패 처리.
- **완료 기준**: USER 로 호출하면 403. 예약이 있는 좌석 비활성화가 409 → `force=true` 로 성공하고 해당 예약이 `CANCELLED` 로 바뀐다. 비활성 좌석이 좌석 현황에서 `UNAVAILABLE` 로 나온다.

### #2 좌석 속성과 필터

- **목적**: 모니터 있는 자리, 스탠딩 데스크, 창가 등 조건으로 좌석을 고른다.
- **사용자 스토리**: 디자이너로서, 외장 모니터가 있는 좌석만 보고 싶다.
- **스키마**: `Seat` 에 `hasMonitor Boolean @default(false)`, `isStanding Boolean @default(false)`, `isWindow Boolean @default(false)`. 속성이 5개를 넘어가면 `SeatFeature` 다대다로 정규화를 검토한다(지금은 과함).
- **API**: `GET /floors/:id/seats?date=&monitor=true&standing=true` — 필터는 AND. 좌석 현황 응답의 각 좌석에 속성 필드 추가.
- **시드**: `prisma/seed.ts` 에서 A 구역은 모니터 있음, 각 구역 01~05 는 창가 등 규칙적으로 부여.
- **영향 파일**: `prisma/schema.prisma`, `prisma/seed.ts`, `src/floors/*`, 쿼리 DTO 신설.
- **학습 포인트**: 저카디널리티 컬럼(Boolean)에 인덱스를 걸면 왜 효과가 없는지 EXPLAIN 으로 확인. 쿼리 파라미터 DTO 와 Boolean 변환(`'true'` 문자열 문제).
- **완료 기준**: 필터 조합이 동작하고, Swagger 에 파라미터가 문서화된다.

### #3 리프레시 토큰과 로그아웃

- **목적**: 액세스 토큰을 15분으로 짧게 유지하면서도 매번 로그인하지 않게 한다. 로그아웃을 가능하게 한다.
- **스키마**: `RefreshToken { id, userId FK, tokenHash String @unique, expiresAt DateTime, revokedAt DateTime? }`. 토큰 원문은 저장하지 않고 해시만.
- **API**: `POST /auth/login` 응답에 `refreshToken` 추가, `POST /auth/refresh` `{ refreshToken }` → 새 토큰 쌍(회전, rotation), `POST /auth/logout` → 해당 리프레시 토큰 폐기.
- **결정할 것**: 리프레시 토큰을 응답 본문으로 줄지 HttpOnly 쿠키로 줄지. 쿠키면 CSRF 대책이 따라온다. 프론트(#5)가 없는 동안은 본문이 단순하다.
- **영향 파일**: `src/auth/*`, `.env.example`(REFRESH 시크릿·만료), `prisma/schema.prisma`.
- **학습 포인트**: 액세스/리프레시 토큰 분리 이유, 토큰 회전, 탈취 감지(이미 쓴 리프레시 토큰이 다시 오면 전부 폐기), 쿠키 vs 본문, CSRF.
- **완료 기준**: 액세스 토큰 만료 후 refresh 로 복구되고, logout 뒤에는 refresh 가 401 이다.

## Tier 2 — 운영 감각

### #4 체크인과 노쇼 자동 취소

- **목적**: 예약만 하고 안 오는 자리를 오전 중에 풀어준다.
- **사용자 스토리**: 출근해서 자리에 앉으면 체크인한다. 10:30 까지 체크인이 없으면 예약이 자동 취소되어 다른 사람이 쓸 수 있다.
- **스키마**: `Reservation.checkedInAt DateTime?`, `ReservationStatus` 에 `NO_SHOW` 추가.
- **상태 전이**: `CONFIRMED → CANCELLED`(본인 취소) / `CONFIRMED → NO_SHOW`(배치) / `NO_SHOW`, `CANCELLED` 는 종료 상태. R2/R3 의 "CONFIRMED 기준"은 그대로 → NO_SHOW 자리는 재예약 가능(R7 확장).
- **API**: `POST /reservations/:id/check-in` — 본인, 당일(KST), 06:00~10:30 사이만. 시간 창은 환경변수(`CHECKIN_DEADLINE=10:30`).
- **배치**: `@nestjs/schedule` 의 `@Cron('30 10 * * 1-5', { timeZone: 'Asia/Seoul' })` → 당일 `CONFIRMED` 이면서 `checkedInAt IS NULL` 인 예약을 `NO_SHOW` 로 `updateMany`.
- **주의**: 서버가 두 대 이상이면 배치가 중복 실행된다. MVP 는 단일 인스턴스 전제로 두고 코드 주석에 남긴다(해결책: DB 락 또는 Redis 분산 락). 배치는 여러 번 돌아도 결과가 같아야 한다(멱등).
- **영향 파일**: `prisma/schema.prisma`, `src/reservations/*`, 새 `src/reservations/no-show.scheduler.ts`, `app.module.ts`(ScheduleModule), `.env.example`.
- **학습 포인트**: 크론 표현식과 타임존, 멱등한 배치, 상태 머신, 분산 환경의 중복 실행.
- **완료 기준**: 체크인 창 밖 요청은 400. 배치 실행 후 미체크인 예약이 `NO_SHOW` 가 되고, 그 좌석을 다른 사용자가 같은 날 예약할 수 있다.

### #5 좌석맵 프론트엔드

- **목적**: 좌석 현황 API 를 눈으로 보고 클릭해서 예약한다. 프론트엔드 경력을 보여주는 부분.
- **스키마**: `Seat` 에 `posX Int`, `posY Int` (격자 좌표). 시드에서 구역·번호로 계산해 채운다. 대안: `Floor.layout Json` 에 좌석 배치를 통째로 저장 — 좌석이 자주 바뀌지 않으면 컬럼 두 개가 단순하다.
- **백엔드 변경**: 좌석 현황 응답에 `posX`, `posY` 추가. **CORS 설정**(`app.enableCors({ origin: [...] })`) — 프론트 도메인만 허용. 프론트에서 토큰을 어디에 둘지(#3 과 연결).
- **프론트**: 별도 폴더 `web/`(React + Vite) 또는 별도 저장소. 화면은 3개면 충분: 로그인, 날짜 선택 + 좌석맵(클릭 → 예약/취소), 내 예약.
- **배포**: 정적 파일이므로 Caddy 가 API 와 함께 서빙하거나(같은 도메인 → CORS 불필요) 별도 정적 호스팅.
- **학습 포인트**: CORS 와 preflight, 같은 출처 vs 다른 출처 배포의 차이, API 응답 설계가 프론트 렌더링에 미치는 영향.
- **완료 기준**: 좌석맵에서 예약·취소가 되고, 다른 사용자의 예약이 실시간은 아니어도 새로고침으로 반영된다.

### #6 팀 구역과 고정석

- **목적**: 팀별로 모여 앉을 구역을 두고, 일부 임원·장비 좌석은 고정한다.
- **스키마**: `Team { id, name }`, `User.teamId Int?`, `Seat.teamId Int?`(구역 소속, null 이면 공용), `Seat.assignedUserId Int?`(고정석).
- **규칙 추가 (R10, R11)**: 구역 좌석은 해당 팀원만 예약 가능(403). 고정석은 예약 대상이 아니며 좌석 현황에서 `UNAVAILABLE` 로 표시(이유 필드 `reason: 'FIXED'` 추가 검토).
- **영향 파일**: `prisma/schema.prisma`, `prisma/seed.ts`, `src/reservations/reservations.service.ts`(create 검증 추가), `src/floors/floors.service.ts`, 관리자 API(#1 확장).
- **학습 포인트**: 자기참조가 아닌 다중 FK 설계, nullable FK 의 의미, 검증 순서(존재 → 활성 → 권한 → 중복).
- **완료 기준**: 다른 팀 구역 예약이 403, 고정석은 현황에서 구분되어 보인다.

## Tier 3 — 있으면 좋은 것

### #7 동료 좌석 찾기

- **목적**: 같이 일할 동료가 어디 앉았는지 찾는다.
- **프라이버시**: 기본은 비공개. `User.showMySeat Boolean @default(false)` 를 켠 사람만 노출.
- **API**: `GET /reservations/search?date=&name=` (USER) — `showMySeat=true` 인 사용자의 CONFIRMED 예약만. 이름 부분 일치, 결과 20개 제한.
- **학습 포인트**: LIKE 검색과 인덱스(앞 와일드카드는 인덱스를 못 탄다), 개인정보 최소 노출(이메일은 빼고 이름·좌석만).

### #8 반복 예약

- **목적**: "매주 화·목, 다음 4주" 처럼 한 번에 예약한다.
- **API**: `POST /reservations/recurring` `{ seatId, weekdays: number[], from, to }` → 날짜별로 `ReservationsService.create` 를 호출.
- **결정할 것**: 일부 날짜가 이미 차 있으면 전체 실패(트랜잭션)인가, 가능한 날만 예약하고 결과를 날짜별로 돌려주는가. 사용자 입장에선 후자가 편하다. R4(예약 가능 기간)와 `to` 의 관계도 정한다.
- **학습 포인트**: 부분 성공 응답 설계(207 Multi-Status 또는 200 + 항목별 결과), 긴 트랜잭션의 위험.

### #9 주말·공휴일 제한

- **목적**: 출근하지 않는 날의 예약을 막는다.
- **스키마**: `Holiday { date Date @unique, name }`. 주말은 코드로, 공휴일은 테이블로. 공공데이터 API 연동은 수동 입력 이후에.
- **규칙 확장 (R4)**: 주말·공휴일은 400 `"휴무일에는 예약할 수 없습니다"`.
- **학습 포인트**: 요일 계산과 타임존(UTC 자정이 KST 로는 전날 금요일이 되는 문제를 `date.ts` 안에서 처리).

### #10 이메일 도메인 제한

- **목적**: 사내 서비스답게 회사 이메일만 가입을 받는다.
- **구현**: `.env` 의 `ALLOWED_EMAIL_DOMAINS=gapsang.test,gapsang.co.kr` → `SignupDto` 커스텀 validator 또는 `AuthService.signup` 에서 검사 → 400. SSO(Google Workspace 등)는 범위 밖으로 두되, 도입 시 `AuthModule` 만 바뀌도록 지금 구조를 유지한다.
- **주의**: `scripts/concurrency-test.ts` 와 `scripts/seed-bulk.ts` 가 `@gapsang.test` 를 쓰므로 허용 목록에 포함시킨다.

### #11 알림 (Slack 또는 이메일)

- **목적**: 예약 확정·취소·노쇼 처리 시 알려준다.
- **구현**: 외부 호출은 **트랜잭션이 끝난 뒤** 한다(실패해도 예약은 유지). 처음에는 서비스에서 직접 호출, 실패 시 로그만. 신뢰성이 필요해지면 아웃박스 패턴(DB 에 알림 행을 먼저 쓰고 별도 워커가 전송)을 검토.
- **학습 포인트**: 외부 I/O 와 트랜잭션 경계, 재시도와 멱등 키.

---

## 배포 — 6단계 상세 계획

MVP 6단계에 해당하므로 ROADMAP 항목이 아니라 "아직 안 만든 것"으로 여기 둔다. 끝나면 README 로 옮긴다.

**구성**: VM 한 대 + Docker Compose(app, mysql, caddy) + GitHub Actions(SSH 로 배포)

| 파일 | 내용 |
|---|---|
| `Dockerfile` | 멀티스테이지. 빌드 스테이지: `corepack enable` → `pnpm install --frozen-lockfile` → `pnpm prisma:generate` → `pnpm build`. 런타임 스테이지: `node:22-slim` 에 `dist/`, `node_modules`(prod 만: `pnpm install --prod --frozen-lockfile`), `prisma/` 복사. 비 root 사용자로 실행 |
| `docker-compose.prod.yml` | `app`(빌드 또는 이미지), `mysql`(포트 외부 비공개, 볼륨, `--innodb-buffer-pool-size=256M` 등 소형 VM 용 메모리 제한), `caddy`(80/443, 볼륨에 인증서 저장). 앱 시작 커맨드: `npx prisma migrate deploy && node dist/main` |
| `Caddyfile` | `api.example.duckdns.org { reverse_proxy app:3000 }` — 두 줄로 TLS 자동 발급 |
| `.github/workflows/deploy.yml` | `main` 푸시 → SSH 접속 → `git pull && docker compose -f docker-compose.prod.yml up -d --build`. 시크릿: `SSH_HOST`, `SSH_USER`, `SSH_KEY` |

**서버**: Oracle Cloud Always Free(ARM, 서울 리전) 또는 월 5천 원대 VPS. 방화벽은 22/80/443 만. 도메인은 DuckDNS 무료 서브도메인으로 충분.

**확인 목록**: `https://도메인/health` 가 200, `/docs` 열림, 3306 이 외부에서 안 열림(`nmap` 또는 `nc -zv`), 컨테이너 재시작 후 데이터 유지(볼륨), `docker compose logs app` 에 요청 로그가 찍힘.

**선택 과제**: 무중단 배포(`--no-deps` + 헬스체크 기반 교체), 이미지를 GHCR 에 푸시하고 서버에서는 pull 만 하기, DB 백업 크론(`mysqldump` → 오브젝트 스토리지).

**빠른 대안**: Render(앱) + Aiven 무료 MySQL. 10분이면 되지만 위 항목을 전부 Render 가 대신 해버려서 배우는 게 적다. 공개 URL 이 급할 때만.

---

## 완료

(아직 없음)
