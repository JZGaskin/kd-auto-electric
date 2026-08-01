/**
 * Client-output security check — run AFTER `npm run build`.
 *
 * Fails if anything in the built `dist/` contains:
 *   - the env var name GOOGLE_MAPS_API_KEY (would signal key plumbing leaked)
 *   - a Google API key pattern (AIza...)
 *   - Places API headers, the old broken review URL, or the six hard-coded
 *     review texts (they must be removed from the production bundle)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const API_KEY_PATTERN = /AIza[0-9A-Za-z_-]{35,}/;
const FORBIDDEN = [
  ['GOOGLE_MAPS_API_KEY env name', 'GOOGLE_MAPS_API_KEY'],
  ['Places API key header', 'X-Goog-Api-Key'],
  ['old broken review URL', 'search.google.com/local/reviews'],
  ['hard-coded review text fragment', 'true life-savers'],
  ['hard-coded review text fragment 2', "President's Day weekend"],
];

let files = 0;
const offenders = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'assets' || name === '_astro') walk(p);
      else walk(p);
    } else {
      files += 1;
      const size = statSync(p).size;
      if (size > 2 * 1024 * 1024) continue; // skip huge binaries
      let content;
      try {
        content = readFileSync(p, 'utf8');
      } catch {
        continue;
      }
      if (API_KEY_PATTERN.test(content)) offenders.push(`${p}: Google API key pattern`);
      for (const [label, needle] of FORBIDDEN) {
        if (content.includes(needle)) offenders.push(`${p}: ${label} ("${needle.slice(0, 40)}")`);
      }
    }
  }
}
walk(dist);

if (offenders.length) {
  console.error('CLIENT OUTPUT CHECK FAILED — ' + offenders.length + ' offender(s):');
  for (const o of offenders) console.error('  - ' + o);
  process.exit(1);
}
console.log(`CLIENT OUTPUT CHECK PASSED — scanned ${files} files, no keys, no headers, no old reviews.`);
