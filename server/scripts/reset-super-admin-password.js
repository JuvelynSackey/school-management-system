require('dotenv').config();
const bcrypt = require('bcryptjs');
const { mongoose, connect } = require('../src/config/database');
const SuperAdmin = require('../src/superAdmin/superAdmin.model');

async function main() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error('Usage: node scripts/reset-super-admin-password.js <email> <newPassword>');
    process.exit(1);
  }

  await connect();

  const existing = await SuperAdmin.findOne({ email });
  if (!existing) {
    console.log('No super admin found with this email.');
  } else {
    existing.passwordHash = await bcrypt.hash(newPassword, 10);
    await existing.save();
    console.log(`Password updated for super admin: ${email}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
