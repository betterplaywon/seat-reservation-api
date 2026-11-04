#!/usr/bin/env bash
# PreToolUse(Bash) 가드 — Claude 가 실행하려는 셸 명령을 실행 전에 본다.
#   ask  : 되돌리기 어렵거나 비밀 정보가 노출될 수 있는 명령 → 사용자에게 한 번 더 묻는다
#   deny : .env 를 강제로 스테이징하는 명령 → 막는다
# 훅은 Claude 의 도구 호출에만 걸린다. 터미널에서 직접 치는 명령과는 무관하다.
# 입력: stdin JSON {"tool_input":{"command":"..."}}
# 출력: 결정 JSON (문제 없으면 아무것도 출력하지 않고 exit 0)
# 손으로 테스트: echo '{"tool_input":{"command":"docker compose down -v"}}' | .claude/hooks/pre-bash-guard.sh
set -o pipefail
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$cmd" ] && exit 0

decision=""
reasons=()
flag() {
  case "$1" in
    deny) decision=deny ;;
    ask) [ "$decision" = deny ] || decision=ask ;;
  esac
  reasons+=("$2")
}
has() { printf '%s' "$1" | grep -Eq "$2"; }

ENV_TOKEN='(^|[[:space:]/"'"'"'])\.env([.][A-Za-z0-9_-]+)?([[:space:]]|$|["'"'"'])'

# 명령을 ; && || | 단위로 나눠 각 조각을 따로 본다 (cd x && git add 처럼 묶인 명령 대응)
segments=$(printf '%s\n' "$cmd" | perl -pe 's/\|\||&&|;|\|/\n/g')

while IFS= read -r seg; do
  s=${seg//.env.example/}            # .env.example 은 공개 파일이므로 검사에서 뺀다
  [ -z "${s//[[:space:]]/}" ] && continue

  # 1. .env 내용 출력
  if has "$s" '^[[:space:]]*(sudo[[:space:]]+)?(cat|less|more|head|tail|bat|strings|base64)([[:space:]]|$)' && has "$s" "$ENV_TOKEN"; then
    flag ask ".env 내용을 터미널에 출력합니다. 비밀 정보가 대화 기록에 남을 수 있습니다. 변수 이름만 필요하면 'cut -d= -f1 .env' 처럼 값 없이 보세요."
  fi

  # 2. .env 강제 스테이징 (.gitignore 된 파일은 -f 로만 추가된다)
  if has "$s" '^[[:space:]]*git[[:space:]]+add([[:space:]]|$)' && has "$s" '[[:space:]](-f|--force|-[A-Za-z]*f[A-Za-z]*)([[:space:]]|$)' && has "$s" "$ENV_TOKEN"; then
    flag deny ".env 를 강제로(-f) 스테이징하는 명령입니다. .env 는 커밋하지 않습니다 (.gitignore). 예시 값은 .env.example 에 적습니다."
  fi

  # 3. push: force push, main 으로 직접 push
  if has "$s" '^[[:space:]]*git[[:space:]]+push([[:space:]]|$)'; then
    if has "$s" '[[:space:]](-f|--force|--force-with-lease(=[^[:space:]]*)?|-[A-Za-z]*f[A-Za-z]*)([[:space:]]|$)'; then
      flag ask "force push 입니다. 원격 커밋이 덮어써질 수 있습니다. 열린 PR 브랜치나 main 이면 하지 않는 편이 안전합니다."
    fi
    branch=$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null)
    if has "$s" '[[:space:]](HEAD:)?(refs/heads/)?main([[:space:]]|$)' \
      || { [ "$branch" = main ] && has "$s" '^[[:space:]]*git[[:space:]]+push([[:space:]]+-[^[:space:]]*)*([[:space:]]+[A-Za-z0-9_.-]+)?([[:space:]]+HEAD)?[[:space:]]*$'; }; then
      flag ask "main 으로 직접 push 합니다. 이 프로젝트는 브랜치 → PR 단위로 작업합니다 (.claude/rules/10-workflow.md). 베이스라인 같은 예외가 아니면 브랜치를 만들어 PR 로 올리세요."
    fi
  fi

  # 4. 작업 내용을 되돌릴 수 없게 지우는 git 명령
  if has "$s" '^[[:space:]]*git[[:space:]]+reset[[:space:]]+.*--hard' \
    || has "$s" '^[[:space:]]*git[[:space:]]+checkout[[:space:]]+(-[^[:space:]]+[[:space:]]+)*--([[:space:]]|$)' \
    || { has "$s" '^[[:space:]]*git[[:space:]]+restore([[:space:]]|$)' && ! has "$s" '[[:space:]](--staged|-S)([[:space:]]|$)'; } \
    || has "$s" '^[[:space:]]*git[[:space:]]+clean[[:space:]]+.*-[A-Za-z]*f' \
    || has "$s" '^[[:space:]]*git[[:space:]]+branch[[:space:]]+.*[[:space:]]-D([[:space:]]|$)' \
    || has "$s" '^[[:space:]]*git[[:space:]]+stash[[:space:]]+(drop|clear)([[:space:]]|$)' \
    || has "$s" '^[[:space:]]*git[[:space:]]+push[[:space:]]+.*(--delete|[[:space:]]-d[[:space:]]|[[:space:]]:[^[:space:]])'; then
    flag ask "작업 중인 변경이나 브랜치를 되돌릴 수 없게 지우는 git 명령입니다. 사용자가 직접 작성한 1~2단계 코드가 섞여 있을 수 있으니 확인 후 진행합니다."
  fi

  # 5. DB 데이터가 사라지는 명령
  if has "$s" '^[[:space:]]*docker[[:space:]]+(compose[[:space:]]+.*down.*([[:space:]]-v|--volumes)|volume[[:space:]]+(rm|prune)|system[[:space:]]+prune)' \
    || has "$s" '^[[:space:]]*docker-compose[[:space:]]+.*down.*([[:space:]]-v|--volumes)'; then
    flag ask "MySQL 볼륨이 삭제됩니다. 로컬 DB 의 모든 데이터(예약·사용자)가 사라지고, docker/mysql/init 의 SQL 이 다시 실행됩니다. 의도한 초기화(/db-reset)인지 확인합니다."
  fi
  if has "$s" 'prisma[[:space:]]+(migrate[[:space:]]+reset|db[[:space:]]+push)([[:space:]]|$)' || has "$s" '(--accept-data-loss|--force-reset)'; then
    flag ask "Prisma 가 테이블을 지우거나 이력 없이 스키마를 바꿉니다. 이 프로젝트는 migrate dev 로 마이그레이션 파일을 남기는 방식을 씁니다 (.claude/rules/30-prisma-db.md)."
  fi

  # 6. 병합은 사용자가 한다
  if has "$s" '^[[:space:]]*gh[[:space:]]+pr[[:space:]]+merge([[:space:]]|$)'; then
    flag ask "PR 병합은 사용자가 리뷰한 뒤 직접 합니다 (README 진행 규칙 2). Claude 가 병합해도 되는지 확인합니다."
  fi
done <<< "$segments"

[ -z "$decision" ] && exit 0
reason=$(printf '%s\n' "${reasons[@]}")
jq -cn --arg d "$decision" --arg r "$reason" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$d,permissionDecisionReason:$r}}'
exit 0
