#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="${1:-photos-src}"
OUT_DIR="${2:-static/photos}"

KIOSK_DIR="$OUT_DIR/kiosk"
MID_DIR="$OUT_DIR/mid"
HQ_DIR="$OUT_DIR/hq"

if [ ! -d "$SRC_DIR" ]; then
	echo "Source directory '$SRC_DIR' does not exist. Create it and add *.jpg images." >&2
	exit 0
fi

mkdir -p "$KIOSK_DIR" "$MID_DIR" "$HQ_DIR"

shopt -s nullglob
files=("$SRC_DIR"/*.jpg "$SRC_DIR"/*.jpeg "$SRC_DIR"/*.JPG "$SRC_DIR"/*.JPEG)

if [ "${#files[@]}" -eq 0 ]; then
	echo "No JPG files found in '$SRC_DIR'. Nothing to optimize." >&2
	exit 0
fi

if ! command -v mogrify >/dev/null 2>&1; then
	echo "mogrify (ImageMagick) not found; copying source photos without resizing." >&2
	for f in "${files[@]}"; do
		name="$(basename "$f")"
		cp -f "$f" "$KIOSK_DIR/$name"
		cp -f "$f" "$MID_DIR/$name"
		cp -f "$f" "$HQ_DIR/$name"
	done
	exit 0
fi

# Kiosk: fits within FHD/FHD+ widths
mogrify -path "$KIOSK_DIR" \
	-resize 1920x1920\> \
	-strip \
	-format jpg \
	-quality 80 \
	"${files[@]}"

# Mid: good for 2K-ish widths
mogrify -path "$MID_DIR" \
	-resize 2560x2560\> \
	-strip \
	-format jpg \
	-quality 85 \
	"${files[@]}"

# HQ: good for 4K-ish widths
mogrify -path "$HQ_DIR" \
	-resize 3840x3840\> \
	-strip \
	-format jpg \
	-quality 95 \
	"${files[@]}"
