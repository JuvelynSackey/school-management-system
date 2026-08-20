const jwt = require('jsonwebtoken');
const config = require('../config');
const { sendEmail } = require('./email.service');

const VERIFY_EXPIRES_IN = '24h';

// Fire-and-forget — a failed send should never block account creation.
const sendVerificationEmail = async (user, school) => {
  if (!user.email) return;
  try {
    const token = jwt.sign(
      { userId: user.id, schoolId: school.id, type: 'email-verify' },
      config.jwt.secret,
      { expiresIn: VERIFY_EXPIRES_IN },
    );
    const link = `${config.clientOrigin}/verify-email?schoolCode=${encodeURIComponent(school.slug)}&token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: user.email,
      subject: `Verify your JesManage account — ${school.name}`,
      text: `Hi ${user.fullName},\n\nPlease confirm this email address is yours by opening the link below (expires in 24 hours):\n\n${link}\n\nIf you didn't expect this, you can ignore it.`,
    });
  } catch (err) {
    console.error('Failed to send verification email:', err.message);
  }
};

module.exports = { sendVerificationEmail };
