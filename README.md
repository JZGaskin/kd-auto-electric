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

## Customer Review Summary

The homepage customer-feedback section is a **static, AI-assisted summary** of the
genuine Google reviews collected for K&D Auto Electric. It renders entirely from site
content at build time — **no API calls, no environment variables, no keys**.

- Section: `src/components/GoogleReviewSummary.astro`
- Google review links (single, non-secret config location): `src/data/google-review-links.ts`
  — update these two URLs there if they ever change; do not reconstruct or guess them.
- All external links open in a new tab with `rel="noopener noreferrer"`.

The previous live Places API (New) implementation (Netlify function, Place Details /
Text Search requests, field masks, client-side fetch, IntersectionObserver loader,
feature flag, Place ID validation, and related tests/fixtures/docs) has been fully
removed. The corresponding Netlify environment variables are no longer referenced by any
source code and should be deleted from the site settings (see deploy notes).
