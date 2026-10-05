#!/usr/bin/env bash
# Checks that CHANGELOG.md matches the version in VERSION and carries the
# required metadata bullets.
# Usage: scripts/validate-changelog.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHANGELOG="$ROOT/CHANGELOG.md"
VERSION_FILE="$ROOT/VERSION"

for file in "$CHANGELOG" "$VERSION_FILE"; do
	if [[ ! -f "$file" ]]; then
		echo "Missing required file: $file" >&2
		exit 1
	fi
done

version="$(tr -d '[:space:]' <"$VERSION_FILE")"
fail=0

if [[ "$(head -n 1 "$CHANGELOG")" != "# Changelog" ]]; then
	echo "CHANGELOG.md must start with '# Changelog'" >&2
	fail=1
fi

if ! grep -q "^## \[$version\]" "$CHANGELOG"; then
	echo "CHANGELOG.md has no section for version $version" >&2
	fail=1
fi

latest_section="$(awk -v v="## [$version]" 'index($0, v) {found=1} found {print} found && /^## / && !index($0, v) {exit}' "$CHANGELOG")"

for key in why model tags; do
	if ! printf '%s\n' "$latest_section" | grep -q "^- \*\*$key:\*\*"; then
		echo "Version $version is missing the '$key' metadata bullet" >&2
		fail=1
	fi
done

if [[ "$fail" -eq 0 ]]; then
	echo "Changelog OK for version $version"
fi

exit "$fail"
