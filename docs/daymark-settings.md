# Daymark settings

The server reads `data/daymark-settings.json` relative to the service working directory on each root layout load. Edit the file and reload the dashboard. The installation file is local and gitignored. A missing file uses application defaults.

```json
{
	"version": 1,
	"global": { "density": "full" },
	"decorations": {
		"diwali": { "density": "adaptive" },
		"thanksgiving": {
			"motions": {
				"head": { "durationMs": 850, "intervalMs": [25000, 45000] },
				"peck": { "enabled": false }
			}
		}
	}
}
```

Application defaults are adaptive density and five enabled turkey motions. This installation uses the density settings above and inherits all motion defaults. Omit a field to inherit it. Resolution overlays the installation-wide settings, then the matching calendar decoration, then the allowlisted URL preview. A future local civil-date override belongs immediately before preview. Calendar decoration scope is independent of the seasonal hero and its display-timezone date.

`?decorationDensity=full`, `adaptive`, or `reduced` changes only the current view. Remove the parameter to restore inheritance. The URL is never sent to a settings writer. An unsupported document version or unreadable document uses application defaults and logs a server warning. Unknown keys and invalid individual values are omitted. A two-number interval is validated and inherited as a single field.

The four-item crowding calculation stays on the calendar cell. Density controls the artwork underneath the events. Full richness still respects the short-cell constraints and Diwali festival progression. Halloween's adaptive artwork retains its original layers; explicit reduced density hides the bats and ghost.

## Future administration

The typed registry in `src/lib/config/daymarkSettings.ts` supplies labels, categories, supported scopes, enumerated options, numeric bounds, and defaults. An editor can display selects for density and ground-peck style, a checkbox per motion, and millisecond fields for duration and the ordered interval endpoints. Show the stored sparse override alongside its inherited effective value. “Use inherited” removes the field. The resolver and Svelte layout context supply effective values for rendering.

A future authenticated server writer can validate against the same definitions, require a supported version, and atomically replace the installation document after checking for concurrent edits. Persist only edited override fields. Reload layout data after saving. New seasonal visibility, kiosk, or accessibility settings can register their own controls and validators when implemented. Schema changes that reinterpret existing values require a versioned reader or explicit migration.

## Motion and preview

The shared turkey controller exposes `play(motion)`, `playPeck(style)`, `playAll()`, `cancel()`, and a read-only Svelte store named `current`. Play operations resolve to `completed`, `skipped` (disabled or busy), or `cancelled`. Stop/Reset cancels the entire sequence and immediately removes its transforms. A future admin preview can use this controller with its own isolated settings.

| Motion key | Interval | Duration |
| ---------- | -------- | -------- |
| head       | 25–45 s  | 850 ms   |
| wattle     | 45–75 s  | 450 ms   |
| wing       | 50–85 s  | 700 ms   |
| peck       | 65–105 s | 1,050 ms |
| tail       | 30–40 s  | 1,700 ms |

The earliest due enabled motion plays first. Exact ties follow the table order. The scheduler waits for the browser's transform animations, including any delayed wattle wobble, to finish, then rests four seconds. At the end of the rest, every expired opportunity receives a new interval. Future deadlines keep their place. Hidden tabs suspend the scheduler, leaf movement, and pulsing glow. Returning to the page starts fresh intervals. OS reduced motion and `seasonMotion=off` retain the static artwork.

Run `yarn preview:thanksgiving` and open the local URL it prints. Stop the fixture server with Ctrl+C. The manual controls require development mode and `turkeyPreview=manual`. They use the same playback gates as automatic motion. Production ignores this parameter.

Run `yarn test:decorations` for browser verification, add `--production` for the production fixture, or add `--record` to generate an enlarged animated WebP at `artifacts/demos/thanksgiving-motions.webp`. The capture plays the five motions in table order. The fixture uses the existing Playwright and demo tooling, local Chrome (override with `DEMO_CHROMIUM_PATH`), and FFmpeg for recording.

Set `groundPeckStyle` to `single`, `double`, or `random` under `global` or `decorations.thanksgiving`. The default is `random`. Each accepted peck selects independently, with a 70% chance of single and 30% chance of double. Both share `motions.peck.enabled` and `intervalMs`. The single uses the configured `durationMs`; the double scales it by 1,250/1,050 to preserve the speed of the first strike. Wattle delay is the same for both. A temporary `?groundPeckStyle=double` override follows the same precedence as density.

The fictional preview offers **Single peck**, **Double peck**, and **Random peck**. Each button overrides the style for one playback. **Last peck** reports the selected variant and **Play all** uses the resolved style.
