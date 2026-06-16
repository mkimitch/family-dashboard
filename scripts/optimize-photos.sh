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

total_files=${#files[@]}
current_file=0
start_time=$(date +%s)

echo "Optimizing $total_files photos..."

draw_progress_bar() {
	local _current=$1
	local _total=$2
	local _start_time=$3

	local _percent=$((100 * _current / _total))
	local _completed=$((40 * _current / _total))
	local _left=$((40 - _completed))

	local _bar=$(printf "%${_completed}s" | tr ' ' '#')
	local _empty=$(printf "%${_left}s" | tr ' ' '-')

	local _now=$(date +%s)
	local _elapsed=$((_now - _start_time))

	local _eta=0
	if [ "$_current" -gt 0 ]; then
		local _avg=$((_elapsed * 1000 / _current))
		_eta=$((_avg * (_total - _current) / 1000))
	fi

	local _elapsed_fmt=$(printf "%02d:%02d" $((_elapsed / 60)) $((_elapsed % 60)))
	local _eta_fmt=$(printf "%02d:%02d" $((_eta / 60)) $((_eta % 60)))

	printf "\rProgress: [%s%s] %3d%% (%d/%d) | Elapsed: %s | ETA: %s" \
		"$_bar" "$_empty" "$_percent" "$_current" "$_total" \
		"$_elapsed_fmt" "$_eta_fmt"
}

# Initial empty progress bar
draw_progress_bar $current_file $total_files $start_time

for f in "${files[@]}"; do
	# Kiosk: fits within FHD/FHD+ widths
	mogrify -path "$KIOSK_DIR" -resize 1920x1920\> -strip -format jpg -quality 80 "$f"

	# Mid: good for 2K-ish widths
	mogrify -path "$MID_DIR" -resize 2560x2560\> -strip -format jpg -quality 85 "$f"

	# HQ: good for 4K-ish widths
	mogrify -path "$HQ_DIR" -resize 3840x3840\> -strip -format jpg -quality 95 "$f"

	current_file=$((current_file + 1))
	draw_progress_bar $current_file $total_files $start_time
done

echo "" # Newline after progress bar finishes
