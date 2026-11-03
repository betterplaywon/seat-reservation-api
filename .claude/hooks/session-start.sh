#!/usr/bin/env bash
# SessionStart: 세션이 시작될 때 프로젝트 상태를 몇 줄로 Claude 의 컨텍스트에 넣는다.
# stdout 이 그대로 컨텍스트가 된다. 네트워크를 타는 명령(gh)과 docker 는 5초 제한.
root=${CLAUDE_PROJECT_DIR:-$(pwd)}
cd "$root" 2>/dev/null || exit 0
export PATH="$HOME/.docker/bin:$PATH"
with_timeout() { perl -e 'alarm shift; exec @ARGV' "$@" 2>/dev/null; }

echo "[seat-reservation-api 세션 컨텍스트 · .claude/hooks/session-start.sh]"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch=$(git branch --show-current)
  dirty=$(git status --porcelain | wc -l | tr -d ' ')
  ahead=$(git rev-list --count main.."${branch:-HEAD}" 2>/dev/null || echo 0)
  echo "브랜치: ${branch:-detached} (main 대비 +${ahead}) · 커밋 안 된 변경 ${dirty}개 · 최근 커밋: $(git log -1 --format='%h %s')"
  prs=$(with_timeout 5 gh pr list --state open --limit 5 --json number,title,headRefName \
        --template '{{range .}}#{{.number}} {{.headRefName}} — {{.title}}{{"\n"}}{{end}}')
  if [ -n "$prs" ]; then printf '열린 PR:\n%s\n' "$prs" | sed '2,$s/^/  /'; else echo "열린 PR: 없음 (또는 gh 사용 불가)"; fi
fi

if [ -f docs/REVIEW.md ]; then
  done_n=$(grep -cE '^- \[x\] ' docs/REVIEW.md)
  total=$(grep -cE '^- \[[ x]\] ' docs/REVIEW.md)
  next=$(grep -E '^- \[ \] ' docs/REVIEW.md | head -1 | sed 's/^- \[ \] //')
  echo "REVIEW.md: 처리 ${done_n}/${total} · 다음 미처리: ${next:-없음}"
fi

if command -v docker >/dev/null 2>&1; then
  state=$(with_timeout 5 docker inspect -f '{{.State.Status}}{{if .State.Health}} ({{.State.Health.Status}}){{end}}' seat-mysql)
  echo "MySQL 컨테이너 seat-mysql: ${state:-없음 → docker compose up -d --wait} · 호스트 포트 3307"
else
  echo "docker CLI 가 PATH 에 없음 (~/.docker/bin 확인)"
fi

echo "규칙: .claude/rules/ · 스킬: /fix-item <번호> /verify /db-reset /term <용어> · 훅: 커밋 전 비밀정보·타입 검사, 위험 명령·학습 영역 편집은 확인 요청"
exit 0
