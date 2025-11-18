#!/usr/bin/env bash
set -euo pipefail

# Source directory of original, high-resolution wallpapers
SRC_DIR="${1:-photos-src}"
# Output directory for optimized wallpapers (used by the app)
OUT_DIR="${2:-static/photos}"

if [ ! -d "$SRC_DIR" ]; then
  echo "Source directory '$SRC_DIR' does not exist. Create it and add *.jpg images." >&2
  exit 0
fi

mkdir -p "$OUT_DIR"
if ! command -v mogrify >/dev/null 2>&1; then
  echo "mogrify (ImageMagick) not found; skipping photo optimization." >&2
  exit 0
fi

# Enable nullglob so '*.jpg' expands to nothing instead of the literal pattern
shopt -s nullglob
files=("$SRC_DIR"/*.jpg "$SRC_DIR"/*.jpeg "$SRC_DIR"/*.JPG "$SRC_DIR"/*.JPEG)

if [ "${#files[@]}" -eq 0 ]; then
  echo "No JPG files found in '$SRC_DIR'. Nothing to optimize." >&2
  exit 0
fi

mogrify -path "$OUT_DIR" \
  -resize 1200x1920\> \
  -format jpg \
  -quality 75 \
  "${files[@]}"
