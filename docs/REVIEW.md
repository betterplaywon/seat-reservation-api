# 점검 기록

아키텍처 · MVP 범위 · 안티패턴 · 에러 유발 지점을 점검한 결과를 항목별로 관리한다.
항목을 처리하면 요약의 체크박스를 `[x]` 로 바꾸고, 상세의 "처리" 줄에 날짜와 한 줄 메모(커밋 해시 등)를 남긴다.
새 점검은 맨 아래에 날짜 섹션을 추가한다. 코드 TODO(`pnpm todo`)와 달리 이 문서는 "고쳐야 할 것"의 목록이다.

심각도

- **차단**: 셋업이나 실행이 막힌다. 다음 단계로 가기 전에 푼다.
- **결함**: 동작은 하지만 결과가 틀리거나, 주석과 실제가 다르다.
- **개선**: 지금은 무해하지만 다음 단계에서 문제가 된다.
- **메모**: 결정이나 참고 사항. 코드 변경이 없을 수도 있다.

근거

- **실행 확인**: 재현 스크립트나 명령으로 직접 확인했다.
- **정적 분석**: 코드를 읽어서 판단했다. 실행하면 결과가 다를 수 있다.
- **문서 근거**: 외부 도구의 문서·소스를 근거로 판단했다. 이 환경에서는 실행하지 못했다.

---

## 2026-11-02 점검

스캐폴딩 상태(비즈니스 로직 전부 TODO)에서 점검했다. `tsc --noEmit` 두 설정 모두 에러 0건, `prisma validate` 통과.
점검 환경: macOS, Node 22.13.1, pnpm 10.28.0, Docker 없음, 3306 에 네이티브 MySQL 9.2 실행 중.

### 요약

- [ ] 1. 차단 · `prisma migrate dev` 가 섀도 DB 권한 오류(P3014)로 실패할 가능성 · 1단계
- [ ] 2. 차단 · 이 머신에 Docker 가 없고 3306 을 네이티브 MySQL 이 점유 · 1단계
- [ ] 3. 결함 · `.env` 의 `APP_TIMEZONE` 이 `date.ts` 에 반영되지 않음 · 1단계
- [ ] 4. 결함 · `HttpExceptionFilter` 주석("응답이 멈춘다")이 실제와 다름 · 주석은 지금, 구현은 5단계
- [ ] 5. 개선 · `ValidationPipe` 와 DTO 기본 데코레이터를 3단계 전에 먼저 켜기 · 3단계 전
- [ ] 6. 개선 · `enableShutdownHooks()` 와 `bootstrap().catch` 추가 · 1단계
- [ ] 7. 개선 · 컨트롤러의 날짜 기본값·검증 (`?date=` 빈 값, ADMIN 조회의 `date` 누락) · 2단계·3단계
- [ ] 8. 개선 · `FloorsController` 에 `@ApiBearerAuth()` 누락 · 3단계
- [ ] 9. 개선 · "오늘" 기본값 계산을 컨트롤러에서 서비스로 · 2단계
- [ ] 10. 개선 · `CurrentUser` 스텁이 일반 `Error` 를 던져 500 · 3단계
- [ ] 11. 메모 · 3단계 TODO 17개를 세 묶음으로 나눠 진행 · 3단계
- [ ] 12. 메모 · 4단계 전 구조 결정: 좌석·층 확인은 트랜잭션 안 직접 조회, `FloorsModule` 의 미사용 export · 4단계
- [ ] 13. 메모 · 자동 테스트·린트 부재. 5단계에 e2e 테스트 1개 · 5단계

### 아키텍처 · MVP 범위 판단 (변경 불필요)

- 모듈 트리: 전역 `ConfigModule`·`PrismaModule` 위에 Health / Users / Auth / Floors / Reservations 가 평면으로 놓인다. Auth 만 Users 를 import 한다. 순환 없음.
- 레이어: Controller → Service → Prisma 3단. Repository 계층 없음. 이 규모에서는 적절하다.
- `common/` 이 Prisma 타입에 의존하지 않도록 `AppRole` 을 분리한 것, 날짜 처리를 `date.ts` 한 곳에 가둔 것은 유지한다.
- MVP 범위: 엔드포인트 10개 · 테이블 4개 · 규칙 8개가 DOMAIN.md 와 코드에서 일치한다. 코드에 문서 밖 기능은 없다.
- 남은 TODO 35개: 1단계 1 · 2단계 4 · 3단계 17 · 4단계 4 · 5단계 8 · 6단계 1.
- ROADMAP 의 "예약 생성은 `ReservationsService.create` 만 경유" 규칙, v2 힌트의 락 순서 고정, v3 힌트의 NULL 유니크 활용은 실무 패턴 그대로다. 유지.

### 상세

#### 1. `prisma migrate dev` 섀도 DB 권한 (차단 · 문서 근거)

- 위치: `.env.example:10` (`DATABASE_URL` 의 `app` 계정), `docker-compose.yml:17` (`MYSQL_USER: app`), `README.md:38`
- 증상: README 4단계 `pnpm prisma:migrate` 가 `P3014 Prisma Migrate could not create the shadow database` 로 실패할 가능성이 높다.
- 원인: MySQL 공식 이미지는 `MYSQL_USER` 계정에 `GRANT ALL ON seat_reservation.*` 만 준다. `migrate dev` 는 섀도 데이터베이스를 새로 만들어 마이그레이션을 검증하므로 서버 전역 `CREATE, ALTER, DROP, REFERENCES ON *.*` 가 필요하다. 운영에서 쓰는 `migrate deploy` 는 섀도 DB 가 필요 없으므로 `app` 계정으로 충분하다.
- 수정 방향 (하나 선택)
  - A. 로컬 개발은 root 로: `.env.example` 을 `DATABASE_URL="mysql://root:root@localhost:3306/seat_reservation"` 으로. 가장 단순하다.
  - B. `app` 유지 + 섀도 DB 만 root: `prisma/schema.prisma` datasource 에 `shadowDatabaseUrl = env("SHADOW_DATABASE_URL")` 추가, `.env.example` 에 root 접속 문자열 추가.
  - C. `app` 에 전역 권한: `docker-compose.yml` 에 초기화 SQL 볼륨(`/docker-entrypoint-initdb.d/`)을 추가하고 `GRANT CREATE, ALTER, DROP, REFERENCES ON *.* TO 'app'@'%';` 를 넣는다. 초기화 SQL 은 볼륨을 처음 만들 때만 실행되므로 이미 띄운 적이 있으면 `docker compose down -v` 가 필요하다.
- 완료 기준: 새 클론에서 README "시작하기" 를 순서대로 실행해 `pnpm prisma:migrate` 가 한 번에 통과하고 `prisma/migrations/` 가 생성된다.
- 처리:

#### 2. Docker 없음 + 3306 포트 점유 (차단 · 실행 확인)

- 위치: `docker-compose.yml:20` (`"3306:3306"`), `.env.example:10`
- 증상: `docker` 명령이 없어 README 1단계 `docker compose up -d` 가 실행되지 않는다. 3306 에는 `/usr/local/mysql/bin/mysqld`(MySQL 9.2) 가 떠 있어 Docker 를 설치해도 포트 바인딩이 충돌한다. `.env.example` 의 `app/app1234` 와 compose 의 `root/root` 는 그 서버에서 거부된다.
- 수정 방향 (하나 선택)
  - A. Docker Desktop 또는 OrbStack 설치 + 포트 변경: `ports: "3307:3306"`, `DATABASE_URL` 의 포트도 3307. `seed-bulk.ts` 가 안내하는 `docker exec ... mysql` 은 컨테이너 내부 접속이라 그대로 둔다. 6단계(배포)에서 어차피 컨테이너로 가므로 이쪽을 권장.
  - B. 네이티브 MySQL 9.2 사용: `CREATE DATABASE seat_reservation; CREATE USER 'app'@'localhost' IDENTIFIED BY 'app1234'; GRANT ALL ON seat_reservation.* TO 'app'@'localhost'; GRANT CREATE, ALTER, DROP, REFERENCES ON *.* TO 'app'@'localhost';` 를 실행하고 `.env` 만 맞춘다. Prisma 6 의 MySQL 9 공식 지원 여부를 먼저 확인할 것.
- 완료 기준: `GET /health` 가 `{ status: 'ok', db: 'ok' }` 를 돌려준다.
- 처리:

#### 3. `.env` 의 `APP_TIMEZONE` 이 `date.ts` 에 반영되지 않음 (결함 · 실행 확인)

- 위치: `src/common/utils/date.ts:10` (`APP_TIMEZONE` 상수), `src/common/utils/date.ts:32` (`todayIn` 의 기본 매개변수)
- 증상: `.env` 에 `APP_TIMEZONE=Pacific/Kiritimati` 를 넣어도 `todayIn()` 은 Asia/Seoul 기준으로 계산한다. 실제 앱과 같은 순서로 `AppModule` 을 import 한 뒤 찍은 값:

  | 항목 | 값 |
  |---|---|
  | `.env` | `APP_TIMEZONE=Pacific/Kiritimati` |
  | `process.env.APP_TIMEZONE` | `Pacific/Kiritimati` |
  | `date.ts` 의 `APP_TIMEZONE` | `Asia/Seoul` |
  | `todayIn()` | `2026-11-02` |
  | `todayIn(process.env.APP_TIMEZONE)` | `2026-11-03` |

- 원인: `APP_TIMEZONE` 상수는 `date.ts` 가 처음 import 되는 순간 평가된다. `app.module.ts` 의 import 문이 `floors.controller.ts` → `date.ts` 를 먼저 끌어오고, `.env` 를 `process.env` 에 넣는 `ConfigModule.forRoot()` 는 그 뒤 `@Module` 데코레이터 안에서 실행된다. 셸 환경변수로 주면 동작하고 `.env` 로 주면 동작하지 않는 상태다. 기본값이 `.env.example` 과 같아 지금은 증상이 없다. 파일 상단 주석의 "부팅 중 한 번만 읽으면 되기 때문" 이라는 근거가 실제로는 성립하지 않는다.
- 수정 방향: 상수를 함수로 바꿔 호출 시점에 읽는다. 기본 매개변수는 호출될 때마다 평가된다. `APP_TIMEZONE` 상수는 `date.ts` 안에서만 쓰이므로 제거해도 된다.

  ```ts
  export function appTimeZone(): string {
    return process.env.APP_TIMEZONE ?? 'Asia/Seoul';
  }

  export function todayIn(timeZone: string = appTimeZone(), now: Date = new Date()): string {
    // 본문 그대로
  }
  ```

- 완료 기준: `.env` 에 `APP_TIMEZONE=Pacific/Kiritimati` 를 임시로 넣고 아래를 실행했을 때 두 값이 같은 날짜다. 확인 후 `.env` 에서 지운다.

  ```bash
  pnpm exec ts-node -e "require('./src/app.module'); const d = require('./src/common/utils/date'); setTimeout(() => console.log('todayIn()=', d.todayIn(), '| todayIn(env)=', d.todayIn(process.env.APP_TIMEZONE)), 50)"
  ```

- 처리:

#### 4. `HttpExceptionFilter` 주석이 실제 동작과 다름 (결함 · 실행 확인)

- 위치: `src/common/filters/http-exception.filter.ts:16` (주석), `src/common/filters/http-exception.filter.ts:19` (`throw exception`), `src/main.ts:17`
- 증상: 주석은 "등록하면 모든 응답이 멈춘다" 고 하지만, Nest 11 이 쓰는 Express 5 에서는 멈추지 않는다. 스텁 필터를 등록한 최소 앱으로 확인한 결과:

  | 요청 | 필터 미등록 | 스텁 필터 등록 |
  |---|---|---|
  | 정상 핸들러 | 200 JSON | 200 JSON (영향 없음) |
  | `ConflictException` | 409 JSON `{ statusCode, error, message }` | 409 **text/html** Express 기본 에러 페이지 |
  | `TypeError` | 500 JSON `Internal server error` | 500 **text/html** Express 기본 에러 페이지 |

  `NODE_ENV=development`(`.env.example` 의 값)에서는 그 HTML 본문에 스택 트레이스와 서버 절대 경로가 그대로 실려 클라이언트에 내려간다.
- 원인: 필터 안에서 다시 throw 하면 Nest 의 라우터 프록시가 잡지 못하고 Express 로 빠져나간다. Express 4 는 비동기 핸들러의 rejection 을 잡지 못해 에러 응답이 끝나지 않았지만(주석은 이 시절 기준), Express 5 는 이를 잡아 기본 에러 핸들러로 보낸다.
- 수정 방향
  - 지금: 주석을 "등록하면 에러 응답이 Express 기본 HTML 페이지로 바뀌고, 개발 모드에서는 스택이 클라이언트에 노출된다" 로 고친다.
  - 5단계 구현 체크리스트: (a) 필터 안에서 throw 하지 않고 `response.status(...).json(...)` 으로 끝낸다. (b) `HttpException` 이 아닌 에러는 500 으로 감싸고 내부 메시지는 응답에 넣지 않는다(로그에만). (c) Prisma `P2002` 를 409 로 바꾸는 자리를 서비스로 할지 필터로 할지 정하고 이유를 적는다. (d) 응답 형식은 DOMAIN.md 5절 `{ statusCode, error, message, path, timestamp }`.
- 완료 기준: 구현 후 검증 실패 400(예: `POST /auth/login` 에 빈 본문)과 강제로 `TypeError` 를 던지는 핸들러의 500 이 모두 `content-type: application/json` 이고 DOMAIN.md 형식이다. 500 응답에 내부 메시지와 스택이 없다.
- 처리:

#### 5. `ValidationPipe` 와 DTO 기본 데코레이터를 3단계 전에 켜기 (개선 · 정적 분석)

- 위치: `src/main.ts:11`, `src/auth/dto/*.ts`, `src/reservations/dto/create-reservation.dto.ts`
- 증상: 5단계까지 DTO 가 전혀 검증되지 않는다. 3·4단계에서 `POST /auth/signup` 에 `email` 이 빠지거나 `POST /reservations` 의 `seatId` 가 문자열이면 Prisma 타입 오류로 500 이 난다.
- 수정 방향: 5단계 TODO 중 "파이프 등록 + DTO 최소 데코레이터" 만 3단계 시작 전으로 앞당긴다. 옵션 비교와 400 응답 형식 학습은 5단계에 그대로 둔다.

  ```ts
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  ```

  주의: `whitelist: true` 는 class-validator 데코레이터가 하나도 없는 속성을 본문에서 제거한다. 파이프만 먼저 켜면 `dto.email` 이 `undefined` 가 되므로, 켜는 시점에 `@IsEmail()`, `@IsString()`, `@MinLength(8)`, `@IsInt()`, `@Matches(/^\d{4}-\d{2}-\d{2}$/)` 를 함께 붙인다. `@ApiProperty` 는 Swagger 용이라 여기에 포함되지 않는다.
- 완료 기준: `POST /reservations` 에 `{ "seatId": "abc", "date": "2026-11-10" }` 를 보내면 400, `POST /auth/signup` 에 `email` 없이 보내면 400, 정상 본문은 그대로 통과한다.
- 처리:

#### 6. 종료 훅과 부팅 실패 처리 (개선 · 정적 분석)

- 위치: `src/main.ts:33` 앞, `src/main.ts:37`
- 증상: `app.enableShutdownHooks()` 가 없어 SIGTERM/SIGINT 에 `PrismaService.onModuleDestroy`(`$disconnect`) 가 실행되지 않는다. 로컬에서는 MySQL 이 끊긴 연결을 알아서 정리하므로 보이지 않고, 6단계 컨테이너 종료(`docker stop`) 때 문제가 된다. `bootstrap()` 에 `.catch` 가 없어 부팅 실패(예: DB 접속 불가) 시 unhandled rejection 스택만 찍히고 끝난다. fail-fast 라 동작 자체는 문제가 아니다.
- 수정 방향:

  ```ts
  app.enableShutdownHooks();
  await app.listen(port);
  // ...
  bootstrap().catch((err) => {
    console.error('bootstrap failed', err);
    process.exit(1);
  });
  ```

- 완료 기준: `pnpm start:dev` 후 Ctrl+C 로 종료할 때 Prisma 연결 종료가 확인된다. `PrismaService.onModuleDestroy` 에 로그 한 줄을 임시로 넣어 보면 된다.
- 처리:

#### 7. 컨트롤러의 날짜 기본값·검증 (개선 · 정적 분석)

- 위치: `src/floors/floors.controller.ts:27-28`, `src/reservations/reservations.controller.ts:45-46`
- 증상
  - `GET /floors/1/seats?date=` 처럼 값이 빈 문자열이면 `??` 는 기본값으로 바꾸지 않아 `''` 가 서비스로 넘어간다. 같은 키가 두 번 오면(`?date=a&date=b`) Express 5 기본 파서가 배열을 넘긴다.
  - `GET /reservations?date=` 는 `date` 가 없거나 형식이 틀려도 그대로 서비스로 간다. TODO 에 검증 언급이 없다.
- 수정 방향: 2단계 TODO 의 `isDateOnly` 검증을 두 컨트롤러에 같은 방식으로 적용한다. 빈 값을 "없음" 으로 보고 오늘로 처리할지 400 으로 할지 정해서 DOMAIN.md API 표에 적는다. ADMIN 조회는 `date` 필수(없으면 400)가 단순하다.
- 완료 기준: `?date=`, `?date=2026-02-30`, `?date=abc` 가 각각 정한 대로(오늘 또는 400) 응답하고, DOMAIN.md 에 반영됐다.
- 처리:

#### 8. `FloorsController` 의 `@ApiBearerAuth()` 누락 (개선 · 정적 분석)

- 위치: `src/floors/floors.controller.ts:10-11`
- 증상: 3단계에서 가드를 붙이면 Swagger UI 가 `/floors` 요청에 토큰을 보내지 않아 401 이 난다. `ReservationsController` 는 클래스에, `UsersController` 는 메서드에 붙어 있어 방식도 제각각이다.
- 수정 방향: 보호되는 컨트롤러는 클래스 레벨 `@ApiBearerAuth()` 로 통일한다.
- 완료 기준: Swagger 의 Authorize 한 번으로 `/floors`, `/users/me`, `/reservations/*` 가 모두 호출된다.
- 처리:

#### 9. "오늘" 기본값 계산을 서비스로 (개선 · 정적 분석)

- 위치: `src/floors/floors.controller.ts:28`
- 증상: 컨트롤러가 `todayIn()` 으로 도메인 기본값을 정한다. R4 검증 때문에 `ReservationsService` 도 같은 계산이 필요해져 "오늘" 을 정하는 자리가 두 레이어에 흩어진다.
- 수정 방향: 서비스 시그니처를 `getSeatStatus(floorId, date?: string, currentUserId?)` 로 두고 `date ?? todayIn()` 을 서비스가 맡는다. 컨트롤러는 형식 검증과 전달만 한다.
- 완료 기준: `src/` 에서 `todayIn()` 호출이 서비스와 유틸에만 있다.
- 처리:

#### 10. `CurrentUser` 스텁의 예외 종류 (개선 · 정적 분석)

- 위치: `src/common/decorators/current-user.decorator.ts:15`
- 증상: 다른 스텁은 401/403/501 을 돌려주는데 이것만 일반 `Error` 라 500 이 나고 응답에 아무 힌트가 없다. 3단계 구현 중 "왜 500 이지" 로 시간을 잃기 쉽다.
- 수정 방향: `throw new NotImplementedException('CurrentUser decorator')` 로 바꾸거나, 3단계에서 바로 구현한다.
- 완료 기준: 3단계 구현으로 자연 해소.
- 처리:

#### 11. 3단계 TODO 분할 (메모)

- 3단계 TODO 17개가 `auth/`, `users/`, `common/guards`, `common/decorators`, `floors`, `reservations`, `prisma/seed.ts`, `.env.example`, `pnpm-workspace.yaml` 에 흩어져 있다. 한 번에 하면 어디서 막혔는지 알기 어렵다.
- 권장 순서
  1. 가입·로그인: `pnpm add @nestjs/jwt bcrypt && pnpm add -D @types/bcrypt`, `UsersService` 3개 메서드, `AuthService`, `JwtModule` 등록, 관리자 시드. 끝: Swagger 에서 가입 → 로그인 → `accessToken` 이 나온다.
  2. 가드·데코레이터: `JwtAuthGuard`, `CurrentUser`, `RolesGuard`. 끝: `/users/me` 가 토큰 없이는 401, 있으면 내 정보.
  3. 보호 적용: `FloorsController`·`ReservationsController` 에 가드, `GET /reservations` 에 `@Roles('ADMIN')`, `findAllByDate` 구현. 끝: USER 가 403.
- 처리:

#### 12. 4단계 전 구조 결정 (메모)

- `ReservationsService.create` 가 좌석·층의 존재/활성을 확인할 때 `FloorsService` 를 재사용할지 Prisma 를 직접 쓸지 정한다. v2 에서 좌석 행을 잠그는 트랜잭션 안에서 같이 조회해야 하므로 트랜잭션 내부 직접 조회가 단순하다. 그 경우 `src/floors/floors.module.ts:8` 의 `exports: [FloorsService]` 는 쓰이지 않으므로 지우거나, 남길 이유를 주석으로 적는다.
- 결정과 이유는 DOMAIN.md 6절 "결정 기록" 에 한 줄 추가한다.
- 처리:

#### 13. 자동 테스트·린트 부재 (메모)

- 동시성 스크립트 외에 회귀를 잡는 장치가 없다. 학습 MVP 라 허용 범위.
- 5단계에서 `@nestjs/testing` + supertest 로 e2e 테스트 1개(`/health` 와 400 응답 형식)만 붙이면 6단계 배포 전 체크로 쓸 수 있다. ESLint 는 `nest new` 기본 설정을 가져오면 된다.
- 처리:

### 재검증 명령

항목을 고친 뒤 아래를 다시 돌린다.

```bash
pnpm exec tsc --noEmit -p tsconfig.json          # src + scripts + prisma 타입체크
pnpm exec tsc --noEmit -p tsconfig.build.json    # 빌드 대상만
pnpm exec prisma validate                        # 스키마 문법 (.env 의 DATABASE_URL 필요)
pnpm todo                                        # 남은 TODO
```

`tsc --noEmit` 은 `incremental: true` 때문에 `dist/*.tsbuildinfo` 를 만든다. `.gitignore` 의 `dist/` 에 걸리므로 커밋되지는 않는다.
