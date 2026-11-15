# 에이전트 작업 환경

이 저장소에서 AI 에이전트(Claude Code)가 일하는 방식을 받치는 장치를 정리한 문서다. 규칙의 본문은 루트 `CLAUDE.md`, 파일 목록은 `.claude/README.md` 에 있고, 여기는 **각 장치가 무엇이고 왜 넣었는지, 직접 확인하려면 무엇을 치면 되는지**를 적는다.
장치를 바꾸는 PR 은 이 문서를 같이 고친다.

## 1. 결정 기록

| 날짜 | 결정 | 이유 | 다시 볼 시점 |
|---|---|---|---|
| 2026-11-15 | 1~2단계(스키마, 층·좌석 조회)는 직접 작성하고 3단계부터 에이전트가 구현한다 | 스키마 설계와 첫 조회 API 는 손으로 써 봐야 이후 PR 을 읽을 수 있다. 3단계부터는 PR 을 읽고 설명하는 것으로 학습한다 | 2단계를 끝냈을 때 |
| 2026-11-15 | 조건부 에이전트 머지: CI 통과 + 코드를 쓰지 않은 에이전트의 검증 통과 + 민감 경로 미접촉이면 에이전트가 머지한다 | PR 마다 사람을 기다리면 연속 진행이 안 된다. 대신 틀리면 되돌리기 어려운 경로는 사람이 읽고 머지한다 | 에이전트가 머지한 PR 에서 문제가 나왔을 때 |
| 2026-11-15 | pstack 플러그인을 켠다 | 작업 종류별 절차(플레이북)와 다른 모델의 교차 검토를 쓴다. 토큰 사용량이 늘어난다 | 비용이 부담될 때 |
| 2026-11-15 | 테스트 러너는 jest, E2E 는 Node 내장 테스트 러너 | jest 는 NestJS 문서와 예제의 기본이라 자료를 찾기 쉽다. E2E 는 서버를 띄워 HTTP 로만 확인하므로 추가 의존성 없이 쓴다 | 3단계에서 API 테스트가 늘어날 때 |
| 2026-11-15 | prettier 검사는 게이트에 넣지 않는다 | 기존 파일 4개(학습 영역·완성본 포함)가 경고 상태다. 편집 훅이 고친 파일은 정리한다 | 4개 파일을 정리한 뒤 |

## 2. 게이트

게이트(gate)는 "이걸 통과해야 다음으로 간다" 는 검사 묶음이다. 로컬과 CI 가 같은 명령을 쓴다.

| 명령 | 무엇을 확인하나 | 왜 |
|---|---|---|
| `pnpm lint` | eslint 가 코드에서 버그가 되기 쉬운 패턴을 찾는다 (안 쓰는 변수 등) | 타입 검사가 못 잡는 실수를 잡는다 |
| `pnpm typecheck` | TypeScript 타입 오류 (`tsconfig.json`, `tsconfig.build.json` 두 설정) | 실행 전에 잡을 수 있는 오류를 먼저 잡는다 |
| `pnpm test` | 단위 테스트 (`src/**/*.spec.ts`) 와 가드 훅 테스트 | 고친 동작이 다시 깨지지 않게 고정한다 |
| `pnpm build` | `nest build` 로 `dist/` 를 만든다 | 배포에 쓰는 산출물이 실제로 만들어지는지 |
| `pnpm e2e` | `dist/main` 을 3011 포트에 띄워 HTTP 로 확인한다 (`test/e2e/`) | 조립된 앱이 DB 와 함께 실제로 뜨는지 |

직접 해 보기: MySQL 을 띄운 뒤(`docker compose up -d --wait`) 위 다섯 줄을 순서대로 친다.

- 단위 테스트(unit test): 함수 하나를 서버 없이 확인한다. 예) `src/common/utils/date.spec.ts`
- E2E(end-to-end) 테스트: 서버를 실제로 띄우고 요청을 보내 확인한다. 예) `test/e2e/health.e2e.mjs`

## 3. CI 와 브랜치 보호

- **CI** (`.github/workflows/ci.yml`): PR 을 올리거나 main 에 머지되면 GitHub 이 깨끗한 리눅스 머신에서 MySQL 을 띄우고 게이트를 돌린다. "내 컴퓨터에서만 된다" 를 막는다.
- **브랜치 보호**: CI 는 결과를 보고할 뿐이다. GitHub 저장소 설정에서 `main` 에 "verify 체크가 통과해야 머지 가능" 을 걸어야 실제로 막힌다. PR 없이 main 에 직접 push 하는 것, 강제 push, 브랜치 삭제도 여기서 막는다.
- **머지 방식**: merge commit 만 허용한다. PR 안의 작은 커밋들이 main 이력에 그대로 남아 "무엇을 왜" 를 커밋 단위로 다시 읽을 수 있다.
- **dependabot** (`.github/dependabot.yml`): CI 가 쓰는 액션은 버전 태그가 아니라 커밋 SHA 로 고정했다. 새 버전은 달마다 dependabot 이 PR 로 올린다.

직접 해 보기: PR 페이지 아래의 Checks 에서 `verify` 를 열면 단계별 로그가 보인다. `gh pr checks <번호>` 로도 본다.

## 4. 훅

훅(hook)은 Claude 가 도구를 쓰기 직전·직후에 자동으로 실행되는 스크립트다. 문서에 적은 규칙은 잊힐 수 있어서, 꼭 지켜야 하는 것은 훅으로 강제한다. 터미널에서 직접 치는 명령에는 걸리지 않는다.

| 훅 | 무엇을 하나 | 왜 |
|---|---|---|
| `guard-bash.mjs` | 강제 push, main 직접 커밋·push, 작업 트리 전체 되돌리기, DB 볼륨 삭제·리셋, `.env` 읽기, GitHub 설정 변경, 조건을 못 채운 머지를 **차단**한다. 커밋 전에 lint·타입 검사를 돌리고 커밋 제목·PR 제목 형식을 검사한다 | 에이전트가 혼자 진행할 때 되돌릴 수 없는 일을 하지 못하게 |
| `pre-commit-check.sh` | 커밋에 `.env` 나 비밀 정보처럼 보이는 문자열이 있으면 막거나 묻는다 | 공개 저장소라서 |
| `pre-edit-guard.sh` | 학습 영역(`src/floors/**`, `prisma/schema.prisma`), `docs/TERMS.md`, 적용된 마이그레이션을 고치기 전에 묻는다 | 직접 쓰기로 한 곳을 에이전트가 대신 쓰지 않게 |
| `post-format.sh` | 고친 `.ts` 파일을 prettier 로 정리한다 | 포맷 차이로 diff 가 지저분해지지 않게 |
| `session-start.mjs` | 세션을 시작할 때 브랜치, 열린 PR, REVIEW 진행률, MySQL 상태를 알려 준다 | 이전 세션에서 어디까지 했는지 바로 이어가게 |
| `on-stop.mjs` | 실행이 끝나면 알림을 띄우고 마지막 보고를 `.audit/reports/<날짜>.md` 에 쌓는다 | 터미널을 안 보고 있어도 무엇을 했는지 나중에 읽을 수 있게 |
| `on-notify.mjs` | Claude 가 입력을 기다리면 알림을 띄운다 | 자동 진행이 멈춘 것을 바로 알게 |

직접 해 보기:

```bash
echo '{"tool_input":{"command":"git push --force"}}' | node .claude/hooks/guard-bash.mjs; echo "종료 코드 $?"
node --test .claude/hooks/guard-bash.test.mjs
```

종료 코드 2 가 "차단" 이다. 테스트 파일을 읽으면 어떤 명령이 막히고 어떤 명령이 통과하는지 예시로 볼 수 있다.

## 5. 누가 머지하나

| PR 이 건드린 곳 | 머지 |
|---|---|
| `prisma/**` (스키마·마이그레이션), `src/auth/**`, `src/common/guards/**`, `src/common/decorators/**`, `src/floors/**`, Docker·compose, `.env.example`, `.github/**`, `.claude/**`, `.agents/**`, `CLAUDE.md` | 사람. 에이전트는 merge-ready 로 보고하고 멈춘다 |
| 그 밖 | CI 녹색 + 코드를 쓰지 않은 에이전트가 실제 서버에서 확인해 PASS 면 에이전트 |

목록은 `guard-bash.mjs` 의 `SENSITIVE` 에 있고, 에이전트가 조건을 못 채운 채 머지하려 하면 훅이 막는다.

## 6. PR 양식

- 제목: `<대단위> - <소규모>`. "무슨 작업" 인지 적는다. 예) `예약 - 좌석 중복 409`
- 본문 (`.github/pull_request_template.md`): 1 배경 → 2 변경 내용 → 3 체크리스트 → 4 검증 → 5 리뷰어가 볼 것. 체크리스트는 에이전트가 비워 두고 직접 확인하며 체크한다.
- 커밋: `type(scope): 한국어 제목`. PR 이 "무슨 작업", 커밋이 "어느 모듈" 을 말한다.

## 7. 기록이 남는 곳

| 무엇 | 어디 | git 에 올라가나 |
|---|---|---|
| 왜 바꿨는지 | 커밋 메시지, PR 본문 | 예 |
| 점검 항목과 처리 내역 | `docs/REVIEW.md` | 예 |
| 도메인 결정 | `docs/DOMAIN.md` 6절 | 예 |
| 작업 환경 결정 | 이 문서 1절 | 예 |
| 매 실행의 보고서 | `.audit/reports/<날짜>.md` | 아니요 (로컬 전용) |
| 용어 정리 | `docs/TERMS.md` (직접 채운다. 후보는 PR 본문 5번과 보고에 나온다) | 예 |

## 8. 이 문서에서 나온 용어 후보

린트(lint), 게이트, CI, 브랜치 보호, 필수 체크(required check), merge commit / squash / rebase, 단위 테스트, E2E 테스트, 훅(hook), 종료 코드(exit code), dependabot, 커밋 SHA 고정. `/term <용어>` 로 초안을 받아 `docs/TERMS.md` 에 직접 정리한다.
