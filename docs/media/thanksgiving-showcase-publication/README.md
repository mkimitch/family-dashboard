# Thanksgiving Comes to Daymark

The first-draft film and cover are in `review/`. The 36-second silent film uses Daymark’s real calendar, Noto Sans, and the project’s SVG mark. The publication workspace is a sibling of the original Thanksgiving showcase.

## Edit and motion cues

| Film time | Picture |
| --- | --- |
| 0–5 s | “Thanksgiving Comes to Daymark” above the Wednesday–Friday calendar. |
| 5–12 s | Ease into the full Thursday cell, hold on the holiday chip, then move into the lower part of the cell. Head tilt at 9.00 s. |
| 12–26 s | Locked detail with both feet and the cell’s bottom edge visible. Wing at 14.00 s, tail at 17.50 s, double peck at 22.00 s. |
| 26–32 s | Ease back to the calendar with “Custom SVG with reduced-motion support.” |
| 32–36 s | Hold the calendar and Daymark lockup. The foliage continues through the last frame. |

The 42-second lossless source includes two alternates after the film ends. The standalone wattle starts at 37.00 s and the single peck at 40.00 s. Each of the six labeled lossless clips in `capture/` includes 18 frames (0.6 s) of rest on each side of the complete motion. The head’s secondary wattle ends 8 ms after the 850 ms tilt. The 1,250 ms double peck includes a 450 ms wattle starting at 504 ms.

## Regenerate the draft

Run from the repository root. Use the project’s Yarn/Playwright environment, local Chromium with H.264 playback (Google Chrome by default), FFmpeg/FFprobe with libx264 and libx264rgb, Python 3 with Pillow, ImageMagick, and the original showcase’s Noto Sans fonts. Set `DEMO_CHROMIUM_PATH` to override the browser executable.

First fingerprint the original showcase and start the disposable fictional preview.

```sh
p=docs/media/thanksgiving-showcase-publication
mkdir -p "$p/capture" "$p/exports"
find docs/media/thanksgiving-showcase -type f -print0 | sort -z | xargs -0 sha256sum > "$p/capture/original.sha256"
yarn preview:thanksgiving
```

In a second terminal, set the origin to the loopback URL that the preview printed. Supply just the scheme, host, and port. The example below uses the port assigned during draft production.

```sh
p=docs/media/thanksgiving-showcase-publication
export THANKSGIVING_PREVIEW_ORIGIN=http://127.0.0.1:5174
yarn node "$p/source/capture.mjs"
python3 "$p/source/edit.py"
python3 "$p/source/verify.py"
yarn node "$p/source/mobile.mjs"
sha256sum -c "$p/capture/original.sha256"
```

Stop the disposable preview with Ctrl-C. Keep `capture/` locally for reuse. It contains the RGB master, six clips, browser measurements, geometry, and encoded-frame proofs. Partial renders and these intermediates are ignored by Git.

## Inputs and checks

`source/fixture.json` contains the original fictional calendar events, the US calendar’s flag and display metadata, and empty peripheral feeds. The capture fulfills API requests from this file, blocks external requests and photo assets, and fixes the preview clock in America/Chicago. It checks for one native blue holiday chip on Thursday, November 26, with the exclusive end date of November 27.

The kiosk viewport is 1200 × 1920 CSS pixels. Chromium captures the Wednesday–Friday background once at 2× and the Thursday cell at 4×. Its CSS animations and the animations created by the manual preview buttons share one 30 fps sampling clock. The compositor replaces the Thursday cell with the corresponding lossless frame before applying each uniformly scaled camera crop.

The browser checks both peck variants against the existing attachment, beak travel, eye clearance, and recovery assertions. It checks the real reduced-motion rendering. The verifier compares decoded beak poses, foot position, and the wattle outline against the browser’s SVG geometry. It also checks every source foliage frame and verifies the RGB frames in the six clips against the source. The mobile review plays the encoded MP4 muted from start to finish at both CSS widths, saves a frame for every second, and captures the principal shots and cover with a simulated 40 CSS-pixel playback bar.
