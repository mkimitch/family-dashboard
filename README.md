# Family Dashboard (SvelteKit)

A family-room information board built with SvelteKit. The UI is tuned for a 1920×1200 portrait display and combines shared household information, ambient visuals, and host health metrics in a single kiosk-friendly screen.

## Feature overview

- Hero area with:
  - current time/date
  - school lunch options
  - optional message banner
  - optional countdown list
- Weather card with:
  - current conditions
  - alert pills
  - sunrise/sunset and moonrise/moonset
  - rolling seven-day forecast (excluding today)
- One-week calendar with:
  - all-day and timed events
  - calendar legend with per-calendar colors/icons
  - merged duplicate all-day events across calendars
- System status chips for:
  - the Raspberry Pi display host
  - the backend/server host
- Rotating wallpaper background with responsive photo sizes
- Optional snow overlay component (present in the repo, currently disabled in `src/routes/+layout.svelte`)

## Project architecture

| Layer                | Responsibility                                                                 | Key files                                                             |
| -------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| UI components        | Clock, school lunch, weather, calendar, wallpaper, system status               | `src/lib/components/*.svelte`                                         |
| Shared UI logic      | Calendar duplicate-merge behavior and config helpers                           | `src/lib/calendarMerge.ts`, `src/lib/config/**`                       |
| Routes               | Compose the dashboard shell and page layout                                    | `src/routes/+layout.svelte`, `src/routes/+page.svelte`                |
| Server load          | Prefetch weather, wallpaper metadata, and school lunch for first paint         | `src/routes/+layout.server.ts`                                        |
| API and media routes | Proxy upstream calendar/weather/school-menu/system data and serve photos/icons | `src/routes/api/**`, `src/routes/photos/**`, `src/routes/vendor/**`   |
| Styling              | Global tokens/app shell plus component-local styles                            | `src/app.css`, component `<style>` blocks, `docs/css-architecture.md` |
| Static assets        | Lottie weather animations, SVGs, wallpapers, manifest assets                   | `static/`                                                             |

This project uses Svelte 5 runes such as `$state` and `$derived` for local component state. Server routes proxy upstream APIs so browser clients do not need direct access to external services or credentials.

## CSS ownership

The project has been incrementally refactored toward component-owned styles.

- `src/app.css` owns:
  - global design tokens
  - font-face declarations
  - resets/base element styles
  - app-shell layering and layout primitives
  - a small set of intentional global exceptions
- Component `<style>` blocks own:
  - component internals
  - component states and modifiers
  - component-local responsive behavior
- Route components may style child roots for placement, but should not style child internals.

See `docs/css-architecture.md` for the current rules and stylelint rollout guidance.

## Prerequisites

- Node.js 20+
- Yarn 4 with Plug'n'Play enabled
- ImageMagick (`mogrify`) if you want photo resizing in `yarn optimize:photos`
- Python 3.7+ on the Raspberry Pi if you want live Pi system metrics via the sidecar script

## Getting started

1. Install dependencies:

   ```sh
   yarn install
   ```

2. Create a `.env` file in the project root. See [Environment configuration](#environment-configuration).

3. Add wallpaper photos if needed:
   - either place JPGs under `static/photos/`
   - or point `PHOTO_DIR` at an external photo directory

4. Start the development server:

   ```sh
   yarn dev
   ```

   For LAN access from another device on your network:

   ```sh
   yarn dev:lan
   ```

5. Open the URL shown in the terminal (default `http://localhost:5173`).

## Useful local checks

```sh
yarn check
yarn lint
yarn lint:css
yarn fix:css
yarn format
```

Notes:

- `yarn lint` runs Prettier in check mode, ESLint, and the scoped CSS lint script.
- `yarn lint:css` / `yarn fix:css` currently follow the scoped rollout documented in `docs/css-architecture.md`.
- `src/app.css` is still excluded from the package CSS lint script to avoid forcing broad global rewrites during the incremental ownership migration.

## Environment configuration

Create a `.env` file alongside the project root with the variables consumed by the server routes:

| Variable                      | Purpose                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `CAL_URL`                     | Base URL for the calendar events feed                      |
| `CAL_API_KEY`                 | Optional API key header sent to calendar endpoints         |
| `CAL_CLIENT_ZONE`             | Default timezone supplied to the calendar service          |
| `DISPLAY_LOCALE`              | Optional locale for absolute date/time display formatting  |
| `DISPLAY_TIMEZONE`            | Optional timezone for date/time display format             |
| `DISPLAY_HOUR12`              | Optional 12-hour/24-hour display override                  |
| `CAL_CALENDARS_URL`           | Optional separate endpoint for calendar metadata/legend    |
| `WX_URL` or `AGG_WEATHER_URL` | Weather data endpoint consumed by `/api/weather`           |
| `SCHOOL_MENU_URL`             | Optional override for the school-menu upstream             |
| `PHOTO_DIR`                   | Optional absolute/relative directory for wallpaper JPGs    |
| `GPU_TEMP_FILE`               | Optional server-side GPU temperature file path             |

If `PHOTO_DIR` is not set, the app serves photos from `static/photos`.

`DISPLAY_HOUR12` accepts common boolean forms such as `true`/`false`, `1`/`0`, `yes`/`no`, and `on`/`off`.

`DISPLAY_*` settings affect display formatting only. They do not change operational scheduling or query logic such as school-menu polling, calendar bucketing/query behavior, all-day boundaries, or similar domain-time calculations.

Current v1 locale scope is intentionally narrow: locale settings apply to absolute date/time formatting via `Intl`, while English strings such as `just now`, `x mins ago`, `Today`, and `Tomorrow` remain hardcoded.

Example:

```env
CAL_URL="https://example.com/api/calendar"
CAL_API_KEY="your-api-key-here"
CAL_CLIENT_ZONE="America/Chicago"
DISPLAY_LOCALE="en-US"
DISPLAY_TIMEZONE="America/Chicago"
DISPLAY_HOUR12="true"
CAL_CALENDARS_URL="https://example.com/api/calendars"
WX_URL="https://example.com/api/weather"
SCHOOL_MENU_URL="https://example.com/api/school-menu/next"
PHOTO_DIR="/mnt/photos/dashboard"
GPU_TEMP_FILE="/sys/class/hwmon/hwmon2/temp1_input"
```

## Raspberry Pi system monitor setup

The dashboard shows system metrics for two machines:

- the server host, via `/api/server-sysinfo`
- the Raspberry Pi display host, via the standalone `scripts/pi_sysinfo.py` sidecar

### Important current behavior

In the current UI implementation:

- **development mode** uses deterministic mock Pi data when the sidecar is unavailable
- **non-dev builds** fetch Pi metrics directly from `http://127.0.0.1:9000/sysinfo` in the browser

That means the common deployment model is:

- run the dashboard on the Pi display host, and
- run `pi_sysinfo.py` on that same Pi listening on port `9000`

The current app does **not** consume a `PI_SYSINFO_URL` environment variable.

### What `pi_sysinfo.py` does

The `scripts/pi_sysinfo.py` script is a lightweight HTTP service that:

- reads Pi-specific metrics from `/proc/` and related system tools
- reports CPU temperature, GPU temperature, load, memory, uptime, CPU count, and IPv4 address
- exposes this data as JSON at `http://<pi-ip>:9000/sysinfo`

### Prerequisites on the Raspberry Pi

- Python 3.7+
- `vcgencmd` (included by default on Raspberry Pi OS)
- network access if you want to test the endpoint from another machine

### Step-by-step installation

#### 1. Copy the script to your Raspberry Pi

From your development machine:

```sh
scp scripts/pi_sysinfo.py <username>@<pi-ip>:/home/<username>/
```

Example:

```sh
scp scripts/pi_sysinfo.py mkimitch@192.168.1.100:/home/mkimitch/
```

#### 2. Test the script manually

SSH into your Pi and run it:

```sh
ssh <username>@<pi-ip>
python3 ~/pi_sysinfo.py --port 9000
```

You should see:

```sh
pi-sysinfo listening on http://127.0.0.1:9000/sysinfo
```

Test it locally on the Pi:

```sh
curl http://localhost:9000/sysinfo
```

This should return JSON with `ipv4`, `cpuTempC`, `gpuTempC`, `cpuCount`, `load`, `mem`, and `uptimeSec`.

Press `Ctrl+C` to stop the script once verified.

#### 3. Set up a systemd service for autostart

Create a service file:

```sh
sudo nano /etc/systemd/system/pi-sysinfo.service
```

Add the following configuration, replacing `<username>` with your actual username:

```ini
[Unit]
Description=Raspberry Pi System Info HTTP Service
After=network.target

[Service]
Type=simple
User=<username>
WorkingDirectory=/home/<username>
ExecStart=/usr/bin/python3 /home/<username>/pi_sysinfo.py --port 9000
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

#### 4. Enable and start the service

```sh
sudo systemctl daemon-reload
sudo systemctl enable pi-sysinfo.service
sudo systemctl start pi-sysinfo.service
```

#### 5. Verify the service is running

```sh
sudo systemctl status pi-sysinfo.service
sudo journalctl -u pi-sysinfo.service -n 50
```

You should see `Active: active (running)` in the status output.

### Useful service management commands

```sh
sudo systemctl restart pi-sysinfo.service
sudo systemctl stop pi-sysinfo.service
sudo systemctl disable pi-sysinfo.service
sudo journalctl -u pi-sysinfo.service -f
```

### Troubleshooting

- **Service fails with "Failed at step USER"**: Check that the `User=` field in the service file matches your actual username. Run `whoami` on the Pi to confirm.
- **IP shows as `unknown`**: The script may not be running, or the Pi is not exposing a usable IPv4 address. Check the service logs with `sudo journalctl -u pi-sysinfo.service`.
- **Metrics not updating in production**: Ensure the browser host can reach `http://127.0.0.1:9000/sysinfo`. The current UI expects the Pi sidecar there in non-dev mode.

## Data flow

1. `src/routes/+layout.server.ts` prefetches weather, wallpaper metadata, and school lunch data for the first render.
2. `SchoolMenu`, `WeatherCard`, `Calendar`, and `SystemStatusStub` refresh their own data on mount using the app's route proxies.
3. `Calendar` loads calendar metadata from `/api/calendars`, event data from `/api/calendar`, and overlay data from `/api/calendar-overlays`.
4. Duplicate all-day events across calendars are merged client-side by `src/lib/calendarMerge.ts` when `MERGE_ALLDAY_DUPLICATES` is enabled.
5. `Wallpaper` rotates between kiosk/mid/HQ photo variants and updates the visible background height to match the composed board layout.

Most upstream data flows through SvelteKit routes so credentials and upstream URLs stay server-side. The main exception is the Pi sidecar, which the browser reads directly from `http://127.0.0.1:9000/sysinfo` in non-dev mode.

## Scripts

| Script                 | Description                                                             |
| ---------------------- | ----------------------------------------------------------------------- |
| `yarn dev`             | Run the Vite dev server                                                 |
| `yarn dev:lan`         | Run the dev server on `0.0.0.0:5173` for LAN testing                    |
| `yarn check`           | Run `svelte-check` after `svelte-kit sync`                              |
| `yarn check:watch`     | Run `svelte-check` in watch mode                                        |
| `yarn lint`            | Run Prettier check, ESLint, and the scoped CSS lint script              |
| `yarn lint:css`        | Run the scoped stylelint pass defined in `package.json`                 |
| `yarn fix:css`         | Apply scoped stylelint fixes, then run Prettier on those files          |
| `yarn format`          | Format the repository with Prettier                                     |
| `yarn optimize:photos` | Resize/copy JPGs from `photos-src/` into `static/photos/{kiosk,mid,hq}` |
| `yarn build`           | Run `optimize:photos`, then build the adapter-node output               |
| `yarn preview`         | Preview the production build with Vite                                  |
| `yarn start`           | Run the built Node server                                               |

## Assets and attribution

- Wallpapers live under `static/photos/` by default and are typically ignored by git to keep personal photos private.
- Weather animations live under `static/lottie/weather/` and are rendered with `lottie-web` via `src/lib/components/LottieWeatherIcon.svelte`.
- The repo also exposes installed weather icon packages through `src/routes/vendor/weather-icons/[...path]/+server.ts` for package-hosted SVG assets.
- Static SVG assets live under `static/svg/static/`.
- System status SVG assets (e.g., `rpi.svg`, `server.svg`, `cpu-filled.svg`, `gpu-filled.svg`, `uptime-1.svg`) are from the **Uicons by [Flaticon](https://www.flaticon.com/uicons)** set and require attribution when published.

## Deployment

Create a production build:

```sh
yarn build
```

This project currently uses `@sveltejs/adapter-node` in `svelte.config.js`.

Run the built server:

```sh
yarn start
```

Notes:

- `yarn build` runs `yarn optimize:photos` first; that script safely no-ops if `photos-src/` does not exist.
- `yarn preview` is still useful for local build verification, but `yarn start` reflects the adapter-node production target.

## Troubleshooting

- **Missing adapters or build startup issues**: run `yarn install` and make sure `@sveltejs/adapter-node` is present, since the repo is configured for adapter-node builds.
- **Weather or calendar data missing**: verify your `.env` configuration and confirm the upstream services are reachable from the SvelteKit server.
- **School lunch is empty**: check `SCHOOL_MENU_URL`, or verify the default upstream host is reachable from the server.
- **Pi metrics missing in production**: make sure the browser host can reach `http://127.0.0.1:9000/sysinfo`.
- **Wallpapers not rotating**: ensure JPGs exist in `PHOTO_DIR` or `static/photos`, and confirm the generated `/photos/...` routes can read them.
- **Photo optimization is not resizing**: install ImageMagick so `mogrify` is available; otherwise the script copies photos without resizing.

## Contributing

1. Branch from the current mainline.
2. Run the relevant local checks before submitting changes.
3. If you touch CSS ownership or style structure, consult `docs/css-architecture.md`.
4. Summarize UI-visible changes with screenshots or short recordings when practical.
