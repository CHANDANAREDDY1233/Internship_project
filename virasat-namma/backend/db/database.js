// db/database.js
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'virasat.db');

let db;

async function getDb() {
  if (!db) {
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    await db.run('PRAGMA journal_mode = WAL');
    await db.run('PRAGMA foreign_keys = ON');

    await initializeSchema(db);
    await seedData(db);
  }
  return db;
}

async function initializeSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS heritage_sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_kn TEXT NOT NULL,
      description TEXT NOT NULL,
      description_kn TEXT NOT NULL,
      architectural_significance TEXT,
      local_legend TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      district TEXT NOT NULL,
      period TEXT,
      qr_code TEXT UNIQUE,
      hidden_fact TEXT,
      audio_url TEXT,
      image_url TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      latitude REAL,
      longitude REAL,
      FOREIGN KEY (site_id) REFERENCES heritage_sites(id)
    );

    CREATE TABLE IF NOT EXISTS travel_passport (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      site_id TEXT NOT NULL,
      checkin_id TEXT NOT NULL,
      stamp_image TEXT,
      visit_date DATE DEFAULT (DATE('now')),
      FOREIGN KEY (site_id) REFERENCES heritage_sites(id),
      FOREIGN KEY (checkin_id) REFERENCES checkins(id)
    );

    CREATE TABLE IF NOT EXISTS site_reports (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      description TEXT,
      photo_url TEXT,
      status TEXT DEFAULT 'reported',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (site_id) REFERENCES heritage_sites(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      device_id TEXT UNIQUE,
      preferred_lang TEXT DEFAULT 'en',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function seedData(db) {
  const row = await db.get('SELECT COUNT(*) as cnt FROM heritage_sites');
  if (row.cnt > 0) return;

  const sites = [
    {
      id: 'site-001',
      name: 'Lakkundi Temple Complex',
      name_kn: 'ಲಕ್ಕುಂಡಿ ದೇವಾಲಯ ಸಮುಚ್ಚಯ',
      description: 'A 11th-century Chalukyan temple complex in Gadag district, featuring exquisite step-wells and intricate stone carvings rarely seen in mainstream tourism.',
      description_kn: '೧೧ನೇ ಶತಮಾನದ ಚಾಲುಕ್ಯ ದೇವಾಲಯ ಸಮೂಹ, ಅಪ್ರತಿಮ ಕಲ್ಲು ಕೆತ್ತನೆಗಳಿಂದ ಕೂಡಿದೆ.',
      architectural_significance: 'Represents the pinnacle of Kalyani Chalukya architecture with 50+ temples and step-wells (kalyani) featuring intricate latticed windows.',
      local_legend: 'Legend says the main temple was built in a single night by divine craftsmen to win the hand of a princess.',
      latitude: 15.4295,
      longitude: 75.9802,
      district: 'Gadag',
      period: '11th Century CE',
      qr_code: 'VN-SITE-001',
      hidden_fact: 'The temple complex contains secret underground passages used by priests during invasions — only recently mapped by archaeologists.',
      audio_url: null,
      image_url: null
    },
    {
      id: 'site-002',
      name: 'Chandramouleswara Temple',
      name_kn: 'ಚಂದ್ರಮೌಳೇಶ್ವರ ದೇವಾಲಯ',
      description: 'A hidden 9th-century Rashtrakuta shrine tucked behind rice paddies in Mysuru district, with a thousand-year-old Shiva linga still worshipped daily.',
      description_kn: '೯ನೇ ಶತಮಾನದ ರಾಷ್ಟ್ರಕೂಟ ದೇವಾಲಯ, ಮೈಸೂರು ಜಿಲ್ಲೆಯಲ್ಲಿದೆ.',
      architectural_significance: 'Early Deccan style with vesara architecture. Unique star-shaped (stellate) platform base predating most known examples.',
      local_legend: 'The village elders say the temple was submerged in a lake for 300 years before rising naturally from the earth.',
      latitude: 12.3051,
      longitude: 76.6552,
      district: 'Mysuru',
      period: '9th Century CE',
      qr_code: 'VN-SITE-002',
      hidden_fact: 'The sanctum\'s acoustic design creates a resonating "Om" sound when the main bell is rung — a technique modern acousticians cannot fully explain.',
      audio_url: null,
      image_url: null
    },
    {
      id: 'site-003',
      name: 'Hire Benakal Megalithic Burial Ground',
      name_kn: 'ಹಿರೆ ಬೆಣಕಲ್ ಮೆಗಾಲಿಥಿಕ್ ಸ್ಮಶಾನ',
      description: 'Over 400 megalithic burial structures (dolmens) dating back 3,000 years in Koppal district — one of the largest such sites in Asia.',
      description_kn: '೩,೦೦೦ ವರ್ಷಗಳ ಹಿಂದಿನ ೪೦೦+ ಮೆಗಾಲಿಥಿಕ್ ಸಮಾಧಿ ರಚನೆಗಳು ಕೊಪ್ಪಳ ಜಿಲ್ಲೆಯಲ್ಲಿವೆ.',
      architectural_significance: 'Iron Age megalithic culture. The dolmens are aligned with astronomical events — solstice sunrises pass through specific openings.',
      local_legend: 'The Kuruba shepherd community believes these are sleeping giants who will rise to protect the land if it is ever threatened.',
      latitude: 15.4547,
      longitude: 76.2285,
      district: 'Koppal',
      period: '1000 BCE - 500 BCE',
      qr_code: 'VN-SITE-003',
      hidden_fact: 'Carbon dating revealed burial goods inside include beads from ancient Egypt — evidence of trade routes spanning continents 3,000 years ago.',
      audio_url: null,
      image_url: null
    },
    {
      id: 'site-004',
      name: 'Aihole Durga Temple',
      name_kn: 'ಐಹೊಳೆ ದುರ್ಗಾ ದೇವಾಲಯ',
      description: 'A 7th-century apsidal temple in Aihole — considered the "cradle of Indian temple architecture" — with a unique semi-circular apse borrowed from Buddhist chaityas.',
      description_kn: '೭ನೇ ಶತಮಾನದ ಐಹೊಳೆಯ ದುರ್ಗಾ ದೇವಾಲಯ — ಭಾರತೀಯ ದೇವಾಲಯ ವಾಸ್ತುಶಿಲ್ಪದ ತೊಟ್ಟಿಲು.',
      architectural_significance: 'Transitional style between Buddhist and Hindu architecture. The gallery surrounding the sanctum is an innovation that spread across all of South Asia.',
      local_legend: 'A sculptor named Gunda carved the exquisite Durga panel in three days without sleeping, driven by a divine vision.',
      latitude: 15.9613,
      longitude: 75.8803,
      district: 'Bagalkot',
      period: '7th Century CE',
      qr_code: 'VN-SITE-004',
      hidden_fact: 'Aihole has 125 temples spread across the village — most locals use ancient temple stones as boundary walls and foundations for their homes.',
      audio_url: null,
      image_url: null
    },
    {
      id: 'site-005',
      name: 'Shettihalli Rosary Church Ruins',
      name_kn: 'ಶೆಟ್ಟಿಹಳ್ಳಿ ರೋಸರಿ ಚರ್ಚ್ ಅವಶೇಷಗಳು',
      description: 'A haunting 19th-century Gothic church that partially submerges under the Hemavathi reservoir every monsoon season, rising again like a ghost from the waters.',
      description_kn: '೧೯ನೇ ಶತಮಾನದ ಗೋಥಿಕ್ ಚರ್ಚ್, ಪ್ರತಿ ಮಳೆಗಾಲದಲ್ಲಿ ಹೇಮಾವತಿ ಜಲಾಶಯದಲ್ಲಿ ಮುಳುಗುತ್ತದೆ.',
      architectural_significance: 'French Gothic style built by missionaries in 1860. The only partially submerged Gothic church ruin in India.',
      local_legend: 'Former residents say that on quiet nights, you can hear church bells ringing from beneath the water during the monsoon.',
      latitude: 13.2801,
      longitude: 76.1398,
      district: 'Hassan',
      period: '1860 CE',
      qr_code: 'VN-SITE-005',
      hidden_fact: 'The village of Shettihalli was submerged to create the reservoir in 1964. The church is the last visible remnant of an entire drowned civilization.',
      audio_url: null,
      image_url: null
    }
  ];

  for (const site of sites) {
    await db.run(`
      INSERT INTO heritage_sites
      (id, name, name_kn, description, description_kn, architectural_significance, local_legend,
       latitude, longitude, district, period, qr_code, hidden_fact, audio_url, image_url)
      VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      site.id, site.name, site.name_kn, site.description, site.description_kn,
      site.architectural_significance, site.local_legend, site.latitude, site.longitude,
      site.district, site.period, site.qr_code, site.hidden_fact, site.audio_url, site.image_url
    ]);
  }

  console.log('✅ Database seeded with heritage sites.');
}

module.exports = { getDb };
