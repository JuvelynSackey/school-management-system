require('dotenv').config();
const bcrypt = require('bcryptjs');
const { mongoose, User, AcademicTerm, House, Subject } = require('../src/models');

const DEFAULT_HOUSES = [
  { name: 'Red House', colorHex: '#DC2626' },
  { name: 'Blue House', colorHex: '#2563EB' },
  { name: 'Green House', colorHex: '#16A34A' },
  { name: 'Yellow House', colorHex: '#CA8A04' },
];

// NaCCA subject lists per stage. Names are deduplicated at seed time since a
// few (e.g. "Numeracy", "Creative Arts") repeat across stages verbatim.
const NACCA_SUBJECTS_BY_STAGE = {
  'Creche & Nursery': ['Language & Literacy', 'Numeracy', 'Creative Arts / Activities', 'Psycho-Motor & Physical Dev.', 'Social & Emotional Dev.'],
  'KG 1 & KG 2': ['Language & Literacy (Ghanaian Language)', 'Numeracy', 'Our World Our People (OWOP)', 'Creative Arts'],
  'Primary (Basic 1-6)': ['English Language', 'Mathematics', 'Science', 'Ghanaian Language & Culture', 'Computing / ICT', 'History', 'Religious & Moral Education (RME)', 'Creative Arts', 'Physical Education & Health', 'French'],
  'JHS (Basic 7-9)': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Computing', 'Ghanaian Language', 'Religious & Moral Education (RME)', 'Career Technology', 'Creative Arts and Design', 'French'],
};

const ADMIN_EMAIL = 'admin@school.local';
const ADMIN_PASSWORD = 'Admin@123';

async function seedAdmin() {
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log('Admin user already exists, skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({
    email: ADMIN_EMAIL,
    passwordHash,
    fullName: 'System Administrator',
    role: 'admin',
    status: 'active',
  });
  console.log(`Admin user created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (change this after first login)`);
}

async function seedTerm() {
  const existing = await AcademicTerm.findOne({ academicYear: '2025/2026', termNumber: 1 });
  if (existing) {
    console.log('Default academic term already exists, skipping.');
    return;
  }

  await AcademicTerm.create({
    name: '2025/2026 Term 1',
    academicYear: '2025/2026',
    termNumber: 1,
    isCurrent: true,
  });
  console.log('Default academic term created: 2025/2026 Term 1 (current).');
}

async function seedHouses() {
  for (const house of DEFAULT_HOUSES) {
    const existing = await House.findOne({ name: house.name });
    if (!existing) {
      await House.create(house);
      console.log(`House created: ${house.name}`);
    }
  }
}

async function seedSubjects() {
  const names = new Set(Object.values(NACCA_SUBJECTS_BY_STAGE).flat());
  for (const name of names) {
    const existing = await Subject.findOne({ name });
    if (!existing) {
      await Subject.create({ name });
      console.log(`Subject created: ${name}`);
    }
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  await seedAdmin();
  await seedTerm();
  await seedHouses();
  await seedSubjects();
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
