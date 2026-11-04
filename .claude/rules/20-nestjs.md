---
paths:
  - "src/**/*.ts"
---
# NestJS 코드 규칙

요청 흐름: 미들웨어 → 가드 → 인터셉터(전) → 파이프 → 컨트롤러 → 서비스 → Prisma → MySQL → 인터셉터(후) → (에러 시) 예외 필터. 각 층의 역할을 섞지 않는다.

## 층 나누기

- 컨트롤러는 HTTP 만 다룬다: 라우팅, DTO 받기, 상태코드, Swagger 데코레이터. 기본값 계산·조회·규칙 판단은 서비스로 보낸다 (REVIEW 9번).
- 서비스가 비즈니스 규칙(R1~R8)과 트랜잭션을 가진다. 규칙을 구현한 줄에는 `// R2` 처럼 번호를 단다.
- DB 접근은 `PrismaService` 로만 한다. 컨트롤러에서 Prisma 를 직접 부르지 않는다. 예약 생성은 `ReservationsService.create` 만 경유한다.
- 모듈 간 참조는 모듈 `exports` 를 통해서만 한다. 쓰지 않는 export 는 남기지 않거나 이유를 주석으로 적는다 (REVIEW 12번).

## 설정값과 날짜

- `process.env` 를 **모듈 로드 시점**에 읽지 않는다. 파일 최상단 `const X = process.env.X` 는 `ConfigModule.forRoot()` 가 `.env` 를 읽기 전에 평가된다 (REVIEW 3번). 함수 안에서 읽거나 `ConfigService` 를 주입한다.
- 날짜와 "오늘(Asia/Seoul)" 계산은 `src/common/utils/date.ts` 에서만 한다. 다른 곳에서 `new Date()` 로 날짜 문자열을 만들지 않는다 (DOMAIN.md 3절). 날짜 형식은 `YYYY-MM-DD` 하나뿐이다.

## 에러와 응답

- 예상 가능한 실패는 `HttpException` 계열로 던진다. 400 입력 오류·규칙 위반(R4·R5), 401 인증 실패, 403 권한·소유권(R6·R8), 404 없음, 409 충돌(R2·R3, 이미 취소, 이메일 중복). 일반 `Error` 는 500 이 되고 응답에 힌트가 없다 (REVIEW 10번).
- 에러 응답 형식은 `{ statusCode, error, message, path, timestamp }` 로 통일한다 (5단계, `HttpExceptionFilter`). 필터 안에서 다시 throw 하지 않는다 (REVIEW 4번).
- 입력은 DTO + `class-validator` 데코레이터로 검증한다. `ValidationPipe({ whitelist: true })` 는 데코레이터 없는 속성을 **조용히 지운다**. DTO 의 모든 속성에 데코레이터를 둔다 (REVIEW 5번).
- 쿼리 `?date=` 는 빈 문자열·형식 오류를 400 으로 거른다 (REVIEW 7번).

## 부팅

- `main.ts` 의 `bootstrap()` 은 `.catch` 로 실패를 로그에 남기고 종료 코드 1 로 끝낸다. `app.enableShutdownHooks()` 로 Prisma 연결을 정리한다 (REVIEW 6번).

## 스타일

- 포맷은 `.prettierrc` (single quote, trailing comma, 100자) 를 따른다. 파일을 고치면 훅이 prettier 를 돌린다.
- 새 엔드포인트에는 `@ApiTags`, 인증이 필요하면 클래스 레벨 `@ApiBearerAuth()` (REVIEW 8번).
- `TODO [n단계]` 주석은 구현할 때만 지운다.
