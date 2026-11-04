# .claude — 이 저장소에서 Claude Code 가 따르는 설정

Claude Code 가 자동으로 읽는 곳이다. 사람이 읽을 안내는 이 파일뿐이고, 나머지는 Claude 에게 주는 규칙·절차·자동 검사다.

| 경로 | 역할 | 언제 적용되나 |
|---|---|---|
| `rules/00-project.md` | 프로젝트 성격, 학습 규칙, 비밀 정보, 언어 | 항상 |
| `rules/10-workflow.md` | PR 단위 작업 방식, 커밋 규칙, 자동/확인 경계, PR 전 체크 | 항상 |
| `rules/20-nestjs.md` | NestJS 코드 규칙 (층 분리, 설정값, 에러 형식, 검증) | `src/**/*.ts` 를 다룰 때 |
| `rules/30-prisma-db.md` | Prisma·MySQL·Docker 규칙 | `prisma/**`, `docker/**`, compose, `.env.example` |
| `rules/40-docs.md` | 문서 갱신 규칙 | `docs/**`, `README.md` |
| `rules/50-learning-zones.md` | 1~2단계 학습 영역 보호 | `src/floors/**`, `prisma/schema.prisma` |
| `skills/fix-item` | `/fix-item 3` — REVIEW 항목 하나를 설명 → 브랜치 → 커밋 → 검증 → PR 로 처리 | 호출 시 (Claude 도 호출) |
| `skills/verify` | `/verify` — 타입 검사·포맷·스키마·컨테이너·헬스체크 표 | 호출 시 (Claude 도 호출) |
| `skills/db-reset` | `/db-reset` — 볼륨 삭제 후 재생성, 마이그레이션, 시드 | 사용자만 호출 가능 |
| `skills/term` | `/term 커넥션 풀` — TERMS.md 형식 용어 초안 (파일은 안 건드림) | 호출 시 (Claude 도 호출) |
| `hooks/session-start.sh` | 브랜치·열린 PR·REVIEW 진행률·컨테이너 상태를 컨텍스트에 주입 | 세션 시작 |
| `hooks/pre-bash-guard.sh` | 위험 명령 전 확인: 볼륨 삭제, force push, main 으로 push, reset --hard, migrate reset, .env 출력, gh pr merge | Bash 실행 전 |
| `hooks/pre-commit-check.sh` | `git commit` 전: .env 스테이징 차단, 비밀 정보 패턴 확인, .ts 포함 시 tsc 타입 검사 | Bash 실행 전 |
| `hooks/pre-edit-guard.sh` | 학습 영역·적용된 마이그레이션·TERMS.md·.env 편집 전 확인 | 파일 편집 전 |
| `hooks/post-format.sh` | 수정한 `.ts` 를 prettier 로 정리 | 파일 편집 후 |
| `settings.json` | 위 훅 등록, `.env` 읽기 금지 | 항상 (커밋됨) |

## 알아둘 것

- 훅은 **Claude 의 도구 호출**에만 걸린다. 터미널에서 직접 치는 명령에는 아무 영향이 없다.
- "확인(ask)" 은 막는 것이 아니라 한 번 더 묻는 것이다. 승인하면 그대로 진행된다. 아예 막는(deny) 것은 `.env` 를 커밋에 넣는 경우뿐이다.
- 개인 설정(권한 허용 목록 등)은 `settings.local.json` 에 둔다. `.gitignore` 에 들어 있어 커밋되지 않는다.
- 훅이나 `settings.json` 을 고친 뒤에는 `/hooks` 를 한 번 열거나 세션을 다시 시작해야 반영된다.
- 훅을 손으로 시험해 보려면 (stdin 으로 JSON 을 넣으면 결정 JSON 이 나온다):

  ```bash
  echo '{"tool_input":{"command":"docker compose down -v"}}' | .claude/hooks/pre-bash-guard.sh
  echo '{"tool_input":{"file_path":"'"$PWD"'/src/floors/floors.service.ts"}}' | .claude/hooks/pre-edit-guard.sh
  echo '{}' | .claude/hooks/session-start.sh
  ```
