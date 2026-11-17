#!/usr/bin/env bash
# app.js 편집 직후 문법 검사. 실패 시 Claude에게 오류를 전달(exit 2).
f=$(python3 -c 'import sys,json;print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)
case "$f" in
  *.js)
    command -v node >/dev/null || exit 0
    node --check "$f" 2>&1 >&2 || exit 2 ;;
esac
exit 0
