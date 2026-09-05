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

const SOLD_OUT_MARKER = '[data-selenium*="soldout" i], [class*="SoldOut"]';
const ROOM_GRID = '[data-selenium*="room" i], [id*="roomGrid"], [data-element-name*="room" i]';
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

    // Wait until the page settles into one of the two states. Without this the loading
    // skeleton reads as "no prices and no sold-out marker", i.e. a spurious error at best.
    await page.waitForFunction(
      selectors => {
        const soldOut = !!document.querySelector(selectors.soldOut);
        const hasPrice = new RegExp(selectors.price).test(document.body.innerText || '');
        return soldOut || hasPrice;
      },
      { soldOut: SOLD_OUT_MARKER, price: PRICE_PATTERN.source },
      { timeout: SETTLE_TIMEOUT_MS }
    );

    const seen = await page.evaluate(
      selectors => {
        const text = document.body.innerText || '';
        const prices = text.match(new RegExp(selectors.price, 'g')) || [];
        return {
          soldOut: !!document.querySelector(selectors.soldOut),
          priceCount: prices.length,
          roomNodes: document.querySelectorAll(selectors.rooms).length
        };
      },
      { soldOut: SOLD_OUT_MARKER, rooms: ROOM_GRID, price: PRICE_PATTERN.source }
    );

    if (seen.soldOut && seen.priceCount > 0) {
      return { status: 'error', note: 'גם "אזל" וגם מחירים בדף - תוצאה לא חד-משמעית' };
    }
    if (seen.priceCount > 0 && seen.roomNodes > 0) {
      return { status: 'available', note: `${seen.priceCount} מחירים בדף החדרים` };
    }
    if (seen.soldOut) {
      return { status: 'unavailable', note: '' };
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
