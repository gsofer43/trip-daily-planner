// Agoda availability check.
//
// Deliberately a separate module from check-booking.js: the two sites are scraped completely
// differently and both are outside our control, so when one breaks it must be fixable without
// touching the other.
//
// Agoda serves an empty webpack shell to plain fetch - the hotel name appears zero times in the
// HTML - so this also needs a real browser. Two further constraints found while testing:
//   * Only the HOTEL DETAIL page works. The free-text search URL bounces to the homepage, and
//     the /search?city=<id> form needs Agoda-internal numeric city ids we do not have (17072,
//     tried as a guess, turned out to be Las Vegas).
//   * Dates go in as checkIn + los (nights), not checkIn + checkOut.
//
// Result mapping, verified against real pages (Avala Resort & Villas):
//   available    at least one EUR price token in the room grid AND no sold-out marker
//   unavailable  a sold-out marker AND zero price tokens
//   error        anything else - both or neither, or the page never settled
//
// The "neither" case is the important one here. Agoda renders "Just a moment / 0 results" while
// still loading, which is indistinguishable from a genuine zero result if you look too early -
// so the check waits for a settled state and reports error rather than reading that as "no
// rooms".

// Sold-out is detected by TEXT, not by a selector. The obvious-looking
// [data-selenium*="soldout"] / [class*="SoldOut"] matches nothing on a real sold-out page -
// verified against three of them - so relying on it meant this module could never once return
// `unavailable`, and instead sat waiting for a price until it timed out.
const SOLD_OUT_TEXT = /sold out|we're sold out|fully booked/i;

// The bookable-rooms container. Present on a page that has rooms, absent on a sold-out one, so
// it is the second half of the "available" test.
const ROOM_GRID = '#roomGrid, [data-selenium="roomGrid"], [id*="roomGrid"]';

const PRICE_PATTERN = /€\s?[0-9][0-9,.]*/;

const NAVIGATION_TIMEOUT_MS = 45000;
const SETTLE_TIMEOUT_MS = 30000;

function nightsBetween(checkin, checkout) {
  const start = new Date(`${checkin}T00:00:00Z`);
  const end = new Date(`${checkout}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}

export function buildAgodaUrl(agodaUrl, checkin, checkout) {
  const url = new URL(agodaUrl);
  url.searchParams.set('checkIn', checkin);
  url.searchParams.set('los', String(nightsBetween(checkin, checkout)));
  url.searchParams.set('adults', '2');
  url.searchParams.set('rooms', '1');
  url.searchParams.set('currency', 'EUR');
  return url.toString();
}

export async function checkAgoda(page, watch) {
  // No guessing. A hotel without a verified Agoda page is reported as error, with a note that
  // says exactly why - not as "no rooms".
  if (!watch.agodaUrl) {
    return { status: 'error', note: 'אין קישור Agoda מאומת למלון הזה' };
  }

  const nights = nightsBetween(watch.checkin, watch.checkout);
  if (!Number.isFinite(nights) || nights < 1) {
    return { status: 'error', note: 'טווח תאריכים לא תקין' };
  }

  const url = buildAgodaUrl(watch.agodaUrl, watch.checkin, watch.checkout);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });

    // Wait until the page settles into one of the two states. Without this the loading skeleton
    // reads as "no prices and not sold out", i.e. a spurious error at best.
    await page.waitForFunction(
      selectors => {
        const text = document.body.innerText || '';
        if (new RegExp(selectors.soldOut, 'i').test(text)) return true;
        return !!document.querySelector(selectors.rooms) && new RegExp(selectors.price).test(text);
      },
      { soldOut: SOLD_OUT_TEXT.source, rooms: ROOM_GRID, price: PRICE_PATTERN.source },
      { timeout: SETTLE_TIMEOUT_MS }
    );

    const seen = await page.evaluate(
      selectors => {
        const text = document.body.innerText || '';
        return {
          soldOut: new RegExp(selectors.soldOut, 'i').test(text),
          priceCount: (text.match(new RegExp(selectors.price, 'g')) || []).length,
          hasRoomGrid: !!document.querySelector(selectors.rooms)
        };
      },
      { soldOut: SOLD_OUT_TEXT.source, rooms: ROOM_GRID, price: PRICE_PATTERN.source }
    );

    // Sold-out wins outright, and is checked FIRST. Agoda keeps rendering other things with
    // prices on a sold-out page (a "similar properties" carousel, for one), so a price appearing
    // somewhere in the body is not evidence that THIS hotel has a room. Reading it as one is how
    // a false "available" - and a false alert telling someone to go book a room that isn't
    // there - would get sent.
    if (seen.soldOut) {
      return { status: 'unavailable', note: '' };
    }
    if (seen.hasRoomGrid && seen.priceCount > 0) {
      return { status: 'available', note: `${seen.priceCount} מחירים בדף החדרים` };
    }
    return { status: 'error', note: 'הדף לא הגיע למצב חד-משמעי' };
  } catch (err) {
    return { status: 'error', note: shortReason(err) };
  }
}

function shortReason(err) {
  const message = String((err && err.message) || err);
  if (/timeout/i.test(message)) return 'הדף לא נטען בזמן (ייתכן חסימה של Agoda)';
  return 'הבדיקה נכשלה';
}
