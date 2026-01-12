#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=== Running Unit Tests ==="
pnpm test:unit

echo ""
echo "=== Running Lint ==="
pnpm lint

echo ""
echo "=== Running Type Check ==="
pnpm type-check

echo ""
echo "=== Running Build ==="
pnpm build

echo ""
echo "✅ All CI checks passed"
