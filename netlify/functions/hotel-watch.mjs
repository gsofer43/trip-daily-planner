// Stores the "watch this hotel for availability" list in Netlify Blobs, and serves it to the
// browser. This is the first server-side *stateful* thing in this repo, and it exists because
// the scheduled availability check runs on a GitHub Actions runner, which has no access to the
// browser localStorage where the rest of the trip data lives (see "Data model & persistence"
// in CLAUDE.md). Blobs is therefore the single source of truth for this feature — the watch
// list is deliberately NOT mirrored into state.data, and nothing here round-trips through the
// export/import backup JSON.
//
// WHY THIS ONE IS ESM/.mjs WHILE nearby-places.js IS CommonJS: Netlify only wires the Blobs
// environment (siteID + token) into functions running on the modern runtime — a v1
// `exports.handler` function loads in "Lambda compatibility mode" and getStore() throws
// MissingBlobsEnvironmentError there, including under `netlify dev`. So this is a v2 function:
// `export default async (req, context)` taking a Request and returning a Response. Everything
// else (Hebrew error messages, guard ordering, console.error server-side only) follows the
// same conventions as nearby-places.js. Do not "harmonise" this back to CommonJS.
//
// The scheduled checker (scripts/hotel-watch/) writes to this same store from outside Netlify,
// using an explicit siteID + token. It is the only writer of the `sources` /
// `lastOverallStatus` / `lastAlertSentAt` fields; this function only ever creates and deletes
// whole records, so the two never fight over the same fields.
//
// Endpoints (all at /.netlify/functions/hotel-watch):
//   GET                                          -> { watches: [...] }  all watch records
//   POST                                         -> { watch }           create one
//   DELETE (or POST ?action=remove) with { key }  -> delete one

import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'hotel-watches';

// Only these hosts may be stored as a hotel URL. The checker navigates a real headless browser
// to whatever we save here, so an unvalidated URL would be an open redirect straight into that
// browser. Booking is required; Agoda is optional (see CLAUDE.md for why Google Hotels is not
// a source at all).
const ALLOWED_BOOKING_HOSTS = new Set(['booking.com', 'www.booking.com']);
const ALLOWED_AGODA_HOSTS = new Set(['agoda.com', 'www.agoda.com']);

const MAX_TEXT_LEN = 200;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function openStore() {
  // 'strong' so a record created by POST is visible to the very next GET — the frontend
  // re-reads the list immediately after creating a watch, and eventual consistency would show
  // the user a card that looks like it failed to save.
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

// Stable key for a hotel+dates pair: an ASCII slug for readability when browsing the store,
// plus a hash so Hebrew location names and punctuation cannot produce a colliding or invalid
// key. Same inputs always give the same key, so re-watching the same hotel/dates overwrites
// rather than duplicating.
function buildWatchKey(hotelName, location, checkin, checkout) {
  const slug =
    String(hotelName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'hotel';
  const hash = createHash('sha1')
    .update(`${hotelName}|${location}|${checkin}|${checkout}`)
    .digest('hex')
    .slice(0, 10);
  return `${slug}-${hash}`;
}

function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_TEXT_LEN);
}

function isValidHotelUrl(value, allowedHosts) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && allowedHosts.has(url.hostname);
  } catch (err) {
    return false;
  }
}

// Returns an error message (Hebrew, shown to the user) or null when the payload is usable.
function validateWatchPayload(payload) {
  if (!cleanText(payload.hotelName)) return 'חסר שם מלון';
  if (!cleanText(payload.location)) return 'חסר מיקום';

  if (!ISO_DATE.test(payload.checkin || '') || !ISO_DATE.test(payload.checkout || '')) {
    return 'תאריכים חייבים להיות בפורמט YYYY-MM-DD';
  }
  const checkin = new Date(`${payload.checkin}T00:00:00Z`);
  const checkout = new Date(`${payload.checkout}T00:00:00Z`);
  if (Number.isNaN(checkin.getTime()) || Number.isNaN(checkout.getTime())) {
    return 'אחד התאריכים אינו תאריך תקין';
  }
  if (checkout <= checkin) return 'תאריך העזיבה חייב להיות אחרי תאריך ההגעה';

  if (!isValidHotelUrl(payload.bookingUrl || '', ALLOWED_BOOKING_HOSTS)) {
    return 'נדרש קישור תקין לעמוד המלון ב-Booking';
  }
  if (payload.agodaUrl && !isValidHotelUrl(payload.agodaUrl, ALLOWED_AGODA_HOSTS)) {
    return 'קישור Agoda אינו תקין';
  }
  return null;
}

async function listWatches(store) {
  const { blobs } = await store.list();
  const records = await Promise.all(
    blobs.map(async blob => {
      const value = await store.get(blob.key, { type: 'json' });
      // A record that fails to parse is skipped rather than surfaced as a broken card —
      // "prefer showing nothing over showing something wrong".
      if (!value || typeof value !== 'object') return null;
      return { ...value, key: blob.key };
    })
  );
  return records.filter(Boolean);
}

async function readJsonBody(req) {
  try {
    return await req.json();
  } catch (err) {
    return null;
  }
}

export default async (req) => {
  const method = req.method;
  const action = new URL(req.url).searchParams.get('action');

  let store;
  try {
    store = openStore();
  } catch (err) {
    console.error('hotel-watch: could not open the Blobs store:', err);
    return jsonResponse(500, { error: 'אחסון המעקב אינו זמין כרגע' });
  }

  try {
    if (method === 'GET') {
      return jsonResponse(200, { watches: await listWatches(store) });
    }

    if (method === 'DELETE' || (method === 'POST' && action === 'remove')) {
      const payload = await readJsonBody(req);
      if (!payload) return jsonResponse(400, { error: 'גוף הבקשה אינו JSON תקין' });

      const key = cleanText(payload.key);
      if (!key) return jsonResponse(400, { error: 'חסר מזהה מעקב למחיקה' });

      await store.delete(key);
      return jsonResponse(200, { removed: key });
    }

    if (method === 'POST') {
      const payload = await readJsonBody(req);
      if (!payload) return jsonResponse(400, { error: 'גוף הבקשה אינו JSON תקין' });

      const problem = validateWatchPayload(payload);
      if (problem) return jsonResponse(400, { error: problem });

      const hotelName = cleanText(payload.hotelName);
      const location = cleanText(payload.location);
      const key = buildWatchKey(hotelName, location, payload.checkin, payload.checkout);

      // Re-watching the same hotel+dates must not wipe the check history the scheduled run
      // already recorded, otherwise lastOverallStatus resets and the next successful check
      // looks like a fresh "became available" transition — a false alert.
      const existing = await store.get(key, { type: 'json' });

      if (existing) {
        // One exception to "never touch an existing record": backfill a missing agodaUrl.
        // Records created before a hotel had a verified Agoda page would otherwise keep
        // agodaUrl: null forever and report Agoda as error for good, since re-watching returns
        // the record untouched. Only fills a null - never overwrites an existing URL, and never
        // touches sources / lastOverallStatus / lastAlertSentAt, so the alert state is safe.
        if (!existing.agodaUrl && payload.agodaUrl) {
          existing.agodaUrl = payload.agodaUrl;
          await store.setJSON(key, existing);
        }
        return jsonResponse(200, { watch: { ...existing, key } });
      }

      const watch = {
        hotelName,
        location,
        searchLocation: cleanText(payload.searchLocation),
        bookingUrl: payload.bookingUrl,
        agodaUrl: payload.agodaUrl || null,
        checkin: payload.checkin,
        checkout: payload.checkout,
        createdAt: new Date().toISOString(),
        // null (not 'error') means "never checked yet" — the frontend shows "טרם נבדק" for it.
        // Only the checker ever writes a real status here.
        sources: {
          booking: { status: null, checkedAt: null, note: '' },
          agoda: { status: null, checkedAt: null, note: '' }
        },
        lastOverallStatus: null,
        lastAlertSentAt: null
      };

      await store.setJSON(key, watch);
      return jsonResponse(200, { watch: { ...watch, key } });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error(`hotel-watch: ${method} failed:`, err);
    return jsonResponse(502, { error: 'הפעולה על רשימת המעקב נכשלה' });
  }
};
