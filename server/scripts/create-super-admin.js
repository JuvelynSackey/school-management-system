require('dotenv').config();
const bcrypt = require('bcryptjs');
const { mongoose, connect } = require('../src/config/database');
const SuperAdmin = require('../src/superAdmin/superAdmin.model');

async function main() {
  const [email, password, fullName] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: node scripts/create-super-admin.js <email> <password> ["Full Name"]');
    process.exit(1);
  }

  await connect();

  const existing = await SuperAdmin.findOne({ email });
  if (existing) {
    console.log('A super admin with this email already exists.');
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await SuperAdmin.create({ email, passwordHash, fullName: fullName || 'Platform Administrator', status: 'active' });
    console.log(`Super admin created: ${email}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
