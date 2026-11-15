# seat-reservation-api — 에이전트 작업 규칙

백엔드 입문자의 학습용 MVP 다. 1~2단계는 사용자가 직접 쓰고, 3단계부터 구현은 AI 에이전트가, 설계 결정·리뷰·용어 정리·실험 기록은 사용자가 맡는다(README '진행 규칙'). 이 파일은 에이전트가 매 세션 지키는 규칙이다. 프로젝트 기본 사항과 코드·DB·문서 규칙은 `.claude/rules/` 에 있다. 강제 장치가 있는 규칙은 맨 아래 표에 있고, 나머지는 이 문서만 믿는다. 장치마다 무엇이고 왜 있는지는 `docs/AGENT-SETUP.md`.

## 시작

- 플러그인 pstack(`pstack@pstack-claude`, `.claude/settings.json`)이 세션 시작 때 라우팅 규칙을 넣는다. 파일 여럿을 건드리거나, 설계 선택이 있거나, 원인 모를 버그면 `pstack:poteto-mode` 스킬이 플레이북을 고른다. 작은 일은 바로 한다. 사용자가 `/pstack:poteto-mode …` 로 직접 시작해도 된다.
- 무엇을 할지는 `docs/REVIEW.md` 의 미처리 항목(`/fix-item <번호>`)과 README '단계별 진행' 표의 `TODO [n단계]`(`pnpm todo`)에서 고른다. 차단·결함 항목이 단계 구현보다 먼저다. 범위 밖 기능은 코드가 아니라 `docs/ROADMAP.md` 에 적는다.
- 이 레포에서의 이름 매핑: 드라이버 스킬은 프로젝트 `verify`(`.claude/skills/verify`, 실제 서버를 띄워 증거를 남긴다). 머지 전 검토는 `interrogate`(또는 `thermos`, `/code-review`). 플레이북의 PR 제목·본문·머지·worktree 단계는 `.agents/playbooks/seat-pr.md` 가 이 레포 규칙으로 덧씌운다.
- 답변·보고·PR 본문·커밋 메시지·주석은 한국어로 쓴다. 코드 식별자·명령·경로는 그대로 둔다.
- 사용자는 백엔드가 처음이다. 새 용어에는 한 줄 정의를 붙이고 `docs/TERMS.md` 후보라고 알린다(`/term <용어>`).

## 게이트(CI verify 와 같다)

`pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`. E2E 는 빌드 산출물을 3011 포트에 띄우고 MySQL 이 필요하다(`docker compose up -d --wait`, 호스트 포트 3307). 비대화형 셸에서는 `export PATH="$HOME/.docker/bin:$PATH"`. `GET /health` 는 `SELECT 1` 만 하므로 테이블이 없어도 통과한다. 테이블이 필요한 확인은 `pnpm prisma:migrate` 와 `pnpm db:seed` 뒤에 한다.

## 브랜치·커밋·PR

- 작업 하나 = REVIEW 항목 하나 또는 단계 안의 기능 하나 = PR 하나. 브랜치 `<type>/<짧은-설명>`(fix·feat·docs·chore), 최신 `main` 에서 만든다.
- 커밋 `type(scope): 한국어 제목`(scope 는 모듈이나 영역: db, review, readme, floors, reservations, claude …). 본문에 "왜"를 적고 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. 커밋 하나는 한 가지 변경만 담는다. 주석·코드·문서 수정은 나눈다.
- PR 제목 `<대단위> - <소규모>`. 어휘와 예시는 `.github/pull_request_template.md` 머리말. 본문은 템플릿 5항목을 그대로 쓴다. pstack 의 Why / What changed / Scope / Blast Radius / Verification 은 각각 1 배경 / 2 변경 내용 / 범위 밖 / 5 리뷰어가 볼 것 / 4 검증에 넣는다. 수치는 실측만 쓴다. PR 은 draft 가 아니라 ready 로 연다.
- main 에 직접 커밋·push 하지 않는다. push 한 이력은 다시 쓰지 않는다(강제 push 금지, `--force-with-lease` 도 금지). main 이 앞서면 `git merge origin/main` 으로 따라잡는다.
- 머지는 merge commit: `gh pr merge <번호> --merge --match-head-commit <검증한 head SHA>`. squash·rebase 머지는 레포 설정이 막는다. 머지된 원격 브랜치는 GitHub 이 지운다.
- 메인 세션은 같은 폴더에서 브랜치를 바꿔 작업한다(미커밋 변경은 이름 붙여 stash). 코드를 쓰는 서브에이전트에게는 각자 worktree 를 주고, 끝나면 지운다.
- 검증용으로 생긴 파일(dist, 로그, 검증용 마이그레이션)은 되돌린다. 초기 마이그레이션은 README 1단계의 사용자 작업이라 커밋하지 않는다.
- REVIEW 항목을 처리했으면 요약의 체크박스를 `[x]` 로, 상세의 `처리` 줄에 `날짜 · 브랜치/커밋 · 확인한 것` 을 적는다. 항목 번호는 바꾸지 않는다. 별도 커밋 `docs(review): N번 처리 기록`.

## 자율 범위

**묻지 않고 한다.** 이미 내려진 설계 결정 안의 3단계 이후 구현, 버그 수정, 리팩토링, 테스트, 문서 뼈대, 도구·CI 수정, 커밋·push·PR 생성, 리뷰 코멘트 처리, CI 재실행, 아래 조건을 만족하는 머지.

**머지 조건.** CI verify 녹색 + 코드를 쓰지 않은 에이전트(다른 모델)가 실제 서버에서 검증해 PASS + 사람이 머지하는 경로를 건드리지 않음. 사람이 머지하는 경로(스키마·마이그레이션 `prisma/**`, 인증·인가 `src/auth/**`·`src/common/guards/**`·`src/common/decorators/**`, 학습 영역 `src/floors/**`, Docker·compose, `.env.example`, CI, 에이전트 장치 `.claude/**`·`.agents/**`·`CLAUDE.md`)를 건드린 PR 은 merge-ready 로 보고하고 멈춘다(훅이 막는다).

**멈추고 사용자에게.** 아직 내려지지 않은 구조·설계 결정(모듈 경계, 트랜잭션 방식, 에러 형식, 검증 정책), 비밀 정보·계정·포트 같은 환경 값, 1~2단계 학습 영역, GitHub 설정, DB 볼륨·데이터·브랜치 삭제, 배포. 묻기 전에 **배경 → 선택지의 장단점 → 추천** 순서로 쉬운 말로 설명한다. 선택지만 나열하지 않는다. 되돌릴 수 있는 일은 묻지 말고 하고, 결과를 보고한다.

**사용자 몫.** `src/floors/**` 와 `prisma/schema.prisma` 의 `TODO [1단계]`·`TODO [2단계]` 구현(설명·힌트·리뷰만 한다), `docs/TERMS.md` 의 "용어 정리", README 의 "실험 기록". 초안은 채팅으로 주고 파일에는 쓰지 않는다. 3단계 이후 구현이 1~2단계 결과물에 막히면 거기서 멈추고 무엇이 필요한지 보고한다.

## 보고와 기록

- 매 실행의 마지막 답변이 보고서다. 목표를 내 말로, 한 일, 검증 증거(명령과 출력), 선택과 이유, 열린 결정, 새 용어 후보.
- 실행이 멈추면 Stop 훅이 알림을 띄우고 마지막 답변을 `.audit/reports/<날짜>.md` 에 덧붙인다(로컬 전용). 긴 실행은 `/pstack:show-me-your-work` 결정 기록을 `.audit/<작업>.tsv` 에 남긴다. 사용자는 `/pstack:ketchup` 으로 따라잡는다.
- 에이전트 장치를 바꾸면 같은 PR 에서 `docs/AGENT-SETUP.md` 를 고친다. 도메인 결정은 `docs/DOMAIN.md` '6. 결정 기록' 에 이유와 함께 적는다.
- AI 가 쓴 코드에서 실제로 발견한 문제만 `docs/REVIEW.md` 에 새 번호로 적는다. 없는 사례를 만들지 않는다.

## 비밀 정보

- `.env` 는 읽지도 출력하지도 커밋하지도 않는다. 설정 예시는 `.env.example` 에만 플레이스홀더로 적는다.
- 공개 저장소다. 로컬 개발용 기본 계정(app / app1234)만 들어갈 수 있고 실제 키·토큰·외부 호스트 주소는 넣지 않는다.

## 규칙과 강제 장치

| 규칙 | 장치 |
| --- | --- |
| main 보호: PR 필수, verify 체크(strict), 관리자 포함, 강제 push·삭제 금지 | GitHub 브랜치 보호 |
| 강제 push, main push·커밋, 원격·강제 브랜치 삭제, stash 삭제 금지 | `.claude/hooks/guard-bash.mjs` |
| 작업 트리 전체 되돌리기(`reset --hard`, `checkout .`, `clean -f`) 금지 | 같은 훅 |
| 커밋 전 lint·typecheck 통과, 커밋 제목 `type(scope): …` | 같은 훅 |
| 사람이 머지하는 경로 PR, `--admin`, squash·rebase 머지, 체크 미통과 머지 금지 | 같은 훅 |
| 레포 설정·비밀·워크플로우·릴리스 변경 금지(`gh api`·`gh repo`·`gh secret`) | 같은 훅 |
| `.env` 읽기·출력 금지 | 같은 훅 + `permissions.deny` |
| DB 리셋·`db push`·볼륨 삭제·패키지 발행·이름으로 kill 금지 | 같은 훅 |
| PR 제목 형식, 공개 파일 금칙어 | 같은 훅(목록은 로컬 파일) |
| 커밋에 `.env`·비밀 정보 패턴이 있으면 막거나 묻기 | `.claude/hooks/pre-commit-check.sh` |
| 학습 영역·`.env`·적용된 마이그레이션·`docs/TERMS.md` 편집 전 확인 | `.claude/hooks/pre-edit-guard.sh` |
| 고친 `.ts` 파일 prettier 정리 | `.claude/hooks/post-format.sh` |
| PR 제목·본문·머지 방식·worktree 규칙이 pstack 플레이북 단계에 적용 | `.agents/playbooks/seat-pr.md`(앵커는 `check-playbooks.mjs` 가 검사) |
| 테스트·빌드·E2E | CI verify(필수 체크) |
| 보고 파일·알림·세션 시작 요약 | `.claude/hooks/on-stop.mjs`, `on-notify.mjs`, `session-start.mjs` |
| 언어, 자율 범위, 사용자 몫, 코드 규칙(`.claude/rules/`) | 문서만 |
