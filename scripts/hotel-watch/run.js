// Scheduled hotel-availability run. Started by .github/workflows/hotel-watch.yml every 6 hours.
//
// Runs on a GitHub Actions runner rather than as a Netlify Scheduled Function because both
// sources require a real browser (Booking serves an AWS WAF JS challenge; Agoda ships an empty
// JS shell), and Chromium does not belong in a 10-second Lambda. Netlify Blobs stays the shared
// store either way - @netlify/blobs works from outside Netlify given an explicit siteID + token.
//
// Reads every watch record, checks each source, sends the one-off alert on a transition into
// availability, and writes the results back.
//
// Required environment:
//   NETLIFY_SITE_ID     the Netlify project id
//   NETLIFY_AUTH_TOKEN  a Netlify personal access token
// Optional:
//   DRY_RUN=1           check and print, write nothing back to Blobs
//   ALERT_DRY_RUN=1     print the alert email instead of sending it
// See notify.js for GMAIL_USER / GMAIL_APP_PASSWORD / ALERT_RECIPIENT_EMAILS.

import { pathToFileURL } from 'node:url';
import { getStore } from '@netlify/blobs';
import { chromium } from 'playwright';
import { checkBooking } from './check-booking.js';
import { checkAgoda } from './check-agoda.js';
import { sendAvailabilityAlert } from './notify.js';

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
// source errored we return null, meaning "we learned nothing this run" - see applyResult(),
// which then leaves lastOverallStatus untouched.
export function computeOverallStatus(sources) {
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

// Decides what the new record looks like, including whether to alert.
//
// Two rules here are what keep "exactly one email per transition" honest:
//
// 1. When every source errored (overall === null) lastOverallStatus is left exactly as it was.
//    Writing 'error' would make the next successful check look like a fresh
//    unavailable -> available transition and fire a false alert.
//
// 2. The email is sent BEFORE the transition is persisted, and lastOverallStatus only advances
//    to 'available' if the send actually succeeded. Persisting first would mean a failed send
//    silently consumes the transition and the alert is never delivered at all. This way a
//    failure just leaves the record as it was, and the next run tries again.
export async function applyResult(watch, sources) {
  const previous = watch.lastOverallStatus;
  const overall = computeOverallStatus(sources);
  const updated = { ...watch, sources };

  if (overall === null) {
    console.log(`    overall  (no conclusive result - keeping "${previous ?? 'never checked'}")`);
    return { updated, alerted: false };
  }

  const isTransition = overall === 'available' && previous !== 'available';
  console.log(`    overall  ${overall}${previous !== overall ? `  (was ${previous ?? 'never checked'})` : ''}`);

  if (!isTransition) {
    updated.lastOverallStatus = overall;
    return { updated, alerted: false };
  }

  console.log('    became available - sending alert');
  const sent = await sendAvailabilityAlert(watch, sources);
  if (!sent) {
    console.error('    alert not delivered - leaving status unchanged so the next run retries');
    return { updated, alerted: false };
  }

  updated.lastOverallStatus = 'available';
  updated.lastAlertSentAt = new Date().toISOString();
  return { updated, alerted: true };
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

  console.log(`Checking ${blobs.length} watch(es)${dryRun ? ' [DRY RUN - no writes]' : ''}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: USER_AGENT, locale: 'en-US' });

  let alerts = 0;
  let errors = 0;

  try {
    for (const blob of blobs) {
      const watch = await store.get(blob.key, { type: 'json' });
      if (!watch || typeof watch !== 'object') {
        console.log(`!!  ${blob.key}: unreadable record, skipped`);
        errors++;
        continue;
      }

      console.log(`--  ${watch.hotelName} (${watch.checkin} -> ${watch.checkout})`);
      const sources = await checkWatch(context, watch);
      const { updated, alerted } = await applyResult(watch, sources);
      if (alerted) alerts++;

      if (!dryRun) await store.setJSON(blob.key, updated);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone. ${alerts} alert(s) sent, ${errors} record(s) skipped.`);
}

// Only run when invoked directly (node run.js), so the state machine above can be imported
// and exercised by alerttest.js without kicking off a real run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
