# K & D Auto Electric, Inc.

Website for K & D Auto Electric, Inc. — auto electric and automotive repair in Somerset, PA since 1991.

Built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com).

## Development

```bash
npm run dev     # start dev server
npm run build   # build for production
npm run preview # preview production build
```

## Deploy

Pushes to `main` branch automatically deploy to Netlify.

## Google AI Review Summary (live)

The homepage review section is a live, Google-generated review summary served by the
Places API (New) `reviewSummary` field — not a static wall of copied reviews. The
summary, disclosure text, links, and Google attribution are displayed exactly as Google
returns them. Google Places content is **never cached** (function returns
`Cache-Control: no-store` and nothing is persisted client-side).

### Architecture

- `netlify/functions/google-review-summary.mjs` — serverless proxy. Reads the API key
  from Netlify env vars, calls `https://places.googleapis.com/v1/places/{GOOGLE_PLACE_ID}`
  with field mask `reviewSummary,googleMapsLinks`, sanitizes (HTTPS Google-only URLs),
  and returns only the fields the front end needs. The key never enters the browser
  bundle, HTML, source maps, or logs.
- `src/components/GoogleReviewSummary.astro` — section shell rendered in static HTML
  (compact fallback). An IntersectionObserver (`rootMargin: 300px`) triggers at most one
  request per page view when the section nears the viewport. No request during build, no
  request on ordinary page loads.
- If no summary exists, the API fails, or the feature is disabled, the fallback shows:
  "CUSTOMER FEEDBACK / See what customers are saying on Google" with Google-provided
  buttons only (buttons hidden if no verified links — never constructed or guessed).

### Required Netlify environment variables (no values in this repo)

| Variable | Value |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Places API (New) key, restricted to that API, HTTPS referrer/IP restriction, server-side only |
| `GOOGLE_PLACE_ID` | Validated Place ID for K & D Auto Electric, Inc. (see below) |
| `ENABLE_GOOGLE_REVIEW_SUMMARY` | `true` to enable the live summary (absent/false = fallback, zero API calls) |

### One-time setup (owner/operator)

1. Enable **Places API (New)** in Google Cloud Console and attach billing.
2. Create an API key restricted to **Places API (New)** only (no wildcard referrers).
3. Set the three variables above in Netlify (Site settings → Environment variables).
4. Validate the Place ID (one-time, uses the real API):
   ```bash
   GOOGLE_MAPS_API_KEY=... GOOGLE_PLACE_ID=... npm run validate:place
   # or rediscover it:
   GOOGLE_MAPS_API_KEY=... node scripts/validate-place-id.mjs --text-search "K & D Auto Electric Somerset PA"
   ```
5. Recommended: Google Cloud billing alerts, conservative Places API quotas, usage
   monitoring, and key restriction review.

### Cost note

`reviewSummary` is requested once per page view (capped at one request per view, on
demand). Billed under Place Details (New) pricing — the summary field is part of the
higher-priced tier (per the current Google pricing page: 1,000 free requests/month,
then ~$25 per 1,000). Confirm current SKU pricing on the Google Maps Platform pricing
page before launch.

### Tests (never call the paid API)

```bash
npm test          # unit tests: mocked fetch (success, no summary, env missing,
                  #   Google error, bad URLs, timeout, flag off, cache headers)
npm run test:output  # scans dist/ for key leaks + old review content (run after build)
npm run test:e2e     # Playwright over the production build with mocked function
npm run test:all
```
