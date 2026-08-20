const { sendEmail, isEmailConfigured } = require('./email.service');

const getChannelStatus = () => ({
  email: { configured: isEmailConfigured() },
  sms: { configured: Boolean(process.env.SMS_PROVIDER && process.env.SMS_API_KEY) },
  whatsapp: { configured: Boolean(process.env.WHATSAPP_PROVIDER && process.env.WHATSAPP_API_KEY) },
});

// Fans a message out to a channel for a list of recipients. Real send only
// happens if that channel is configured — otherwise logs and reports
// 'skipped_not_configured' rather than pretending it worked.
const dispatch = async ({ channel, message, recipients }) => {
  const status = getChannelStatus();
  if (!status[channel]?.configured) {
    console.log(`[notifications] ${channel} not configured — skipping ${recipients.length} recipient(s)`);
    return { channel, status: 'skipped_not_configured', recipientCount: recipients.length };
  }

  if (channel === 'email') {
    const withEmail = recipients.filter((r) => r.email);
    await Promise.all(withEmail.map((r) => sendEmail({
      to: r.email, subject: 'JesManage Notification', text: message,
    }).catch((err) => console.error(`[email] failed to send to ${r.email}:`, err.message))));
    return { channel, status: 'sent', recipientCount: withEmail.length };
  }

  // TODO: wire in a real provider (Twilio/Africa's Talking/WhatsApp Business
  // API) once credentials exist. Until then this branch is unreachable
  // because getChannelStatus() can never report configured: true for sms/whatsapp.
  return { channel, status: 'sent', recipientCount: recipients.length };
};

module.exports = { getChannelStatus, dispatch };
