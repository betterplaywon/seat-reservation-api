---
name: verify
description: PR 을 열기 전이나 변경 뒤에 이 프로젝트의 표준 검증(CI 와 같은 게이트 - lint, 타입 검사, 테스트, 빌드, E2E - 와 prisma validate, MySQL 컨테이너, 기능별 시나리오, 남은 산출물 점검)을 한 번에 돌리고 표로 보고한다. "검증해", "확인해 봐", "제대로 도는지 봐", "PR 올리기 전에 체크해" 같은 요청이나 /fix-item 의 4단계, 머지 전 독립 검증에서 쓴다.
---

# 표준 검증

순서대로 실행하고, 실패하면 그 자리에서 원인을 설명한다. 한 항목이 실패해도 나머지를 끝까지 돌린 뒤 표로 정리한다.
게이트 5개는 CI 의 verify 잡(`.github/workflows/ci.yml`)과 같은 명령이다. 로컬에서 통과하면 CI 도 통과해야 한다.

## 0. 준비

```bash
export PATH="$HOME/.docker/bin:$PATH"   # 비대화형 셸에는 docker 가 PATH 에 없다
docker compose up -d --wait && docker compose ps
```

`seat-mysql` 이 `running (healthy)` 여야 한다. 볼륨이 처음 생기면 `docker/mysql/init` 의 SQL 이 실행된다.

## 1. 게이트

```bash
pnpm lint        # eslint (eslint.config.mjs)
pnpm typecheck   # tsc --noEmit, tsconfig.json 과 tsconfig.build.json 두 설정
pnpm test        # jest (src/**/*.spec.ts) + 가드 훅 테스트
pnpm build       # nest build → dist/
pnpm e2e         # dist/main 을 3011 포트에 띄워 test/e2e/*.e2e.mjs 실행
```

- `pnpm typecheck` 는 `--incremental false` 로 돌아서 `dist/*.tsbuildinfo` 를 만들지 않는다.
- `pnpm e2e` 는 `pnpm build` 뒤에 돌린다. DB 연결 정보는 로컬 환경 설정에서 온다(호스트 포트 3307).
- `/health` 는 `SELECT 1` 만 하므로 테이블이 없어도 통과한다. 완료 기준이 테이블을 요구하면 `pnpm prisma:migrate` 와 `pnpm db:seed` 를 돌린 뒤, **검증용으로 생긴 `prisma/migrations` 는 커밋하지 않는다** (README 1단계의 사용자 작업).

## 2. 스키마와 포맷

```bash
pnpm exec prisma validate
pnpm exec prettier --check "src/**/*.ts" "scripts/**/*.ts" "prisma/**/*.ts"
```

포맷은 게이트가 아니다(편집 훅이 고친 파일을 정리한다). 이번에 바꾼 파일이 경고에 있으면 `pnpm format` 으로 고치고 별도 커밋(`chore: 포맷`)으로 둔다. 손대지 않은 파일의 경고는 보고만 한다.

## 3. 기능별 시나리오

바뀐 기능에 해당하는 `features/*.md` 를 읽고 그 시나리오를 실제 서버에서 따라 한다. 목록과 작성법은 `features/README.md`. 새 API 를 만들었는데 시나리오 파일이 없으면 같은 PR 에서 추가한다.

머지 전 독립 검증(CLAUDE.md '머지 조건')은 이 단계를 **코드를 쓰지 않은 에이전트**가 한다. 증거(명령과 응답)를 PR 본문 4번에 붙인다.

## 4. 남은 TODO 와 작업 트리

```bash
pnpm todo | wc -l
git status --short
```

`dist/`, 로그, 검증용 마이그레이션이 남아 있으면 지운다.

## 보고 형식

| 확인 | 명령 | 결과 |
|---|---|---|
| 린트 | pnpm lint | 통과 / 오류 N개 |
| 타입 검사 | pnpm typecheck | 통과 / 오류 N개 |
| 테스트 | pnpm test | N개 통과 |
| 빌드 | pnpm build | 통과 |
| E2E | pnpm e2e | N개 통과 |
| 스키마 | prisma validate | 통과 |
| MySQL | docker compose ps | running (healthy) |
| 시나리오 | features/<이름>.md | PASS / FAIL (증거) |
| 작업 트리 | git status | 깨끗함 / 남은 파일 |

실패한 줄이 있으면 표 아래에 원인과 다음 행동을 한두 문장으로 적는다.
