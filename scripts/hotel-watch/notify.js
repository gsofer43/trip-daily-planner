// Sends the "a hotel you are watching just became available" email, from the trip owner's own
// Gmail account over SMTP.
//
// This started on Resend and had to move. Resend will happily send from onboarding@resend.dev
// with no domain verification, but in that mode it only delivers to the ACCOUNT OWNER's own
// address - a real send to the second recipient was rejected with "You can only send testing
// emails to your own email address". Reaching both people would have meant buying and verifying
// a domain. Gmail SMTP needs no domain, sends to anyone, and arrives from a familiar address so
// it is less likely to be filtered as spam.
//
// Credentials live only in GitHub Actions secrets - never in this repo - exactly like
// GOOGLE_PLACES_API_KEY lives only in a Netlify environment variable. GMAIL_APP_PASSWORD is a
// Google "app password", not the account password; it only works with 2-Step Verification on and
// can be revoked on its own without touching the account.
//
// Environment:
//   GMAIL_USER              the sending Gmail address
//   GMAIL_APP_PASSWORD      a Google app password (16 chars, spaces are ignored)
//   ALERT_RECIPIENT_EMAILS  comma-separated; falls back to FALLBACK_RECIPIENTS below
//   ALERT_DRY_RUN=1         print the email instead of sending it
//
// sendAvailabilityAlert() returns true only when the mail was really accepted by the SMTP
// server. The caller uses that to decide whether the transition has been consumed, so "false"
// must mean "nobody was told" - never swallow a failure into a true here.

import { buildBookingUrl } from './check-booking.js';
import { buildAgodaUrl } from './check-agoda.js';

// Gmail rewrites the envelope sender to the authenticated account anyway, so this is only the
// display name attached to GMAIL_USER.
const FROM_NAME = 'מתכנן הטיול';
const FALLBACK_RECIPIENTS = ['gil.sofer@gmail.com', 'ornitleib27@gmail.com'];

const SOURCE_LABELS = { booking: 'Booking.com', agoda: 'Agoda' };

function recipients() {
  const raw = process.env.ALERT_RECIPIENT_EMAILS || '';
  const parsed = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : FALLBACK_RECIPIENTS;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function availableSources(sources) {
  return Object.entries(sources || {})
    .filter(([, result]) => result && result.status === 'available')
    .map(([key]) => SOURCE_LABELS[key] || key);
}

// Links go straight to the dated page, not a bare hotel page - the whole point is to land on
// the room list for those exact nights while the room is still there.
function bookingLink(watch) {
  return watch.bookingUrl ? buildBookingUrl(watch.bookingUrl, watch.checkin, watch.checkout) : null;
}

function agodaLink(watch) {
  return watch.agodaUrl ? buildAgodaUrl(watch.agodaUrl, watch.checkin, watch.checkout) : null;
}

function buildEmail(watch, sources) {
  const found = availableSources(sources);
  const foundText = found.length > 0 ? found.join(' ו-') : 'אחד המקורות';
  const booking = bookingLink(watch);
  const agoda = agodaLink(watch);

  const subject = `🏨 ${watch.hotelName} התפנה! ${watch.checkin} — ${watch.checkout}`;

  const html = `<!doctype html>
<html dir="rtl" lang="he">
  <body style="margin:0;padding:24px;background:#f6f4ef;font-family:'Segoe UI',Arial,sans-serif;color:#2b2620;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2ddd0;border-radius:14px;padding:20px 24px;">
      <h1 style="margin:0 0 4px;font-size:1.15rem;">🏨 נמצא חדר פנוי</h1>
      <p style="margin:0 0 16px;color:#6f6a60;font-size:0.85rem;">
        מלון שאתם עוקבים אחריו התפנה. חדרים שמתפנים ברגע האחרון נתפסים מהר.
      </p>

      <p style="margin:0 0 2px;font-size:1.05rem;font-weight:600;">${escapeHtml(watch.hotelName)}</p>
      <p style="margin:0 0 12px;color:#6f6a60;font-size:0.9rem;">${escapeHtml(watch.location)}</p>

      <table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin-bottom:18px;">
        <tr>
          <td style="padding:4px 0;color:#6f6a60;">תאריכים</td>
          <td style="padding:4px 0;font-weight:600;">${escapeHtml(watch.checkin)} — ${escapeHtml(watch.checkout)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#6f6a60;">נמצא ב־</td>
          <td style="padding:4px 0;font-weight:600;">${escapeHtml(foundText)}</td>
        </tr>
      </table>

      ${booking ? `<p style="margin:0 0 8px;">
        <a href="${escapeHtml(booking)}" style="display:inline-block;background:#1f7a6c;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600;">להזמנה ב-Booking 🛏️</a>
      </p>` : ''}
      ${agoda ? `<p style="margin:0 0 8px;">
        <a href="${escapeHtml(agoda)}" style="display:inline-block;background:#ffffff;color:#1f7a6c;text-decoration:none;padding:10px 18px;border-radius:999px;border:1px solid #1f7a6c;font-weight:600;">לבדיקה ב-Agoda</a>
      </p>` : ''}

      <p style="margin:16px 0 0;color:#6f6a60;font-size:0.75rem;">
        הודעה זו נשלחת פעם אחת בלבד לכל מעבר מ"לא פנוי" ל"פנוי", לא בכל בדיקה.
      </p>
    </div>
  </body>
</html>`;

  const text = [
    `${watch.hotelName} — נמצא חדר פנוי`,
    watch.location,
    `תאריכים: ${watch.checkin} — ${watch.checkout}`,
    `נמצא ב־: ${foundText}`,
    booking ? `Booking: ${booking}` : null,
    agoda ? `Agoda: ${agoda}` : null
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}

export async function sendAvailabilityAlert(watch, sources) {
  const { subject, html, text } = buildEmail(watch, sources);
  const to = recipients();

  if (process.env.ALERT_DRY_RUN === '1') {
    console.log(`    [ALERT_DRY_RUN] would email ${to.join(', ')}`);
    console.log(`    [ALERT_DRY_RUN] subject: ${subject}`);
    console.log(text.split('\n').map(l => `    [ALERT_DRY_RUN] ${l}`).join('\n'));
    return true;
  }

  const user = process.env.GMAIL_USER;
  // Google shows app passwords as "abcd efgh ijkl mnop"; pasting them with the spaces is the
  // obvious thing to do and SMTP auth would just fail, so strip them here rather than making
  // that a support question.
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (!user || !pass) {
    // Not a silent skip: returning false leaves the transition unconsumed, so the alert is
    // retried on the next run once the credentials are configured, instead of being lost.
    console.error('    GMAIL_USER / GMAIL_APP_PASSWORD are not set - alert NOT sent, will retry next run');
    return false;
  }

  try {
    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
    const info = await transporter.sendMail({
      from: `${FROM_NAME} <${user}>`,
      to: to.join(', '),
      subject,
      html,
      text
    });
    // Gmail accepts or rejects per recipient. Treating a partial delivery as success would mean
    // one person silently never hears about it, so anything rejected is reported and the send
    // counts as failed.
    if (info.rejected && info.rejected.length > 0) {
      console.error(`    some recipients were rejected: ${info.rejected.join(', ')}`);
      return false;
    }
    console.log(`    alert sent to ${(info.accepted || to).join(', ')} (id ${info.messageId})`);
    return true;
  } catch (err) {
    console.error(`    sending the alert failed: ${err.message || err}`);
    return false;
  }
}
