# Calendar day decorations

`CalendarDayDecoration.svelte` is an optional, presentational layer inside each calendar
cell. `calendarDecorations.ts` matches the column's local civil date against a small
registry with optional year constraints. Halloween matches October 31 every year;
Diwali / Deepavali covers November 6–10, 2026, with November 8 as its main day, independently of events or
the current time. The matcher uses the same civil date as the visible day/month heading;
it does not parse ISO timestamps or convert the column to UTC.

The cell's isolated stacking context places the decoration above its existing background
and below all content. The decoration is absolutely positioned, clips its own artwork,
ignores pointer events, and is hidden from assistive technology. No event wrappers, rows, event
spacing, or event colors change. Diwali date labels, timed-event titles, and time labels
receive a subtle dark text shadow to stay readable over the lights, while retaining their
usual backgrounds. Weekend striping and today indicators remain intact.

Halloween artwork is inline SVG. The ghost floats 18px with 3px drift and ±5° rocking on a
4.5-second cycle. Bats have staggered bursts of ±10° rocking, small vertical movement,
and silhouette compression (their wings are not separate paths). `HalloweenPumpkins.svelte`
contains the supplied enhanced SVG: both pumpkin silhouettes, the large carved tooth,
inner-rind bevels, candle-core gradients, face illumination, and four ambient/ground
halos. Pumpkin bodies remain stationary.

The thin holiday frame uses static shadows on two pseudo-elements inside the clipped
layer. Night lighting fades in with opacity over six seconds; no shadow or filter is
animated. The frame runs from the day-number heading to the bottom of the cell, below
the separately rendered weekday row. Its glow stays inside the column boundary, so it
cannot bleed into neighbors. Reduced motion disables motion, flickering, and transitions
while retaining the appropriate static lighting.

## Solar lighting

The page provides a per-instance Svelte context store. `WeatherCard` publishes lighting
from its existing weather data and minute clock; the decoration subscribes. There are
no added requests or timers, and no shared server-side mutable state.

`weatherLighting.ts` selects today's sunrise/sunset from the daily forecast using the
weather location's IANA timezone (browser-local when absent). It also supports the
existing astronomy/root fields. Explicit-offset timestamps and epoch values are
converted into that timezone; local clock strings are interpreted there. Future daily
entries carry lighting across midnight before the next three-minute weather poll.
Sunset is nighttime, sunrise is daytime, and updates occur within one minute. This
uses the current clock, independently of the date displayed in the Halloween column.
DST changes use the forecast's actual solar timestamps. Missing, invalid, or expired
solar data defaults to daytime rather than indefinitely repeating yesterday's times.

## Local preview

Run `yarn dev`, then open:

- `http://localhost:5173/?calendarPreviewDate=2026-10-27` for a week containing Halloween.
- `http://localhost:5173/?calendarPreviewDate=2027-10-27` for recurring Halloween in a future year.
- `http://localhost:5173/?calendarPreviewDate=2026-11-06` for Diwali and its adjacent dates.
- `http://localhost:5173/?calendarPreviewDate=2027-11-06` to check that Diwali does not recur automatically.
- `http://localhost:5173/?calendarPreviewDate=2026-06-01` for an undecorated week.

The development-only parameter accepts a valid `YYYY-MM-DD` local date and changes only
the calendar's range anchor. The calendar still loads real events for that range. The
current clock, event current/past states, and other dashboard components are unaffected.
Add `&calendarPreviewLighting=day` or `&calendarPreviewLighting=night` to force a
lighting state in development. Omit it to exercise actual sunrise/sunset transitions.
Reload after changing either parameter. Production builds ignore it. Browser developer tools
can emulate 1200 × 1920 and reduced motion without changing operating system settings.

## Extending

Add a decoration identifier and registry entry, then add its artwork to the
existing decoration component (extract individual artwork components when useful).
Omit `year` only for fixed annual Gregorian holidays. For Diwali, add a verified entry to `diwaliFestivals` in
`calendarDecorations.ts`, with zero-padded `YYYY-MM-DD` civil dates:

```ts
{ startDate: '2026-11-06', mainDate: '2026-11-08', endDate: '2026-11-10' }
```

The start and end are inclusive; the year is explicit in every date. Ranges may cross
month boundaries, and the main day is configured rather than assumed to be the midpoint.
Before the main day the intensity is `subtle`, on it `full`, and after it `moderate`.
Future years need their own verified entries. The existing fixed-date registry retains
precedence if another holiday falls inside a festival period.
No calendar events, holiday labels, or countdowns are created by this registry.

## Diwali festival source and progression

The 2026 range was checked against the all-day **Deepavali** entry in the shared
**Mark & Smruti** calendar on November 1, 2026. It starts November 6 and ends November 11
exclusive, so the decorated period ends November 10. The **Diwali/Deepavali** entry in
**Hindu Holidays** confirms November 8 as the main day. The separate Bhai Duj entry on
November 11 does not extend the shared calendar's festival period.

These are reviewed configuration dates, not a live event-title matcher. Calendar events,
renames, unrelated Diwali parties, and temporary feed outages do not activate or extend
the theme. No new calendar fetching is involved.

| Dates (2026)  | Intensity  | Treatment                                                                                 |
| ------------- | ---------- | ----------------------------------------------------------------------------------------- |
| November 6–7  | `subtle`   | Small, dim, static lamps and corners; faint cell frame                                    |
| November 8    | `full`     | Original animation strength; lantern, corners, lamps, perimeter sparkles; brightest frame |
| November 9–10 | `moderate` | Static corners, lamps with 45% flame movement and reduced halo pulsation; softer frame    |

Only the main day uses a lantern and sparkles. Existing short-cell and crowded-cell
reductions apply on top of every intensity, preserving their relative brightness.
The brighter main-day frame remains distinctive even when content hides its lantern.
All frames and artwork are clipped independently to their own cells.

## Diwali / Deepavali artwork

`DiwaliDecoration.svelte` composes the four supplied SVGs from
`static/assets/holidays/diwali/` within the existing clipped, noninteractive decoration
layer. External image documents isolate gradient IDs and keyframes across assets and
repeated calendar instances. Paths, gradients, animation timing, and the supplied
reduced-motion media queries are preserved. The diya keyframes now multiply movement
and halo pulsation by an inherited strength token, defaulting to the original strength.
The `?motion=moderate#diwali-moderate` SVG view selects 45% movement and a dimmer halo.
The main-day SVG still uses its original scale, skew, opacity endpoints, and timings.

Each SVG adds a `diwali-reduced-motion` root ID and two small CSS rules: the targeted
root sets an inherited motion token to `paused`, and SVG elements use that token for
`animation-play-state`. Inheritance reaches the rangoli's `<use>` instances as well.
A native `<picture>` media source selects `?motion=static#diwali-reduced-motion` when
reduced motion is requested. The separate cache key and explicit static fragment handle
Chromium image documents retaining earlier media preferences. There are no JavaScript
listeners or duplicate assets.
The supplied HTML is a visual reference only and is not included in the application.

The rangoli sits in the upper corners, with a mask dimming the left date-label corner.
The central hanging kandil and bottom diya row scale with the available cell dimensions.
A mask keeps sparkles near the perimeter. Artwork never contributes to cell sizing.
Size container queries live on the absolutely positioned artwork root, leaving calendar
layout untouched. At 12rem cell height or less, the lantern shrinks and sparkles disappear.
At four or more displayed events/tasks, the lantern and sparkles disappear, the rangoli
dims, and the diya row shrinks and dims. Calendar content keeps its existing spacing,
ordering, text colors, and all-day/multi-day rendering.

The existing solar context controls image opacity and the shared gold frame: lights
are more pronounced at night, with a six-second opacity transition. This deliberately
changes the image element, not CSS properties inside the external SVG. No extra weather
requests, timers, SVG duplication, animated filters, or dependencies are needed.
Reduced motion disables image/frame transitions and each SVG's internal animations,
leaving the original static artwork visible.

## Visual tuning

The variables at the top of `CalendarDayDecoration.svelte` control the effect:

| Variables                                                           | Defaults / purpose                                       |
| ------------------------------------------------------------------- | -------------------------------------------------------- |
| `--ghost-rise`, `--ghost-drift`, `--ghost-rock`, `--ghost-duration` | -18px, 3px, 5deg, 4.5s                                   |
| `--bat-rock`, `--bat-travel`                                        | 10deg, -3px                                              |
| `--bat-near-duration`, `--bat-far-duration`                         | 7.3s, 9.7s; staggered bursts                             |
| `--holiday-color`                                                   | Orange frame/ambient color; reusable for future holidays |
| `--frame-day`, `--frame-night`                                      | 0.42, 0.85; base frame and additional night layer        |
| `--lighting-transition`                                             | 6s; crossfade between lighting states                    |

## Enhanced pumpkin lighting

`HalloweenPumpkins.svelte` accepts the existing `isNight` value. It does not subscribe
to weather, read the clock, or create timers. Day/night changes transition independent
lighting channels over six seconds, without replacing or restarting the candle animations.
The parent retains the original placement: bottom 0.15rem, right 3%, width min(92%, 9rem),
and the SVG retains its 160 × 95 viewBox. SVG overflow is visible for soft light, while
the day-decoration layer still clips everything at the column boundary.

The supplied paths and gradients are preserved. The standalone document layout/reset,
color-scheme rules, and accessible image description are omitted: the existing decoration
is already hidden from assistive technology. Gradient IDs use Svelte's per-instance
`$props.id()`. Native nested CSS and keyframes remain scoped to the pumpkin component.

CSS `@property` registrations are necessarily global. All six registered channels and
all pumpkin tuning tokens use the `--daymark-halloween-` prefix; their values are set on
each SVG, so instances animate independently. The four original keyframe sequences,
easing curves, and durations are retained. The small pumpkin's external shadow now uses
its own candle channel, correcting the prototype's shared large-candle reference.

Tune these tokens inside `HalloweenPumpkins.svelte` (all names below have the
`--daymark-halloween-` prefix):

| Token suffix                                       | Default     | Purpose                                            |
| -------------------------------------------------- | ----------- | -------------------------------------------------- |
| `face-day`, `face-night`                           | 0.72 / 1    | Overall carved-face lighting                       |
| `halo-day`, `halo-night`                           | 0.55 / 1.05 | Ambient halos, surface light, spill, external glow |
| `ember-color`                                      | #ee963f     | Warm orange glow color                             |
| `lighting-duration`                                | 6s          | Day/night transition                               |
| `flicker-large-duration`, `flicker-small-duration` | 3.7s / 5.3s | Independent candle cycles                          |
| `sway-large-duration`, `sway-small-duration`       | 4.3s / 6.1s | Independent light movement                         |

The registered `candle-lg`, `candle-sm`, `sway-lg`, and `sway-sm` channels are driven by
keyframes; adjust those keyframes to change flicker amplitude or sway distance. Reduced
motion leaves steady candle intensity 1 and sway 0px, with the appropriate day/night
brightness and no transitions. Without `color-mix()` support, warm solid fills remain
and candle animations are disabled; modern kiosk Chromium is the intended target.

### Rendering tradeoff

The prototype's three blur radii per carved face are held constant, with each face's
opacity and color responding to its candle. This preserves layered near/far glow while
avoiding six continuously varying blur kernels. The two small external body glows still
vary with their respective candles; all radial gradients retain their original geometry.
Registered custom properties are **not** a guarantee of compositor-only animation:
colors, SVG styling, and the remaining small dynamic filters can repaint. The maximum
SVG width stays 144 CSS pixels at the default root font size. Validate sustained rendering
on the physical Raspberry Pi before increasing the artwork size or shadow radii.
