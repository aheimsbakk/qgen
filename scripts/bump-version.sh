#!/usr/bin/env bash
# Bumps the project version stored in VERSION.
# Usage: scripts/bump-version.sh [patch|minor|major]
set -euo pipefail

LEVEL="${1:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$ROOT/VERSION"

if [[ "$LEVEL" != "patch" && "$LEVEL" != "minor" && "$LEVEL" != "major" ]]; then
	echo "Usage: scripts/bump-version.sh [patch|minor|major]" >&2
	exit 1
fi

if [[ ! -f "$VERSION_FILE" ]]; then
	echo "VERSION file not found at $VERSION_FILE" >&2
	exit 1
fi

current="$(tr -d '[:space:]' <"$VERSION_FILE")"

if [[ ! "$current" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "VERSION must hold MAJOR.MINOR.PATCH, found: $current" >&2
	exit 1
fi

IFS='.' read -r major minor patch <<<"$current"

case "$LEVEL" in
major)
	major=$((major + 1))
	minor=0
	patch=0
	;;
minor)
	minor=$((minor + 1))
	patch=0
	;;
patch) patch=$((patch + 1)) ;;
esac

next="$major.$minor.$patch"
printf '%s\n' "$next" >"$VERSION_FILE"
echo "$current -> $next"
