# Calendar day decorations

`CalendarDayDecoration.svelte` is an optional, presentational layer inside each calendar
cell. `calendarDecorations.ts` matches the column's local month/day against a small
annual registry. Halloween matches October 31 every year, independently of events or
the current time. The matcher uses the same civil date as the visible day/month heading;
it does not parse ISO timestamps or convert the column to UTC.

The cell's isolated stacking context places the decoration above its existing background
and below all content. The decoration is absolutely positioned, clips its own artwork,
ignores pointer events, and is hidden from assistive technology. No event wrappers, rows, event
spacing, or event colors change. Timed-event titles in decorated cells receive a small dark backing because their
rows are otherwise transparent; bright lantern faces must not compete with text. Weekend striping and today indicators remain intact.

All artwork is inline SVG. The ghost floats 18px with 3px drift and ±5° rocking on a
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
- `http://localhost:5173/?calendarPreviewDate=2027-10-27` for a future year.
- `http://localhost:5173/?calendarPreviewDate=2026-06-01` for an undecorated week.

The development-only parameter accepts a valid `YYYY-MM-DD` local date and changes only
the calendar's range anchor. The calendar still loads real events for that range. The
current clock, event current/past states, and other dashboard components are unaffected.
Add `&calendarPreviewLighting=day` or `&calendarPreviewLighting=night` to force a
lighting state in development. Omit it to exercise actual sunrise/sunset transitions.
Reload after changing either parameter. Production builds ignore it. Browser developer tools
can emulate 1200 × 1920 and reduced motion without changing operating system settings.

## Extending

Add a decoration identifier and annual month/day entry, then add its artwork to the
decoration component (extract individual artwork components when useful). Core event
rendering does not need to change. Holidays with variable dates, such as Diwali, should
use explicit civil-date entries or a separately verified date provider when supported;
they should not be treated as fixed annual Gregorian dates.

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
