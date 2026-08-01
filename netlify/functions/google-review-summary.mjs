/**
 * Google AI Review Summary — Netlify serverless function.
 *
 * Proxies a single Place Details (New) request to the Google Places API and
 * returns ONLY the fields the front end needs. The API key never leaves the
 * server. Places content is never cached (Cache-Control: no-store).
 *
 * Env (Netlify):
 *   ENABLE_GOOGLE_REVIEW_SUMMARY  "true" to enable (anything else = disabled)
 *   GOOGLE_MAPS_API_KEY           restricted Places API (New) server key
 *   GOOGLE_PLACE_ID               validated Google Place ID for the business
 *   GOOGLE_REVIEW_FETCH_TIMEOUT_MS optional fetch timeout override (tests)
 *
 * Response shapes (all JSON):
 *   { enabled: false }                                   flag off
 *   { enabled: true, hasSummary: true,  summary: {...} } full summary
 *   { enabled: true, hasSummary: false, fallback: {...}} no summary (Google links only)
 *   errors: { error: "safe message" } + 5xx/429
 */
const PLACES_API_BASE = 'https://places.googleapis.com/v1';
const FIELD_MASK = 'reviewSummary,googleMapsLinks';
const ABOUT_SUMMARY_URI = 'https://support.google.com/local-listings/answer/9851099';
const DEFAULT_TIMEOUT_MS = 8000;

const SAFE_ERRORS = {
  config: 'Server configuration is incomplete. The review summary feature is not available.',
  upstream: 'The review summary service is temporarily unavailable. Please try again later.',
  malformed: 'The review summary service returned an invalid response.',
  timeout: 'The review summary service timed out. Please try again later.',
  incomplete: 'The review summary response was incomplete. Please try again later.',
};

function respond(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
    body: JSON.stringify(body),
  };
}

/** Accept only HTTPS URLs hosted by Google (or Google's g.page shortener). */
export function sanitizeGoogleUrl(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  const isGoogle =
    host === 'google.com' ||
    host.endsWith('.google.com') ||
    host === 'g.page' ||
    host.endsWith('.g.page');
  return isGoogle ? url.toString() : null;
}

async function fetchPlaceDetails(apiKey, placeId, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${PLACES_API_BASE}/places/${encodeURIComponent(placeId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function handler() {
  // Feature flag: off by default. Never touch the paid API when disabled.
  if (process.env.ENABLE_GOOGLE_REVIEW_SUMMARY !== 'true') {
    return respond({ enabled: false });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) {
    return respond({ error: SAFE_ERRORS.config }, 500);
  }

  const timeoutMs = Number.parseInt(process.env.GOOGLE_REVIEW_FETCH_TIMEOUT_MS || '', 10) || DEFAULT_TIMEOUT_MS;

  let googleRes;
  try {
    googleRes = await fetchPlaceDetails(apiKey, placeId, timeoutMs);
  } catch (err) {
    if (err && err.name === 'AbortError') return respond({ error: SAFE_ERRORS.timeout }, 504);
    return respond({ error: SAFE_ERRORS.upstream }, 502);
  }

  if (googleRes.status === 429) {
    return respond({ error: 'The review summary service is temporarily busy. Please try again later.' }, 429);
  }
  if (!googleRes.ok) {
    return respond({ error: SAFE_ERRORS.upstream }, 502);
  }

  let data;
  try {
    data = await googleRes.json();
  } catch {
    return respond({ error: SAFE_ERRORS.malformed }, 502);
  }
  if (!data || typeof data !== 'object') {
    return respond({ error: SAFE_ERRORS.malformed }, 502);
  }

  const rs = data.reviewSummary;
  const gml = data.googleMapsLinks || {};

  const reviewsUri = sanitizeGoogleUrl(rs && rs.reviewsUri);
  const flagContentUri = sanitizeGoogleUrl(rs && rs.flagContentUri);
  const writeReviewUri = sanitizeGoogleUrl(gml.writeAReviewUri);
  const readReviewsUri = sanitizeGoogleUrl(gml.placeUri);
  const disclosureText =
    rs && rs.disclosureText && typeof rs.disclosureText.text === 'string' ? rs.disclosureText.text.trim() : null;
  const summaryText =
    rs && rs.text && typeof rs.text.text === 'string' ? rs.text.text.trim() : null;

  if (summaryText) {
    // Google requires disclosure + links alongside the summary. Never show a
    // partial summary — controlled error instead, front end falls back.
    if (!disclosureText || !reviewsUri || !writeReviewUri || !flagContentUri) {
      return respond({ error: SAFE_ERRORS.incomplete }, 502);
    }
    return respond({
      enabled: true,
      hasSummary: true,
      summary: {
        summaryText,
        disclosureText,
        reviewsUri,
        writeReviewUri,
        flagContentUri,
        aboutSummaryUri: ABOUT_SUMMARY_URI,
      },
    });
  }

  // No reviewSummary for this place — provide Google links for the fallback
  // UI when they exist. Never construct or guess URLs ourselves.
  const fallback = {};
  if (writeReviewUri) fallback.writeReviewUri = writeReviewUri;
  if (readReviewsUri) fallback.readReviewsUri = readReviewsUri;
  return respond({ enabled: true, hasSummary: false, fallback });
}
