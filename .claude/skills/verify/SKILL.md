---
name: verify
description: PR 을 열기 전이나 변경 뒤에 이 프로젝트의 표준 검증(타입 검사, prettier, prisma validate, MySQL 컨테이너, 서버 기동과 /health, 남은 산출물 점검)을 한 번에 돌리고 표로 보고한다. "검증해", "확인해 봐", "제대로 도는지 봐", "PR 올리기 전에 체크해" 같은 요청이나 /fix-item 의 4단계에서 쓴다.
---

# 표준 검증

순서대로 실행하고, 실패하면 그 자리에서 원인을 설명한다. 한 항목이 실패해도 나머지를 끝까지 돌린 뒤 표로 정리한다.

## 0. 준비

```bash
export PATH="$HOME/.docker/bin:$PATH"   # 비대화형 셸에는 docker 가 PATH 에 없다
```

## 1. 타입 검사

```bash
pnpm exec tsc --noEmit --incremental false -p tsconfig.json
pnpm exec tsc --noEmit --incremental false -p tsconfig.build.json
```

`--incremental false` 가 없으면 `dist/*.tsbuildinfo` 가 생긴다. 실패하면 오류 전체를 보여 주고 고친 뒤 다시 돌린다.

## 2. 포맷과 스키마

```bash
pnpm exec prettier --check "src/**/*.ts" "scripts/**/*.ts" "prisma/**/*.ts"
pnpm exec prisma validate
```

포맷이 틀린 파일은 `pnpm format` 으로 고치고 별도 커밋(`chore: 포맷`)으로 둔다. `prisma validate` 는 `.env` 의 `DATABASE_URL` 이 필요하다.

## 3. DB 컨테이너

```bash
docker compose up -d --wait && docker compose ps
```

`seat-mysql` 이 `running (healthy)` 여야 한다. 볼륨이 처음 생기면 `docker/mysql/init` 의 SQL 이 실행된다.

## 4. 서버 기동 + 헬스체크

개발 서버가 이미 떠 있으면(`lsof -i :3000`) 그 포트로 확인한다. 아니면 빌드해서 다른 포트로 잠깐 띄운다. 한 번의 명령 안에서 띄우고 확인하고 끝낸다.

```bash
pnpm build && (
  PORT=3011 node dist/main > "$TMPDIR/seat-api-verify.log" 2>&1 & pid=$!
  sleep 4
  curl -s -w '\n%{http_code}\n' localhost:3011/health
  kill $pid
)
```

기대: `{"status":"ok","db":"ok"}` 와 200. `db` 가 `error` 면 `.env` 의 `DATABASE_URL`(포트 3307) 과 컨테이너를 확인한다.
`/health` 는 `SELECT 1` 만 하므로 테이블이 없어도 통과한다. 완료 기준이 테이블을 요구하면 `pnpm prisma:migrate` 와 `pnpm db:seed` 를 돌린 뒤, **검증용으로 생긴 `prisma/migrations` 는 커밋하지 않는다** (README 1단계의 사용자 작업).

## 5. 남은 TODO 와 작업 트리

```bash
pnpm todo | wc -l
git status --short
```

`dist/`, 로그, 검증용 마이그레이션이 남아 있으면 지운다.

## 보고 형식

| 확인 | 명령 | 결과 |
|---|---|---|
| 타입 검사 | tsc --noEmit (두 설정) | 통과 / 오류 N개 |
| 포맷 | prettier --check | 통과 / 파일 N개 |
| 스키마 | prisma validate | 통과 |
| MySQL | docker compose ps | running (healthy) |
| /health | curl :3011/health | 200 · db ok |
| 작업 트리 | git status | 깨끗함 / 남은 파일 |

실패한 줄이 있으면 표 아래에 원인과 다음 행동을 한두 문장으로 적는다.
