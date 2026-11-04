---
paths:
  - "prisma/**"
  - "src/prisma/**"
  - "docker-compose.yml"
  - "docker/**"
  - ".env.example"
---
# Prisma · MySQL · Docker 규칙

## 로컬 DB

- MySQL 8.4 는 `docker compose up -d --wait` 로 띄운다. 서비스 `mysql`, 컨테이너 `seat-mysql`, 호스트 포트 **3307** (이 Mac 의 네이티브 MySQL 9.2 가 3306 을 쓴다).
- `docker/mysql/init/*.sql` 은 볼륨이 **처음 만들어질 때 한 번만** 실행된다. 바꾼 뒤 다시 적용하려면 `docker compose down -v` 로 볼륨을 지워야 하고 데이터도 같이 사라진다. 사용자 확인 후에만 실행한다 (`/db-reset`).
- `app` 계정에는 `prisma migrate dev` 의 섀도 DB 생성용으로 `CREATE, ALTER, DROP, REFERENCES ON *.*` 가 init SQL 로 주어져 있다. `migrate deploy` 에는 필요 없다. 운영 계정에는 주지 않는다.

## 마이그레이션

- 스키마 변경 → `pnpm prisma:migrate` (= `prisma migrate dev`) 로 마이그레이션 파일을 만든다. `prisma db push` 는 이력이 남지 않으므로 쓰지 않는다.
- 이미 적용된 `prisma/migrations/*/migration.sql` 은 고치지 않는다. 새 마이그레이션을 만든다.
- 초기 마이그레이션은 README 1단계의 사용자 작업이다. 검증용으로 만들었다면 커밋 전에 지운다.
- `migrate dev` 는 **시드를 자동 실행하지 않는다** (`migrate reset` 만 실행한다). 마이그레이션 뒤에는 `pnpm db:seed` 를 따로 돌린다.
- `package.json` 의 `prisma.seed` 설정은 Prisma 7 에서 `prisma.config.ts` 로 옮겨야 한다 (REVIEW 14번). 지금은 바꾸지 않는다.

## 스키마·시드

- 스키마의 `TODO [2단계]`, `TODO [4단계]` (인덱스·유니크 제약) 는 사용자가 직접 설계한다. 제안은 채팅으로 한다.
- 시드는 멱등해야 한다. `upsert` 를 유지하고 여러 번 돌려도 같은 결과가 나와야 한다.
- 관리자 계정 시드(3단계)의 이메일·비밀번호는 환경변수(`ADMIN_EMAIL`, `ADMIN_PASSWORD`)에서 읽고 `.env.example` 에 플레이스홀더를 추가한다.

## 환경변수

- `.env.example` 에 새 변수를 추가할 때는 용도 주석과 플레이스홀더 값을 함께 적는다. 실제 값은 `.env` 에만 둔다.
- `DATABASE_URL` 의 계정·포트는 `docker-compose.yml` 과 항상 맞춘다. 둘 중 하나를 바꾸면 같은 커밋에서 README 도 맞춘다.
