# Seat Reservation API

가상 회사 **Gapsang Korea** 의 사내 좌석 예약 API. NestJS + MySQL + Prisma.
백엔드 기초(인증·DB 모델링·트랜잭션·동시성·검증·배포)를 작은 범위 안에서 전부 다루는 것이 목표다.

> 이 저장소는 **MVP 스캐폴딩**이다. 구조·설정·문서만 잡혀 있고, 학습 대상인 로직은 `TODO [n단계]` 주석으로 비워져 있다.
> `pnpm todo` 로 남은 TODO 를 단계별로 볼 수 있다.

| 문서 | 내용 |
|---|---|
| [docs/DOMAIN.md](docs/DOMAIN.md) | 가상 회사 설정, 용어, 비즈니스 규칙(R1~R8), ERD, API 명세, 결정 기록. **구현 전에 먼저 읽는다** |
| [docs/ROADMAP.md](docs/ROADMAP.md) | MVP 이후 확장 항목. 각 항목이 구현 컨텍스트로 쓰일 수 있게 적혀 있다 |
| [docs/TERMS.md](docs/TERMS.md) | 단계별 용어 체크리스트와 용어 노트 템플릿 |

## 요구사항

- Node.js 20 이상 (`.nvmrc` 참고)
- pnpm 10 이상 — `corepack enable` 한 번이면 `package.json` 의 `packageManager` 에 적힌 버전이 자동으로 쓰인다
- Docker (로컬 MySQL 용)

## 시작하기

```bash
# 0. (최초 1회) pnpm 활성화
corepack enable

# 1. MySQL 띄우기
docker compose up -d    # MySQL 8.4 가 호스트 포트 3307 로 뜬다. 볼륨이 처음 생길 때 docker/mysql/init 의 SQL 이 한 번 실행된다

# 2. 환경변수
cp .env.example .env

# 3. 의존성 설치 + Prisma 클라이언트 생성
pnpm install
pnpm prisma:generate

# 4. 테이블 생성 (마이그레이션) + 초기 데이터 (층 2개, 좌석 80개)
pnpm prisma:migrate     # 이름을 물으면 init 등 아무 이름
pnpm db:seed

# 5. 개발 서버
pnpm start:dev
```

- 헬스체크: http://localhost:3000/health → `{ status: 'ok', db: 'ok' }` 가 나오면 서버와 DB 연결 성공
- API 문서(Swagger): http://localhost:3000/docs — 프론트 대신 이 화면에서 API 를 호출하며 개발한다
- DB 내용 직접 보기: `pnpm prisma:studio`

> **pnpm 10 설치 스크립트 정책**: pnpm 10 은 의존성의 postinstall 스크립트를 기본으로 막는다.
> Prisma 처럼 설치 시 스크립트가 필요한 패키지는 `pnpm-workspace.yaml` 의 `onlyBuiltDependencies` 에 허용해 두었다.
> 새 패키지를 추가했는데 `Ignored build scripts` 경고가 뜨면, 그 패키지가 정말 스크립트가 필요한지 확인한 뒤 목록에 추가한다.

## 구조

```
prisma/
  schema.prisma          # 테이블 정의 (User / Floor / Seat / Reservation)
  seed.ts                # 초기 데이터: 본사 7층·8층, 좌석 80개
src/
  main.ts                # 진입점. 전역 파이프/필터/인터셉터 등록 자리
  app.module.ts          # 루트 모듈
  prisma/                # PrismaClient 를 Nest 에 연결
  health/                # GET /health (유일하게 완성된 엔드포인트)
  auth/                  # POST /auth/signup, /auth/login
  users/                 # GET /users/me
  floors/                # GET /floors, GET /floors/:id/seats?date=   ← 읽기 쪽 학습(조인·인덱스·EXPLAIN)
  reservations/          # POST /reservations, GET /reservations/me, GET /reservations?date= (ADMIN), PATCH /reservations/:id/cancel
                         #                                             ← 쓰기 쪽 학습(트랜잭션·락·동시성)
  common/
    guards/              # JwtAuthGuard, RolesGuard
    decorators/          # @CurrentUser(), @Roles()
    filters/             # HttpExceptionFilter
    interceptors/        # LoggingInterceptor
    utils/date.ts        # 'YYYY-MM-DD' ↔ DB, "오늘(KST)" 계산 (완성본 — 타임존 함정을 한 곳에 가둬둠)
scripts/
  concurrency-test.ts    # 동시 요청 테스트 2종 (완성본)
  seed-bulk.ts           # EXPLAIN 실험용 대량 데이터 (완성본)
docker/
  mysql/init/            # MySQL 볼륨 최초 생성 시 한 번 실행되는 SQL (app 계정에 migrate dev 용 권한)
docs/
  DOMAIN.md / ROADMAP.md / TERMS.md
```

요청 하나의 흐름: `미들웨어 → 가드 → 인터셉터(전) → 파이프 → 컨트롤러 → 서비스 → Prisma → MySQL → 인터셉터(후) → (에러 시) 예외 필터`

## 단계별 진행

| 단계 | 할 일 | TODO 위치 | 끝났다는 기준 |
|---|---|---|---|
| 1 | 셋업·구조 이해 | `app.module.ts` | 모듈 트리를 그릴 수 있고, 환경변수 누락 시 부팅이 실패한다 |
| 2 | 층·좌석 조회 (AI 없이 직접) | `floors/`, `schema.prisma` | `GET /floors`, `GET /floors/:id/seats?date=` 가 동작하고, `pnpm seed:bulk` 후 인덱스 전/후 EXPLAIN 을 아래 표에 적었다 |
| 3 | 인증·인가 | `auth/`, `users/`, `common/guards`, `common/decorators`, `reservations.service.ts#findAllByDate` | 가입→로그인→토큰으로 `/users/me` 호출이 되고, USER 가 `GET /reservations?date=` 에서 403 을 받는다 |
| 4 | 예약 생성·취소 (핵심) | `reservations/reservations.service.ts` | 동시성 테스트 두 시나리오 모두 201 이 정확히 1개. v1/v2/v3 결과를 아래 표에 기록했다 |
| 5 | 검증·에러·로깅 | `main.ts`, `common/filters`, `common/interceptors`, `dto/` | 잘못된 입력에 400, 에러 응답 형식이 통일됐고, 모든 요청이 로그에 남는다 |
| 6 | 배포 | `docker-compose.yml`, `docs/ROADMAP.md` 의 "배포" 섹션 | `docker compose up` 한 번으로 앱+DB 가 뜨고, HTTPS 도메인으로 `/health` 가 열린다 |

3단계에서 추가로 설치: `pnpm add @nestjs/jwt bcrypt && pnpm add -D @types/bcrypt`

## 진행 규칙

1. **1~2단계는 AI 없이** 공식 문서만 보고 직접 작성한다.
2. 3단계부터 AI 를 써도 되지만, **생성된 코드를 한 줄씩 설명할 수 있을 때만 커밋**한다. 설명이 안 되면 커밋하지 않는다.
3. 새 용어를 만나면 `docs/TERMS.md` 의 템플릿(정의 / 내 코드의 위치 / 면접 질문)을 채운다. 세 칸을 못 채우면 아직 모르는 것이다.
4. 금요일마다 그 주 용어를 노트 안 보고 말로 설명해본다.
5. 기능을 더 넣고 싶어지면 코드 대신 `docs/ROADMAP.md` 에 적는다. MVP 범위는 `docs/DOMAIN.md` 가 기준이다.

## 실험 기록 (직접 채울 것)

### 동시성 테스트 — 10개 동시 요청

```bash
pnpm test:concurrency                 # seat: 사용자 10명이 같은 좌석·같은 날짜
SCENARIO=user pnpm test:concurrency   # user: 한 사용자가 좌석 10개를 같은 날짜에
```

| 버전 | 방식 | seat 시나리오 201 | user 시나리오 201 | 비고 |
|---|---|---|---|---|
| v1 | 조회 후 insert (보호 없음) | | | |
| v2 | 트랜잭션 + `SELECT … FOR UPDATE` (seats, users 행) | | | |
| v3 | 유니크 제약 2개 + P2002 → 409 | | | |

v3 에서 "취소 후 재예약(R7)"과 유니크 제약의 충돌을 어떻게 풀었는가:

(여기에)

### 인덱스 전/후 EXPLAIN (`pnpm seed:bulk` 이후)

```
-- 쿼리:
-- 전 (type / key / rows):
-- 후 (type / key / rows):
-- 추가한 인덱스와 컬럼 순서를 그렇게 정한 이유:
```

### AI 활용 방식

어디까지 직접 작성했고, 어디에 AI 를 썼는지. (면접에서 그대로 말할 수 있는 수준으로)
