# Holiday animation demos

These recordings use the actual Daymark page, calendar components, styles and
holiday assets at a **1200 × 1920** logical kiosk viewport. All events are fictional.
The recording tooling does not change application code or kiosk configuration.

## Setup and commands

Use Linux with the project's Node/Yarn prerequisites, plus Xvfb, FFmpeg and
FFprobe on `PATH`.
FFmpeg must include `libx264`, `libx264rgb`, `libwebp_anim`, `ffv1`, PNG, `xfade` and `drawtext`.
Install the DejaVu Sans font for consistent social titles. On Debian/Ubuntu these
are supplied by `xvfb`, `ffmpeg` and `fonts-dejavu-core`. FFmpeg also needs the
`x11grab` input device (included in the distribution package).

```sh
yarn install
yarn playwright-core install chromium
yarn demos:generate
```

| Command                                  | Result                                                            |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `yarn demos:generate`                    | Capture and encode both holidays                                  |
| `yarn demos:halloween`                   | Capture and encode Halloween only                                 |
| `yarn demos:diwali`                      | Capture and encode Diwali only                                    |
| `yarn demos:capture [halloween\|diwali]` | Record lossless source footage without exporting                  |
| `yarn demos:encode [halloween\|diwali]`  | Re-encode existing captures without opening the app               |
| `yarn test:demos`                        | Check fixture dates, DST handling, identities and scene selection |

Optional process-local overrides: `FFMPEG_PATH`, `FFPROBE_PATH`, and
`DEMO_CHROMIUM_PATH` (an installed Chromium executable). Do not put these in a
production `.env`. Chromium may need its usual OS shared libraries on a fresh
machine. Errors identify missing binaries, encoders, browser installation or
components. Server diagnostics are in `artifacts/demos/server.log`.

## Isolation and capture

`scripts/demos/fixtures.mjs` owns the two year-specific scenes. Halloween is
October 31, 2026; Diwali is November 8, 2026. Chicago date offsets account for the
November 1 daylight-saving transition. Diwali deliberately has three main-day
events: the existing UI hides its lantern and sparkles at four events. Surrounding
days provide context and determine the row's natural height. No cell sizes,
event styles, animation speeds or accessibility CSS are overridden.

The capture script creates a disposable workspace under `artifacts/demos/` and
copies the UI, styling and public artwork. It excludes server libraries, all
production routes/loaders, local calendar/countdown configuration, environment
files, photos and databases. Temporary server loaders return empty hero data;
fixture endpoints provide the calendar. Unknown API endpoints fail closed and
server-side fetching is disabled. The subprocess receives only the environment
needed to run Node, with no application credentials. Browser requests to other
origins are blocked and cause capture to fail. The fixture mechanism is never
added to a production route. No existing development or production server is used.

Playwright fixes `Date` at 12:30 AM on the first visible day (October 29 or
November 3); the holiday appears as an upcoming date. Timers, `performance.now`,
rAF and CSS animations continue normally. Existing development-only calendar preview
parameters select the visible date range and night lighting. Capture waits for
events, fonts, images and finite lighting transitions. Reduced motion is not
overridden: a reduced-motion browser causes the recording to stop with an error.

The three-cell README crop retains the main day, both neighbors and weekday
headers. Social footage uses the same source, crops the complete main cell and
weekday header, scales proportionally and pads to 1080 × 1920. All titles are
outside the UI. Neither output includes the unrelated hero or system metrics.

## Encoding and loops

Twelve seconds of real-time capture produce an eleven-second loop. Since bats,
ghosts, flames and particles have different periods, there is no short common
natural loop boundary. The final second blends into the first second, then meets
the rotated start. This preserves forward motion and avoids a hard cut or fade
to black, though moving elements may briefly overlap during the blend.

The script owns a private, local-only Xvfb display and launches Chromium with a
1200 × 1920 page viewport at native pixel density, using software rendering.
The private display has extra room for browser chrome; a temporary calibration
marker locates the page origin and is removed before recording. FFmpeg captures
only the calendar crop at 30 FPS, with no real desktop access, into lossless RGB
H.264 MKV (`libx264rgb`, CRF 0). FFV1 is used for the loop intermediate.
No screenshot polling, virtual animation clocks, browser chrome or mouse pointer
enters the footage. README WebP uses 18 FPS,
960-pixel width, quality 80 and infinite looping. Social MP4 uses H.264, CRF 20,
slow preset, yuv420p, 30 FPS, faststart and no audio.

Capture measures adjacent source-frame changes as well as browser animation-frame
callbacks. It rejects fewer than 10 changing frames per second or fewer than 180
animation callbacks over the take, and warns below 15 changing frames per second.
`capture.json` and `verification.json` report the actual source motion cadence
separately from the recording/export frame rates. Failed captures preserve the
previous validated source.

The initial exports measured **12.9 changing frames/second for Halloween and 11.4
for Diwali** on this host's software renderer. The 18/30 FPS exports repeat frames
where the source has no new image; they do not provide 30 FPS of distinct motion.
Native-resolution text is also enlarged for export. Supersampling was tested but
made animation too slow, so it is not enabled. A faster rendering environment is
needed for sharper, smoother source footage; the workflow does not slow animation
time or alter the artwork to disguise these limits.

## Outputs and review

Commit these reasonably small documentation assets:

- `docs/media/demos/halloween.webp` and `diwali.webp`
- `docs/media/demos/halloween-poster.png` and `diwali-poster.png`

The following remain gitignored:

- `artifacts/demos/{halloween,diwali}-vertical.mp4` — upload-ready social clips
- `artifacts/demos/{halloween,diwali}/source.mkv` — lossless footage for re-encoding
- Each scene's `loop.mkv`, `kiosk.png`, `social-poster.png`, `first.png`, `last.png`,
  `capture.json`, and `verification.json` — review evidence

Capture checks page identity, event readiness, artwork presence, viewport
overflow, layout stability, browser errors, outbound requests and visible motion.
Encoding uses FFprobe to check codec, dimensions, frame rate, frame count and
absence of audio. A RIFF parser checks WebP frame count, duration and loop flag
(older FFprobe versions cannot demux animated WebP). The seam's mean pixel
difference is reported and checked, but cannot replace visual review.

After regeneration, inspect both posters and play both loops, including the seam.
Check that event text is readable and all artwork stays inside its cell. Encoding
prints output sizes and warns if a WebP exceeds 5 MB. Browser/font/renderer updates
can change pixels and phase timing; the workflow is repeatable, not byte-identical.

GitHub's actual hosted README playback must be checked after the assets are
published through the normal review process; a local browser preview does not
confirm GitHub's image proxy or renderer behavior. No GIF is generated by default.
If the hosted WebP demonstrably fails, add a palette-optimized GIF fallback and
update the README image paths. Do not publish private data or push just to test it.
