# Weather icon map

The dashboard bundles 236 animated Meteocons Lottie files under `static/lottie/weather/`.
`src/lib/weatherIcons.ts` is the single runtime mapping layer. It translates weather feed values
into public `/lottie/weather/*.json` paths and always falls back to `not-available.json` when a
condition cannot be identified.

## Runtime selection

| Feed data                                            | Icon families selected                                                                                                                                                                                                | Selection rules                                                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| OpenWeather condition ID, icon code, and description | `clear-*`, `partly-cloudy-*`, `cloudy`, `overcast-*`, `drizzle`/`rain`/`sleet`/`snow`/`hail` variants, `thunderstorms-*`, `mist`, `fog-*`, `haze-*`, `smoke` variants, `dust-*`, `wind-alert`, `tornado`, `hurricane` | IDs 200–804 are mapped first. Description matching fills gaps and recognizes day/night, cloud cover, and severe wording. |
| Wind speed                                           | `wind-beaufort-0` through `wind-beaufort-12`                                                                                                                                                                          | The measured mph value is converted to the Beaufort scale.                                                               |
| Pressure                                             | `pressure-low`, `barometer`, `pressure-high`                                                                                                                                                                          | Low is at or below 1005 hPa; high is at or above 1022 hPa.                                                               |
| UV index                                             | `uv-index`, `uv-index-1` through `uv-index-11`                                                                                                                                                                        | The index is rounded and clamped to 1–11.                                                                                |
| Moon phase                                           | NASA-derived PNG frame sequence under `static/assets/moon/`                                                                                                                                                           | The original 0–1 lunar phase mapping is preserved for fine-grained phase rendering.                                      |
| Astronomy times                                      | `sunrise`, `sunset`, `moonrise`, `moonset`                                                                                                                                                                            | Displayed when the corresponding time is present.                                                                        |
| Alert title and severity                             | `alert-*`, `flag-*`, `tornado`, `wind-alert`, `code-green`, `code-yellow`, `code-orange`, `code-red`                                                                                                                  | Hazard-specific artwork wins; the severity color code is the fallback.                                                   |
| Humidity                                             | `humidity`                                                                                                                                                                                                            | Displayed when relative humidity is present.                                                                             |

## Bundled families

The asset collection contains these complete families:

- Core sky: `clear-*`, `cloudy`, `overcast*`, and `partly-cloudy-*`.
- Precipitation and visibility: `drizzle`, `rain`, `sleet`, `snow`, `hail`, `fog`, `haze`,
  `smoke`, `dust`, and their partly cloudy, overcast, extreme, day, and night combinations.
- Severe weather: all `thunderstorms*` combinations, `tornado`, `hurricane`, `lightning-bolt`,
  `wind-alert`, `wind-snow`, and advisory flags.
- Measurements: `barometer`, `pressure-*`, `humidity`, `uv-index*`, `wind-beaufort-*`,
  thermometers, raindrops, compass, windsocks, and wind direction/coastal variants.
- Astronomy and time: eight moon phases, moonrise/moonset, sunrise/sunset, stars, eclipse,
  horizon, and time-of-day animations.
- Environmental and seasonal: pollen types, tides, rainbow, umbrella variants, snowman,
  gloves, and beanie.
- Status and safety: alert symbols, four color codes, and `not-available`.

## Intentionally data-gated assets

Some bundled animations are not shown yet because the current weather payload does not provide a
truthful trigger for them. These include pollen type/count, tide state, pressure trend (`*-alt`),
onshore/offshore wind, temperature trend and substrate, rain accumulation, clothing suggestions,
and time-of-day illustrations. They should be wired through `weatherIcons.ts` when those values are
added to the feed instead of being inferred from unrelated data.

The eight bundled `moon-*` Lotties are also intentionally not selected: the dashboard retains its
existing 233-frame NASA-derived PNG moon-phase sequence for more precise lunar rendering.
