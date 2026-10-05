#!/usr/bin/env bash
# Checks that every project path named in CODEBASE.md exists on disk.
# Usage: scripts/verify_codebase_sync.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAP="$ROOT/CODEBASE.md"

if [[ ! -f "$MAP" ]]; then
	echo "Missing required file: $MAP" >&2
	exit 1
fi

# Paths produced at run time are listed in CODEBASE.md as ignored output, not
# as committed files, so they are skipped here.
IGNORE_PATTERN='^(node_modules/|tests/artifacts/|test-results/|playwright-report/|\.venv/|__pycache__/)'

paths="$(
	grep -oE '(src|tests|scripts|docs)/[A-Za-z0-9_./-]+' "$MAP" |
		sed 's/[.,;:)]*$//' |
		sort -u
)"

missing=0
checked=0

for path in $paths; do
	if [[ "$path" =~ $IGNORE_PATTERN ]]; then
		continue
	fi

	checked=$((checked + 1))
	if [[ ! -e "$ROOT/$path" ]]; then
		echo "Missing path listed in CODEBASE.md: $path" >&2
		missing=$((missing + 1))
	fi
done

if ((missing > 0)); then
	echo "CODEBASE.md lists $missing missing path(s) out of $checked checked." >&2
	exit 1
fi

echo "CODEBASE.md sync OK: $checked path(s) verified."
