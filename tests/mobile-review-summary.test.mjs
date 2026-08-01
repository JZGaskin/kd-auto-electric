/**
 * E2E rendering tests for the Google review summary section.
 *
 * Runs a local HTTP server over `dist/` (production build) and intercepts the
 * Netlify function with mocked responses. NEVER calls the paid Google API.
 *
 * Usage: node tests/mobile-review-summary.test.mjs
 * Requires: `npm run build` first, python3, playwright-core (repo-level dep).
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { summaryResponse, noSummaryResponse } from './fixtures.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const CHROME = '/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';
const PORT = 8899;
const BASE = `http://127.0.0.1:${PORT}`;
const FN = '**/.netlify/functions/google-review-summary';

let server;

function startServer() {
  server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'dist'], { stdio: 'ignore' });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server start timeout')), 8000);
    const probe = () => {
      try {
        execSync(`curl -sf -o /dev/null ${BASE}/`);
        clearTimeout(t);
        resolve();
      } catch {
        setTimeout(probe, 150);
      }
    };
    probe();
  });
}

async function main() {
  try {
    await startServer();
  } catch (e) {
    console.error('dist/ not built or server failed. Run `npm run build` first.', e.message);
    process.exit(1);
  }

  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const results = [];

  async function runCase(name, width, { mode }) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    let fetchCount = 0;
    let fetchBeforeScroll = 0;
    let lastFetchUrl = null;

    await page.route(FN, async (route) => {
      fetchCount += 1;
      lastFetchUrl = route.request().url();
      if (mode === 'summary') {
        const fx = summaryResponse();
        const payload = {
          enabled: true,
          hasSummary: true,
          summary: {
            summaryText: fx.reviewSummary.text.text,
            disclosureText: fx.reviewSummary.disclosureText.text,
            reviewsUri: fx.reviewSummary.reviewsUri,
            writeReviewUri: fx.googleMapsLinks.writeAReviewUri,
            flagContentUri: fx.reviewSummary.flagContentUri,
            aboutSummaryUri: 'https://support.google.com/local-listings/answer/9851099',
          },
        };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      } else if (mode === 'fallback-links') {
        const fx = noSummaryResponse();
        const payload = {
          enabled: true,
          hasSummary: false,
          fallback: {
            readReviewsUri: fx.googleMapsLinks.placeUri,
            writeReviewUri: fx.googleMapsLinks.writeAReviewUri,
          },
        };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false }) });
      }
    });

    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    fetchBeforeScroll = fetchCount;

    const section = page.locator('#google-review-summary');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200); // IO rootMargin 300px + fetch + render

    const state = await page.evaluate(() => {
      const s = document.getElementById('google-review-summary');
      const content = document.getElementById('grs-content');
      const heading = document.getElementById('grs-heading');
      const eyebrow = document.getElementById('grs-eyebrow');
      const buttons = document.getElementById('grs-buttons');
      const links = [...s.querySelectorAll('a')].map((a) => ({ text: a.textContent.trim(), href: a.href, target: a.target, rel: a.rel }));
      return {
        heading: heading ? heading.textContent.trim() : null,
        eyebrow: eyebrow ? eyebrow.textContent.trim() : null,
        summaryText: content ? content.querySelector('.grs-summary')?.textContent : null,
        disclosure: content ? content.querySelector('.grs-disclosure')?.textContent : null,
        links,
        hasLogo: !!s.querySelector('.grs-logo img'),
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        contentText: content ? content.textContent.trim() : null,
      };
    });

    const overflow = state.scrollW - state.clientW;
    assert.equal(overflow, 0, `${name}: horizontal overflow ${overflow}px`);
    assert.equal(errors.length, 0, `${name}: console errors: ${errors.join('; ')}`);
    await page.screenshot({ path: `/tmp/kd-shots/grs-${mode}-${width}.png` });

    results.push({ name, width, mode, fetchCount, fetchBeforeScroll, lastFetchUrl, state, overflow, consoleErrors: errors.length });
    await page.close();
  }

  // --- Case: summary mode @390px ---
  await runCase('summary-390', 390, { mode: 'summary' });
  let r = results[0];
  assert.equal(r.state.heading, 'Review summary', 'heading must be exactly "Review summary"');
  assert.equal(r.state.eyebrow, 'AI CUSTOMER REVIEW SUMMARY');
  assert.ok(r.state.summaryText.startsWith('Customers describe K&D'), 'full summary text displayed');
  assert.equal(r.state.disclosure, 'Summarized with Gemini', 'disclosure unmodified');
  assert.ok(r.state.links.some((l) => l.text === 'See reviews' && l.href.startsWith('https://www.google.com/') && l.target === '_blank' && l.rel === 'noopener noreferrer'));
  assert.ok(r.state.links.some((l) => l.text === 'Write a review'));
  assert.ok(r.state.links.some((l) => l.text === 'About this summary' && l.href === 'https://support.google.com/local-listings/answer/9851099'));
  assert.ok(r.state.links.some((l) => l.text === 'Report summary'));
  assert.equal(r.state.hasLogo, true, 'Google logo attribution present');
  assert.ok(r.fetchCount >= 1);
  console.log('  PASS summary-390: heading/disclosure/links/logo/overflow ok');

  // --- Case: summary mode @430px (no overflow, same heading) ---
  await runCase('summary-430', 430, { mode: 'summary' });
  r = results[1];
  assert.equal(r.state.heading, 'Review summary');
  assert.equal(r.overflow, 0);
  console.log('  PASS summary-430');

  // --- Case: on-demand loading — no fetch before scroll ---
  const p2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let c2 = 0;
  await p2.route(FN, (route) => { c2 += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false }) }); });
  await p2.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(600);
  assert.equal(c2, 0, 'must NOT fetch before section approaches viewport');
  await p2.locator('#google-review-summary').scrollIntoViewIfNeeded();
  await p2.waitForTimeout(1000);
  assert.equal(c2, 1, 'exactly one request after intersection');
  await p2.close();
  console.log('  PASS on-demand: 0 fetches before scroll, 1 after');

  // --- Case: feature disabled -> fallback, no "Review summary" heading ---
  await runCase('fallback-disabled-390', 390, { mode: 'disabled' });
  r = results[2];
  assert.equal(r.state.heading, 'See what customers are saying on Google');
  assert.equal(r.state.eyebrow, 'CUSTOMER FEEDBACK');
  assert.equal(r.state.contentText.includes('Review summary'), false);
  assert.equal(r.state.hasLogo, false);
  assert.ok(r.fetchCount >= 1);
  console.log('  PASS fallback-disabled-390');

  // --- Case: no summary but Google links -> fallback buttons use Google URLs ---
  await runCase('fallback-links-390', 390, { mode: 'fallback-links' });
  r = results[3];
  assert.equal(r.state.heading, 'See what customers are saying on Google');
  assert.ok(r.state.links.some((l) => l.text === 'Read Reviews on Google' && l.href.startsWith('https://www.google.com/')));
  assert.ok(r.state.links.some((l) => l.text === 'Write a Google Review' && l.href.startsWith('https://www.google.com/')));
  assert.equal(r.state.contentText.includes('Review summary'), false);
  console.log('  PASS fallback-links-390');

  await browser.close();
  server.kill();

  console.log(`\nE2E PASS — ${results.length + 1} scenarios. Screenshots in /tmp/kd-shots/grs-*.png`);
  process.exit(0);
}

main().catch(async (e) => {
  if (server) server.kill();
  console.error('E2E FAILED:', e.message);
  process.exit(1);
});
