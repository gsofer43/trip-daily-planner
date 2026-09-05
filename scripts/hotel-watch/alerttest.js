// Tests the alert state machine in run.js. No network, no browser, no Blobs - it feeds
// applyResult() fabricated source results and asserts what gets written back and whether an
// alert fires.
//
// The whole point of the feature is "exactly one email per unavailable -> available
// transition", and the two ways to get that wrong are both covered here: alerting again while
// the hotel simply stays available, and re-alerting after a run where every source errored.
//
// Usage:  node alerttest.js

import { applyResult } from './run.js';

const src = (status, note = '') => ({ status, note, checkedAt: '2026-09-05T18:00:00.000Z' });

const baseWatch = {
  hotelName: 'Avala Resort & Villas',
  location: 'בודווה (Budva)',
  bookingUrl: 'https://www.booking.com/hotel/me/avala-resort-villas.html',
  agodaUrl: 'https://www.agoda.com/en-gb/avala-resort-villas/hotel/budva-me.html',
  checkin: '2026-09-25',
  checkout: '2026-09-27',
  lastOverallStatus: null,
  lastAlertSentAt: null
};

const CASES = [
  {
    label: 'never checked + both sources error -> status stays null, no alert',
    previous: null,
    sources: { booking: src('error', 'timeout'), agoda: src('error', 'no url') },
    expect: { status: null, alerted: false }
  },
  {
    label: 'first conclusive check says unavailable -> record it, no alert',
    previous: null,
    sources: { booking: src('unavailable'), agoda: src('error') },
    expect: { status: 'unavailable', alerted: false }
  },
  {
    label: 'unavailable -> available = the transition, alert fires once',
    previous: 'unavailable',
    sources: { booking: src('available', '3 rooms'), agoda: src('unavailable') },
    expect: { status: 'available', alerted: true, alertTimestamp: true }
  },
  {
    label: 'stays available on the next run -> NO second alert',
    previous: 'available',
    sources: { booking: src('available', '3 rooms'), agoda: src('available') },
    expect: { status: 'available', alerted: false }
  },
  {
    label: 'available -> all sources error -> status kept, no alert',
    previous: 'available',
    sources: { booking: src('error', 'blocked'), agoda: src('error', 'blocked') },
    expect: { status: 'available', alerted: false }
  },
  {
    label: 'unavailable -> all sources error -> status kept (must not re-alert later)',
    previous: 'unavailable',
    sources: { booking: src('error', 'blocked'), agoda: src('error', 'blocked') },
    expect: { status: 'unavailable', alerted: false }
  },
  {
    label: 'available -> unavailable (room taken) -> record it, no alert',
    previous: 'available',
    sources: { booking: src('unavailable'), agoda: src('unavailable') },
    expect: { status: 'unavailable', alerted: false }
  },
  {
    label: 'agoda alone finds a room -> still a transition',
    previous: 'unavailable',
    sources: { booking: src('unavailable'), agoda: src('available', '2 prices') },
    expect: { status: 'available', alerted: true }
  }
];

let failures = 0;

async function runCase(testCase, { failSend } = {}) {
  // ALERT_DRY_RUN=1 makes notify.js report success without sending; removing it with no
  // RESEND_API_KEY present makes it report failure. That is how the delivery-failure path
  // below is exercised without a real Resend account.
  if (failSend) {
    delete process.env.ALERT_DRY_RUN;
    delete process.env.RESEND_API_KEY;
  } else {
    process.env.ALERT_DRY_RUN = '1';
  }

  const watch = { ...baseWatch, lastOverallStatus: testCase.previous };
  const { updated, alerted } = await applyResult(watch, testCase.sources);

  const problems = [];
  if (updated.lastOverallStatus !== testCase.expect.status) {
    problems.push(`status ${JSON.stringify(updated.lastOverallStatus)} != ${JSON.stringify(testCase.expect.status)}`);
  }
  if (alerted !== testCase.expect.alerted) {
    problems.push(`alerted ${alerted} != ${testCase.expect.alerted}`);
  }
  if (testCase.expect.alertTimestamp && !updated.lastAlertSentAt) {
    problems.push('lastAlertSentAt was not set');
  }
  if (!testCase.expect.alerted && updated.lastAlertSentAt !== baseWatch.lastAlertSentAt) {
    problems.push('lastAlertSentAt changed without an alert');
  }

  if (problems.length > 0) {
    failures++;
    console.log(`FAIL  ${testCase.label}\n      ${problems.join('; ')}`);
  } else {
    console.log(`PASS  ${testCase.label}`);
  }
}

console.log('--- alert state machine ---');
for (const testCase of CASES) await runCase(testCase);

console.log('\n--- delivery failure must not consume the transition ---');
await runCase(
  {
    label: 'transition but the email fails -> status NOT advanced, retried next run',
    previous: 'unavailable',
    sources: { booking: src('available'), agoda: src('unavailable') },
    expect: { status: 'unavailable', alerted: false }
  },
  { failSend: true }
);

console.log(`\n${failures === 0 ? 'all passed' : failures + ' failed'}`);
process.exit(failures === 0 ? 0 : 1);
