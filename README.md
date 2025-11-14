# Family Dashboard (Svelte)

Svelte/SvelteKit port of a family dashboard that shows:

- Clock and hero message
- Current weather and 7-day forecast
- Rolling 1-week calendar view with all-day and timed events

The app is designed for a 1920x1200 portrait monitor with an effective content width of 1200px.

## Tech stack

- Svelte 5
- SvelteKit
- TypeScript (strict)
- Vite
- ESLint + Prettier

## Getting started

Install dependencies with Yarn (recommended for this project):

```sh
yarn install
```

### Development

Run the dev server:

```sh
yarn dev
```

Then open `http://localhost:5173` (or whatever port Vite reports).

### Type checking, linting, and formatting

Before committing/pushing, run:

```sh
yarn check
yarn lint
yarn format
```

## Environment variables

This app relies on upstream calendar and weather APIs. Configure them via `.env` (which is git-ignored). Create a local `.env` file based on the variables below:

- `CAL_URL` – Base URL for the calendar events API
- `CAL_API_KEY` – Optional API key for the calendar API
- `CAL_CLIENT_ZONE` – Fallback client timezone (for example `America/Chicago`)
- `CAL_CALENDARS_URL` – Optional URL for the calendar metadata/legend endpoint
- `WX_URL` or `AGG_WEATHER_URL` – Weather API endpoint used by `/api/weather`

Example `.env` (do not commit your real values):

```env
CAL_URL="https://example.com/api/calendar"
CAL_API_KEY="your-api-key-here"
CAL_CLIENT_ZONE="America/Chicago"
CAL_CALENDARS_URL="https://example.com/api/calendars"
WX_URL="https://example.com/api/weather"
```

## Wallpaper and assets

- Wallpaper images are loaded from `static/photos/` but that folder is excluded from version control to avoid committing personal photos.
- Add your own wallpapers to `static/photos/` locally.
- Weather icons come from `@lxg/weather-icons` and are served from `/vendor/weather-icons/fill/svg/`.

## Scripts

Available package scripts:

- `yarn dev` – Start the dev server
- `yarn build` – Create a production build
- `yarn preview` – Preview the production build
- `yarn check` – Run SvelteKit type checks
- `yarn lint` – Run Prettier check and ESLint
- `yarn format` – Format the codebase with Prettier

## Deployment

Build the app:

```sh
yarn build
```

Then deploy the contents of the `build/` directory (and configure your chosen SvelteKit adapter if you target a specific platform).
