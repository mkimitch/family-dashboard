# Thanksgiving showcase

The review exports are the silent LinkedIn film and the PNG cover in `exports/`. The sequence opens on a three-day crop of Daymark’s actual calendar, moves to Thursday, shows a magnified feather ruffle, and switches to the real dense, reduced-motion state before pulling back.

## Reproduce

Start the current fictional development preview with `yarn preview:thanksgiving`. Set `THANKSGIVING_PREVIEW_ORIGIN` to the loopback origin it prints. The capture uses the original showcase fixture from the existing standalone workspace pointer and plays the tail via the development controls. Run from the repository root. The tools used here are the project’s Playwright Chromium, FFmpeg with libx264 and libx264rgb, FFprobe, Python with Pillow, ImageMagick, and the Noto Sans fonts used by the dashboard.

```sh
node docs/media/thanksgiving-showcase/source/fixture.mjs sparse
yarn node docs/media/thanksgiving-showcase/source/capture.mjs --verify-only
yarn node docs/media/thanksgiving-showcase/source/capture.mjs
python3 docs/media/thanksgiving-showcase/source/edit.py
python3 docs/media/thanksgiving-showcase/source/verify.py
```

The fixture command follows the existing standalone preview workspace pointer and updates its fixture JSON atomically. It is safe to repeat. Use `dense` in place of `sparse` to inspect the busier layout in the standalone preview. Reload the page after switching. Use `sparse` before recording. The capture also verifies and screenshots the dense layout in its own browser session.

The calendar is labeled **US** and uses its configured flag icon, blue `#60a5fa`, and sort order 4. The standard all-day event starts November 26, 2026, and ends at the exclusive date November 27. The native calendar component handles ordering and styling. The other events are fictional. The capture substitutes an empty image for photo requests and frames only the calendar.

## Footage

The camera uses the original 1200 × 1920 CSS-pixel layout. The lossless master in `capture/thanksgiving-day/cell.mkv` contains 62 seconds sampled from the browser’s own CSS animations at exact 1/30-second intervals. The capture advances the browser animation timelines together. It positions the one-shot tail ruffle at the original film cue and retains leaf and glow timing. The week screenshot and high-resolution cell share the same coordinates. Camera movement in the edit uses uniform scaling.

The 35-second edit starts at source time 9 seconds. The tail begins to lift around 18.3 seconds in the export and returns to rest around 20 seconds. The magnified view and the visible Thursday cell use the same source frame. The busier view includes the fictional “Make place cards” event and uses Chromium’s reduced-motion media setting.

The source directory, original footage, and exports are local. The self-contained MP4 and PNG can be reviewed or shared independently.
