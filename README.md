# Family Dashboard (Svelte)

An information board for the family room built with SvelteKit. The layout is tuned for a 1920×1200 portrait display and surfaces:

- A hero section with clock, messages, and optional alerts
- Current weather conditions plus a rolling seven-day forecast (excluding today)
- A one-week calendar view with all-day and timed events
- System status metrics for the Raspberry Pi display and the backend server

## Project architecture

| Layer          | Responsibility                                             | Key files                                              |
| -------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| UI components  | Hero, calendar, weather, wallpaper, system status          | `src/lib/components/*.svelte`                          |
| Routes (pages) | Compose dashboard layout and load initial data             | `src/routes/+page.svelte`, `src/routes/+layout.svelte` |
| Server load    | Prefetch weather and wallpaper photos for fast first paint | `src/routes/+layout.server.ts`                         |
| API proxies    | Fetch upstream calendar, weather, and system metrics       | `src/routes/api/**`                                    |
| Static assets  | Wallpapers, icons, SVGs                                    | `static/`                                              |

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

| Variable                      | Purpose                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `CAL_URL`                     | Base URL for the calendar events feed                                                 |
| `CAL_API_KEY`                 | Optional API key header sent to calendar endpoints                                    |
| `CAL_CLIENT_ZONE`             | Default timezone supplied to the calendar service                                     |
| `CAL_CALENDARS_URL`           | Optional separate endpoint for calendar metadata/legend                               |
| `WX_URL` or `AGG_WEATHER_URL` | Weather data endpoint consumed by `/api/weather`                                      |
| `PHOTO_DIR`                   | Optional absolute/relative directory containing wallpaper JPGs                        |
| `GPU_TEMP_FILE`               | Optional file path for GPU temperature reporting (server only, not Pi)                |
| `PI_SYSINFO_URL`              | Optional HTTP endpoint for Raspberry Pi system metrics (see Pi setup section below)   |

Example:

```env
CAL_URL="https://example.com/api/calendar"
CAL_API_KEY="your-api-key-here"
CAL_CLIENT_ZONE="America/Chicago"
CAL_CALENDARS_URL="https://example.com/api/calendars"
WX_URL="https://example.com/api/weather"
PHOTO_DIR="/mnt/photos/dashboard"
GPU_TEMP_FILE="/sys/class/hwmon/hwmon2/temp1_input"
PI_SYSINFO_URL="http://192.168.1.100:9000/sysinfo"
```

## Raspberry Pi system monitor setup

The dashboard displays system metrics (CPU/GPU temperature, load, memory, uptime, IP address) for both the Raspberry Pi display host and the backend server. The server metrics are collected automatically via the `/api/server-sysinfo` endpoint, but the **Raspberry Pi metrics require a separate Python sidecar script** running on the Pi itself.

### What `pi_sysinfo.py` does

The `scripts/pi_sysinfo.py` script is a lightweight HTTP service that:

- Reads Pi-specific metrics from `/proc/` (CPU temp, GPU temp via `vcgencmd`, load, memory, uptime)
- Detects the Pi's local network IPv4 address (filtering out loopback, link-local, and Docker bridges)
- Exposes this data as JSON at `http://<pi-ip>:9000/sysinfo`

### Prerequisites on the Raspberry Pi

- Python 3.7+
- `vcgencmd` (included by default on Raspberry Pi OS)
- Network connectivity between your Pi and the machine running the SvelteKit app

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

#### 3. Set up systemd service for autostart

Create a systemd service file to run the script automatically at boot:

```sh
sudo nano /etc/systemd/system/pi-sysinfo.service
```

Add the following configuration (replace `<username>` with your actual username):

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

Save and exit (`Ctrl+X`, `Y`, `Enter`).

#### 4. Enable and start the service

```sh
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable the service to start at boot
sudo systemctl enable pi-sysinfo.service

# Start the service now
sudo systemctl start pi-sysinfo.service
```

#### 5. Verify the service is running

```sh
# Check service status
sudo systemctl status pi-sysinfo.service

# View recent logs
sudo journalctl -u pi-sysinfo.service -n 50

# Follow logs in real-time
sudo journalctl -u pi-sysinfo.service -f
```

You should see `Active: active (running)` in the status output.

#### 6. Test from your development machine

From your dev machine, verify you can reach the endpoint:

```sh
curl http://<pi-ip>:9000/sysinfo
```

Replace `<pi-ip>` with your Pi's actual IP address (e.g., `192.168.1.100`).

### Configuring the SvelteKit app

In your `.env` file on the development/server machine, add the Pi endpoint URL:

```env
PI_SYSINFO_URL=http://192.168.1.100:9000/sysinfo
```

The `SystemStatusStub` component will automatically poll this endpoint every 15 seconds and display the Pi's metrics in the dashboard.

### Useful service management commands

```sh
# Restart the service (e.g., after updating the script)
sudo systemctl restart pi-sysinfo.service

# Stop the service
sudo systemctl stop pi-sysinfo.service

# Disable autostart
sudo systemctl disable pi-sysinfo.service

# View all logs since boot
sudo journalctl -u pi-sysinfo.service
```

### Troubleshooting

- **Service fails with "Failed at step USER"**: Check that the `User=` field in the service file matches your actual username. Run `whoami` on the Pi to confirm.
- **IP shows as "unknown"**: The script may not be running, or the `hostname -I` command on your Pi isn't returning valid IPs. Check the service logs with `sudo journalctl -u pi-sysinfo.service`.
- **Connection refused from SvelteKit app**: Ensure port 9000 is not blocked by a firewall on the Pi. Check with `sudo ufw status` if using UFW.
- **Metrics not updating**: Verify the `PI_SYSINFO_URL` in your `.env` file matches your Pi's actual IP address and port.

## Data flow

1. `+layout.server.ts` prefetches weather and wallpaper metadata so the initial render has meaningful content.
2. The calendar, weather, and system status components fetch their respective proxy endpoints on mount and refresh periodically.
3. Wallpaper images are shuffled client-side and cycled with fade transitions.

All network calls use the SvelteKit fetch polyfill, keeping credentials on the server and allowing caching/polling policies to live in one place.

## Scripts

| Script                 | Description                                                                    |
| ---------------------- | ------------------------------------------------------------------------------ |
| `yarn dev`             | Run Vite dev server                                                            |
| `yarn build`           | Optimize photos (if `photos-src` exists) then build SvelteKit                  |
| `yarn preview`         | Preview the production build                                                   |
| `yarn check`           | Run `svelte-check` against `tsconfig.json`                                     |
| `yarn lint`            | Run Prettier in check mode and ESLint                                          |
| `yarn format`          | Format the codebase with Prettier                                              |
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
