const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AppError = require('../utils/AppError');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Shared by every image-upload route (school logo, student photo,
// headteacher signature) — same disk-storage/size-limit/mime-filter shape,
// just a different directory and multipart field name. `filename` falls
// back to req.user.schoolId when the route has no :id param (a tenant
// admin uploading their own school's asset rather than Super Admin
// targeting one by id).
const createImageUploader = (dir, fieldName) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.params.id || req.user?.schoolId}-${Date.now()}${ext}`);
    },
  });

  const uploadRaw = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
      }
      return cb(null, true);
    },
  }).single(fieldName);

  // multer surfaces file-size/type errors as plain Errors via its callback,
  // which the app's errorHandler would otherwise fall through to a generic
  // 500 for — translate to the AppError contract every other route uses.
  return (req, res, next) => {
    uploadRaw(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError(`${fieldName[0].toUpperCase()}${fieldName.slice(1)} file must be under 2MB`, 400));
      return next(new AppError(err.message || `Failed to upload ${fieldName}`, 400));
    });
  };
};

const LOGOS_DIR = path.join(__dirname, '../../uploads/logos');
const PHOTOS_DIR = path.join(__dirname, '../../uploads/student-photos');
const SIGNATURES_DIR = path.join(__dirname, '../../uploads/signatures');

const uploadLogo = createImageUploader(LOGOS_DIR, 'logo');
const uploadStudentPhoto = createImageUploader(PHOTOS_DIR, 'photo');
const uploadSignature = createImageUploader(SIGNATURES_DIR, 'signature');

// Bulk-import CSVs are parsed in memory and discarded, never written to
// disk -- unlike the image uploaders above, this has nothing to serve back
// later. Browsers send inconsistent mimetypes for CSV depending on OS, so
// the extension is checked as a fallback rather than trusting mimetype alone.
const CSV_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel', 'application/csv'];
const uploadCsvRaw = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isCsvExt = path.extname(file.originalname).toLowerCase() === '.csv';
    if (!CSV_MIME_TYPES.includes(file.mimetype) && !isCsvExt) {
      return cb(new Error('Only CSV files are allowed'));
    }
    return cb(null, true);
  },
}).single('file');

const uploadCsv = (req, res, next) => {
  uploadCsvRaw(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError('CSV file must be under 5MB', 400));
    return next(new AppError(err.message || 'Failed to upload CSV file', 400));
  });
};

module.exports = {
  uploadLogo, LOGOS_DIR, uploadStudentPhoto, PHOTOS_DIR, uploadSignature, SIGNATURES_DIR, uploadCsv,
};
