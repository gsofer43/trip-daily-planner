// Booking.com availability check.
//
// Booking cannot be read with plain fetch: every request (any URL, any header set) comes back
// HTTP 202 with a ~4KB AWS WAF challenge page that has to execute challenge.js to proceed. A
// real browser solves it in a few seconds, so this module drives Playwright rather than
// parsing HTML.
//
// The three-way result comes from two DOM markers that were verified against real pages:
//   available    #hprt-table exists AND has at least one [data-block-id] room row
//                (checked against Avala Resort & Villas, 22-24 Sep 2026)
//   unavailable  #no_availability_msg exists AND #hprt-table does not
//                (checked against Molla Guest House, 14-16 Jan 2027)
//   error        anything else - the challenge never cleared, the page timed out, neither
//                marker appeared, or BOTH appeared
//
// That last case matters: an ambiguous page is an error, never a guess. A false "available"
// sends the user running to book a room that does not exist, which is far worse than missing
// one. See the error rule in CLAUDE.md.

const ROOM_TABLE = '#hprt-table';
const ROOM_ROW = '#hprt-table [data-block-id]';
const NO_AVAILABILITY = '#no_availability_msg';

// The WAF challenge usually clears in ~6s; give it room without letting one hotel stall the run.
const NAVIGATION_TIMEOUT_MS = 45000;
const MARKER_TIMEOUT_MS = 30000;

export function buildBookingUrl(bookingUrl, checkin, checkout) {
  const url = new URL(bookingUrl);
  url.searchParams.set('checkin', checkin);
  url.searchParams.set('checkout', checkout);
  url.searchParams.set('group_adults', '2');
  url.searchParams.set('no_rooms', '1');
  url.searchParams.set('group_children', '0');
  url.searchParams.set('lang', 'en-us');
  url.searchParams.set('selected_currency', 'EUR');
  return url.toString();
}

export async function checkBooking(page, watch) {
  if (!watch.bookingUrl) {
    return { status: 'error', note: 'אין קישור Booking מאומת למלון הזה' };
  }

  const url = buildBookingUrl(watch.bookingUrl, watch.checkin, watch.checkout);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });

    // Wait for whichever marker shows up first. If neither does, this throws and we fall
    // through to 'error' - we never read a half-rendered page as "no rooms".
    await page.waitForFunction(
      selectors => !!document.querySelector(selectors.table) || !!document.querySelector(selectors.none),
      { table: ROOM_TABLE, none: NO_AVAILABILITY },
      { timeout: MARKER_TIMEOUT_MS }
    );

    const seen = await page.evaluate(
      selectors => ({
        table: !!document.querySelector(selectors.table),
        rows: document.querySelectorAll(selectors.row).length,
        none: !!document.querySelector(selectors.none)
      }),
      { table: ROOM_TABLE, row: ROOM_ROW, none: NO_AVAILABILITY }
    );

    if (seen.table && seen.none) {
      return { status: 'error', note: 'שני הסימנים הופיעו יחד - תוצאה לא חד-משמעית' };
    }
    if (seen.table && seen.rows > 0) {
      return { status: 'available', note: `${seen.rows} סוגי חדרים זמינים` };
    }
    if (seen.none) {
      return { status: 'unavailable', note: '' };
    }
    // Room table present but empty: not a confident "available", and not a confident "no".
    return { status: 'error', note: 'טבלת החדרים ריקה - לא ניתן להכריע' };
  } catch (err) {
    return { status: 'error', note: shortReason(err) };
  }
}

function shortReason(err) {
  const message = String((err && err.message) || err);
  if (/timeout/i.test(message)) return 'הדף לא נטען בזמן (ייתכן חסימה של Booking)';
  return 'הבדיקה נכשלה';
}
