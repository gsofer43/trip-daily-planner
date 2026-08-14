// Proxies "restaurants near me" lookups to the Google Places API (New) so the Google Places
// API key never reaches the browser. The key lives only in the GOOGLE_PLACES_API_KEY Netlify
// environment variable (Site settings → Environment variables in the Netlify dashboard) and is
// read here via process.env — it must never be written into this file or any committed file.
// See the "Nearby restaurants" section in CLAUDE.md for the full rationale (why a proxy instead
// of a client-exposed key) and setup steps.
//
// The key's Google Cloud Console restriction is (and should stay) "HTTP referrers" matching
// this site's domain — the same restriction used for ordinary client-side Maps/Places usage.
// Because this function calls Google server-to-server (no browser involved, so normally no
// Referer header at all), we manually set Referer to the site's own URL below so the existing
// referrer restriction keeps working unchanged — there is no need to loosen the key's
// restriction just to route the call through this proxy.

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';
const SEARCH_RADIUS_METERS = 3000;
const MAX_RESULTS = 12;

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'השרת לא הוגדר: חסר GOOGLE_PLACES_API_KEY' }) };
  }

  const params = event.queryStringParameters || {};
  const lat = parseFloat(params.lat);
  const lng = parseFloat(params.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { statusCode: 400, body: JSON.stringify({ error: 'חסרים או לא תקינים פרמטרי lat/lng' }) };
  }

  try {
    const response = await fetch(PLACES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress',
        // Satisfies the key's HTTP-referrer restriction for this server-to-server call — see
        // file header comment. process.env.URL is Netlify's built-in "primary site URL" var.
        Referer: process.env.URL || process.env.DEPLOY_URL || ''
      },
      body: JSON.stringify({
        includedTypes: ['restaurant'],
        maxResultCount: MAX_RESULTS,
        rankPreference: 'POPULARITY',
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: SEARCH_RADIUS_METERS
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const message = (data && data.error && data.error.message) || 'שגיאה מול Google Places API';
      // Logged server-side (visible via `netlify logs --function nearby-restaurants`) so the
      // real Google error — e.g. REQUEST_DENIED, an unenabled API — is diagnosable without
      // having to reproduce the request manually. The client only gets the generic message.
      console.error(`Google Places API error (status ${response.status}): ${message}`);
      return { statusCode: response.status, body: JSON.stringify({ error: message }) };
    }

    const restaurants = (data.places || [])
      .map(p => ({
        name: (p.displayName && p.displayName.text) || '',
        placeId: p.id || '',
        rating: typeof p.rating === 'number' ? p.rating : null,
        reviews: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
        address: p.formattedAddress || ''
      }))
      .filter(r => r.name && r.placeId);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ restaurants })
    };
  } catch (err) {
    console.error('nearby-restaurants: failed to reach Google Places API:', err);
    return { statusCode: 502, body: JSON.stringify({ error: 'החיבור ל-Google Places API נכשל' }) };
  }
};
