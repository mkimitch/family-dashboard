# Family Dashboard (Svelte)

An information board for the family room built with SvelteKit. The layout is tuned for a 1920×1200 portrait display and surfaces:

- A hero section with clock, messages, and optional alerts
- Current weather conditions plus a rolling seven-day forecast (excluding today)
- A one-week calendar view with all-day and timed events
- System status metrics for the Raspberry Pi display and the backend server

## Project architecture

| Layer | Responsibility | Key files |
| --- | --- | --- |
| UI components | Hero, calendar, weather, wallpaper, system status | `src/lib/components/*.svelte` |
| Routes (pages) | Compose dashboard layout and load initial data | `src/routes/+page.svelte`, `src/routes/+layout.svelte` |
| Server load | Prefetch weather and wallpaper photos for fast first paint | `src/routes/+layout.server.ts` |
| API proxies | Fetch upstream calendar, weather, and system metrics | `src/routes/api/**` |
| Static assets | Wallpapers, icons, SVGs | `static/` |

State is managed through the Svelte 5 `$state` primitive inside components. Server routes proxy external APIs so browser clients never need upstream credentials.

## Prerequisites

- Node.js 20+
- Yarn 4 (PnP is enabled via `.pnp.cjs`)
- ImageMagick (`mogrify`) if you intend to run the photo optimization script

## Getting started

1. Install dependencies:

   ```sh
   yarn install
   ```

2. Add a `.env` file (see [Environment configuration](#environment-configuration)).
3. Start the dev server:

   ```sh
   yarn dev
   ```

   Then open the port shown in the terminal (default `http://localhost:5173`).

### Quality checks

Run these locally before pushing—this mirrors the CI workflow and guards against regressions:

```sh
yarn check   # Type checking via svelte-check
yarn lint    # ESLint + Prettier check
yarn format  # Apply Prettier formatting
```

## Environment configuration

Create a `.env` alongside the project root with the variables used by the proxy endpoints:

| Variable | Purpose |
| --- | --- |
| `CAL_URL` | Base URL for the calendar events feed |
| `CAL_API_KEY` | Optional API key header sent to calendar endpoints |
| `CAL_CLIENT_ZONE` | Default timezone supplied to the calendar service |
| `CAL_CALENDARS_URL` | Optional separate endpoint for calendar metadata/legend |
| `WX_URL` or `AGG_WEATHER_URL` | Weather data endpoint consumed by `/api/weather` |
| `PHOTO_DIR` | Optional absolute/relative directory containing wallpaper JPGs |
| `GPU_TEMP_FILE` | Optional file path for GPU temperature reporting |

Example:

```env
CAL_URL="https://example.com/api/calendar"
CAL_API_KEY="your-api-key-here"
CAL_CLIENT_ZONE="America/Chicago"
CAL_CALENDARS_URL="https://example.com/api/calendars"
WX_URL="https://example.com/api/weather"
PHOTO_DIR="/mnt/photos/dashboard"
GPU_TEMP_FILE="/sys/devices/gpu/temp"
```

## Data flow

1. `+layout.server.ts` prefetches weather and wallpaper metadata so the initial render has meaningful content.
2. The calendar, weather, and system status components fetch their respective proxy endpoints on mount and refresh periodically.
3. Wallpaper images are shuffled client-side and cycled with fade transitions.

All network calls use the SvelteKit fetch polyfill, keeping credentials on the server and allowing caching/polling policies to live in one place.

## Scripts

| Script | Description |
| --- | --- |
| `yarn dev` | Run Vite dev server |
| `yarn build` | Optimize photos (if `photos-src` exists) then build SvelteKit |
| `yarn preview` | Preview the production build |
| `yarn check` | Run `svelte-check` against `tsconfig.json` |
| `yarn lint` | Run Prettier in check mode and ESLint |
| `yarn format` | Format the codebase with Prettier |
| `yarn optimize:photos` | Downscale JPGs from `photos-src/` into `static/photos/` (requires ImageMagick) |

## Assets and attribution

- Wallpapers live in `static/photos/` and are ignored by git to keep personal photos private. Add your own JPGs manually or via `yarn optimize:photos`.
- Weather icons come from `@lxg/weather-icons` and render from `/vendor/weather-icons/fill/svg/`.
- System status SVG assets (e.g., `rpi.svg`, `server.svg`, `cpu-filled.svg`, `gpu-filled.svg`, `uptime-1.svg`) are from the **Uicons by [Flaticon](https://www.flaticon.com/uicons)** set and require attribution when published.

## Deployment

Create a production build:

```sh
yarn build
```

The default adapter is `@sveltejs/adapter-auto`. If deploying to Node, install `@sveltejs/adapter-node` and update `svelte.config.js` accordingly. Serve the contents of the `build/` directory or integrate with your preferred adapter target.

## Troubleshooting

- Missing adapters: install `@sveltejs/adapter-node` (or your adapter of choice) if the build complains about unavailable adapters.
- Weather or calendar data missing: confirm your `.env` configuration and that upstream services are reachable from the server.
- Wallpapers not rotating: ensure JPG files exist in the configured directory and that the browser can reach `/photos/<file>`. Check console logs for fetch errors.

## Contributing

1. Fork or branch.
2. Run the quality checks listed above.
3. Open a PR summarizing UI changes with screenshots/gifs when applicable.
