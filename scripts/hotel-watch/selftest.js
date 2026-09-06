// Self-test for the two source checkers. No Blobs, no credentials, no writes - it just runs
// checkBooking()/checkAgoda() against real pages whose answer we already know, so a broken
// selector shows up as a wrong status instead of silently degrading to `error` in production.
//
// Cases are chosen to exercise BOTH directions. A checker that always returns `error` would
// pass an availability-only test, which is exactly the failure mode that matters here.
//
// Usage:  node selftest.js

import { chromium } from 'playwright';
import { checkBooking } from './check-booking.js';
import { checkAgoda } from './check-agoda.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const CASES = [
  {
    label: 'Booking / Avala Budva, real trip dates',
    source: 'booking',
    expect: 'available',
    watch: {
      hotelName: 'Avala Resort & Villas',
      bookingUrl: 'https://www.booking.com/hotel/me/avala-resort-villas.html',
      checkin: '2026-09-25',
      checkout: '2026-09-27'
    }
  },
  {
    label: 'Booking / Molla Guest House, deep winter (closed)',
    source: 'booking',
    expect: 'unavailable',
    watch: {
      hotelName: 'Molla Guest House',
      bookingUrl: 'https://www.booking.com/hotel/al/molla-guest-house.html',
      checkin: '2027-01-14',
      checkout: '2027-01-16'
    }
  },
  {
    label: 'Agoda / Avala Budva, real trip dates',
    source: 'agoda',
    expect: 'available',
    watch: {
      hotelName: 'Avala Resort & Villas',
      agodaUrl: 'https://www.agoda.com/en-gb/avala-resort-villas/hotel/budva-me.html',
      checkin: '2026-09-25',
      checkout: '2026-09-27'
    }
  },
  {
    // Regression case for the false "available" that actually reached someone's inbox: Agoda
    // renders a "similar properties" carousel with OTHER hotels' prices on a sold-out page, and
    // counting prices page-wide read that as a room being free.
    //
    // Deliberately uses DEEP WINTER, not the trip dates. Theth guesthouses are shut then, so the
    // answer stays 'unavailable' forever. Pinning this to real trip dates would make the test go
    // red the day a room genuinely frees up - and a test that cries wolf is one you stop reading.
    label: 'Agoda / Molla Theth deep winter (sold out - the false-positive regression)',
    source: 'agoda',
    expect: 'unavailable',
    watch: {
      hotelName: 'Molla Guest House',
      agodaUrl: 'https://www.agoda.com/en-gb/molla-guest-house/hotel/theth-al.html',
      checkin: '2027-01-14',
      checkout: '2027-01-16'
    }
  },
  {
    label: 'Agoda / hotel with no verified Agoda page',
    source: 'agoda',
    expect: 'error',
    watch: {
      hotelName: 'Casarogna Luxury Rooms',
      agodaUrl: null,
      checkin: '2026-09-11',
      checkout: '2026-09-12'
    }
  }
];

const CHECKERS = { booking: checkBooking, agoda: checkAgoda };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ userAgent: USER_AGENT, locale: 'en-US' });

let failures = 0;
for (const testCase of CASES) {
  const page = await context.newPage();
  let result;
  try {
    result = await CHECKERS[testCase.source](page, testCase.watch);
  } finally {
    await page.close();
  }
  const ok = result.status === testCase.expect;
  if (!ok) failures++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${testCase.label}\n      expected ${testCase.expect}, got ${result.status}${result.note ? `  (${result.note})` : ''}`
  );
}

await browser.close();
console.log(`\n${CASES.length - failures}/${CASES.length} passed`);
process.exit(failures === 0 ? 0 : 1);
