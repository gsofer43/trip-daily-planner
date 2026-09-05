// Scheduled hotel-availability run. Started by .github/workflows/hotel-watch.yml every 6 hours.
//
// Runs on a GitHub Actions runner rather than as a Netlify Scheduled Function because both
// sources require a real browser (Booking serves an AWS WAF JS challenge; Agoda ships an empty
// JS shell), and Chromium does not belong in a 10-second Lambda. Netlify Blobs stays the shared
// store either way - @netlify/blobs works from outside Netlify given an explicit siteID + token.
//
// Reads every watch record, checks each source, writes the results back, and (round 4) sends
// the one-off alert when a hotel becomes available.
//
// Required environment:
//   NETLIFY_SITE_ID     the Netlify project id
//   NETLIFY_AUTH_TOKEN  a Netlify personal access token
// Optional:
//   DRY_RUN=1           check and print, write nothing back

import { getStore } from '@netlify/blobs';
import { chromium } from 'playwright';
import { checkBooking } from './check-booking.js';
import { checkAgoda } from './check-agoda.js';

const STORE_NAME = 'hotel-watches';

// Same user agent a normal desktop Chrome sends. Playwright's default advertises HeadlessChrome,
// which Booking's WAF treats far more harshly.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const SOURCES = [
  { key: 'booking', label: 'Booking', check: checkBooking },
  { key: 'agoda', label: 'Agoda', check: checkAgoda }
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

// A source that returns `available` wins. Otherwise a confident `unavailable` counts. If every
// source errored we return null, meaning "we learned nothing this run" - see the caller, which
// deliberately leaves lastOverallStatus untouched in that case.
function computeOverallStatus(sources) {
  const statuses = Object.values(sources).map(s => s && s.status);
  if (statuses.includes('available')) return 'available';
  if (statuses.includes('unavailable')) return 'unavailable';
  return null;
}

async function checkWatch(context, watch) {
  const results = {};
  for (const source of SOURCES) {
    const page = await context.newPage();
    try {
      results[source.key] = {
        ...(await source.check(page, watch)),
        checkedAt: new Date().toISOString()
      };
    } finally {
      await page.close();
    }
    const r = results[source.key];
    console.log(`    ${source.label.padEnd(8)} ${r.status}${r.note ? `  (${r.note})` : ''}`);
  }
  return results;
}

async function main() {
  const siteID = requireEnv('NETLIFY_SITE_ID');
  const token = requireEnv('NETLIFY_AUTH_TOKEN');
  const dryRun = process.env.DRY_RUN === '1';

  const store = getStore({ name: STORE_NAME, siteID, token, consistency: 'strong' });
  const { blobs } = await store.list();

  if (blobs.length === 0) {
    console.log('No hotel watches registered - nothing to check.');
    return;
  }

  console.log(`Checking ${blobs.length} watch(es)${dryRun ? ' [DRY RUN]' : ''}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: USER_AGENT, locale: 'en-US' });

  const becameAvailable = [];

  try {
    for (const blob of blobs) {
      const watch = await store.get(blob.key, { type: 'json' });
      if (!watch || typeof watch !== 'object') {
        console.log(`!!  ${blob.key}: unreadable record, skipped`);
        continue;
      }

      console.log(`--  ${watch.hotelName} (${watch.checkin} -> ${watch.checkout})`);
      const sources = await checkWatch(context, watch);
      const overall = computeOverallStatus(sources);

      const previous = watch.lastOverallStatus;
      const updated = { ...watch, sources };

      if (overall === null) {
        // Every source errored. Leave lastOverallStatus exactly as it was: if we wrote 'error'
        // here, the next successful check would look like a fresh "became available"
        // transition and fire a false alert. The per-source errors are still recorded, so the
        // site shows what happened.
        console.log(`    overall  (no conclusive result - keeping "${previous ?? 'טרם נבדק'}")`);
      } else {
        updated.lastOverallStatus = overall;
        console.log(`    overall  ${overall}${previous !== overall ? `  (was ${previous ?? 'טרם נבדק'})` : ''}`);
        if (overall === 'available' && previous !== 'available') {
          becameAvailable.push({ key: blob.key, watch: updated, sources });
        }
      }

      if (!dryRun) await store.setJSON(blob.key, updated);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone. ${becameAvailable.length} hotel(s) newly available.`);

  if (becameAvailable.length > 0) {
    const { sendAvailabilityAlerts } = await import('./notify.js');
    await sendAvailabilityAlerts(becameAvailable, { store, dryRun });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
