const config = require('../config');
const { sendEmail } = require('./email.service');

// Fire-and-forget — a failed send should never block account creation. The
// temp password is also shown once in the Super-Admin UI as a fallback for
// when the email doesn't land.
const sendWelcomeEmail = async (user, school, tempPassword) => {
  if (!user.email) return;
  try {
    const loginLink = `${config.clientOrigin}/login?school=${encodeURIComponent(school.slug)}`;
    await sendEmail({
      to: user.email,
      subject: `Welcome to JesManage — ${school.name}`,
      text: `Hi ${user.fullName},\n\nYour JesManage account for ${school.name} is ready.\n\nPortal: ${loginLink}\nSchool Code: ${school.slug}\nTemporary Password: ${tempPassword}\n\nYou'll be asked to set a new password the first time you log in.`,
    });
  } catch (err) {
    console.error('Failed to send welcome email:', err.message);
  }
};

module.exports = { sendWelcomeEmail };
