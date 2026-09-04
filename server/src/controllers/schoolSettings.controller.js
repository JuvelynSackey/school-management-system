const { SchoolSettings } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { findOrCreate } = require('../utils/findOrCreate');
const auditLog = require('../services/auditLog.service');

// One settings document per school — auto-created with blank defaults on first read.
const get = asyncHandler(async (req, res) => {
  const [settings] = await findOrCreate(SchoolSettings, { where: { schoolId: req.user.schoolId } });
  res.json({ success: true, data: settings });
});

const update = asyncHandler(async (req, res) => {
  const {
    name, motto, address, phone, email, headteacherName, reportCardFeeGateEnabled, performanceChartEnabled, communicationChannelsEnabled,
    feedingFeeEnabled, feedingRatePerDay,
  } = req.body;
  const settings = await SchoolSettings.findOneAndUpdate(
    { schoolId: req.user.schoolId },
    { $set: {
      name: name ?? '',
      motto: motto ?? '',
      address: address ?? '',
      phone: phone ?? '',
      email: email ?? '',
      headteacherName: headteacherName ?? '',
      reportCardFeeGateEnabled: Boolean(reportCardFeeGateEnabled),
      performanceChartEnabled: Boolean(performanceChartEnabled),
      communicationChannelsEnabled: {
        email: Boolean(communicationChannelsEnabled?.email),
        sms: Boolean(communicationChannelsEnabled?.sms),
        whatsapp: Boolean(communicationChannelsEnabled?.whatsapp),
      },
      feedingFeeEnabled: Boolean(feedingFeeEnabled),
      feedingRatePerDay: feedingRatePerDay || 0,
    } },
    { upsert: true, new: true },
  );
  res.json({ success: true, data: settings });
});

// POST /school-settings/logo — multipart, req.file populated by the
// uploadLogo multer middleware before this handler runs. Stored as a data
// URL directly on the document (see upload.js's createInMemoryImageUploader)
// rather than a file path, so it survives a Render redeploy.
const uploadLogo = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('A logo file is required', 400));

  const logoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  const settings = await SchoolSettings.findOneAndUpdate(
    { schoolId: req.user.schoolId },
    { $set: { logoUrl } },
    { upsert: true, new: true },
  );

  await auditLog.record({
    req, action: 'schoolSettings.logoUpload', entityType: 'SchoolSettings', entityId: settings.id, description: 'Uploaded the school logo',
  });

  res.json({ success: true, data: { logoUrl } });
});

// POST /school-settings/signature — multipart, req.file populated by the
// uploadSignature multer middleware before this handler runs. Embedded on
// terminal report cards (see reportCardTemplate.service.js) next to the
// typed headteacher name. Stored as a data URL directly on the document
// (see upload.js's createInMemoryImageUploader) rather than a file path, so
// it survives a Render redeploy.
const uploadSignature = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('A signature image is required', 400));

  const headteacherSignatureUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  const settings = await SchoolSettings.findOneAndUpdate(
    { schoolId: req.user.schoolId },
    { $set: { headteacherSignatureUrl } },
    { upsert: true, new: true },
  );

  await auditLog.record({
    req, action: 'schoolSettings.signatureUpload', entityType: 'SchoolSettings', entityId: settings.id, description: 'Uploaded the headteacher signature',
  });

  res.json({ success: true, data: { headteacherSignatureUrl } });
});

module.exports = {
  get, update, uploadLogo, uploadSignature,
};
