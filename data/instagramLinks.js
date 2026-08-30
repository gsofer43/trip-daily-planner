// data/instagramLinks.js
// קישורי אינסטגרם שנאספו מקבוצת הוואטסאפ של הטיול, מקובצים לפי אזור → תת-קטגוריה.
// לא ניתן לעריכה מה-UI — עדכון ידני בקובץ בלבד.
// כל item: { url, caption, type: 'post'|'reel'|'profile'|'story'|'facebook', note? }
// 'post'/'reel' מנסים הטמעה אמיתית; 'profile'/'story'/'facebook' תמיד כרטיס טקסט פשוט
// (הטמעות פייסבוק דורשות SDK ונוטות להישבר — עדיף קישור אמין).
const INSTAGRAM_LINKS_BY_REGION = [
  {
    region: '🇦🇱 אלבניה',
    subcategories: [
      {
        name: 'אגם קומאן / Lumi i Shalës',
        items: [
          { url: 'https://www.instagram.com/reel/C4GJI6esTHy/', caption: 'Lumi i Shalës – הגעה בסירה מאזור אגם קומאן', type: 'reel' },
          { url: 'https://www.instagram.com/reel/Db_hGwcqmJI/', caption: 'Te Konaku – אגם קומאן, מגיעים בסירה', type: 'reel' }
        ]
      },
      {
        name: 'ת׳ת׳ (Theth)',
        items: [
          { url: 'https://www.instagram.com/reel/DbRbB9VIhkO/', caption: 'Guest House Rrashkadoli בת׳ת׳ – לינה זולה עם נוף להרי האלפים האלבניים', type: 'reel' },
          { url: 'https://www.facebook.com/share/p/1Q9xSBNBzt/', caption: 'כל מה שיש לעשות בת׳ת׳ (Theth) – מדריך בעברית', type: 'facebook' }
        ]
      },
      {
        name: 'אלבניה – כללי',
        items: [
          { url: 'https://www.instagram.com/reel/DEmdsJjooog/', caption: '5 מקומות מומלצים באלבניה', type: 'reel' },
          { url: 'https://www.instagram.com/reel/DaiLOVeTZhT/', caption: 'השוואה בין ערים באלבניה (Dhërmi, Himarë, Sarandë)', type: 'reel' },
          { url: 'https://www.instagram.com/reel/DcErKiSMzmB/', caption: 'מלונות ומקומות מומלצים לביקור באלבניה', type: 'reel' },
          { url: 'https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MDUwMjAxNTA0MTEzMTI4?story_media_id=3643309709225695303_239254683', caption: 'היילייטס מאלבניה (@michalolivero)', type: 'story' },
          { url: 'https://www.instagram.com/aviran.travels', caption: 'Aviran Travels – חשבון טיולים כללי', type: 'profile' }
        ]
      },
      {
        name: 'דרום אלבניה / ריביירה האלבנית',
        items: [
          { url: 'https://www.instagram.com/reel/DaFceKLu1lw/', caption: 'טיפים לדרום אלבניה (קסאמיל–סרנדה)', type: 'reel' },
          { url: 'https://www.instagram.com/reel/DY9Y9hPgwA5/', caption: 'החופים היפים בריביירה (כולל Pigeons Cave)', type: 'reel' },
          { url: 'https://www.instagram.com/p/DZ7pWWZR_uj/', caption: 'Dhërmi / Himarë / Jalë / Ksamil / Sarandë', type: 'post' },
          { url: 'https://www.instagram.com/p/DbyB73ZDEbc/', caption: 'מדריך לריביירה האלבנית, מקסאמיל עד Dhërmi', type: 'post' },
          { url: 'https://www.instagram.com/reel/DcEm_lYK2QO/', caption: '5 חופים מומלצים בקסאמיל (Twin Islands, Manastiri Bay, Pema e Thatë, Pulëbardha)', type: 'reel' }
        ]
      },
      {
        name: 'סרנדה (Sarandë)',
        items: [
          { url: 'https://www.instagram.com/reel/C4wC-PBC9Jh/', caption: 'מלונות בסרנדה', type: 'reel' },
          { url: 'https://www.instagram.com/reel/Db1Boyhpyj1/', caption: 'טירת לקורסי (Lekursi) מעל סרנדה – נקודת שקיעה עם נוף לים היוני', type: 'reel' },
          { url: 'https://www.facebook.com/share/p/1GoNHjQoZQ/', caption: 'המלצות על סרנדה – מתוך קבוצת "אלבניה למטייל הישראלי"', type: 'facebook' }
        ]
      },
      {
        name: 'הימארה (Himarë)',
        items: [
          { url: 'https://www.instagram.com/p/DJ_oNhjtw-S/', caption: 'מלונות מומלצים בהימארה', type: 'post' },
          { url: 'https://www.instagram.com/reel/Db6BOvmsVGb/', caption: '7 חופים באזור הימארה', type: 'reel' }
        ]
      },
      {
        name: 'וולורה (Vlorë)',
        items: [
          { url: 'https://www.facebook.com/share/p/1BzrJhtF8z/', caption: 'כל מה שיש לעשות בוולורה (Vlorë) – מדריך בעברית', type: 'facebook' }
        ]
      }
    ]
  },
  {
    region: '🇲🇪 מונטנגרו',
    subcategories: [
      {
        name: 'מסלולים / כמה מקומות',
        items: [
          { url: 'https://www.instagram.com/reel/DaCs0uQMt7m/', caption: 'טיווט → בודווה → סווטי סטפן → קוטור → פרסט', type: 'reel' },
          { url: 'https://www.instagram.com/reel/DZevrYgOTWp/', caption: 'מקומות שאסור לפספס במונטנגרו (קוטור, בודווה)', type: 'reel' },
          { url: 'https://www.instagram.com/reel/DbDPd8ko03z/', caption: 'מפרץ קוטור / פרסט / Boka Kotorska', type: 'reel' },
          { url: 'https://www.instagram.com/reel/DcMT5ozM_I9/', caption: '15 מקומות מומלצים במונטנגרו – עיירות ימי-ביניים, טבע ותצפיות', type: 'reel' }
        ]
      },
      {
        name: 'קוטור (Kotor)',
        items: [
          { url: 'https://www.instagram.com/reel/DbSw3d9gL6o/', caption: 'Pomodorino – מסעדה בעיר העתיקה של קוטור', type: 'reel' }
        ]
      },
      {
        name: 'פודגוריצה (Podgorica)',
        items: [
          { url: 'https://www.instagram.com/reel/C7hAylYoHqh/', caption: 'יקב בפודגוריצה', type: 'reel' }
        ]
      }
    ]
  },
  {
    region: '❓ לא מזוהה',
    subcategories: [
      {
        name: 'תוכן שלא ניתן לשייך לאזור גיאוגרפי',
        items: [
          { url: 'https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MTAyOTk0ODk1MTMzODc2?story_media_id=3929649592605929314_39173358', caption: 'Story/Highlight, לא ניתן לזהות תוכן גיאוגרפי', type: 'story' },
          { url: 'https://www.instagram.com/reel/Dam5wb_Oeuy/', caption: 'רילס מקבוצת הטיול – לא הצלחתי לשלוף את התוכן, ראו באינסטגרם', type: 'reel' }
        ]
      }
    ]
  }
];
