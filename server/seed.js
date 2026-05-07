require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Persona = require('./models/Persona');
const PersonaVersion = require('./models/PersonaVersion');
const Match = require('./models/Match');
const Swipe = require('./models/Swipe');
const { computeMatch } = require('./utils/matching');

// ===== Named demo users (keep stable for login demos) =====
const NAMED_USERS = [
  { name: 'Maya L.', email: 'maya@parallel.app', city: 'Boston', state: 'MA', personas: [
    { name: 'Wanderer Self', traits: ['Adventurous','Curious','Social'], interests: ['Travel','Photography','Art'], connectionGoal: 'travel', moodTag: 'Curious' },
    { name: 'Studio Self', traits: ['Imaginative','Patient','Focused'], interests: ['Art','Design'], connectionGoal: 'collaborator', moodTag: 'Focused' },
  ]},
  { name: 'Dev S.', email: 'dev@parallel.app', city: 'Cambridge', state: 'MA', personas: [
    { name: 'Founder Mode', traits: ['Analytical','Driven','Organized','Ambitious'], interests: ['Chess','Finance','Systems'], connectionGoal: 'co-founder', moodTag: 'Ambitious' },
    { name: 'Athlete Self', traits: ['Driven','Focused'], interests: ['Running','Fitness'], connectionGoal: 'friend', moodTag: 'Focused' },
  ]},
  { name: 'Kenji T.', email: 'kenji@parallel.app', city: 'Seattle', state: 'WA', personas: [
    { name: 'Night Philosopher', traits: ['Introspective','Quiet','Reader','Stoic'], interests: ['Philosophy','Ambient music','Walks'], connectionGoal: 'deep-conversation', moodTag: 'Contemplative' },
    { name: 'Writer Self', traits: ['Deep','Patient','Imaginative'], interests: ['Poetry','Literature'], connectionGoal: 'creative-partner', moodTag: 'Contemplative' },
  ]},
  { name: 'Priya R.', email: 'priya@parallel.app', city: 'Austin', state: 'TX', personas: [
    { name: 'Designer Self', traits: ['Imaginative','Organized','Focused'], interests: ['Design','Art','Film'], connectionGoal: 'collaborator', moodTag: 'Focused' },
    { name: 'Dreamer Self', traits: ['Imaginative','Open-minded','Sensitive'], interests: ['Poetry','Travel'], connectionGoal: 'romantic', moodTag: 'Dreaming' },
    { name: 'Mentor Self', traits: ['Patient','Empathetic','Deep'], interests: ['Teaching','Design'], connectionGoal: 'mentor', moodTag: 'Grounded' },
  ]},
];

// ===== Pools for procedural generation =====
const FIRST_NAMES = [
  'Ava','Liam','Noah','Emma','Olivia','Aiden','Sophia','Jackson','Mia','Lucas',
  'Isabella','Ethan','Amelia','Mason','Harper','Logan','Evelyn','James','Abigail','Henry',
  'Elena','Caleb','Zara','Owen','Maya','Theo','Iris','Felix','Nora','Jonas',
  'Layla','Rohan','Anika','Diego','Sana','Kai','Esme','Marcus','Yuki','Elias',
  'Naomi','Soren','Talia','Mateo','Freya','Arjun','Camila','Wesley','Hana','Bodhi',
];
const LAST_INITIALS = ['A.','B.','C.','D.','E.','F.','G.','H.','J.','K.','L.','M.','N.','P.','R.','S.','T.','V.','W.','Z.'];

const CITIES = [
  ['Boston','MA'], ['Cambridge','MA'], ['Worcester','MA'],
  ['New York','NY'], ['Brooklyn','NY'], ['Buffalo','NY'],
  ['Seattle','WA'], ['Tacoma','WA'],
  ['Austin','TX'], ['Houston','TX'], ['Dallas','TX'],
  ['San Francisco','CA'], ['Los Angeles','CA'], ['San Diego','CA'], ['Berkeley','CA'],
  ['Chicago','IL'], ['Evanston','IL'],
  ['Portland','OR'],
  ['Denver','CO'], ['Boulder','CO'],
  ['Miami','FL'], ['Orlando','FL'],
  ['Atlanta','GA'],
  ['Nashville','TN'],
  ['Minneapolis','MN'],
  ['Philadelphia','PA'], ['Pittsburgh','PA'],
  ['Phoenix','AZ'],
  ['Salt Lake City','UT'],
  ['Washington','DC'],
];

const TRAIT_POOL = [
  'Adventurous','Curious','Social','Imaginative','Patient','Focused',
  'Analytical','Driven','Organized','Ambitious','Introspective','Quiet',
  'Reader','Stoic','Deep','Open-minded','Sensitive','Empathetic',
  'Optimistic','Witty','Playful','Methodical','Spontaneous','Resilient',
  'Loyal','Practical','Idealistic','Direct','Warm','Independent',
];

const INTEREST_POOL = [
  'Travel','Photography','Art','Design','Film','Music','Poetry','Literature',
  'Chess','Finance','Systems','Running','Fitness','Yoga','Hiking','Climbing',
  'Cooking','Baking','Coffee','Wine','Philosophy','Ambient music','Walks',
  'Gardening','Cycling','Surfing','Skateboarding','Theater','Dance','Gaming',
  'Tabletop games','Volunteering','Languages','Astronomy','Birdwatching','Pottery',
];

const GOALS = [
  'romantic','collaborator','friend','mentor','travel','co-founder',
  'deep-conversation','creative-partner','casual',
];

const MOODS = [
  'Curious','Focused','Ambitious','Contemplative','Dreaming','Grounded',
  'Playful','Bold','Restless','Tender','Quiet','Open',
];

const PERSONA_ADJ = [
  'Wanderer','Studio','Founder','Athlete','Night','Writer','Designer','Dreamer',
  'Mentor','Quiet','Bold','Curious','Focused','Wild','Steady','Soft','Builder',
  'Explorer','Reader','Maker','Thinker','Coach','Listener','Romantic',
];
const PERSONA_NOUN = ['Self','Mode','Side','Spirit','Hour','Era'];

// ===== Helpers =====
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, min, max) {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function makeProceduralUser(usedEmails) {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_INITIALS);
  const fullName = `${first} ${last}`;
  let email;
  let attempt = 0;
  do {
    const suffix = attempt === 0 ? '' : String(attempt + 1);
    email = `${first.toLowerCase()}${last.charAt(0).toLowerCase()}${suffix}@parallel.app`;
    attempt++;
  } while (usedEmails.has(email));
  usedEmails.add(email);

  const [city, state] = pick(CITIES);
  const personaCount = 1 + Math.floor(Math.random() * 3); // 1..3
  const personas = [];
  const usedPersonaNames = new Set();
  for (let i = 0; i < personaCount; i++) {
    let pname;
    do {
      pname = `${pick(PERSONA_ADJ)} ${pick(PERSONA_NOUN)}`;
    } while (usedPersonaNames.has(pname));
    usedPersonaNames.add(pname);
    personas.push({
      name: pname,
      traits: pickN(TRAIT_POOL, 3, 5),
      interests: pickN(INTEREST_POOL, 3, 5),
      connectionGoal: pick(GOALS),
      moodTag: pick(MOODS),
    });
  }
  return { name: fullName, email, city, state, personas };
}

async function run() {
  await connectDB();
  console.log('Clearing collections...');
  await Promise.all([
    User.deleteMany({}),
    Persona.deleteMany({}),
    PersonaVersion.deleteMany({}),
    Match.deleteMany({}),
    Swipe.deleteMany({}),
  ]);

  // Build the full list of 100 users (4 named + 96 procedural)
  const TARGET = 100;
  const usedEmails = new Set(NAMED_USERS.map(u => u.email));
  const allUsers = [...NAMED_USERS];
  while (allUsers.length < TARGET) {
    allUsers.push(makeProceduralUser(usedEmails));
  }

  console.log(`Hashing password (one-time)...`);
  const sharedHash = await bcrypt.hash('demo1234', 10);

  console.log(`Inserting ${allUsers.length} users...`);
  const userDocs = await User.insertMany(allUsers.map(u => ({
    name: u.name,
    email: u.email,
    passwordHash: sharedHash,
    city: u.city || '',
    state: u.state || '',
  })));

  console.log('Inserting personas...');
  const personaDocs = [];
  for (let i = 0; i < userDocs.length; i++) {
    const u = allUsers[i];
    const owner = userDocs[i];
    for (const p of u.personas) {
      personaDocs.push({ ...p, userId: owner._id, currentVersion: 1, bio: '' });
    }
  }
  const personas = await Persona.insertMany(personaDocs);

  console.log(`Inserting ${personas.length} persona versions...`);
  await PersonaVersion.insertMany(personas.map(p => ({
    personaId: p._id,
    versionNumber: 1,
    snapshot: p.toObject(),
  })));

  console.log(`Computing matches across ${personas.length} personas (this is the slow step)...`);
  const matchOps = [];
  for (let i = 0; i < personas.length; i++) {
    for (let j = i + 1; j < personas.length; j++) {
      const a = personas[i], b = personas[j];
      // Skip pairs from the same user (no self-matching)
      if (a.userId.toString() === b.userId.toString()) continue;
      const { score, traitOverlap, interestSimilarity, goalAlignment } = computeMatch(a, b);
      // Drop ultra-low matches to keep DB size sane
      if (score < 12) continue;
      matchOps.push({
        personaAId: a._id, personaBId: b._id,
        score, traitOverlap, interestSimilarity, goalAlignment,
        matchedAt: new Date(),
      });
    }
  }

  console.log(`Bulk inserting ${matchOps.length} matches...`);
  const BATCH = 2000;
  for (let i = 0; i < matchOps.length; i += BATCH) {
    await Match.insertMany(matchOps.slice(i, i + BATCH), { ordered: false });
  }

  // Seed sample AI reports on top matches so the report panel works without a live HF call
  const SAMPLE_REPORTS = [
    'These personas share a strong creative-explorer core — both lean into novelty and lived experience. Friction may appear when one wants structured collaboration and the other drifts toward open-ended curiosity. Expect a warm, generative dynamic with occasional pacing mismatches.',
    'This pairing aligns around disciplined craft and quiet depth. Both value focus over speed and will naturally respect each other\'s working rhythm. Watch for a tendency to avoid difficult conversations — the strength of this match depends on intentional vulnerability.',
    'A high-energy fit. Both personas bring momentum and a willingness to act, which should translate into fast iteration together. The risk: neither slows down enough to reflect, so missed signals could compound. Build in a weekly "what are we missing?" ritual.',
    'A quiet, complementary match — one persona steadies, the other softens. Trust will form gradually but durably. The growth edge is asking each other for what you actually want; both default to accommodation.',
    'These two operate from different tempos but share a values floor — care, curiosity, and follow-through. The dynamic to expect is patient, ranging conversation rather than rapid alignment. Useful for long-arc collaboration, less so for sprints.',
    'Strong signal across traits and goals, with one important asymmetry: their moods sit in different registers, which can read as mismatch in the first conversation but stabilizes once context is shared. Give it a real second meeting before judging fit.',
  ];
  const topMatches = await Match.find({}).sort({ score: -1 }).limit(SAMPLE_REPORTS.length);
  for (let i = 0; i < topMatches.length; i++) {
    topMatches[i].aiReport = SAMPLE_REPORTS[i];
    await topMatches[i].save();
  }

  const finalCount = await Match.countDocuments({});
  console.log(`Done. Users: ${userDocs.length}, personas: ${personas.length}, matches: ${finalCount}`);
  console.log(`Login as any seeded user with password: demo1234`);
  console.log(`Demo accounts: maya@parallel.app, dev@parallel.app, kenji@parallel.app, priya@parallel.app`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
