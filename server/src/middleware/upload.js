const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AppError = require('../utils/AppError');

const LOGOS_DIR = path.join(__dirname, '../../uploads/logos');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
    cb(null, LOGOS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Super Admin's route passes the target school via :id; the tenant
    // admin's own /school-settings/logo route has no :id and relies on the
    // authenticated request's own schoolId instead.
    cb(null, `${req.params.id || req.user?.schoolId}-${Date.now()}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const uploadLogoRaw = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
    }
    return cb(null, true);
  },
}).single('logo');

// multer surfaces file-size/type errors as plain Errors via its callback,
// which the app's errorHandler would otherwise fall through to a generic
// 500 for — translate to the AppError contract every other route uses.
const uploadLogo = (req, res, next) => {
  uploadLogoRaw(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError('Logo file must be under 2MB', 400));
    return next(new AppError(err.message || 'Failed to upload logo', 400));
  });
};

const PHOTOS_DIR = path.join(__dirname, '../../uploads/student-photos');

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
    cb(null, PHOTOS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.params.id}-${Date.now()}${ext}`);
  },
});

const uploadStudentPhotoRaw = multer({
  storage: photoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
    }
    return cb(null, true);
  },
}).single('photo');

const uploadStudentPhoto = (req, res, next) => {
  uploadStudentPhotoRaw(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError('Photo file must be under 2MB', 400));
    return next(new AppError(err.message || 'Failed to upload photo', 400));
  });
};

module.exports = {
  uploadLogo, LOGOS_DIR, uploadStudentPhoto, PHOTOS_DIR,
};
