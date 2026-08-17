# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page, Hebrew-language (RTL) trip itinerary planner for a Montenegro/Albania road trip, built as **plain HTML/CSS/JS with no server and no build tools**. It's `index.html` + `app.js` + `style.css`, deployed as-is to Netlify. The one exception is a single Netlify Function (see "Nearby places" below) that proxies Google Places lookups — everything else is still pure static frontend.

## Working preferences

- After finishing a change, remind the user to commit and push to GitHub — the live Netlify site only updates once the change is pushed.
- Never trust automatic text-matching or geo-proximity matching (e.g. Wikipedia lookups) without a relevance/sanity check. Prefer showing nothing over showing something wrong.
- For any external map link, use Google's modern format `?api=1&query=...&query_place_id=...`, not the older `?q=place_id:...` format — the latter doesn't reliably work on mobile. (See `buildVerifiedMapsUrl()` in the Architecture section below.)
- Flag tradeoffs and ask before big/risky changes; small additive changes don't need to wait for approval.
- When asked to do multiple improvements in a loop, always work in bounded rounds (a stated max number), fixing one issue per round, with a separate git commit per fix — never one big autonomous loop with no stopping points.
- The site being Hebrew-only with no language toggle is intentional, not a bug — never "fix" this unless explicitly asked.

## Running / developing

There is no build, no package manager, no dev server, and no test suite. To work on it:

- Open `index.html` directly in a browser (double-click, or drag into a browser window), or serve the folder with any static file server.
- Changes to `app.js`/`style.css`/`index.html` take effect on browser refresh — no compile step.
- Deployment is via Netlify (see `.netlify/state.json` for the linked site); pushing/deploying is otherwise not automated from this repo.

There are no lint or test commands configured — verify changes by exercising the UI in a browser.

## Architecture

**Everything lives in three files**, loaded by `index.html`:
- `index.html` — static shell: header/toolbar buttons, empty containers (`#dayTabs`, `#dayContent`), the overview-map/wineries/hotels/packing sections, and the `<template>`/modal markup for the add/edit forms. All content inside is rendered by `app.js`.
- `app.js` — all logic and all trip data (single file, ~1000 lines).
- `style.css` — all styling, including dark-mode support via `prefers-color-scheme`.

External dependencies are both loaded via CDN in `index.html`, no npm: **Leaflet** (maps) and its CSS.

All external data fetches (Nominatim, Wikipedia, Open-Meteo — see below) are plain client-side `fetch()` calls straight from the browser, no API keys and no backend proxy — the one exception is the Google Places lookups used by "Nearby places" (see below), which deliberately go through a Netlify Function instead, because that one needs an API key kept secret.

### Data model & persistence

- The entire app state is one JS object: `{ tripTitle, tripSubtitle, days: [{ id, title, date, stops: [{ id, time, place, note, lat, lng }] }], packingList: [{ id, name, items: [{ id, text, packed }] }] }`.
- The seed itinerary (18 days across Montenegro/Albania, Sept–Oct 2026) is hardcoded in `defaultData()` in `app.js` — this is both the fallback and the "factory reset" content.
- State persists to **`localStorage`** only (key `travelPlannerData`), loaded/saved via `loadData()`/`saveData()`. There is no backend — data lives in one browser/device.
- Users back up/restore via the export (`⬇️ גיבוי`) / import (`⬆️ שחזור`) buttons, which read/write the same JSON shape as a downloaded file. `↺ איפוס` wipes localStorage back to `defaultData()`.
- `stop.lat`/`stop.lng` are optional; stops without coordinates render in the list but are skipped on maps.

### Rendering pattern

No framework — direct DOM manipulation with a single `state` object and a top-level `render()` that calls `renderTabs()` + `renderDayPanel()` and rebuilds `innerHTML` from scratch each time (re-render-the-world on every mutation, not diffed). CRUD for days and stops mutates `state.data` in place, calls `saveData()`, then calls `render()`.

Four additional full-width sections (`#overviewMapSection`, `#wineriesSection`, `#hotelsSection`, `#packingSection`) are toggled via `openSpecialSection()`/`closeSpecialSections()`, which hide the day tabs/content and show one section at a time — they share this one "special view" state and are mutually exclusive (`hideAllSpecialSections()` lists all of them explicitly, so adding a new special section means adding one line there plus a button/open-close listener pair, same pattern as the existing four).

### Maps (Leaflet + OpenStreetMap)

- Per-day map (`renderDayMap`) and the cross-trip overview map (`renderOverviewMap`) both: filter stops/days to those with coordinates, plot numbered markers (visit order = position in the time-sorted list, via `createNumberedMarkerIcon`), and connect them with a dashed polyline.
- Maps **require internet** (OSM tile server) even though the rest of the app works offline; both render a `.map-fallback` message when `L` (Leaflet) is undefined or no stops have coordinates.
- Map instances (`dayMapInstance`, `overviewMapInstance`) are torn down (`.remove()`) and recreated on every render — Leaflet maps aren't reused across re-renders.

### Place lookup integrations (all client-side fetch, no API keys)

- **Nominatim** (OpenStreetMap) search-as-you-type in the stop add/edit modal (`searchPlaces`), debounced 450ms, min 3 chars — autofills place name + coordinates from a picked result.
- **Wikipedia REST API** (`fetchWikipediaSummaryByGeo` / `fetchWikipediaSummaryByTitle`) powers the ℹ️ info button per stop: geo-search near a stop's coordinates when available (tries Hebrew then English), else title search (English then Hebrew). Results are cached per-stop in `wikiInfoCache` (including in-flight promises, to dedupe concurrent lookups). Before any of that, `getWikiInfoForPlace()`/`setupStopInfoButton()` both gate on `isGenericLogisticsStop()`, which pattern-matches the stop's place name against known logistics/activity phrasing (check-in, meals, departure/arrival, free time, short walks, car pickup/return, etc.) and skips the lookup entirely when matched — geo/text search on a logistics stop tends to return the "nearest" unrelated thing (this happened for real: a car-pickup stop matched a football stadium), so those stops never get an ℹ️ button at all rather than risk showing something wrong. Only add to `GENERIC_STOP_PATTERNS` for genuinely generic activity phrasing, not real place names.
- **Google Maps links**: most place links are generic search URLs. A small number of specific stops/wineries have been manually verified and mapped to a real `place_id` in `VERIFIED_STATION_PLACE_IDS` (stops) and inline in `WINERIES_BY_LOCATION` (wineries) — these use `buildVerifiedMapsUrl()` (the `?api=1&query=...&query_place_id=...` form, chosen because it opens reliably in the Google Maps mobile app, unlike the older `?q=place_id:...` form). Only add to these maps after manually confirming the place_id in Google Maps; don't guess place_ids.

### Wineries / hotels pages

`WINERIES_BY_LOCATION` and `HOTELS_BY_LOCATION` are static reference arrays (not part of `state.data`/localStorage) rendered by `renderWineries()`/`renderHotels()` through the shared `renderPlaceGroups()` helper, which is generic over "group by location → cards with a maps link button" (used for both, and intended to be reused for future similar reference lists).

### Packing checklist page

Unlike wineries/hotels, `packingList` (categories → checkable/deletable/addable items) **is** part of `state.data`, so it persists to localStorage and round-trips through the export/import backup JSON like days/stops. `defaultPackingCategories()` seeds it with categories/items chosen by cross-referencing the actual day data (which days are hiking/mountain, beach/coastal, city, or transit — see the comment above that function) with general climate norms for the region in mid-September–early October; it is not a real-time forecast, which is why the UI shows a disclaimer to that effect. `ensurePackingList()` self-heals `state.data.packingList` if it's missing (older localStorage, or an imported backup from before this feature existed) — call it (or `renderPackingList()`, which calls it) rather than assuming the field exists. `renderPackingList()` follows the same "rebuild from scratch" pattern as the rest of the app and must be re-invoked after anything that replaces `state.data` wholesale (import, reset).

The packing page also has a **🌤️ עדכון מזג אוויר** button that fetches a real forecast from Open-Meteo (`fetchDayWeather()`), using a day's "anchor" station (`getDayAnchorStop()`, the same helper the overview map uses) and a calendar date derived from `day.date` ("DD/MM") plus the year parsed out of `tripSubtitle` (`getDayIsoDate()`/`getTripYear()`). Because Open-Meteo's free tier only forecasts ~16 days out, days further away are short-circuited locally (no request made) to a `too-far` status rather than being fetched and failing. The clothing note per day is plain if/else on the returned numbers (`buildClothingNote()`) — nothing inferred beyond what the API returned. Unlike `packingList`, the weather cache (`weatherCache`, keyed by day id with a `fetchedAt` timestamp) lives in its **own** localStorage key (`travelPlannerWeatherCache`), not in `state.data` — it's treated as ephemeral/derived data the user wouldn't want bundled into their trip backup JSON. Page load only reads this cache (`renderWeatherList()`); a network fetch happens solely on button click (`refreshAllWeather()`), and per-day fetch failures degrade to an inline `weather-note-error` message rather than breaking the section.

A **🧪 בדיקת תחזית (היום)** dev-only button sits next to it, reusing `fetchDayWeather()`/`weatherRowContent()` unchanged against today's real date and a hardcoded Kotor coordinate (useful before trip dates are within Open-Meteo's 16-day window). It's hidden by default (`hidden` class in `index.html`) and only shown when the page URL has a `?dev` flag — see the `URLSearchParams(...).has('dev')` check near its DOM refs in `app.js`. Its result is written into `weatherCache` only long enough to reuse the display formatting, then deleted synchronously so it never reaches `saveWeatherCache()`/localStorage. It's explicitly flagged DEV/TEST ONLY in all three files with matching removal instructions.

The forecast is fetched and displayed **per location group, not per day** — `getWeatherGroups()` walks `state.data.days` in order and merges consecutive days into one row whenever their *overnight* coordinates (`getDayOvernightStop()`, the last-by-time stop with coordinates — deliberately different from `getDayAnchorStop()`, which is the first-by-time stop and answers "where does the day start," not "where do you sleep") are within `WEATHER_GROUP_MERGE_KM` (8km, via `haversineKm()`) of the previous day's. A day with no coordinates/date both gets no row *and* breaks the current group, so grouping never silently bridges across a gap like the still-unplanned Kotor→Žabljak day. Each group only ever fetches/caches/displays one forecast, keyed by its *last* day (`repDay`) — `fetchDayWeather()`/the cache/the 16-day check are all otherwise untouched. The row label strips a trailing "— יום N" from that day's title (`cleanGroupLabel()`) when present, falling back to the title as-is.

### Nearby places — restaurants & attractions (Google Places API, server-side proxy)

The **🍽️ מסעדות מומלצות** page is a static curated list (`RESTAURANTS_BY_LOCATION`, same pattern as wineries/hotels). **📍 מסעדות בסביבתי** and **🗺️ אטרקציות בסביבתי** are separate, dynamic features that share one implementation: on button click each asks the browser for the user's current location (`navigator.geolocation`) and calls the Google Places API (New, `places:searchNearby`) to find places of a given type near it — `restaurant` for the first, `tourist_attraction` for the second.

This is the **one exception** to "no API keys, no backend" in this repo. A Google Places API key can't be safely embedded in `app.js`/`index.html` even with a domain restriction — anyone can read it out of the shipped JS. So the key lives only in the Netlify **environment variable** `GOOGLE_PLACES_API_KEY` (Site settings → Environment variables in the Netlify dashboard, not in any file in this repo), and is used exclusively inside `netlify/functions/nearby-places.js` — one Netlify Function shared by both features, called as `/.netlify/functions/nearby-places?type=restaurant&lat=..&lng=..` or `?type=tourist_attraction&lat=..&lng=..`. `type` is checked against an allowlist (`ALLOWED_TYPES`) server-side rather than passed through to Google verbatim, since the key/quota is shared site-wide. The function calls Google server-side and returns just `{ name, placeId, rating, reviews, address, cuisine, price, distanceMeters }` per result under a `places` array — the raw key never reaches the browser. (`cuisine` is a generic "subtitle" field: cuisine text for restaurants, place category — e.g. "אתר היסטורי", "מוזיאון" — for attractions, both sourced from the same `primaryTypeDisplayName` field in the field mask.)

The Google Cloud Console restriction on the key is (and should stay) **HTTP referrers** matching this site's domain — the normal restriction for client-side Maps/Places usage. Because the Netlify Function calls Google server-to-server, it wouldn't normally send a `Referer` header at all, so `nearby-places.js` explicitly sets `Referer: process.env.URL` (Netlify's built-in "primary site URL" var) on the outgoing request to satisfy that same restriction — this means the key's restriction never needs loosening just to route the call through the proxy. `netlify.toml` (`build.functions = "netlify/functions"`) is what tells Netlify to deploy that function.

The client side (`findNearbyPlaces(configKey)` in `app.js`, driven by `NEARBY_PLACES_CONFIGS['restaurant' | 'tourist_attraction']` — one config object per feature holding its button/status/list DOM refs and Hebrew copy) reuses `buildVerifiedMapsUrl()` and `renderPlaceGroups()` — the `id` field Places API (New) returns is a real Google `place_id`, so results get the same verified-link maps button as everywhere else. Errors (geolocation denied, fetch failure, zero results) degrade to an inline status message, never a broken page — same "prefer showing nothing over showing something wrong" principle as the rest of the app. Adding a further nearby-place feature (e.g. a third Places type) means adding one entry to `ALLOWED_TYPES` in `nearby-places.js`, one entry to `NEARBY_PLACES_CONFIGS`, and a button/section pair in `index.html` following the existing two — no new Netlify Function.

Google's `rankPreference: 'POPULARITY'` (the only ranking option besides `DISTANCE`) is not a rating/review-count filter, so `nearby-places.js` applies its own quality bar server-side after Google's response comes back, identically for every place type: only results with `rating >= 4.5` **and** `userRatingCount >= 150` (`MIN_RATING`/`MIN_REVIEWS`) survive, then the survivors are sorted by distance ascending — closest first — using a straight-line (haversine) distance from the user's coordinates to each place's `location`, computed server-side (`filterAndSortByQuality()`/`haversineMeters()`). Each surviving place carries its `distanceMeters`, which `app.js` (`formatDistanceHe()`) formats as e.g. `"200 מ'"` under 1000m or `"1.2 ק"מ"` at/above 1000m and shows on the card alongside the rating/review count. The initial search radius is 3km; if fewer than 3 places clear the bar (`MIN_QUALIFYING_RESULTS`), it retries once at 6km (`SEARCH_RADII_METERS`) rather than showing a near-empty list — but it never falls back to unfiltered results, so a location with genuinely nothing highly-rated nearby (even after the wider retry) correctly returns an empty list, which `app.js` renders as an explicit "nothing highly-rated found nearby" status message rather than an empty section.

Local testing needs `netlify dev` (Netlify CLI) since a plain `index.html` double-click has no Netlify Function runtime behind it; `process.env.URL` differs locally (e.g. `http://localhost:8888`) and won't match the key's referrer restriction, so these features specifically only work once deployed to the real Netlify domain (or via `netlify dev` after adjusting the restriction to also allow the local URL, temporarily).

### Text conventions in the itinerary data

Hebrew stop/day titles use small prefix markers that `cleanPlaceNameForWiki()` strips before Wikipedia lookups: `⭐` (must-see highlight), `⚠️` (unplanned/TBD day), and leading `(...)` parenthetical notes (e.g. "(אופציונלי)"/"optional", "(טיוטה — לא סופי)"/"draft, not final"). Keep using these markers consistently if adding/editing itinerary stops, since the Wikipedia-lookup stripping logic depends on them.
