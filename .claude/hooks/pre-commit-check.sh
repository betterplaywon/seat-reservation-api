#!/usr/bin/env bash
# PreToolUse(Bash) — `git commit` 이 들어 있는 명령에만 반응한다.
#   1) .env 계열 파일이 커밋 대상이면 막는다 (deny)
#   2) 커밋될 변경에 비밀 정보로 보이는 문자열이 있으면 묻는다 (ask)
#   3) .ts 파일이 포함되면 타입 검사(tsc --noEmit)를 돌리고 실패하면 묻는다 (ask)
# 같은 명령에 `git add` 나 `commit -a` 가 있으면 아직 스테이징 전이므로 작업 트리의 변경까지 본다.
# 손으로 테스트: echo '{"tool_input":{"command":"git commit -m x"}}' | .claude/hooks/pre-commit-check.sh
set -o pipefail
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
printf '%s' "$cmd" | grep -Eq '(^|[[:space:];&|(])git[[:space:]]+commit([[:space:]]|$)' || exit 0

root=${CLAUDE_PROJECT_DIR:-$(pwd)}
cd "$root" || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

if ! command -v node >/dev/null 2>&1; then   # 훅 셸에 nvm 경로가 없을 때
  for d in "$HOME"/.nvm/versions/node/*/bin; do [ -d "$d" ] && PATH="$d:$PATH"; done
  export PATH
fi

decision=""
reasons=()
flag() {
  case "$1" in
    deny) decision=deny ;;
    ask) [ "$decision" = deny ] || decision=ask ;;
  esac
  reasons+=("$2")
}

staged=$(git diff --cached --name-only)
files=$staged
pending=0
if printf '%s' "$cmd" | grep -Eq '(^|[[:space:];&|(])git[[:space:]]+add([[:space:]]|$)' \
  || printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+commit[^;&|]*[[:space:]](-a|-am|--all)([[:space:]]|$)'; then
  pending=1
  files=$(printf '%s\n%s\n' "$staged" "$(git status --porcelain --untracked-files=all | cut -c4-)")
fi
files=$(printf '%s\n' "$files" | sed '/^$/d' | sort -u)

# 1) .env 계열
envhit=$(printf '%s\n' "$files" | grep -E '(^|/)\.env(\.[A-Za-z0-9_-]+)?$' | grep -v '\.env\.example$')
if [ -n "$envhit" ]; then
  flag deny ".env 파일이 커밋 대상에 있습니다: $(printf '%s' "$envhit" | tr '\n' ' '). .env 는 커밋하지 않습니다. 'git rm --cached <파일>' 로 빼거나 .gitignore 를 확인하세요."
fi

# 2) 비밀 정보 패턴 — 추가된 줄만 본다
added=$( { git diff --cached -U0; [ "$pending" = 1 ] && git diff -U0; } 2>/dev/null | grep -E '^\+[^+]')
if [ "$pending" = 1 ]; then
  # 새 파일(untracked)은 diff 에 안 나오므로 내용 자체를 본다 (200KB 이하 텍스트만)
  while IFS= read -r f; do
    [ -n "$f" ] && [ -f "$f" ] || continue
    git ls-files --error-unmatch -- "$f" >/dev/null 2>&1 && continue
    [ "$(wc -c < "$f")" -gt 204800 ] && continue
    grep -Iq . "$f" 2>/dev/null || continue
    added+=$'\n'"$(sed 's/^/+/' "$f")"
  done <<< "$files"
fi
hits=$(printf '%s\n' "$added" | grep -E \
  -e '-----BEGIN [A-Z ]*PRIVATE KEY-----' \
  -e 'AKIA[0-9A-Z]{16}' \
  -e 'gh[pousr]_[A-Za-z0-9]{30,}' -e 'github_pat_[A-Za-z0-9_]{20,}' \
  -e 'xox[baprs]-[A-Za-z0-9-]{10,}' \
  -e '(^|[^A-Za-z0-9])sk-(ant-)?[A-Za-z0-9_-]{20,}' \
  -e '(mysql|postgres(ql)?|mongodb(\+srv)?|redis)://[A-Za-z0-9][^:/@[:space:]]*:[^@[:space:]]+@' \
  | grep -vE '://[^@[:space:]]+@(localhost|127\.0\.0\.1|mysql|db)([:/]|$)' | head -5)
if [ -n "$hits" ]; then
  flag ask "비밀 정보로 보이는 문자열이 커밋될 변경에 있습니다:
$hits
공개 저장소입니다. 플레이스홀더로 바꾸거나 .env 로 옮긴 뒤 커밋하세요. 오탐이면 그대로 진행해도 됩니다."
fi

# 3) 타입 검사 — .ts 가 포함될 때만
if printf '%s\n' "$files" | grep -Eq '\.ts$' && [ -f tsconfig.json ] && [ -x node_modules/.bin/tsc ]; then
  if ! out=$(node_modules/.bin/tsc --noEmit --incremental false -p tsconfig.json 2>&1); then
    flag ask "타입 검사(tsc --noEmit)가 실패했습니다. 커밋 전에 고치는 것이 원칙입니다 (README 진행 규칙 2):
$(printf '%s\n' "$out" | head -20)"
  fi
fi

[ -z "$decision" ] && exit 0
reason=$(printf '%s\n\n' "${reasons[@]}")
jq -cn --arg d "$decision" --arg r "$reason" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$d,permissionDecisionReason:$r}}'
exit 0
