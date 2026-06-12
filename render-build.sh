#!/bin/bash
set -e

# Render build: install deps only — dist is pre-built and committed to the repo.
# This avoids Render build environment issues and ensures the correct routes
# (including analyze-file) are always present.

echo "==> Node: $(node --version) | npm: $(npm --version)"
echo "==> Using pre-built dist from repository (built 2026-06-12 07:01 UTC)"
echo "==> Verifying dist/index.mjs exists..."
ls -lh artifacts/api-server/dist/index.mjs

# Fix for EROFS: use NPM_CONFIG_PREFIX to install pnpm to home dir (not /usr/lib)
if ! command -v pnpm >/dev/null 2>&1; then
  echo "==> pnpm not found — installing to home dir (avoids EROFS on /usr/lib)"
  export NPM_CONFIG_PREFIX="$HOME/.npm-global"
  npm install -g pnpm@10
  export PATH="$HOME/.npm-global/bin:$PATH"
  echo "==> pnpm installed: $(pnpm --version)"
else
  echo "==> pnpm version: $(pnpm --version)"
fi

echo "==> Installing api-server workspace deps"
pnpm install --filter @workspace/api-server... --no-frozen-lockfile

echo "==> Installing @gradio/client (runtime, not bundled)"
npm install @gradio/client

echo "==> Render build complete — dist ready"
ls -lh artifacts/api-server/dist/
