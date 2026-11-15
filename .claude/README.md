# .claude — 이 저장소에서 Claude Code 가 따르는 설정

Claude Code 가 자동으로 읽는 곳이다. 여기는 파일 목록이고, 장치마다 "무엇인지 / 왜 넣었는지 / 직접 확인하는 명령" 은 `docs/AGENT-SETUP.md` 에 있다. 작업 규칙의 본문은 루트 `CLAUDE.md`.

| 경로 | 역할 | 언제 적용되나 |
|---|---|---|
| `../CLAUDE.md` | 에이전트 작업 규칙: 게이트, 브랜치·커밋·PR, 자율 범위, 머지 조건, 보고 | 항상 |
| `rules/00-project.md` | 프로젝트 성격, 학습 규칙, 비밀 정보, 언어 | 항상 |
| `rules/20-nestjs.md` | NestJS 코드 규칙 (층 분리, 설정값, 에러 형식, 검증) | `src/**/*.ts` 를 다룰 때 |
| `rules/30-prisma-db.md` | Prisma·MySQL·Docker 규칙 | `prisma/**`, `docker/**`, compose, `.env.example` |
| `rules/40-docs.md` | 문서 갱신 규칙 | `docs/**`, `README.md` |
| `rules/50-learning-zones.md` | 1~2단계 학습 영역 보호 | `src/floors/**`, `prisma/schema.prisma` |
| `skills/fix-item` | `/fix-item 3` — REVIEW 항목 하나를 설명 → 브랜치 → 커밋 → 검증 → PR → (조건이 맞으면) 머지 | 호출 시 (Claude 도 호출) |
| `skills/verify` | `/verify` — 게이트 5개·스키마·컨테이너·기능별 시나리오(`features/`) 표 | 호출 시 (Claude 도 호출) |
| `skills/db-reset` | `/db-reset` — 볼륨 삭제(사용자가 직접) 후 재생성, 마이그레이션, 시드 | 사용자만 호출 가능 |
| `skills/term` | `/term 커넥션 풀` — TERMS.md 형식 용어 초안 (파일은 안 건드림) | 호출 시 (Claude 도 호출) |
| `hooks/session-start.mjs` | 브랜치·열린 PR·REVIEW 진행률·컨테이너 상태·최근 보고서를 컨텍스트에 주입 | 세션 시작 |
| `hooks/guard-bash.mjs` | 되돌리기 어렵거나 사용자 몫인 명령을 **차단**하고, 커밋 전에 lint·타입 검사를 돌린다 | Bash 실행 전 |
| `hooks/guard-bash.test.mjs` | 가드 훅의 판정을 고정하는 테스트 (`pnpm test` 에 포함) | 테스트 |
| `hooks/pre-commit-check.sh` | `git commit` 전: `.env` 스테이징 차단, 비밀 정보 패턴 확인 | Bash 실행 전 |
| `hooks/pre-edit-guard.sh` | 학습 영역·적용된 마이그레이션·TERMS.md·`.env` 편집 전 확인 | 파일 편집 전 |
| `hooks/post-format.sh` | 수정한 `.ts` 를 prettier 로 정리 | 파일 편집 후 |
| `hooks/on-stop.mjs` | 실행이 멈추면 macOS 알림 + 마지막 답변을 `.audit/reports/<날짜>.md` 에 덧붙임 | 실행 종료 |
| `hooks/on-notify.mjs` | Claude 가 입력을 기다릴 때 macOS 알림 | 알림 |
| `hooks/_shared.mjs` | 위 `.mjs` 훅의 공용 헬퍼 | - |
| `settings.json` | 훅 등록, 권한 허용·금지 목록, pstack 플러그인 | 항상 (커밋됨) |
| `../.agents/playbooks/seat-pr.md` | pstack 플레이북의 PR 단계를 이 저장소 규칙으로 덧씌움 | PR 을 열거나 머지할 때 |

## 알아둘 것

- 훅은 **Claude 의 도구 호출**에만 걸린다. 터미널에서 직접 치는 명령에는 아무 영향이 없다.
- 가드 훅은 "확인" 이 아니라 **차단**이다 (종료 코드 2). 막힌 이유와 대안이 Claude 에게 돌아간다. 편집 훅(`pre-edit-guard.sh`)과 비밀 정보 검사는 한 번 더 묻는 방식이다.
- 개인 설정(권한 허용 목록 등)은 `settings.local.json` 에 둔다. `.gitignore` 에 들어 있어 커밋되지 않는다.
- 훅이나 `settings.json` 을 고친 뒤에는 `/hooks` 를 한 번 열거나 세션을 다시 시작해야 확실히 반영된다.
- 훅을 손으로 시험해 보려면 (stdin 으로 JSON 을 넣는다):

  ```bash
  echo '{"tool_input":{"command":"git push --force"}}' | node .claude/hooks/guard-bash.mjs; echo "종료 코드 $?"
  echo '{"tool_input":{"file_path":"'"$PWD"'/src/floors/floors.service.ts"}}' | .claude/hooks/pre-edit-guard.sh
  echo '{}' | node .claude/hooks/session-start.mjs
  ```
