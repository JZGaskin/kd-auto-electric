#!/usr/bin/env node
/**
 * One-time Place ID validation for K & D Auto Electric, Inc.
 *
 * Confirms the stored GOOGLE_PLACE_ID resolves to the right business using
 * Place Details (New) or, with --text-search, Text Search (New).
 *
 * Usage:
 *   GOOGLE_MAPS_API_KEY=... GOOGLE_PLACE_ID=... node scripts/validate-place-id.mjs
 *   GOOGLE_MAPS_API_KEY=... node scripts/validate-place-id.mjs --text-search "K & D Auto Electric Somerset PA"
 *
 * Exits 0 on verified match, 1 on mismatch/failure. Requires the Places API
 * (New) key — this is the ONLY step that calls the real (billed) API.
 */
const EXPECTED = {
  name: 'k & d auto electric',
  street: '212 forward boulevard',
  locality: 'somerset',
  region: 'pa',
  postal: '15501',
  phone: '+18144433615',
};

const BASE = 'https://places.googleapis.com/v1';

function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function placeDetails(apiKey, placeId) {
  const res = await fetch(`${BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'id,displayName,formattedAddress,internationalPhoneNumber,websiteUri,googleMapsLinks.placeUri',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Place Details failed HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function textSearch(apiKey, query) {
  const res = await fetch(`${BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber',
    },
    body: JSON.stringify({ textQuery: query }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Text Search failed HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

function check(place, label) {
  const issues = [];
  const name = norm(place.displayName && place.displayName.text);
  const addr = norm(place.formattedAddress);
  const phone = (place.internationalPhoneNumber || '').replace(/[^\d+]/g, '');

  if (!name.includes(EXPECTED.name)) issues.push(`name "${place.displayName?.text}" != ${EXPECTED.name}`);
  if (!addr.includes(EXPECTED.street)) issues.push(`address lacks "${EXPECTED.street}" (got: ${addr})`);
  if (!addr.includes(EXPECTED.locality)) issues.push(`address lacks "${EXPECTED.locality}"`);
  if (!addr.includes(EXPECTED.region)) issues.push(`address lacks "${EXPECTED.region}"`);
  if (!addr.includes(EXPECTED.postal)) issues.push(`address lacks "${EXPECTED.postal}"`);
  if (phone !== EXPECTED.phone) issues.push(`phone ${phone || '(none)'} != ${EXPECTED.phone}`);

  console.log(`\n[${label}]`);
  console.log(`  Place ID:      ${place.id}`);
  console.log(`  Name:          ${place.displayName?.text || '(none)'}`);
  console.log(`  Address:       ${place.formattedAddress || '(none)'}`);
  console.log(`  Phone:         ${place.internationalPhoneNumber || '(none)'}`);
  console.log(`  Maps:          ${place.googleMapsLinks?.placeUri || '(n/a)'}`);

  if (issues.length) {
    console.error(`  VERDICT: MISMATCH — ${issues.join('; ')}`);
    return false;
  }
  console.log('  VERDICT: MATCH — Place ID resolves to the correct business.');
  return true;
}

const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  console.error('Missing GOOGLE_MAPS_API_KEY environment variable.');
  process.exit(1);
}

const textSearchFlag = process.argv.indexOf('--text-search');
const mode = textSearchFlag !== -1 ? 'text-search' : 'details';

try {
  if (mode === 'text-search') {
    const query = process.argv[textSearchFlag + 1] || 'K & D Auto Electric, 212 Forward Boulevard, Somerset, PA 15501';
    console.log(`Searching: "${query}"`);
    const { places = [] } = await textSearch(apiKey, query);
    if (!places.length) {
      console.error('No results found. Try a broader query.');
      process.exit(1);
    }
    let ok = false;
    for (const p of places) {
      if (check(p, 'candidate')) ok = true; // any matching candidate is a win
    }
    if (!ok) {
      console.error('\nNone of the candidates match the expected business.');
      process.exit(1);
    }
    console.log('\nUse the matching Place ID above as GOOGLE_PLACE_ID in Netlify.');
    process.exit(0);
  }

  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!placeId) {
    console.error('Missing GOOGLE_PLACE_ID environment variable (or use --text-search).');
    process.exit(1);
  }
  const place = await placeDetails(apiKey, placeId);
  process.exit(check(place, 'Place Details') ? 0 : 1);
} catch (err) {
  console.error(`Validation error: ${err.message}`);
  process.exit(1);
}
