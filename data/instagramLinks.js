// data/instagramLinks.js
// קישורי אינסטגרם שנאספו מקבוצת הוואטסאפ של הטיול, מקובצים לפי אזור → תת-קטגוריה.
// לא ניתן לעריכה מה-UI — עדכון ידני בקובץ בלבד.
// כל item: { url, caption, type: 'post'|'reel'|'profile'|'story', note? }
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
        name: 'אלבניה – כללי',
        items: [
          { url: 'https://www.instagram.com/reel/DEmdsJjooog/', caption: '5 מקומות מומלצים באלבניה', type: 'reel' },
          { url: 'https://www.instagram.com/reel/DaiLOVeTZhT/', caption: 'השוואה בין ערים באלבניה (Dhërmi, Himarë, Sarandë)', type: 'reel' },
          { url: 'https://www.instagram.com/aviran.travels', caption: 'Aviran Travels – חשבון טיולים כללי', type: 'profile' }
        ]
      },
      {
        name: 'דרום אלבניה / ריביירה האלבנית',
        items: [
          { url: 'https://www.instagram.com/reel/DaFceKLu1lw/', caption: 'טיפים לדרום אלבניה (קסאמיל–סרנדה)', type: 'reel' },
          { url: 'https://www.instagram.com/reel/DY9Y9hPgwA5/', caption: 'החופים היפים בריביירה (כולל Pigeons Cave)', type: 'reel' },
          { url: 'https://www.instagram.com/p/DZ7pWWZR_uj/', caption: 'Dhërmi / Himarë / Jalë / Ksamil / Sarandë', type: 'post' },
          { url: 'https://www.instagram.com/p/DbyB73ZDEbc/', caption: 'מדריך לריביירה האלבנית, מקסאמיל עד Dhërmi', type: 'post' }
        ]
      },
      {
        name: 'סרנדה (Sarandë)',
        items: [
          { url: 'https://www.instagram.com/reel/C4wC-PBC9Jh/', caption: 'מלונות בסרנדה', type: 'reel' }
        ]
      },
      {
        name: 'הימארה (Himarë)',
        items: [
          { url: 'https://www.instagram.com/p/DJ_oNhjtw-S/', caption: 'מלונות מומלצים בהימארה', type: 'post' }
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
          { url: 'https://www.instagram.com/reel/DbDPd8ko03z/', caption: 'מפרץ קוטור / פרסט / Boka Kotorska', type: 'reel' }
        ]
      },
      {
        name: 'קוטור (Kotor)',
        items: [
          { url: 'https://www.instagram.com/reel/DbSw3d9gL6o/', caption: 'Pomodorino – מסעדה בעיר העתיקה של קוטור', type: 'reel' }
        ]
      },
      {
        name: 'יקב (מיקום לא מאומת)',
        items: [
          { url: 'https://www.instagram.com/reel/C7hAylYoHqh/', caption: 'יקב במונטנגרו', type: 'reel', note: 'המיקום המדויק לא אומת' }
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
          { url: 'https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MTAyOTk0ODk1MTMzODc2?story_media_id=3929649592605929314_39173358', caption: 'Story/Highlight, לא ניתן לזהות תוכן גיאוגרפי', type: 'story' }
        ]
      }
    ]
  }
];
