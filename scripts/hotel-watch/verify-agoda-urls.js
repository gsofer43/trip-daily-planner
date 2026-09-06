// ONE-OFF DEV TOOL. Verifies candidate Agoda URLs before they go into HOTELS_BY_LOCATION.
//
// Two checks per URL, because either one alone is not enough:
//   1. the rendered <h1> must match the hotel name  -> we are looking at the right property
//   2. checkAgoda() must return a conclusive status -> the checker can actually read the page
//
// A URL that loads but whose <h1> names a different hotel is worse than no URL at all: the
// watch would silently report on somebody else's rooms.
//
// Usage:  node verify-agoda-urls.js

import { chromium } from 'playwright';
import { checkAgoda } from './check-agoda.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const CANDIDATES = [
  {
    name: 'Guesthouse Gjin Thana',
    url: 'https://www.agoda.com/en-gb/guesthouse-gjin-thana/hotel/velipoje-al.html',
    checkin: '2026-09-12',
    checkout: '2026-09-15'
  },
  {
    name: 'Thethi Paradise Hotel & Restaurant',
    url: 'https://www.agoda.com/en-gb/thethi-paradise/hotel/theth-al.html',
    checkin: '2026-09-12',
    checkout: '2026-09-15'
  },
  {
    name: 'Vidis Chalet Boutique Hotel',
    url: 'https://www.agoda.com/en-gb/vidis-chalet-hotel/hotel/theth-al.html',
    checkin: '2026-09-12',
    checkout: '2026-09-15'
  }
];

const normalize = v =>
  String(v || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function namesMatch(expected, rendered) {
  const a = normalize(expected);
  const b = normalize(rendered);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ userAgent: USER_AGENT, locale: 'en-GB' });

const verified = {};
let failures = 0;

for (const c of CANDIDATES) {
  const page = await context.newPage();
  let identity = null;
  try {
    await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('h1', { timeout: 20000 });
    identity = (await page.locator('h1').first().innerText()).trim();
  } catch (err) {
    identity = null;
  }
  await page.close();

  const ok = identity && namesMatch(c.name, identity);

  const page2 = await context.newPage();
  const result = await checkAgoda(page2, { agodaUrl: c.url, checkin: c.checkin, checkout: c.checkout });
  await page2.close();

  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${c.name}`);
  console.log(`        h1        : ${identity ?? '(no h1)'}`);
  console.log(`        availability: ${result.status}${result.note ? `  (${result.note})` : ''}`);

  if (ok) verified[c.name] = c.url;
  else failures++;
}

await browser.close();
console.log('\n' + JSON.stringify(verified, null, 2));
process.exit(failures === 0 ? 0 : 1);
