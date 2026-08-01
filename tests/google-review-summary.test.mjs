/**
 * Unit tests for netlify/functions/google-review-summary.mjs
 * Uses node:test with a mocked global fetch — never calls the paid Google API.
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { handler, sanitizeGoogleUrl } from '../netlify/functions/google-review-summary.mjs';
import {
  summaryResponse,
  noSummaryResponse,
  bareResponse,
  googleErrorBody,
  summaryWithBadLinks,
} from './fixtures.mjs';

const origEnv = { ...process.env };
const ORIG_FETCH = globalThis.fetch;

beforeEach(() => {
  process.env.ENABLE_GOOGLE_REVIEW_SUMMARY = 'true';
  process.env.GOOGLE_MAPS_API_KEY = 'AIza-test-key-not-real';
  process.env.GOOGLE_PLACE_ID = 'ChIJE5eH5pFzNIgR-V3-VYbY-cw';
  process.env.GOOGLE_REVIEW_FETCH_TIMEOUT_MS = '50';
  delete process.env.GOOGLE_REVIEW_EXTRA; // (unused, kept for symmetry)
});

afterEach(() => {
  process.env = { ...origEnv };
  globalThis.fetch = ORIG_FETCH;
});

function mockFetch({ status = 200, body, hang = false, abort = false, throwError = false }) {
  globalThis.fetch = async (...args) => {
    if (throwError) throw new Error('network unreachable');
    if (abort) {
      return new Promise((_, reject) => {
        setTimeout(() => {
          const e = new Error('The operation was aborted.');
          e.name = 'AbortError';
          reject(e);
        }, 5);
      });
    }
    if (hang) {
      // Simulate a real hung request: resolves only when AbortController fires.
      return new Promise((_, reject) => {
        const signal = args[1] && args[1].signal;
        if (!signal) {
          const e = new Error('The operation was aborted.');
          e.name = 'AbortError';
          reject(e);
          return;
        }
        signal.addEventListener('abort', () => {
          const e = new Error('The operation was aborted.');
          e.name = 'AbortError';
          reject(e);
        });
      });
    }
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
}

function calledWith() {
  let captured = null;
  globalThis.fetch = async (...args) => {
    captured = args;
    return { ok: true, status: 200, json: async () => summaryResponse() };
  };
  return () => captured;
}

test('1. successful API response returns sanitized summary payload', async () => {
  mockFetch({ body: summaryResponse() });
  const res = await handler();
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.enabled, true);
  assert.equal(body.hasSummary, true);
  assert.equal(typeof body.summary.summaryText, 'string');
  assert.ok(body.summary.summaryText.length > 0);
  assert.equal(body.summary.disclosureText, 'Summarized with Gemini');
  assert.match(body.summary.reviewsUri, /^https:\/\/www\.google\.com\//);
  assert.match(body.summary.writeReviewUri, /^https:\/\/www\.google\.com\//);
  assert.match(body.summary.flagContentUri, /^https:\/\/support\.google\.com\//);
  assert.equal(body.summary.aboutSummaryUri, 'https://support.google.com/local-listings/answer/9851099');
  assert.equal(res.headers['Cache-Control'], 'no-store, no-cache, must-revalidate');
  assert.equal(JSON.stringify(body).includes('AIza-test-key'), false);
});

test('1b. request uses exact field mask and key header server-side', async () => {
  const capture = calledWith();
  await handler();
  const [url, init] = capture();
  assert.equal(url, 'https://places.googleapis.com/v1/places/ChIJE5eH5pFzNIgR-V3-VYbY-cw');
  assert.equal(init.headers['X-Goog-FieldMask'], 'reviewSummary,googleMapsLinks');
  assert.equal(init.headers['X-Goog-Api-Key'], 'AIza-test-key-not-real');
});

test('2. no reviewSummary returned -> fallback with Google links, no error', async () => {
  mockFetch({ body: noSummaryResponse() });
  const res = await handler();
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.enabled, true);
  assert.equal(body.hasSummary, false);
  assert.ok(body.fallback.writeReviewUri.startsWith('https://www.google.com/'));
  assert.ok(body.fallback.readReviewsUri.startsWith('https://www.google.com/'));
});

test('2b. place with no links at all -> fallback with empty links (no guessed URLs)', async () => {
  mockFetch({ body: bareResponse() });
  const res = await handler();
  const body = JSON.parse(res.body);
  assert.equal(body.enabled, true);
  assert.equal(body.hasSummary, false);
  assert.deepEqual(body.fallback, {});
});

test('3. missing environment variables -> controlled 500, no key leaked', async () => {
  delete process.env.GOOGLE_MAPS_API_KEY;
  let called = false;
  globalThis.fetch = async () => { called = true; };
  const res = await handler();
  assert.equal(res.statusCode, 500);
  assert.equal(called, false);
  const body = JSON.parse(res.body);
  assert.equal(body.error, 'Server configuration is incomplete. The review summary feature is not available.');
  assert.equal(JSON.stringify(body).includes('AIza'), false);
});

test('4. Google API error -> controlled 502, raw Google body never sent', async () => {
  mockFetch({ status: 403, body: googleErrorBody() });
  const res = await handler();
  assert.equal(res.statusCode, 502);
  const body = JSON.parse(res.body);
  assert.match(body.error, /temporarily unavailable/);
  assert.equal(JSON.stringify(body).includes('PERMISSION_DENIED'), false);
  assert.equal(JSON.stringify(body).includes('API key not valid'), false);
});

test('4b. quota exceeded (429) -> controlled 429 with safe message', async () => {
  mockFetch({ status: 429, body: googleErrorBody() });
  const res = await handler();
  assert.equal(res.statusCode, 429);
  assert.equal(JSON.parse(res.body).error.includes('temporarily busy'), true);
});

test('5. invalid or missing URL fields -> never sent to browser', async () => {
  mockFetch({ body: summaryWithBadLinks() });
  const res = await handler();
  assert.equal(res.statusCode, 502);
  const body = JSON.parse(res.body);
  assert.match(body.error, /incomplete/);
  assert.equal(JSON.stringify(body).includes('evil.example.com'), false);
  assert.equal(JSON.stringify(body).includes('javascript:'), false);
  assert.equal(JSON.stringify(body).includes('must not be displayed'), false);
});

test('5b. sanitizeGoogleUrl rejects http/javascript/foreign hosts, keeps google.com + g.page', () => {
  assert.equal(sanitizeGoogleUrl('https://www.google.com/maps/place/?q=place_id:x'), 'https://www.google.com/maps/place/?q=place_id:x');
  assert.equal(sanitizeGoogleUrl('https://g.page/r/abc/review'), 'https://g.page/r/abc/review');
  assert.equal(sanitizeGoogleUrl('http://www.google.com/x'), null);
  assert.equal(sanitizeGoogleUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeGoogleUrl('https://evil.example.com/x'), null);
  assert.equal(sanitizeGoogleUrl('https://google.com.evil.com/x'), null);
  assert.equal(sanitizeGoogleUrl('not a url'), null);
  assert.equal(sanitizeGoogleUrl(''), null);
});

test('6. network timeout -> controlled 504', async () => {
  mockFetch({ hang: true }); // AbortController fires at 50ms (test override)
  const res = await handler();
  assert.equal(res.statusCode, 504);
  assert.match(JSON.parse(res.body).error, /timed out/);
});

test('6b. aborted fetch (AbortError) -> controlled 504', async () => {
  mockFetch({ abort: true });
  const res = await handler();
  assert.equal(res.statusCode, 504);
});

test('6c. transport failure -> controlled 502', async () => {
  mockFetch({ throwError: true });
  const res = await handler();
  assert.equal(res.statusCode, 502);
});

test('6d. malformed JSON body -> controlled 502', async () => {
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } });
  const res = await handler();
  assert.equal(res.statusCode, 502);
  assert.match(JSON.parse(res.body).error, /invalid response/);
});

test('7. feature flag disabled -> enabled:false, NO fetch to Google', async () => {
  process.env.ENABLE_GOOGLE_REVIEW_SUMMARY = 'false';
  let called = false;
  globalThis.fetch = async () => { called = true; };
  const res = await handler();
  assert.equal(called, false);
  const body = JSON.parse(res.body);
  assert.equal(body.enabled, false);
  assert.equal(res.headers['Cache-Control'], 'no-store, no-cache, must-revalidate');
});

test('10. every response carries Cache-Control no-store', async () => {
  mockFetch({ body: summaryResponse() });
  const ok = await handler();
  assert.equal(ok.headers['Cache-Control'], 'no-store, no-cache, must-revalidate');
  mockFetch({ status: 403, body: googleErrorBody() });
  const err = await handler();
  assert.equal(err.headers['Cache-Control'], 'no-store, no-cache, must-revalidate');
});
