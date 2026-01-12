#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cleanup() {
    echo "Shutting down..."
    if [ -n "$DEV_PID" ]; then
        kill $DEV_PID 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

cd "$PROJECT_DIR"

echo "Starting dev server..."
pnpm dev &
DEV_PID=$!

echo "Waiting for dev server to start..."
sleep 5

if ! command -v cloudflared &> /dev/null; then
    echo "cloudflared not found. Install with: brew install cloudflared"
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi

echo "Starting cloudflared tunnel..."
echo "Press Ctrl+C to stop"
cloudflared tunnel --url http://localhost:3000

cleanup
