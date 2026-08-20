const nodemailer = require('nodemailer');

// Port 587 (STARTTLS) is blocked on this network at the TCP level — the
// connection opens and is immediately closed with zero protocol exchange.
// Port 465 (implicit TLS) was verified end-to-end with a real send, so that's
// the fixed port here rather than reading SMTP_PORT from the environment.
let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 465,
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
  }
  return transporter;
};

const isEmailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

const sendEmail = async ({ to, subject, text, html }) => {
  if (!isEmailConfigured()) {
    console.log(`[email] not configured — skipping send to ${to}: ${subject}`);
    return { status: 'skipped_not_configured' };
  }
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return { status: 'sent' };
};

module.exports = { sendEmail, isEmailConfigured };
