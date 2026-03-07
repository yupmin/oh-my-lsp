#!/bin/bash
set -e

LEVEL=${1:-patch}

if [[ "$LEVEL" != "patch" && "$LEVEL" != "minor" && "$LEVEL" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

npm version "$LEVEL"
VERSION=$(node -p "require('./package.json').version")

echo "Released v$VERSION"

npm run build
git push && git push origin "v$VERSION"
npm publish
