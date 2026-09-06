// ONE-OFF DEV TOOL - not part of the scheduled run, never called by run.js or the workflow.
//
// Finds the Agoda hotel page for each hotel in HOTELS_BY_LOCATION and prints the ones it could
// VERIFY, ready to paste back into app.js as `agodaUrl`.
//
// It guesses a slug from the hotel name, opens the page, and then accepts the URL only if the
// <h1> Agoda renders actually matches the hotel name. Agoda redirects a near-miss slug to the
// real page (tirana-marriott-hotel -> tirana-marriott), so the guess only needs to be close;
// the <h1> check is what makes the result trustworthy. Anything that does not match is
// reported as UNVERIFIED and deliberately left without a URL - the availability checker then
// reports Agoda as `error` for that hotel rather than checking the wrong property.
//
// Usage:  node resolve-agoda-urls.js        (add --headed to watch it)

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_JS = path.join(HERE, '..', '..', 'app.js');

// Agoda's own city-slug(s) for each searchLocation in HOTELS_BY_LOCATION. A list, because
// Agoda does not always file a town under the name you would expect - Himarë properties sit
// under himara-al or under vlora-al (its county), and guessing only one of them makes every
// hotel there look missing.
const CITY_SLUGS = {
  'Rijeka Crnojevića, Montenegro': 'rijeka-crnojevica-me',
  'Theth, Albania': 'theth-al',
  'Shkodër, Albania': 'shkoder-al',
  'Berat, Albania': 'berat-al',
  'Sarandë, Albania': 'sarande-al',
  'Tirana, Albania': 'tirana-al',
  'Budva, Montenegro': 'budva-me',
  'Himarë, Albania': ['himara-al', 'vlora-al', 'himare-al'],
  'Kotor, Montenegro': 'kotor-me'
};

// Pulls the HOTELS_BY_LOCATION literal straight out of app.js so this tool cannot drift from
// the real list. app.js is a plain browser script with no exports, hence the extract-and-eval.
async function loadHotelGroups() {
  const source = await readFile(APP_JS, 'utf8');
  const start = source.indexOf('const HOTELS_BY_LOCATION = [');
  if (start === -1) throw new Error('HOTELS_BY_LOCATION not found in app.js');
  const literalStart = source.indexOf('[', start);
  const end = source.indexOf('\n];', literalStart);
  if (end === -1) throw new Error('could not find the end of HOTELS_BY_LOCATION');
  const literal = source.slice(literalStart, end + 2);
  return eval(literal);
}

function slugify(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Accept only when the rendered name and our name are the same thing. Containment either way
// covers Agoda dropping or adding a generic word ("Tirana Marriott" vs "Tirana Marriott
// Hotel"); anything looser would risk pinning a watch to a different property.
function namesMatch(expected, rendered) {
  const a = normalizeName(expected);
  const b = normalizeName(rendered);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

async function resolveOne(page, hotelName, citySlug) {
  const guess = `https://www.agoda.com/${slugify(hotelName)}/hotel/${citySlug}.html`;
  try {
    await page.goto(guess, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('h1', { timeout: 20000 });
    const rendered = (await page.locator('h1').first().innerText()).trim();
    const finalUrl = new URL(page.url());
    // Keep only the path - the dates are added per check by buildAgodaUrl().
    const cleanUrl = `https://www.agoda.com${finalUrl.pathname}`;
    if (!/\/hotel\//.test(finalUrl.pathname)) {
      return { ok: false, reason: `bounced to ${finalUrl.pathname}` };
    }
    if (!namesMatch(hotelName, rendered)) {
      return { ok: false, reason: `name mismatch: page says "${rendered}"` };
    }
    return { ok: true, url: cleanUrl, rendered };
  } catch (err) {
    return { ok: false, reason: String(err.message || err).split('\n')[0].slice(0, 90) };
  }
}

async function main() {
  const groups = await loadHotelGroups();
  const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
  const context = await browser.newContext({ locale: 'en-GB' });
  const page = await context.newPage();

  const verified = [];
  const failed = [];

  for (const group of groups) {
    const citySlug = CITY_SLUGS[group.searchLocation];
    if (!citySlug) {
      console.log(`?? no Agoda city slug for ${group.searchLocation} - skipping group`);
      continue;
    }
    const citySlugs = Array.isArray(citySlug) ? citySlug : [citySlug];
    for (const entry of group.hotels) {
      const hotel = typeof entry === 'string' ? { name: entry } : entry;
      let result = { ok: false, reason: 'no city slug tried' };
      for (const slug of citySlugs) {
        result = await resolveOne(page, hotel.name, slug);
        if (result.ok) break;
      }
      if (result.ok) {
        console.log(`OK        ${hotel.name}  ->  ${result.url}`);
        verified.push({ name: hotel.name, url: result.url });
      } else {
        console.log(`UNVERIFIED ${hotel.name}  (${result.reason})`);
        failed.push({ name: hotel.name, reason: result.reason });
      }
    }
  }

  await browser.close();

  console.log(`\n--- verified ${verified.length}, unverified ${failed.length} ---`);
  console.log(JSON.stringify(Object.fromEntries(verified.map(v => [v.name, v.url])), null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
