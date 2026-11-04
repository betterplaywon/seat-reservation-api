#!/usr/bin/env bash
# PreToolUse(Edit|Write|MultiEdit|NotebookEdit)
# 사용자가 직접 작성하기로 한 영역과 고치면 안 되는 파일을 건드리기 전에 한 번 묻는다 (ask).
# 막는 것이 아니라 묻는 것이다. 사용자가 요청한 수정이면 승인하고 진행하면 된다.
# 손으로 테스트: echo '{"tool_input":{"file_path":"'"$PWD"'/src/floors/floors.controller.ts"}}' | .claude/hooks/pre-edit-guard.sh
set -o pipefail
input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null)
[ -z "$path" ] && exit 0
root=${CLAUDE_PROJECT_DIR:-$(pwd)}
rel=${path#"$root"/}

ask() {
  jq -cn --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
  exit 0
}

case "$rel" in
  .env.example) ;;
  .env|.env.*)
    ask "$rel 은 비밀 정보 파일입니다. Claude 가 직접 쓰지 않고 사용자가 편집하는 것이 원칙입니다. 예시 값은 .env.example 에 적습니다." ;;
  src/floors/*|prisma/schema.prisma)
    ask "$rel 은 1~2단계 학습 영역입니다 (README 진행 규칙 1: AI 없이 직접 작성). 설명이나 리뷰가 아니라 구현을 대신 쓰는 것이라면 멈추세요. REVIEW 항목 처리처럼 사용자가 요청한 수정이면 진행합니다." ;;
  prisma/migrations/*)
    ask "$rel 은 이미 적용됐을 수 있는 마이그레이션입니다. 적용된 마이그레이션은 고치지 않고 새 마이그레이션을 만듭니다 (.claude/rules/30-prisma-db.md)." ;;
  docs/TERMS.md)
    ask "docs/TERMS.md 의 용어 정리는 사용자가 직접 채우는 칸입니다 (README 진행 규칙 3). 초안은 채팅으로 주세요. 사용자가 요청한 체크리스트 구조 수정이면 진행합니다." ;;
esac
exit 0
