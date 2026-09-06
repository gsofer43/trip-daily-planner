// ONE-OFF DEV TOOL. Confirms a candidate Booking URL really is the hotel we think it is,
// before it goes into HOTELS_BY_LOCATION.
//
// Booking page titles are "<name>, <city> (updated prices <year>)", so both the property and
// its town can be checked in one go. This matters because slugs are not derived from names -
// HUMA Kotor Bay lives at /hotel/me/allure-palazzi-kotor-bay.html (it was rebranded), and
// Casarogna Luxury Rooms lives at /hotel/me/skala.html. A URL that loads but points at a
// different property would silently make the watcher report on someone else's rooms.
//
// Usage:  node verify-booking-urls.js

import { chromium } from 'playwright';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const CANDIDATES = [
  ['Prado Luxury Hotel', 'Himar', 'https://www.booking.com/hotel/al/prado-luxury-himare.html'],
  ['Miamar Luxury Hotel & Spa', 'Himar', 'https://www.booking.com/hotel/al/miamar.html'],
  ['Saint Nicolas Hotel', 'Himar', 'https://www.booking.com/hotel/al/saint-nicolas.html'],
  ['Acta 1939', 'Himar', 'https://www.booking.com/hotel/al/acta-1939.html'],
  ['Hotel Forza Terra', 'Kotor', 'https://www.booking.com/hotel/me/forza-terra.html'],
  ['HUMA Kotor Bay Hotel and Villas', 'Kotor', 'https://www.booking.com/hotel/me/allure-palazzi-kotor-bay.html'],
  ['Adiya Signature Hotel - Adults only', 'Kotor', 'https://www.booking.com/hotel/me/adiya-signature.html'],
  ['Boutique Hotel Astoria', 'Kotor', 'https://www.booking.com/hotel/me/astoria-kotor.html'],
  ['Hotel Forza Mare', 'Kotor', 'https://www.booking.com/hotel/me/forza-mare-kotor.html']
];

const normalize = v =>
  String(v || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ userAgent: UA, locale: 'en-US' });

let failures = 0;

for (const [name, cityFragment, url] of CANDIDATES) {
  const page = await ctx.newPage();
  let title = '(failed to load)';
  let address = '';
  try {
    await page.goto(`${url}?lang=en-us`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(() => document.title && !/^\s*$/.test(document.title), { timeout: 30000 });
    title = await page.title();
    address = await page.evaluate(() => {
      const m = (document.body.innerText || '').match(/[^\n]*(Montenegro|Albania)[^\n]*/g) || [];
      return (m.find(l => /\d/.test(l)) || m[0] || '').trim().slice(0, 80);
    });
  } catch (err) {
    /* leave title as the failure marker */
  }
  await page.close();

  const nameOk = normalize(title).includes(normalize(name).split(' ').slice(0, 2).join(' '));
  const cityOk = normalize(title).includes(normalize(cityFragment));
  const ok = nameOk && cityOk;
  if (!ok) failures++;

  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}`);
  console.log(`        title  : ${title}`);
  if (address) console.log(`        address: ${address}`);
}

await browser.close();
console.log(`\n${CANDIDATES.length - failures}/${CANDIDATES.length} verified`);
process.exit(failures === 0 ? 0 : 1);
