#!/usr/bin/env bash
# PostToolUse(Edit|Write|MultiEdit): 수정한 .ts 파일을 prettier(.prettierrc)로 정리한다.
# src/ scripts/ prisma/ 아래 .ts 만 대상. 실패해도 작업을 막지 않는다.
set -o pipefail
input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_response.filePath // .tool_input.file_path // empty' 2>/dev/null)
[ -z "$path" ] && exit 0
case "$path" in *.ts) ;; *) exit 0 ;; esac
root=${CLAUDE_PROJECT_DIR:-$(pwd)}
case "${path#"$root"/}" in src/*|scripts/*|prisma/*) ;; *) exit 0 ;; esac
cd "$root" || exit 0
[ -x node_modules/.bin/prettier ] || exit 0
if ! command -v node >/dev/null 2>&1; then
  for d in "$HOME"/.nvm/versions/node/*/bin; do [ -d "$d" ] && PATH="$d:$PATH"; done
  export PATH
fi
node_modules/.bin/prettier --log-level warn --write "$path" >/dev/null 2>&1 || true
exit 0
