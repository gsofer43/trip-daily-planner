// מתכנן מסלול טיול — כל הנתונים נשמרים בדפדפן (localStorage), בלי שרת ובלי build tools.

const STORAGE_KEY = 'travelPlannerData';

// בונה קישור גוגל מפות בפורמט ה-Search API המומלץ (עובד אמין גם באפליקציית המובייל,
// בשונה מהפורמט הישן ?q=place_id:XXX שגוגל מציג לפעמים כטקסט גולמי במקום לפתוח את המקום).
function buildVerifiedMapsUrl(name, placeId) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`;
}

// מיפוי ידני של שם תחנה מדויק ← place_id מאומת בגוגל מפות, לתחנות ספציפיות שכבר בדקנו
// ידנית. אפשר להוסיף עוד שורות בעתיד כדי לתת עוד תחנות קישור ישיר.
const VERIFIED_STATION_PLACE_IDS = {
  'Vinarija Janković': 'ChIJw52UHYLETRMRymPOnT0ymjA',
  'Nurellari Winery Cellar': 'ChIJU585moiZWhMRktiM5DsrS04',
  'Storia di Pietra': 'ChIJjV_LK_AzTBMRStdpMdGAVtY'
};

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultData() {
  return {
    tripTitle: 'מסלול טיול: אלבניה ומונטנגרו 2026',
    tripSubtitle: '11 בספטמבר – 2 באוקטובר 2026',
    days: [
      {
        id: uid('day'), title: 'טיווט לרייקה צרנוייביצה', date: '11/09',
        stops: [
          { id: uid('stop'), time: '09:00', place: 'איסוף הרכב בטיווט', note: 'תחילת הטיול — נסיעה רגועה, כשעתיים סה"כ לרייקה צרנוייביצה', lat: 42.4304, lng: 18.6957 },
          { id: uid('stop'), time: '11:00', place: 'העיר העתיקה של צטיניה', note: 'עצירה בדרך — קפה והליכה קצרה, כ-45 דקות', lat: 42.3906, lng: 18.9219 },
          { id: uid('stop'), time: '13:00', place: '⭐ תצפית פבלובה סטרנה', note: 'תצפית חובה על פיתול הנהר, כ-20 דקות (Montenegro)', lat: 42.2954, lng: 19.0186 },
          { id: uid('stop'), time: '14:00', place: 'Vinarija Janković', note: 'יקב מקומי מומלץ', lat: undefined, lng: undefined },
          { id: uid('stop'), time: '15:30', place: 'צ׳ק אין ברייקה צרנוייביצה', note: 'ערב שקט — לא להעמיס פעילות אחרי איסוף הרכב', lat: 42.2989, lng: 19.0067 }
        ]
      },
      {
        id: uid('day'), title: 'רייקה צרנוייביצה לת׳ת׳ (Theth)', date: '12/09',
        stops: [
          { id: uid('stop'), time: '08:00', place: 'יציאה לכיוון אלבניה', note: 'מעבר גבול ונסיעה דרך שקודר, כארבע עד חמש שעות — רצוי להגיע לפני החשכה', lat: 42.2989, lng: 19.0067 },
          { id: uid('stop'), time: '10:30', place: 'מבצר רוזאפה', note: 'אופציונלי — רק אם יוצאים מוקדם, כשעה', lat: 42.0508, lng: 19.4879 },
          { id: uid('stop'), time: '12:30', place: '⭐ תצפית מעבר ת׳ורה', note: 'העצירה החשובה לפני הירידה לת׳ת׳, כ-20-30 דקות. עדיף לבחור בין רוזאפה לכאן ולא להעמיס את שתיהן', lat: 42.3814, lng: 19.7186 },
          { id: uid('stop'), time: '17:00', place: 'הגעה לת׳ת׳, צ׳ק אין', note: '', lat: 42.3986, lng: 19.7797 }
        ]
      },
      {
        id: uid('day'), title: 'ת׳ת׳ — יום 1: Blue Eye', date: '13/09',
        stops: [
          { id: uid('stop'), time: '09:00', place: 'נסיעה לנדרליסה', note: '', lat: 42.3986, lng: 19.7797 },
          { id: uid('stop'), time: '10:00', place: 'מסלול ה-Blue Eye של ת׳ת׳', note: 'דרך נהר, סלעים ובריכות טבעיות. משך: כשעתיים עד שלוש, קושי בינוני', lat: 42.4270, lng: 19.7530 },
          { id: uid('stop'), time: '18:00', place: 'הליכה בכפר, בכנסייה ובמגדל ההיסטורי', note: 'ערב רגוע בין בתי האבן ונקודות תצפית העמק', lat: 42.3986, lng: 19.7797 }
        ]
      },
      {
        id: uid('day'), title: 'ת׳ת׳ — יום 2: מפל גרונאס', date: '14/09',
        stops: [
          { id: uid('stop'), time: '09:00', place: 'מפל גרונאס וקניון ת׳ת׳', note: 'מסלול קצר ויפה מהכפר דרך הנהר והשדות. משך: כשעתיים עד שעתיים וחצי, קושי קל עד בינוני', lat: 42.4058, lng: 19.7869 },
          { id: uid('stop'), time: '13:00', place: '(חלופה) לולאת ננרת׳', note: 'למי שרוצה מסלול מעט מאתגר יותר — יערות, מרעה ותצפיות על עמק ת׳ת׳. משך: כשלוש עד ארבע שעות, קושי בינוני', lat: 42.3986, lng: 19.7797 }
        ]
      },
      {
        id: uid('day'), title: 'ת׳ת׳ לשקודר (Shkodër)', date: '15/09',
        stops: [
          { id: uid('stop'), time: '09:00', place: 'יציאה רגועה מההרים', note: 'כשעתיים עד שעתיים וחצי נסיעה', lat: 42.3986, lng: 19.7797 },
          { id: uid('stop'), time: '12:00', place: 'צ׳ק אין בשקודר', note: '', lat: 42.0683, lng: 19.5126 },
          { id: uid('stop'), time: '15:00', place: 'סיבוב בעיר העתיקה', note: 'רחוב הולך ורגלי מרכזי, בזארים ובתי קפה', lat: 42.0683, lng: 19.5126 },
          { id: uid('stop'), time: '19:30', place: 'ארוחת ערב', note: '', lat: 42.0683, lng: 19.5126 }
        ]
      },
      {
        id: uid('day'), title: 'שקודר — יום 2', date: '16/09',
        stops: [
          { id: uid('stop'), time: '10:00', place: 'מבצר רוזאפה', note: 'ביקור מלא הפעם (לא רק מעבר) — נוף מרהיב על האגם', lat: 42.0508, lng: 19.4879 },
          { id: uid('stop'), time: '13:00', place: 'יום פנוי / גמיש בשקודר', note: 'המקור לא פירט תוכנית ליום הזה במפורש — אפשר לנצל למנוחה, קניות או הכנה לנסיעה לבראט', lat: 42.0683, lng: 19.5126 }
        ]
      },
      {
        id: uid('day'), title: 'שקודר לבראט (Berat)', date: '17/09',
        stops: [
          { id: uid('stop'), time: '09:00', place: 'יציאה דרומה לבראט', note: 'כשלוש וחצי עד ארבע שעות נסיעה', lat: 42.0683, lng: 19.5126 },
          { id: uid('stop'), time: '11:30', place: '⭐ Mrizi i Zanave', note: 'חווה ומסעדה מקומית מיוחדת באזור פישטה. להקדיש כשעה וחצי ולהזמין מראש (mrizizanave.al)', lat: 41.7906, lng: 19.6428 },
          { id: uid('stop'), time: '15:00', place: 'צ׳ק אין בבראט + טיול ראשון בעיר העתיקה', note: '', lat: 40.7059, lng: 19.9502 }
        ]
      },
      {
        id: uid('day'), title: 'בראט (Berat)', date: '18/09',
        stops: [
          { id: uid('stop'), time: '09:00', place: 'מצודת בראט', note: 'Berat Castle', lat: 40.7060, lng: 19.9430 },
          { id: uid('stop'), time: '11:30', place: 'רבעים עתיקים ותצפיות', note: 'יום מלא במצודה, ברבעים העתיקים ובתצפיות — ללא נסיעה משמעותית', lat: 40.7059, lng: 19.9502 },
          { id: uid('stop'), time: '14:00', place: '(אופציונלי) קניון אוסומי — רפטינג', note: 'אטרקציה אופציונלית באזור בראט', lat: 40.7059, lng: 19.9502 },
          { id: uid('stop'), time: '17:00', place: 'Nurellari Winery Cellar', note: 'יקב מומלץ ליד בראט', lat: undefined, lng: undefined },
          { id: uid('stop'), time: '19:30', place: 'ארוחת ערב עם נוף לעיר', note: '', lat: 40.7060, lng: 19.9430 }
        ]
      },
      {
        id: uid('day'), title: 'בראט לסרנדה (Sarandë)', date: '19/09',
        stops: [
          { id: uid('stop'), time: '08:00', place: 'יציאה דרומה לסרנדה', note: 'כשלוש וחצי עד ארבע וחצי שעות נסיעה', lat: 40.7059, lng: 19.9502 },
          { id: uid('stop'), time: '10:00', place: 'Ujë i Ftohtë בטפלנה', note: 'קפה או ארוחת צהריים קצרה', lat: 40.3225, lng: 20.1808 },
          { id: uid('stop'), time: '12:00', place: '⭐ הבזאר העתיק בג׳ירוקסטרה', note: 'להקדיש כשעה וחצי עד שעתיים (Visit-Gjirokastra.com)', lat: 40.0757, lng: 20.1385 },
          { id: uid('stop'), time: '14:00', place: '⭐ העין הכחולה', note: 'כשעה עד שעה וחצי כולל ההליכה. כדי להספיק גם את ג׳ירוקסטרה וגם את זה, כדאי לצאת מבראט מוקדם', lat: 39.9908, lng: 20.0169 },
          { id: uid('stop'), time: '18:00', place: 'הגעה לסרנדה, צ׳ק אין', note: '', lat: 39.8756, lng: 20.0053 }
        ]
      },
      {
        id: uid('day'), title: 'סרנדה, קסמיל ובוטרינט', date: '20/09',
        stops: [
          { id: uid('stop'), time: '09:00', place: 'יום חופים באזור קסמיל', note: '', lat: 39.7660, lng: 20.0090 },
          { id: uid('stop'), time: '13:00', place: 'האתר העתיק בוטרינט', note: 'Butrint — אתר מורשת עולמית של אונסק"ו', lat: 39.7480, lng: 20.0230 },
          { id: uid('stop'), time: '19:30', place: 'ארוחת ערב בסרנדה', note: '', lat: 39.8756, lng: 20.0053 }
        ]
      },
      {
        id: uid('day'), title: 'סרנדה להימרה (Himarë)', date: '21/09',
        stops: [
          { id: uid('stop'), time: '09:00', place: 'יציאה נופית לאורך החוף', note: 'כשעה וחצי נסיעה', lat: 39.8756, lng: 20.0053 },
          { id: uid('stop'), time: '10:30', place: 'מפל בורש', note: 'קפה ועצירה של כ-30 דקות', lat: 40.0397, lng: 19.9314 },
          { id: uid('stop'), time: '11:30', place: '⭐ טירת פורטו פלרמו', note: 'טירה, מפרץ ותצפית, כ-45-60 דקות (expedia)', lat: 40.0347, lng: 19.7961 },
          { id: uid('stop'), time: '13:30', place: 'צ׳ק אין בהימרה', note: '', lat: 40.1017, lng: 19.7439 }
        ]
      },
      {
        id: uid('day'), title: 'הימרה (Himarë)', date: '22/09',
        stops: [
          { id: uid('stop'), time: '10:00', place: 'יום חופים / מנוחה', note: '', lat: 40.1017, lng: 19.7439 },
          { id: uid('stop'), time: '16:00', place: 'טיול קצר באזור', note: '', lat: 40.1017, lng: 19.7439 }
        ]
      },
      {
        id: uid('day'), title: 'הימרה לטירנה (Tirana)', date: '23/09',
        stops: [
          { id: uid('stop'), time: '08:00', place: 'יציאה לטירנה', note: 'כארבע עד חמש שעות — יום נסיעה ארוך יחסית', lat: 40.1017, lng: 19.7439 },
          { id: uid('stop'), time: '09:30', place: '⭐ תצפית מעבר לוגרה', note: 'תצפית מרשימה על החוף. כדי להגיע צריך לבחור בכביש ההר הישן ולא במנהרה המקצרת (Tripadvisor)', lat: 40.1975, lng: 19.6017 },
          { id: uid('stop'), time: '11:00', place: 'הפארק הלאומי לוגרה', note: 'קפה או ארוחת צהריים', lat: 40.2075, lng: 19.5919 },
          { id: uid('stop'), time: '13:00', place: '(אופציונלי) טיילת ולורה', note: 'אופציונלי, אם לא ממהרים', lat: 40.4686, lng: 19.4897 },
          { id: uid('stop'), time: '17:00', place: 'הגעה לטירנה, צ׳ק אין', note: '', lat: 41.3275, lng: 19.8187 }
        ]
      },
      {
        id: uid('day'), title: 'טירנה (Tirana)', date: '24/09',
        stops: [
          { id: uid('stop'), time: '10:00', place: 'שווקים ומרכז העיר', note: 'יום מלא בעיר — ללא נסיעה משמעותית', lat: 41.3275, lng: 19.8187 },
          { id: uid('stop'), time: '13:00', place: 'ארוחת צהריים', note: '', lat: 41.3275, lng: 19.8187 },
          { id: uid('stop'), time: '16:00', place: 'סיור עירוני', note: 'שווקים, אוכל ואווירה עירונית', lat: 41.3275, lng: 19.8187 }
        ]
      },
      {
        id: uid('day'), title: 'טירנה לבודווה (Budva)', date: '25/09',
        stops: [
          { id: uid('stop'), time: '08:00', place: 'יציאה למונטנגרו', note: 'מעבר גבול, כארבע עד חמש שעות נסיעה', lat: 41.3275, lng: 19.8187 },
          { id: uid('stop'), time: '10:30', place: '(אופציונלי) העיר העתיקה של צטיניה', note: 'רק אם לא עצרתם בה ב-11 בספטמבר', lat: 42.3906, lng: 18.9219 },
          { id: uid('stop'), time: '13:00', place: '⭐ תצפית Brajići על בודווה', note: 'עצירה קצרה לפני הירידה לבודווה', lat: 42.3211, lng: 18.8664 },
          { id: uid('stop'), time: '15:00', place: 'הגעה לבודווה, צ׳ק אין', note: 'את סווטי סטפן עדיף להשאיר למחר', lat: 42.2864, lng: 18.8400 }
        ]
      },
      {
        id: uid('day'), title: 'בודווה וסווטי סטפן (Sveti Stefan)', date: '26/09',
        stops: [
          { id: uid('stop'), time: '10:00', place: 'העיר העתיקה של בודווה', note: '', lat: 42.2864, lng: 18.8400 },
          { id: uid('stop'), time: '13:00', place: 'חוף מוגרן', note: 'Mogren Beach', lat: 42.2917, lng: 18.8422 },
          { id: uid('stop'), time: '16:00', place: 'תצפית על סווטי סטפן', note: '', lat: 42.2553, lng: 18.8931 }
        ]
      },
      {
        id: uid('day'), title: 'בודווה לקוטור (Kotor)', date: '27/09',
        stops: [
          { id: uid('stop'), time: '10:00', place: 'יציאה לקוטור', note: 'מעבר קצר יחסית — כשלושת רבעי שעה עד שעה ורבע', lat: 42.2864, lng: 18.8400 },
          { id: uid('stop'), time: '12:00', place: 'צ׳ק אין בקוטור', note: '', lat: 42.4247, lng: 18.7712 },
          { id: uid('stop'), time: '14:00', place: 'היכרות עם העיר העתיקה של קוטור', note: '', lat: 42.4252, lng: 18.7708 }
        ]
      },
      {
        id: uid('day'), title: 'קוטור ופרסט (Perast)', date: '28/09',
        stops: [
          { id: uid('stop'), time: '09:00', place: 'טיול לפרסט', note: '', lat: 42.4886, lng: 18.7101 },
          { id: uid('stop'), time: '11:00', place: 'סיור במפרץ קוטור', note: '', lat: 42.4855, lng: 18.7090 },
          { id: uid('stop'), time: '15:00', place: 'חזרה לקוטור, זמן חופשי', note: '', lat: 42.4247, lng: 18.7712 }
        ]
      },
      {
        id: uid('day'), title: 'קוטור — יום רגוע', date: '29/09',
        stops: [
          { id: uid('stop'), time: '10:00', place: 'יום רגוע בעיר', note: 'היום השני מתוך שני ימים מלאים בקוטור', lat: 42.4247, lng: 18.7712 },
          { id: uid('stop'), time: '14:00', place: 'זמן פנוי במפרץ', note: '', lat: 42.4247, lng: 18.7712 },
          { id: uid('stop'), time: '16:00', place: 'Storia di Pietra', note: 'יקב מומלץ במפרץ קוטור', lat: undefined, lng: undefined }
        ]
      },
      {
        id: uid('day'), title: '⚠️ טרם תוכנן (TBD) — קוטור לז׳בליאק?', date: '30/09',
        stops: [
          { id: uid('stop'), time: '09:00', place: '⚠️ יום זה עדיין לא סגור', note: 'המעבר מקוטור לז׳בליאק (Durmitor) לא תוכנן סופית — גם המקור המקורי מסמן אותו כ-"???". התחנות למטה הן רעיונות טיוטה בלבד לאורך הנסיעה, לא תוכנית מאושרת.', lat: undefined, lng: undefined },
          { id: uid('stop'), time: '10:00', place: '(טיוטה — לא סופי) ⭐ תצפית על מפרץ ריסאן', note: 'עצירת צילום קצרה', lat: undefined, lng: undefined },
          { id: uid('stop'), time: '11:00', place: '(טיוטה — לא סופי) אגם סלאנו', note: 'כ-15 דקות', lat: undefined, lng: undefined },
          { id: uid('stop'), time: '12:00', place: '(טיוטה — לא סופי) כיכר החירות בניקשיץ׳', note: 'קפה או ארוחת צהריים', lat: undefined, lng: undefined },
          { id: uid('stop'), time: '14:00', place: '(טיוטה — לא סופי) Eco Village Nevidio', note: 'קפה ונוף באזור הקניון', lat: undefined, lng: undefined },
          { id: uid('stop'), time: '15:30', place: '(טיוטה — לא סופי) אגם Pošćenje', note: 'עצירת טבע קצרה ליד הדרך (Gray Line Montenegro)', lat: undefined, lng: undefined }
        ]
      },
      {
        id: uid('day'), title: 'ז׳בליאק לטיווט (Tivat)', date: '01/10',
        stops: [
          { id: uid('stop'), time: '08:00', place: 'יציאה בבוקר לטיווט', note: 'נסיעה רגועה, כשלוש וחצי עד ארבע שעות. חוזרים בדרך דומה — לעצור רק בנקודות שדילגו עליהן', lat: 43.1547, lng: 19.1220 },
          { id: uid('stop'), time: '10:00', place: '(אם דילגו קודם) אגם סלאנו', note: '', lat: undefined, lng: undefined },
          { id: uid('stop'), time: '11:00', place: '(אם דילגו קודם) כיכר החירות בניקשיץ׳', note: '', lat: undefined, lng: undefined },
          { id: uid('stop'), time: '13:00', place: 'טיילת ריסאן', note: 'מקום טוב לארוחת צהריים רגועה לפני טיווט', lat: 42.5178, lng: 18.6994 },
          { id: uid('stop'), time: '16:00', place: 'הגעה לטיווט, לינה אחרונה', note: 'לינה סמוך לשדה התעופה מורידה לחץ ומונעת נסיעה ארוכה בבוקר הטיסה', lat: 42.4304, lng: 18.6957 }
        ]
      },
      {
        id: uid('day'), title: 'טיסה מטיווט', date: '02/10',
        stops: [
          { id: uid('stop'), time: '09:00', place: 'החזרת הרכב', note: '', lat: 42.4304, lng: 18.6957 },
          { id: uid('stop'), time: '10:00', place: 'טיסה מטיווט', note: 'יציאה לשדה התעופה והחזרת הרכב בהתאם לשעת הטיסה — יום עזיבה, סוף הטיול', lat: 42.4047, lng: 18.7238 }
        ]
      }
    ],
    packingList: defaultPackingCategories()
  };
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const data = defaultData();
    saveData(data);
    return data;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.days)) throw new Error('invalid shape');
    return parsed;
  } catch (e) {
    console.warn('נתונים שמורים פגומים, חוזר לברירת המחדל', e);
    const data = defaultData();
    saveData(data);
    return data;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const state = {
  data: loadData(),
  activeDayId: null,
  editingStopId: null, // null = adding new
  editingDayId: null    // null = adding new day
};
state.activeDayId = state.data.days[0] ? state.data.days[0].id : null;

// ---------- DOM refs ----------
const dayTabsEl = document.getElementById('dayTabs');
const dayContentEl = document.getElementById('dayContent');
const addDayBtn = document.getElementById('addDayBtn');
const emptyDaysTemplate = document.getElementById('emptyDaysTemplate');

const stopModal = document.getElementById('stopModal');
const stopForm = document.getElementById('stopForm');
const stopModalTitle = document.getElementById('stopModalTitle');
const stopTimeInput = document.getElementById('stopTime');
const stopPlaceInput = document.getElementById('stopPlace');
const stopNoteInput = document.getElementById('stopNote');
const stopCoordsInput = document.getElementById('stopCoords');
const cancelStopBtn = document.getElementById('cancelStopBtn');
const stopSearchInput = document.getElementById('stopSearchInput');
const stopSearchResults = document.getElementById('stopSearchResults');
const placeSearchWrap = stopSearchInput.closest('.place-search-wrap');

let dayMapInstance = null;
let placeSearchDebounceTimer = null;
let placeSearchAbortController = null;

const PLACE_SEARCH_MIN_CHARS = 3;
const PLACE_SEARCH_DEBOUNCE_MS = 450;
const PLACE_SEARCH_RESULT_LIMIT = 5;

const dayModal = document.getElementById('dayModal');
const dayForm = document.getElementById('dayForm');
const dayModalTitle = document.getElementById('dayModalTitle');
const dayTitleInput = document.getElementById('dayTitleInput');
const dayDateInput = document.getElementById('dayDateInput');
const cancelDayBtn = document.getElementById('cancelDayBtn');

const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');
const resetBtn = document.getElementById('resetBtn');

const overviewMapBtn = document.getElementById('overviewMapBtn');
const overviewMapSection = document.getElementById('overviewMapSection');
const closeOverviewBtn = document.getElementById('closeOverviewBtn');
const tabsRowEl = document.querySelector('.tabs-row');
let overviewMapInstance = null;

const wineriesBtn = document.getElementById('wineriesBtn');
const wineriesSection = document.getElementById('wineriesSection');
const closeWineriesBtn = document.getElementById('closeWineriesBtn');
const wineriesListEl = document.getElementById('wineriesList');

const hotelsBtn = document.getElementById('hotelsBtn');
const hotelsSection = document.getElementById('hotelsSection');
const closeHotelsBtn = document.getElementById('closeHotelsBtn');
const hotelsListEl = document.getElementById('hotelsList');

const packingBtn = document.getElementById('packingBtn');
const packingSection = document.getElementById('packingSection');
const closePackingBtn = document.getElementById('closePackingBtn');
const packingListEl = document.getElementById('packingList');
const packingProgressEl = document.getElementById('packingProgress');

const weatherBtn = document.getElementById('weatherBtn');
const weatherStatusEl = document.getElementById('weatherStatus');
const weatherListEl = document.getElementById('weatherList');

const infoModal = document.getElementById('infoModal');
const infoModalTitle = document.getElementById('infoModalTitle');
const infoModalImage = document.getElementById('infoModalImage');
const infoModalExtract = document.getElementById('infoModalExtract');
const infoModalLink = document.getElementById('infoModalLink');
const closeInfoBtn = document.getElementById('closeInfoBtn');
const wikiInfoCache = new Map(); // place key -> resolved info object, null (confirmed not found), or an in-flight Promise

document.getElementById('tripTitle').textContent = state.data.tripTitle || 'מתכנן מסלול טיול';

// ---------- Rendering ----------
function getActiveDay() {
  return state.data.days.find(d => d.id === state.activeDayId) || null;
}

function render() {
  renderTabs();
  renderDayPanel();
}

function renderTabs() {
  dayTabsEl.innerHTML = '';
  state.data.days.forEach((day, idx) => {
    const btn = document.createElement('button');
    btn.className = 'day-tab' + (day.id === state.activeDayId ? ' active' : '');
    btn.innerHTML = `<span>יום ${idx + 1} — ${escapeHtml(day.title)}</span>` +
      (day.date ? `<span class="tab-date">${escapeHtml(day.date)}</span>` : '');
    btn.addEventListener('click', () => {
      state.activeDayId = day.id;
      render();
    });
    dayTabsEl.appendChild(btn);
  });
}

function renderDayPanel() {
  dayContentEl.innerHTML = '';

  if (state.data.days.length === 0) {
    const empty = emptyDaysTemplate.content.cloneNode(true);
    dayContentEl.appendChild(empty);
    document.getElementById('emptyAddDayBtn').addEventListener('click', () => openDayModal());
    return;
  }

  const day = getActiveDay();
  if (!day) { state.activeDayId = state.data.days[0].id; return render(); }

  const header = document.createElement('div');
  header.className = 'day-panel-header';
  header.innerHTML = `
    <div>
      <h2>${escapeHtml(day.title)}</h2>
      ${day.date ? `<div class="day-date">${escapeHtml(day.date)}</div>` : ''}
    </div>
    <div class="day-panel-actions">
      <button class="icon-btn" data-action="edit-day" title="עריכת כותרת/תאריך">✏️</button>
      <button class="icon-btn" data-action="delete-day" title="מחיקת היום כולו">🗑️</button>
    </div>
  `;
  header.querySelector('[data-action="edit-day"]').addEventListener('click', () => openDayModal(day));
  header.querySelector('[data-action="delete-day"]').addEventListener('click', () => deleteDay(day.id));
  dayContentEl.appendChild(header);

  const stops = [...day.stops].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  if (stops.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-stops';
    empty.textContent = 'עדיין אין תחנות ביום הזה. הוסיפו את התחנה הראשונה.';
    dayContentEl.appendChild(empty);
  } else {
    const list = document.createElement('ul');
    list.className = 'stop-list';
    stops.forEach(stop => {
      const li = document.createElement('li');
      li.className = 'stop-card';
      li.innerHTML = `
        <div class="stop-time">${escapeHtml(stop.time || '--:--')}</div>
        <div class="stop-body">
          <p class="stop-place">${escapeHtml(stop.place)}</p>
          ${stop.note ? `<p class="stop-note">${escapeHtml(stop.note)}</p>` : ''}
        </div>
        <div class="stop-actions">
          <button class="icon-btn hidden" data-action="info-stop" title="מידע על המקום (ויקיפדיה)">ℹ️</button>
          ${VERIFIED_STATION_PLACE_IDS[stop.place] ? `<a class="icon-btn" href="${escapeHtml(buildVerifiedMapsUrl(stop.place, VERIFIED_STATION_PLACE_IDS[stop.place]))}" target="_blank" rel="noopener noreferrer" title="פתיחה בגוגל מפות (קישור מאומת)">📍</a>` : ''}
          <button class="icon-btn" data-action="edit-stop" title="עריכה">✏️</button>
          <button class="icon-btn" data-action="delete-stop" title="מחיקה">🗑️</button>
        </div>
      `;
      li.querySelector('[data-action="edit-stop"]').addEventListener('click', () => openStopModal(day.id, stop));
      li.querySelector('[data-action="delete-stop"]').addEventListener('click', () => deleteStop(day.id, stop.id));
      setupStopInfoButton(li.querySelector('[data-action="info-stop"]'), stop);
      list.appendChild(li);
    });
    dayContentEl.appendChild(list);
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-ghost add-stop-btn';
  addBtn.textContent = '+ הוספת תחנה';
  addBtn.addEventListener('click', () => openStopModal(day.id));
  dayContentEl.appendChild(addBtn);

  const mapSection = document.createElement('div');
  mapSection.className = 'map-section';
  mapSection.innerHTML = `
    <div class="map-section-title">📍 מפת היום</div>
    <div id="dayMap" class="day-map"></div>
  `;
  dayContentEl.appendChild(mapSection);
  renderDayMap(stops, mapSection.querySelector('#dayMap'));
}

function createNumberedMarkerIcon(number) {
  return L.divIcon({
    className: 'numbered-marker-icon',
    html: `<div class="numbered-marker"><span>${number}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28]
  });
}

function renderDayMap(stops, container) {
  if (dayMapInstance) {
    dayMapInstance.remove();
    dayMapInstance = null;
  }

  if (typeof L === 'undefined') {
    container.innerHTML = '<div class="map-fallback">המפה לא נטענה — נדרש חיבור לאינטרנט לטעינת אריחי OpenStreetMap.</div>';
    return;
  }

  // סדר הביקור נקבע לפי המיקום ברשימה הממוינת לפי שעה (stops מגיע כבר ממוין),
  // ולא רק לפי סדר בין התחנות שיש להן קואורדינטות — כך המספור על המפה תואם לרשימה.
  const points = stops
    .map((s, idx) => ({ ...s, visitOrder: idx + 1 }))
    .filter(s => typeof s.lat === 'number' && typeof s.lng === 'number');
  if (points.length === 0) {
    container.innerHTML = '<div class="map-fallback">אין קואורדינטות לתחנות ביום זה.<br>הוסיפו קואורדינטות בעריכת תחנה כדי לראות אותה כאן.</div>';
    return;
  }

  const map = L.map(container, { scrollWheelZoom: false });
  dayMapInstance = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map);

  const latlngs = points.map(s => [s.lat, s.lng]);

  points.forEach(s => {
    L.marker([s.lat, s.lng], { icon: createNumberedMarkerIcon(s.visitOrder) })
      .addTo(map)
      .bindPopup(`<strong>${escapeHtml(s.time || '')} ${escapeHtml(s.place)}</strong>${s.note ? '<br>' + escapeHtml(s.note) : ''}`);
  });

  if (latlngs.length > 1) {
    L.polyline(latlngs, { color: '#1f7a6c', weight: 3, opacity: 0.75, dashArray: '6 8' }).addTo(map);
    map.fitBounds(latlngs, { padding: [30, 30] });
  } else {
    map.setView(latlngs[0], 13);
  }
}

function getDayAnchorStop(day) {
  const sorted = [...day.stops].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  return sorted.find(s => typeof s.lat === 'number' && typeof s.lng === 'number') || null;
}

function renderOverviewMap() {
  if (overviewMapInstance) {
    overviewMapInstance.remove();
    overviewMapInstance = null;
  }

  const container = document.getElementById('overviewMap');

  if (typeof L === 'undefined') {
    container.innerHTML = '<div class="map-fallback">המפה לא נטענה — נדרש חיבור לאינטרנט לטעינת אריחי OpenStreetMap.</div>';
    return;
  }

  const dayPoints = state.data.days
    .map(day => ({ day, anchor: getDayAnchorStop(day) }))
    .filter(d => d.anchor);

  if (dayPoints.length === 0) {
    container.innerHTML = '<div class="map-fallback">אין עדיין קואורדינטות לאף יום במסלול.<br>הוסיפו קואורדינטות לתחנות כדי לראות אותן כאן.</div>';
    return;
  }

  const map = L.map(container, { scrollWheelZoom: false });
  overviewMapInstance = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map);

  const latlngs = dayPoints.map(d => [d.anchor.lat, d.anchor.lng]);

  dayPoints.forEach((d, idx) => {
    L.marker([d.anchor.lat, d.anchor.lng], { icon: createNumberedMarkerIcon(idx + 1) })
      .addTo(map)
      .bindPopup(`<strong>${escapeHtml(d.day.date || '')}</strong><br>${escapeHtml(d.day.title)}`);
  });

  if (latlngs.length > 1) {
    L.polyline(latlngs, { color: '#1f7a6c', weight: 3, opacity: 0.75, dashArray: '6 8' }).addTo(map);
    map.fitBounds(latlngs, { padding: [30, 30] });
  } else {
    map.setView(latlngs[0], 10);
  }
}

function parseCoords(str) {
  const trimmed = (str || '').trim();
  if (!trimmed) return { lat: undefined, lng: undefined };
  const parts = trimmed.split(',').map(p => parseFloat(p.trim()));
  if (parts.length === 2 && parts.every(n => Number.isFinite(n))) {
    return { lat: parts[0], lng: parts[1] };
  }
  return { lat: undefined, lng: undefined };
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ---------- Place search (Nominatim) ----------
function resetPlaceSearch() {
  clearTimeout(placeSearchDebounceTimer);
  placeSearchDebounceTimer = null;
  if (placeSearchAbortController) {
    placeSearchAbortController.abort();
    placeSearchAbortController = null;
  }
  stopSearchInput.value = '';
  hidePlaceSearchResults();
}

function hidePlaceSearchResults() {
  stopSearchResults.classList.add('hidden');
  stopSearchResults.innerHTML = '';
}

function showPlaceSearchStatus(message) {
  stopSearchResults.innerHTML = '';
  const li = document.createElement('li');
  li.className = 'search-result-status';
  li.textContent = message;
  stopSearchResults.appendChild(li);
  stopSearchResults.classList.remove('hidden');
}

function renderPlaceSearchResults(results) {
  stopSearchResults.innerHTML = '';
  results.forEach(result => {
    const li = document.createElement('li');
    li.className = 'search-result-item';
    li.textContent = result.display_name || '';
    li.title = result.display_name || '';
    li.addEventListener('click', () => selectPlaceSearchResult(result));
    stopSearchResults.appendChild(li);
  });
  stopSearchResults.classList.remove('hidden');
}

async function searchPlaces(query) {
  if (placeSearchAbortController) placeSearchAbortController.abort();
  const controller = new AbortController();
  placeSearchAbortController = controller;
  showPlaceSearchStatus('מחפש...');
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=${PLACE_SEARCH_RESULT_LIMIT}&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('bad status ' + res.status);
    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) {
      showPlaceSearchStatus('לא נמצאו תוצאות. ניתן להזין את הקואורדינטות ידנית למטה.');
      return;
    }
    renderPlaceSearchResults(results);
  } catch (err) {
    if (err.name === 'AbortError') return; // בוטל לטובת חיפוש חדש יותר
    console.warn('חיפוש מקום נכשל', err);
    showPlaceSearchStatus('החיפוש נכשל (יתכן שאין חיבור לאינטרנט). ניתן להזין שם וקואורדינטות ידנית.');
  }
}

function handlePlaceSearchInput() {
  clearTimeout(placeSearchDebounceTimer);
  const query = stopSearchInput.value.trim();
  if (query.length < PLACE_SEARCH_MIN_CHARS) {
    if (placeSearchAbortController) placeSearchAbortController.abort();
    hidePlaceSearchResults();
    return;
  }
  placeSearchDebounceTimer = setTimeout(() => searchPlaces(query), PLACE_SEARCH_DEBOUNCE_MS);
}

function selectPlaceSearchResult(result) {
  const shortName = (result.display_name || '').split(',')[0].trim() || stopSearchInput.value.trim();
  stopPlaceInput.value = shortName;
  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    stopCoordsInput.value = `${lat}, ${lon}`;
  }
  stopSearchInput.value = '';
  hidePlaceSearchResults();
  stopPlaceInput.focus();
  stopPlaceInput.select();
}

stopSearchInput.addEventListener('input', handlePlaceSearchInput);

stopSearchInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    hidePlaceSearchResults();
  } else if (e.key === 'Enter') {
    e.preventDefault(); // למנוע שליחת הטופס כולו מתוך שדה החיפוש
    const first = stopSearchResults.querySelector('.search-result-item');
    if (first) first.click();
  }
});

document.addEventListener('click', e => {
  if (!stopSearchResults.classList.contains('hidden') && !placeSearchWrap.contains(e.target)) {
    hidePlaceSearchResults();
  }
});

// ---------- Stop CRUD ----------
function openStopModal(dayId, stop) {
  resetPlaceSearch();
  state.editingDayIdForStop = dayId;
  state.editingStopId = stop ? stop.id : null;
  stopModalTitle.textContent = stop ? 'עריכת תחנה' : 'הוספת תחנה';
  stopTimeInput.value = stop ? stop.time : '';
  stopPlaceInput.value = stop ? stop.place : '';
  stopNoteInput.value = stop ? stop.note : '';
  stopCoordsInput.value = stop && typeof stop.lat === 'number' ? `${stop.lat}, ${stop.lng}` : '';
  stopModal.classList.remove('hidden');
  stopPlaceInput.focus();
}

function closeStopModal() {
  resetPlaceSearch();
  stopModal.classList.add('hidden');
  stopForm.reset();
}

stopForm.addEventListener('submit', e => {
  e.preventDefault();
  const day = state.data.days.find(d => d.id === state.editingDayIdForStop);
  if (!day) return closeStopModal();

  const payload = {
    time: stopTimeInput.value,
    place: stopPlaceInput.value.trim(),
    note: stopNoteInput.value.trim(),
    ...parseCoords(stopCoordsInput.value)
  };
  if (!payload.place) return;

  if (state.editingStopId) {
    const stop = day.stops.find(s => s.id === state.editingStopId);
    if (stop) Object.assign(stop, payload);
  } else {
    day.stops.push({ id: uid('stop'), ...payload });
  }

  saveData(state.data);
  closeStopModal();
  render();
});

cancelStopBtn.addEventListener('click', closeStopModal);
stopModal.addEventListener('click', e => { if (e.target === stopModal) closeStopModal(); });

function deleteStop(dayId, stopId) {
  const day = state.data.days.find(d => d.id === dayId);
  if (!day) return;
  const stop = day.stops.find(s => s.id === stopId);
  if (!stop) return;
  if (!confirm(`למחוק את "${stop.place}"?`)) return;
  day.stops = day.stops.filter(s => s.id !== stopId);
  saveData(state.data);
  render();
}

// ---------- Place info (Wikipedia) ----------
function cleanPlaceNameForWiki(place) {
  let name = (place || '').trim();
  let changed = true;
  while (changed) {
    const stripped = name
      .replace(/^⭐\s*/, '')
      .replace(/^⚠️\s*/, '')
      .replace(/^\([^)]*\)\s*/, '')
      .trim();
    changed = stripped !== name;
    name = stripped;
  }
  return name;
}

// תבניות של פעילות/לוגיסטיקה כלליות (איסוף/החזרת רכב, צ'ק אין, ארוחות, זמן חופשי, יציאה/
// הגעה/נסיעה, טיסה, לינה, הליכה קצרה וכו') — לא שמות של מקום אמיתי. עבור תחנות שתואמות,
// מדלגים לגמרי על חיפוש בוויקיפדיה, גם אם יש קואורדינטות: חיפוש גיאוגרפי/טקסטואלי סביב
// תחנת לוגיסטיקה נוטה למצוא התאמת "הקרוב ביותר" שגויה ולא רלוונטית (למשל "איסוף הרכב
// בטיווט" התאים בפועל ל"אצטדיון כדורגל" שנמצא במקרה קרוב לקואורדינטות) — עדיף לא להציג
// כפתור מידע כלל מאשר להציג משהו שגוי. רק תחנות שהן בבירור מקום אמיתי (עיר, מצודה, קניון,
// אתר היסטורי, תצפית, יקב...) ממשיכות לנסות חיפוש.
const GENERIC_STOP_PATTERNS = [
  /איסוף.*רכב/, /החזרת.*רכב/,             // איסוף/החזרת רכב
  /צ['׳]?ק[\s-]?אין/,                      // צ'ק אין
  /ארוחת (בוקר|צהריים|ערב)/,               // ארוחה
  /זמן (חופשי|פנוי)/,                      // זמן חופשי/פנוי
  /יום (חופשי|פנוי|רגוע|חופים|מנוחה)/,     // יום חופשי/פנוי/רגוע/חופים/מנוחה
  /יציאה/, /הגעה/, /נסיעה/, /חזרה ל/,       // יציאה/הגעה/נסיעה/חזרה
  /טיסה/, /לינה/,                          // טיסה/לינה
  /טיול קצר/, /הליכה (ב|קצר)/, /סיבוב ב/,   // הליכה/סיבוב קצר
  /עדיין לא/                               // הערות מטא כמו "עדיין לא סגור"
];

function isGenericLogisticsStop(placeName) {
  const cleaned = cleanPlaceNameForWiki(placeName);
  return GENERIC_STOP_PATTERNS.some(pattern => pattern.test(cleaned));
}

async function fetchWikipediaSummaryFromLang(lang, title) {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.type === 'disambiguation' || !data.extract) return null;
  return {
    title: data.title || title,
    extract: data.extract,
    thumbnail: (data.thumbnail && data.thumbnail.source) || (data.originalimage && data.originalimage.source) || null,
    pageUrl: (data.content_urls && data.content_urls.page && data.content_urls.page.desktop) || null
  };
}

async function searchGeoNearestTitle(lang, lat, lng) {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=2000&gslimit=1&format=json&origin=*`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  const match = data.query && data.query.geosearch && data.query.geosearch[0];
  return match ? match.title : null;
}

async function fetchWikipediaSummaryByGeo(lat, lng) {
  // לתחנות עם קואורדינטות מחפשים לפי מיקום פיזי, לא לפי טקסט — כדי למנוע התאמות
  // שגויות כמו "סרנדה" (העיר) שמתאימה לאלבום מוזיקה בשם "סרנדה". עברית קודם, אנגלית כגיבוי.
  for (const lang of ['he', 'en']) {
    try {
      const nearestTitle = await searchGeoNearestTitle(lang, lat, lng);
      if (!nearestTitle) continue;
      const result = await fetchWikipediaSummaryFromLang(lang, nearestTitle);
      if (result) return result;
    } catch (err) {
      console.warn(`חיפוש גאוגרפי בוויקיפדיה (${lang}) נכשל עבור [${lat}, ${lng}]`, err);
    }
  }
  return null;
}

async function fetchWikipediaSummaryByTitle(title) {
  // לתחנות בלי קואורדינטות אין דרך לחפש לפי מיקום — מחפשים לפי כותרת מדויקת.
  // אנגלית קודם: בדרך כלל יש כיסוי טוב יותר לשמות מקומות בבלקן מאשר בוויקיפדיה העברית.
  for (const lang of ['en', 'he']) {
    try {
      const result = await fetchWikipediaSummaryFromLang(lang, title);
      if (result) return result;
    } catch (err) {
      console.warn(`חיפוש בוויקיפדיה (${lang}) נכשל עבור "${title}"`, err);
    }
  }
  return null;
}

function getWikiInfoForPlace(stop) {
  if (isGenericLogisticsStop(stop.place)) return Promise.resolve(null); // לוגיסטיקה/פעילות כללית, לא מקום — ראו הערה למעלה

  const hasCoords = typeof stop.lat === 'number' && typeof stop.lng === 'number';
  const cleanedName = cleanPlaceNameForWiki(stop.place);
  const key = hasCoords ? `geo:${stop.lat.toFixed(4)},${stop.lng.toFixed(4)}` : `name:${cleanedName.toLowerCase()}`;
  if (!hasCoords && !cleanedName) return Promise.resolve(null);
  if (wikiInfoCache.has(key)) {
    const cached = wikiInfoCache.get(key);
    return cached instanceof Promise ? cached : Promise.resolve(cached);
  }
  const promise = (hasCoords ? fetchWikipediaSummaryByGeo(stop.lat, stop.lng) : fetchWikipediaSummaryByTitle(cleanedName)).then(result => {
    wikiInfoCache.set(key, result); // מחליף את ה-Promise שבמעקב בתוצאה הסופית (כולל null אם לא נמצא)
    return result;
  });
  wikiInfoCache.set(key, promise); // סימון "בטיפול" כדי למנוע כפל בקשות אם נלחץ/נטען שוב לפני שהתשובה חזרה
  return promise;
}

function setupStopInfoButton(button, stop) {
  if (isGenericLogisticsStop(stop.place)) return; // לוגיסטיקה/פעילות כללית — לא מנסים בכלל
  const hasCoords = typeof stop.lat === 'number' && typeof stop.lng === 'number';
  if (!hasCoords && !cleanPlaceNameForWiki(stop.place)) return;
  getWikiInfoForPlace(stop).then(info => {
    if (!info) return; // אין ערך בוויקיפדיה — משאירים את הכפתור מוסתר, בלי הודעת שגיאה
    button.classList.remove('hidden');
    button.addEventListener('click', () => openInfoModal(info));
  });
}

function openInfoModal(info) {
  infoModalTitle.textContent = info.title;
  infoModalExtract.textContent = info.extract;

  if (info.thumbnail) {
    infoModalImage.src = info.thumbnail;
    infoModalImage.alt = info.title;
    infoModalImage.classList.remove('hidden');
  } else {
    infoModalImage.classList.add('hidden');
    infoModalImage.removeAttribute('src');
  }

  if (info.pageUrl) {
    infoModalLink.href = info.pageUrl;
    infoModalLink.classList.remove('hidden');
  } else {
    infoModalLink.classList.add('hidden');
  }

  infoModal.classList.remove('hidden');
}

function closeInfoModal() {
  infoModal.classList.add('hidden');
}

closeInfoBtn.addEventListener('click', closeInfoModal);
infoModal.addEventListener('click', e => { if (e.target === infoModal) closeInfoModal(); });

// ---------- Day CRUD ----------
function openDayModal(day) {
  state.editingDayId = day ? day.id : null;
  dayModalTitle.textContent = day ? 'עריכת יום' : 'הוספת יום';
  dayTitleInput.value = day ? day.title : '';
  dayDateInput.value = day ? (day.date || '') : '';
  dayModal.classList.remove('hidden');
  dayTitleInput.focus();
}

function closeDayModal() {
  dayModal.classList.add('hidden');
  dayForm.reset();
}

dayForm.addEventListener('submit', e => {
  e.preventDefault();
  const title = dayTitleInput.value.trim();
  const date = dayDateInput.value.trim();
  if (!title) return;

  if (state.editingDayId) {
    const day = state.data.days.find(d => d.id === state.editingDayId);
    if (day) { day.title = title; day.date = date; }
  } else {
    const newDay = { id: uid('day'), title, date, stops: [] };
    state.data.days.push(newDay);
    state.activeDayId = newDay.id;
  }

  saveData(state.data);
  closeDayModal();
  render();
});

cancelDayBtn.addEventListener('click', closeDayModal);
dayModal.addEventListener('click', e => { if (e.target === dayModal) closeDayModal(); });
addDayBtn.addEventListener('click', () => openDayModal());

// סגירת המודאל הפתוח (הוספת/עריכת תחנה, הוספת/עריכת יום, מידע מוויקיפדיה) במקש Escape,
// בנוסף ללחיצה על הרקע הכהה או על כפתור הסגירה/ביטול הייעודי.
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!stopModal.classList.contains('hidden')) closeStopModal();
  else if (!dayModal.classList.contains('hidden')) closeDayModal();
  else if (!infoModal.classList.contains('hidden')) closeInfoModal();
});

function deleteDay(dayId) {
  const day = state.data.days.find(d => d.id === dayId);
  if (!day) return;
  if (!confirm(`למחוק את היום "${day.title}" וכל התחנות שבו?`)) return;
  const idx = state.data.days.findIndex(d => d.id === dayId);
  state.data.days = state.data.days.filter(d => d.id !== dayId);
  if (state.activeDayId === dayId) {
    const next = state.data.days[idx] || state.data.days[idx - 1] || null;
    state.activeDayId = next ? next.id : null;
  }
  saveData(state.data);
  render();
}

// ---------- Grouped place cards (shared by wineries / hotels / future pages) ----------
// groups: [{ location, items: [{ name, note?, mapsUrl }] }]
function renderPlaceGroups(containerEl, groups, buttonLabel) {
  containerEl.innerHTML = '';
  groups.forEach(group => {
    const groupEl = document.createElement('div');
    groupEl.className = 'place-group';

    const titleEl = document.createElement('h3');
    titleEl.className = 'place-group-title';
    titleEl.textContent = group.location;
    groupEl.appendChild(titleEl);

    const cardsEl = document.createElement('div');
    cardsEl.className = 'place-cards';

    group.items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'place-card';
      card.innerHTML = `
        <p class="place-name">${escapeHtml(item.name)}</p>
        ${item.note ? `<p class="place-note">${escapeHtml(item.note)}</p>` : ''}
        <a href="${escapeHtml(item.mapsUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary place-maps-btn">${escapeHtml(buttonLabel)}</a>
        <small class="place-hint">תמונות אמיתיות של המקום זמינות בגוגל מפות</small>
      `;
      cardsEl.appendChild(card);
    });

    groupEl.appendChild(cardsEl);
    containerEl.appendChild(groupEl);
  });
}

// ---------- Recommended wineries (static reference page) ----------
const WINERIES_BY_LOCATION = [
  {
    location: 'רייקה צרנוייביצה (לינה 12–14.9)',
    wineries: [
      { name: 'Vinarija Janković', note: 'בכפר עצמו, כ-5 דק\' נסיעה', placeId: 'ChIJw52UHYLETRMRymPOnT0ymjA' },
      { name: 'Vinarija Mašanović (וירפזאר)', note: 'כ-20 דק\' נסיעה', placeId: 'ChIJs8Hup0_ZTRMRBwH5EwO1z0c' },
      { name: 'Garnet Winery (גודינייה)', note: 'כ-25 דק\' נסיעה', placeId: 'ChIJEVidvtzeTRMROPmOmh5OV-k' }
    ]
  },
  {
    location: 'בראט (לינה 18.9)',
    wineries: [
      { name: 'Çobo Winery', note: 'כ-25-30 דק\' נסיעה', placeId: 'ChIJo2pQjs2gWhMR-LwzH5Jkk3s' }
    ]
  },
  {
    location: 'טירנה (לינה 24.9)',
    wineries: [
      { name: 'Kantina Binjakët', note: 'בעיר עצמה, כ-5-10 דק\'', placeId: 'ChIJBdQT49YxUBMROspiM50lipw' },
      { name: 'Vila Shehi Winery (וורה)', note: 'כ-20-25 דק\' נסיעה', placeId: 'ChIJAeIrf4EvUBMR8udtW9RvUo8' }
    ]
  },
  {
    location: 'בדרך מטירנה לבודווה (25.9) — ליד פודגוריצה',
    wineries: [
      { name: 'Wine Cellar Šipčanik', note: 'סטייה קצרה מהכביש הראשי', placeId: 'ChIJ0xcKRDrsTRMRAVez858sYg4' }
    ]
  },
  {
    location: 'קוטור (לינה 27–30.9)',
    wineries: [
      { name: 'Storia di Pietra', note: 'כ-45-60 דק\' (כולל מעבורת קמנארי-לפטנה)', placeId: 'ChIJjV_LK_AzTBMRStdpMdGAVtY' },
      { name: 'Kraken Kotor (מרתף תת-ימי)', note: 'כ-15-20 דק\' נסיעה + מעבר בסירה', placeId: 'ChIJ-amgyoI1TBMRRYL_1BbyIwE' }
    ]
  }
];

function renderWineries() {
  const groups = WINERIES_BY_LOCATION.map(g => ({
    location: g.location,
    items: g.wineries.map(w => ({ name: w.name, note: w.note, mapsUrl: buildVerifiedMapsUrl(w.name, w.placeId) }))
  }));
  renderPlaceGroups(wineriesListEl, groups, 'פתח בגוגל מפות 🗺️');
}

// ---------- Recommended hotels (static reference page) ----------
function buildHotelMapsSearchUrl(hotelName, searchLocation) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelName + ' ' + searchLocation)}`;
}

// searchLocation מגדיר מחרוזת ניקוי לחיפוש בגוגל מפות (בלי תוספות עברית), נפרד מ-location שמוצג למשתמש.
const HOTELS_BY_LOCATION = [
  {
    location: 'Rijeka Crnojevića',
    searchLocation: 'Rijeka Crnojevića, Montenegro',
    hotels: ['Casarogna Luxury Rooms', 'Rooms Dujeva Drago-Resort', 'Village house - Novak Rijecani']
  },
  {
    location: 'ת\'ת\' (Theth)',
    searchLocation: 'Theth, Albania',
    hotels: ['Molla Guest House', 'Guesthouse Gjin Thana', 'Thethi Paradise Hotel & Restaurant', 'Vidis Chalet Boutique Hotel']
  },
  {
    location: 'שקודר (Shkodër)',
    searchLocation: 'Shkodër, Albania',
    hotels: ['TRIBUTE Hotel', 'The Red Bricks Hotel', 'The Roots Boutique Hotel']
  },
  {
    location: 'בראט (Berat)',
    searchLocation: 'Berat, Albania',
    hotels: ['Vista Boutique Hotel']
  }
];

function renderHotels() {
  const groups = HOTELS_BY_LOCATION.map(g => ({
    location: g.location,
    items: g.hotels.map(name => ({ name, mapsUrl: buildHotelMapsSearchUrl(name, g.searchLocation) }))
  }));
  renderPlaceGroups(hotelsListEl, groups, 'חיפוש בגוגל מפות 🗺️');
}

// ---------- Packing checklist (🎒 רשימת ציוד) ----------
// Category choice and starting items are informed by two things:
// 1) The actual day data in defaultData() above: the two Theth days and the Durmitor/
//    Žabljak day (draft) are mountain/hiking days (marked trails, cooler evenings); Sarandë
//    + Ksamil, Himarë, and Budva + Sveti Stefan are beach/coastal days; Tirana, Shkodër,
//    Berat and Kotor's old town are city days; most of the remaining days are driving/
//    transit between them.
// 2) General historical climate norms for the Albanian/Montenegrin coast and mountains in
//    mid-September–early October: mild/warm coastal days, cooler mountain evenings, and
//    occasional rain — not a real-time forecast (see the disclaimer shown in the UI).
// The list itself lives in state.data.packingList (same localStorage object/backup JSON as
// everything else) and every item is freely editable/deletable/addable by the user.
function defaultPackingCategories() {
  const cat = (name, items) => ({
    id: uid('cat'),
    name,
    items: items.map(text => ({ id: uid('item'), text, packed: false }))
  });

  return [
    cat('מסמכים', [
      'דרכון + עותק דיגיטלי/צילום',
      'כרטיסי טיסה והזמנות',
      'ביטוח נסיעות',
      'רישיון נהיגה בינלאומי + פרטי השכרת הרכב',
      'אישורי הזמנת לינה',
      'כרטיס אשראי בינלאומי + מזומן ביורו'
    ]),
    cat('ביגוד יום/ביגוד קר', [
      'חולצות קצרות',
      'שורטים / מכנסיים קלים',
      'מכנסיים ארוכים',
      'שכבת פליז או סווטשירט לערבים',
      'מעיל רוח/גשם קל',
      'כובע ומשקפי שמש',
      'גרביים ותחתונים לכל הימים',
      'פיג\'מה חמה יותר (לילות בהרים)'
    ]),
    cat('טיולים/הרים', [
      'נעלי הליכה סגורות',
      'תיק גב יומי',
      'בקבוק מים רב-פעמי',
      'ז\'קט חם ועמיד במים (לת\'ת\' ולז\'בליאק)',
      'כובע חם קל לערב',
      'פנס ראש',
      'פלסטרים לשלפוחיות'
    ]),
    cat('חוף', [
      'שני בגדי ים',
      'מגבת חוף מהירת ייבוש',
      'קרם הגנה עמיד במים (Reef-safe)',
      'משקפי שחייה',
      'כפכפים/סנדלים',
      'שקית יבשה קטנה לטלפון/ארנק'
    ]),
    cat('טיפוח', [
      'מברשת ומשחת שיניים',
      'דאודורנט',
      'שמפו/סבון בגודל נסיעה',
      'קרם לחות',
      'קרם הגנה יומיומי',
      'תרסיס יתושים'
    ]),
    cat('טכני', [
      'מטענים לטלפון ולמצלמה',
      'סוללת גיבוי (Power bank)',
      'מתאם שקע לאלבניה/מונטנגרו',
      'כבל מטען לרכב',
      'אוזניות'
    ]),
    cat('תרופות/עזרה ראשונה', [
      'תרופות אישיות קבועות',
      'משכך כאבים',
      'תרופה נגד בחילת נסיעה',
      'פלסטרים וחיטוי לפצעים',
      'תרופה נגד שלשולים',
      'אנטיהיסטמין'
    ]),
    cat('אחר', [
      'שקיות לכביסה מלוכלכת',
      'כרית נסיעה',
      'עותק מודפס/שמור של המסלול'
    ])
  ];
}

// מבטיח שלנתונים קיימים (localStorage ישן / גיבוי מיובא) יש packingList — כדי שהעמוד
// יעבוד גם עם נתונים שנשמרו לפני שהתכונה הזו נוספה.
function ensurePackingList() {
  if (!Array.isArray(state.data.packingList)) {
    state.data.packingList = defaultPackingCategories();
    saveData(state.data);
  }
  return state.data.packingList;
}

function renderPackingList() {
  const categories = ensurePackingList();
  packingListEl.innerHTML = '';

  let totalItems = 0;
  let packedItems = 0;

  categories.forEach(category => {
    totalItems += category.items.length;
    packedItems += category.items.filter(i => i.packed).length;

    const card = document.createElement('div');
    card.className = 'packing-category';

    const header = document.createElement('div');
    header.className = 'packing-category-header';
    header.innerHTML = `
      <h3 class="packing-category-title">${escapeHtml(category.name)}</h3>
      <span class="packing-category-count">${category.items.filter(i => i.packed).length}/${category.items.length}</span>
    `;
    card.appendChild(header);

    if (category.items.length > 0) {
      const list = document.createElement('ul');
      list.className = 'packing-items';
      category.items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'packing-item' + (item.packed ? ' packed' : '');
        li.innerHTML = `
          <input type="checkbox" ${item.packed ? 'checked' : ''}>
          <span class="packing-item-text">${escapeHtml(item.text)}</span>
          <button type="button" class="icon-btn" title="מחיקה">🗑️</button>
        `;
        li.querySelector('input').addEventListener('change', e => {
          item.packed = e.target.checked;
          saveData(state.data);
          renderPackingList();
        });
        li.querySelector('button').addEventListener('click', () => {
          category.items = category.items.filter(i => i.id !== item.id);
          saveData(state.data);
          renderPackingList();
        });
        list.appendChild(li);
      });
      card.appendChild(list);
    }

    const addForm = document.createElement('form');
    addForm.className = 'packing-add-row';
    addForm.innerHTML = `
      <input type="text" class="packing-add-input" placeholder="הוספת פריט...">
      <button type="submit" class="btn btn-ghost">+</button>
    `;
    addForm.addEventListener('submit', e => {
      e.preventDefault();
      const input = addForm.querySelector('input');
      const text = input.value.trim();
      if (!text) return;
      category.items.push({ id: uid('item'), text, packed: false });
      saveData(state.data);
      renderPackingList();
    });
    card.appendChild(addForm);

    packingListEl.appendChild(card);
  });

  packingProgressEl.textContent = totalItems > 0
    ? `נארזו ${packedItems} מתוך ${totalItems} פריטים`
    : 'אין עדיין פריטים ברשימה.';
}

// ---------- Weather forecast (🌤️ עדכון מזג אוויר, Open-Meteo, no API key) ----------
// Weather is fetched per *location group*, not per day (see getWeatherGroups below) — each
// group picks one representative day, and that day's "anchor" station (getDayAnchorStop,
// already used by the overview map — the first stop by time that has coordinates) is what
// actually gets queried. Open-Meteo's free forecast endpoint only returns real data up to
// ~16 days out, so days further away than that just show a "not available yet" message
// instead of an error.
// The cache is stored separately from state.data (its own localStorage key), keyed by day
// id, because it's ephemeral/derived data — not something the user needs backed up/restored
// with the rest of the trip plan. Page loads only ever read the cache; a fresh fetch happens
// only when the button is clicked.
const WEATHER_CACHE_KEY = 'travelPlannerWeatherCache';
const WEATHER_FORECAST_MAX_DAYS_AHEAD = 16; // Open-Meteo's free daily forecast horizon
const WEATHER_GROUP_MERGE_KM = 8; // מרחק מרבי (ק"מ) בין לינות ימים סמוכים כדי לראות בהם אותו בסיס

function loadWeatherCache() {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function saveWeatherCache(cache) {
  localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
}

let weatherCache = loadWeatherCache();

// day.date is stored as "DD/MM" (e.g. "13/09"); combine with the trip year (read from
// tripSubtitle, e.g. "...2026") to get a real calendar date for the forecast request.
function getTripYear() {
  const match = /(\d{4})/.exec(state.data.tripSubtitle || '');
  return match ? parseInt(match[1], 10) : new Date().getFullYear();
}

function getDayIsoDate(day) {
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec((day.date || '').trim());
  if (!match) return null;
  const dd = match[1].padStart(2, '0');
  const mm = match[2].padStart(2, '0');
  return `${getTripYear()}-${mm}-${dd}`;
}

function daysFromToday(isoDate) {
  const target = new Date(isoDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

// נקודת הלינה של היום — התחנה האחרונה (לפי שעה) עם קואורדינטות. בשונה מ-getDayAnchorStop
// (התחנה הראשונה, המשמשת למפת הימים/המפה הכללית), זו משמשת רק כאן כדי לקבץ ימים סמוכים
// לפי היכן באמת לנים באותו לילה.
function getDayOvernightStop(day) {
  const sorted = [...day.stops].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (typeof sorted[i].lat === 'number' && typeof sorted[i].lng === 'number') return sorted[i];
  }
  return null;
}

// מרחק גיאוגרפי (ק"מ, נוסחת האוורסין) בין שתי נקודות — משמש רק לקיבוץ ימים לבסיסים, לא
// לשליפת התחזית עצמה.
function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// מנקה סיומת נפוצה כמו "— יום 2" / "— יום רגוע" מכותרת היום, לשם בסיס נקי יותר בתצוגה.
// אם התבנית לא מתאימה, הכותרת המקורית מוצגת כמות שהיא.
function cleanGroupLabel(title) {
  const match = /^(.*?)\s*—\s*יום.*$/.exec(title || '');
  return match ? match[1].trim() : title;
}

// מקבץ ימים סמוכים שנקודת הלינה שלהם קרובה (עד WEATHER_GROUP_MERGE_KM) לשורה אחת לכל
// "בסיס" — כדי שמזג האוויר יוצג כרשימה קצרה של התחנות המרכזיות (כמו בעמוד היקבים/המלונות)
// ולא שורה נפרדת לכל אחד מהימים. יום בלי קואורדינטות/תאריך תקין לא מקבל שורה, ובנוסף
// עוצר את הקיבוץ (כדי לא לגשר בטעות בין שני בסיסים שונים משני צדדיו — למשל יום שטרם תוכנן).
// כל קבוצה נשלפת ומטמינה תחת ה-id של היום המייצג האחרון בה (repDay), כמו קודם.
function getWeatherGroups() {
  const groups = [];
  let current = null;

  state.data.days.forEach(day => {
    const location = getDayOvernightStop(day);
    const isoDate = getDayIsoDate(day);
    if (!location || !isoDate) {
      current = null;
      return;
    }
    if (current && haversineKm(current.lastLocation, location) <= WEATHER_GROUP_MERGE_KM) {
      current.days.push(day);
      current.lastLocation = location;
    } else {
      current = { days: [day], lastLocation: location };
      groups.push(current);
    }
  });

  return groups.map(group => {
    const firstDay = group.days[0];
    const lastDay = group.days[group.days.length - 1];
    return {
      repDay: lastDay,
      label: cleanGroupLabel(lastDay.title),
      dateRange: group.days.length > 1 ? `${firstDay.date}–${lastDay.date}` : firstDay.date
    };
  });
}

// Plain, deterministic clothing note based only on the numbers the API returned — no guessing.
function buildClothingNote(tempMin, precipProb) {
  if (typeof precipProb === 'number' && precipProb > 40) return 'כדאי לקחת מעיל גשם';
  if (typeof tempMin === 'number' && tempMin < 12) return 'שכבה חמה לערב';
  return 'מזג אוויר נעים';
}

async function fetchDayWeather(day) {
  const anchor = getDayAnchorStop(day);
  const isoDate = getDayIsoDate(day);
  if (!anchor || !isoDate) return null; // nothing to fetch for this day

  if (daysFromToday(isoDate) > WEATHER_FORECAST_MAX_DAYS_AHEAD) {
    return { status: 'too-far' };
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${anchor.lat}&longitude=${anchor.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${isoDate}&end_date=${isoDate}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('bad status ' + res.status);
    const data = await res.json();
    const daily = data.daily;
    if (!daily || !Array.isArray(daily.temperature_2m_max) || daily.temperature_2m_max.length === 0) {
      return { status: 'no-data' };
    }
    return {
      status: 'ok',
      tempMax: daily.temperature_2m_max[0],
      tempMin: daily.temperature_2m_min[0],
      precipProb: Array.isArray(daily.precipitation_probability_max) ? daily.precipitation_probability_max[0] : undefined
    };
  } catch (err) {
    console.warn(`שליפת תחזית נכשלה עבור "${day.title}"`, err);
    return { status: 'error' };
  }
}

function weatherRowContent(day) {
  const cached = weatherCache[day.id];
  if (!cached || !cached.forecast) {
    return { text: 'לחצו על "עדכון מזג אוויר" לתחזית', className: 'weather-note-muted' };
  }
  const forecast = cached.forecast;
  switch (forecast.status) {
    case 'ok': {
      const note = buildClothingNote(forecast.tempMin, forecast.precipProb);
      const precipText = typeof forecast.precipProb === 'number' ? `${Math.round(forecast.precipProb)}% סיכוי לגשם` : 'אין נתוני גשם';
      return {
        text: `${Math.round(forecast.tempMax)}°/${Math.round(forecast.tempMin)}° · ${precipText} · ${note}`,
        className: 'weather-note'
      };
    }
    case 'too-far':
      return { text: 'עוד לא זמין — נסה שוב קרוב יותר לתאריך', className: 'weather-note-muted' };
    case 'no-data':
      return { text: 'אין נתוני תחזית זמינים ליום זה', className: 'weather-note-muted' };
    case 'error':
    default:
      return { text: 'שליפת התחזית נכשלה (יתכן שאין חיבור לאינטרנט)', className: 'weather-note-error' };
  }
}

function renderWeatherList() {
  const groups = getWeatherGroups();
  weatherListEl.innerHTML = '';

  if (groups.length === 0) {
    weatherListEl.innerHTML = '<div class="map-fallback">אין ימים עם קואורדינטות לתחזית מזג אוויר.</div>';
    return;
  }

  groups.forEach(group => {
    const { text, className } = weatherRowContent(group.repDay);
    const row = document.createElement('div');
    row.className = 'weather-day';
    row.innerHTML = `
      <div class="weather-day-title">${escapeHtml(group.label)} <span class="weather-day-date">(${escapeHtml(group.dateRange)})</span></div>
      <div class="${className}">${escapeHtml(text)}</div>
    `;
    weatherListEl.appendChild(row);
  });
}

function computeLastWeatherUpdateText() {
  // רק תחזיות שבאמת התקבלו (status 'ok') נחשבות ל"עדכון" - אחרת, אם כל הימים עדיין רחוקים
  // מדי (too-far) או שהשליפה נכשלה, יוצג כאן "עודכן לאחרונה" מטעה על עדכון שבפועל לא הביא
  // שום נתון אמיתי.
  const timestamps = Object.values(weatherCache)
    .filter(e => e && e.forecast && e.forecast.status === 'ok')
    .map(e => e.fetchedAt);
  if (timestamps.length === 0) return '';
  return `עודכן לאחרונה: ${new Date(Math.max(...timestamps)).toLocaleString('he-IL')}`;
}

async function refreshAllWeather() {
  const groups = getWeatherGroups();
  if (groups.length === 0) return;

  weatherBtn.disabled = true;
  weatherStatusEl.textContent = 'טוען תחזית...';

  const results = await Promise.all(groups.map(async group => ({ day: group.repDay, forecast: await fetchDayWeather(group.repDay) })));

  let successCount = 0;
  results.forEach(({ day, forecast }) => {
    if (!forecast) return;
    weatherCache[day.id] = { forecast, fetchedAt: Date.now() };
    if (forecast.status === 'ok') successCount++;
  });
  saveWeatherCache(weatherCache);

  weatherBtn.disabled = false;
  weatherStatusEl.textContent = successCount > 0
    ? computeLastWeatherUpdateText()
    : 'לא הצלחנו לעדכן תחזית כרגע (יתכן שאין חיבור לאינטרנט, או שכל הימים עדיין רחוקים מדי).';
  renderWeatherList();
}

weatherBtn.addEventListener('click', refreshAllWeather);

// ============================================================
// ⚠️ DEV/TEST ONLY — temporary aid to verify the weather pipeline (fetch → parse → clothing
// tip → display) end-to-end *before* real trip dates are within Open-Meteo's 16-day window.
// Runs the exact same fetchDayWeather()/weatherRowContent() already built above, just against
// today's real date and a hardcoded existing location (Kotor) instead of a trip day. The
// result is written into weatherCache only long enough to reuse weatherRowContent's
// formatting, then deleted immediately (synchronously, before any other code can run) so it
// never lingers to get swept into a later saveWeatherCache() call — nothing test-related
// touches localStorage/backups.
// Remove this whole block (+ #weatherTestBtn/#weatherTestResult in index.html + the
// .weather-test-* CSS rules in style.css) once no longer needed.
//
// Hidden from regular visitors by default — only shown when the page URL has a `?dev` flag
// (e.g. https://trip-daily-planner.netlify.app/?dev), so it doesn't look like broken/unfinished
// UI to a first-time visitor. Open with ?dev whenever we want to use it ourselves.
// ============================================================
const WEATHER_TEST_LOCATION = { lat: 42.4247, lng: 18.7712 }; // קואורדינטות קוטור (כמו בצ'ק אין בקוטור ב-defaultData)

const weatherTestBtn = document.getElementById('weatherTestBtn');
const weatherTestResultEl = document.getElementById('weatherTestResult');

if (new URLSearchParams(window.location.search).has('dev')) {
  weatherTestBtn.classList.remove('hidden'); // מוסתר כברירת מחדל ב-index.html; נחשף רק עם ?dev
}

function formatTodayAsDdMm() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
}

weatherTestBtn.addEventListener('click', async () => {
  weatherTestBtn.disabled = true;
  weatherTestResultEl.className = 'weather-status weather-test-result';
  weatherTestResultEl.classList.remove('hidden');
  weatherTestResultEl.textContent = 'בודק...';

  // "יום" מזויף שקיים רק כאן — תאריך אמיתי של היום + נקודת קוטור — כדי להריץ בדיוק את אותה
  // שרשרת הקוד שלמעלה, הפעם על תאריך שבאמת נמצא בטווח 16 הימים של Open-Meteo.
  const testDay = {
    id: 'weather-test-today',
    date: formatTodayAsDdMm(),
    stops: [{ time: '12:00', lat: WEATHER_TEST_LOCATION.lat, lng: WEATHER_TEST_LOCATION.lng }]
  };

  const forecast = await fetchDayWeather(testDay);
  weatherTestBtn.disabled = false;

  if (!forecast) {
    weatherTestResultEl.textContent = '⚠️ שגיאה: לא נוצר יום בדיקה תקין.';
    return;
  }

  weatherCache[testDay.id] = { forecast, fetchedAt: Date.now() };
  const { text, className } = weatherRowContent(testDay);
  delete weatherCache[testDay.id]; // ניקוי מיידי — לא משאירים עקבות ב-cache המשותף

  weatherTestResultEl.textContent = `✅ תוצאת בדיקה (קוטור, היום): ${text}`;
  weatherTestResultEl.classList.add(className);
});

// ---------- Special full-width sections (overview map / wineries / hotels) ----------
// כל הכפתורים האלה חולקים מצב "תצוגה מיוחדת" אחת: פתיחת אחת סוגרת את האחרות אוטומטית.
function hideAllSpecialSections() {
  overviewMapSection.classList.add('hidden');
  wineriesSection.classList.add('hidden');
  hotelsSection.classList.add('hidden');
  packingSection.classList.add('hidden');
}

function openSpecialSection(section) {
  tabsRowEl.classList.add('hidden');
  dayContentEl.classList.add('hidden');
  hideAllSpecialSections();
  section.classList.remove('hidden');
}

function closeSpecialSections() {
  hideAllSpecialSections();
  tabsRowEl.classList.remove('hidden');
  dayContentEl.classList.remove('hidden');
}

overviewMapBtn.addEventListener('click', () => {
  openSpecialSection(overviewMapSection);
  renderOverviewMap();
});
closeOverviewBtn.addEventListener('click', closeSpecialSections);

wineriesBtn.addEventListener('click', () => openSpecialSection(wineriesSection));
closeWineriesBtn.addEventListener('click', closeSpecialSections);

hotelsBtn.addEventListener('click', () => openSpecialSection(hotelsSection));
closeHotelsBtn.addEventListener('click', closeSpecialSections);

packingBtn.addEventListener('click', () => openSpecialSection(packingSection));
closePackingBtn.addEventListener('click', closeSpecialSections);

// ---------- Backup: export / import / reset ----------
exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'travel-planner-backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

importInput.addEventListener('change', () => {
  const file = importInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !Array.isArray(parsed.days)) throw new Error('invalid shape');
      if (!confirm('הפעולה תחליף את כל הנתונים הנוכחיים בקובץ שנטען. להמשיך?')) return;
      state.data = parsed;
      saveData(state.data);
      state.activeDayId = state.data.days[0] ? state.data.days[0].id : null;
      render();
      renderPackingList();
      renderWeatherList();
    } catch (e) {
      alert('קובץ לא תקין. ודאו שזהו קובץ גיבוי שיוצא מהאפליקציה הזו.');
    } finally {
      importInput.value = '';
    }
  };
  reader.readAsText(file);
});

resetBtn.addEventListener('click', () => {
  if (!confirm('הפעולה תמחק את כל הנתונים הנוכחיים ותחזיר את המסלול לדוגמה המקורית. להמשיך?')) return;
  state.data = defaultData();
  saveData(state.data);
  state.activeDayId = state.data.days[0] ? state.data.days[0].id : null;
  render();
  renderPackingList();
  renderWeatherList();
});

// ---------- Init ----------
render();
renderWineries();
renderHotels();
renderPackingList();
renderWeatherList();
weatherStatusEl.textContent = computeLastWeatherUpdateText();
