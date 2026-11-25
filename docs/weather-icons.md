# Weather animation selection

Daymark bundles 236 Meteocons Lotties under `static/lottie/weather`. The weather card uses the API's V1 canonical condition for the selected context. Weather API owns the provider catalogs and supplies descriptions and per-period provenance. Daymark uses the condition characteristics to select an existing animation. A bounded adapter handles cached legacy API responses and unknown schema versions.

## Presentation

- Current conditions use the existing solar calculation with the feed's sunrise, sunset and timezone, then a provider light hint when available. The selector also supports hourly, full-day, daytime and nighttime contexts. The production card still displays current and full-day forecasts.
- The artwork uses explicit conditions first. Where sky class is absent, a provider-reported cloud percentage can guide the artwork. Mixed sky uses representative art without choosing a dominant class. Full-day uses neutral art when available.
- Freezing rain, freezing drizzle, ice pellets, sleet, hail and mixed precipitation remain distinct in text. Sleet art represents ice pellets, freezing precipitation and some mixes. Hail uses its own artwork. Snow and rain accompanied by thunder can use combination artwork. Volcanic ash and sand use the nearest visibility art. Unavailable conditions use `not-available.json`.
- Daily precipitation probability occupies the existing forecast cell. `Avg` and `Max` mark interval statistics, `?` denotes unknown basis, and `—` is unavailable. A visible legend and screen-reader text explain those states.

Wind, pressure, UV, alert and astronomy artwork use their existing rules. Daymark retains its NASA-derived moon phase frame sequence. Other bundled assets, such as pollen, tides and clothing, require their own data.

## Developer gallery and coverage

Use `/dev/weather-conditions` with `yarn dev`. The page reads shared fixture data from Weather API's offline exporter. Search by condition code, field or text and filter by provider, period, mapping or canonical property. Each row shows the source, selected animation, file validation, any approximation and copyable JSON. The production route returns 404.

Day/night coverage was measured using the original and replacement selectors with the same code inventory. The OpenWeather legacy baseline used representative icon tokens. Tomorrow V2 figures measure the publisher's artwork-supported mappings. The three documented pairs are reported separately from the provisional artwork entries.

| Code inventory                         | Legacy recognized | Canonical recognized |
| -------------------------------------- | ----------------: | -------------------: |
| OpenWeather test inventory             |             55/55 |                55/55 |
| Tomorrow.io named V1                   |              0/23 |                23/23 |
| Tomorrow.io documented mixed sky pairs |               0/3 |                  3/3 |
| Other Tomorrow.io V2 artwork entries   |             0/150 |     150/150, partial |

Across those rows and both light modes the canonical selector reached 59 distinct existing animations. OpenWeather's code-only fixture set reached 35, compared with 49 on the old selector, because provider icon families no longer supply inferred cloud cover or severity. Real cloud measurements can select further variants. Unknown sentinels use the explicit unavailable asset. Tests check each fixture across all five contexts with day, night and unknown lighting. No tested path is missing.
