# 작업 방식 (PR 단위)

## 단위

- 작업 하나 = `docs/REVIEW.md` 항목 하나(또는 사용자가 정한 작업 하나) = PR 하나. `/fix-item <번호>` 가 이 절차를 따른다.
- PR 은 의미 단위의 작은 커밋으로 쪼갠다. "SQL 추가", "포트 변경", "README 안내", "REVIEW 기록" 처럼 커밋 하나가 한 가지 변경만 담는다. 주석 수정·코드 수정·문서 수정은 나눈다.
- `main` 에 직접 커밋·푸시하지 않는다. 브랜치 이름은 `fix/<주제>`, `feat/<주제>`, `docs/<주제>`, `chore/<주제>`.
- 브랜치는 최신 `main` 에서 만든다. 열린 PR 브랜치 위에 쌓지 않는다.

## 커밋 메시지

- Conventional Commits + 한국어 설명. 예: `fix(db): migrate dev 용 전역 권한을 app 계정에 주는 초기화 SQL 추가`
- 타입: feat / fix / docs / chore / refactor / test. 범위는 모듈이나 영역(db, review, readme, floors, claude …).
- 본문에는 "왜" 를 적는다. 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## 자동으로 해도 되는 것 / 먼저 물어볼 것

- 기본은 자동: 브랜치 생성, 커밋, 푸시, `gh pr create`.
- 먼저 설명하고 사용자 답을 들은 뒤 진행:
  1. 비밀 정보·계정·포트 같은 환경 값을 바꾸는 변경
  2. 구조·설계를 정하는 결정 (모듈 경계, 트랜잭션 방식, 에러 형식, 검증 정책)
  3. 1~2단계 학습 영역(`src/floors/**`, `prisma/schema.prisma`)을 건드리는 변경
  4. DB 볼륨 삭제, force push, `reset --hard` 처럼 되돌리기 어려운 명령 (훅이 묻는다)
- PR 병합은 사용자가 한다. README 진행 규칙 2 ("설명할 수 있을 때만 커밋") 를 PR 설명이 도와야 한다. 왜 바꿨는지, 무엇을 어떻게 확인했는지 적는다.

## PR 을 열기 전에

1. `/verify` 로 타입 검사·포맷·컨테이너·헬스체크를 돌리고 결과를 PR 본문에 표로 남긴다.
2. 검증용으로 생긴 파일(마이그레이션, dist, 로그)은 되돌린다. 초기 마이그레이션은 README 1단계의 사용자 작업이라 커밋하지 않는다.
3. REVIEW 항목을 처리했으면 요약의 체크박스를 `[x]` 로, 상세의 `처리` 줄에 `날짜 · 브랜치/커밋 · 확인한 것` 을 적는다. 항목 번호는 바꾸지 않는다. 별도 커밋 `docs(review): N번 처리 기록`.
4. PR 본문: 배경(REVIEW N번) / 변경 / 확인한 것(표) / 남은 것. 끝줄 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## 검증 명령 메모

- `pnpm exec tsc --noEmit --incremental false -p tsconfig.json` — `incremental: true` 라서 `--incremental false` 가 없으면 `dist/*.tsbuildinfo` 가 생긴다.
- 비대화형 셸에서는 `docker` 가 PATH 에 없을 수 있다: `export PATH="$HOME/.docker/bin:$PATH"`.
- `GET /health` 는 `SELECT 1` 만 하므로 테이블이 없어도 통과한다. 테이블이 필요한 확인은 `pnpm prisma:migrate` 와 `pnpm db:seed` 뒤에 한다.
