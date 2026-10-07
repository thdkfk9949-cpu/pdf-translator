#!/usr/bin/env bash
# vendor/ 폴더의 외부 라이브러리(pdf.js, Anthropic SDK)를 최신 버전으로 다시 받는다.
# 필요: Node.js 18 이상. 사용법: ./scripts/update-vendor.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$TMP"
npm init -y >/dev/null
npm install --silent pdfjs-dist @anthropic-ai/sdk esbuild

# pdf.js: 본체, 워커, 글꼴 문자 매핑(cmaps)
rm -rf "$ROOT/vendor/pdfjs"
mkdir -p "$ROOT/vendor/pdfjs"
cp node_modules/pdfjs-dist/build/pdf.min.mjs node_modules/pdfjs-dist/build/pdf.worker.min.mjs \
  node_modules/pdfjs-dist/LICENSE "$ROOT/vendor/pdfjs/"
cp -r node_modules/pdfjs-dist/cmaps "$ROOT/vendor/pdfjs/"

# Anthropic SDK: 브라우저에서 바로 불러올 수 있게 파일 하나로 묶는다.
mkdir -p "$ROOT/vendor/anthropic-sdk"
echo "export { default } from '@anthropic-ai/sdk';" > entry.mjs
npx esbuild entry.mjs --bundle --format=esm --platform=browser --minify \
  --outfile="$ROOT/vendor/anthropic-sdk/anthropic-sdk.min.mjs"
cp node_modules/@anthropic-ai/sdk/LICENSE "$ROOT/vendor/anthropic-sdk/"

echo "pdfjs-dist $(node -p "require('./node_modules/pdfjs-dist/package.json').version")"
echo "@anthropic-ai/sdk $(node -p "require('./node_modules/@anthropic-ai/sdk/package.json').version")"
