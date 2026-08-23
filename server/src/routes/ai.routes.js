const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/ai.controller');
const queryController = require('../controllers/aiQuery.controller');
const {
  suggestRemarkValidator, adminQueryValidator, composeAnnouncementValidator, performanceSummaryValidator,
} = require('../validators/ai.validators');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

// A generation call has a real, ongoing cost per request — this caps how
// often one account can trigger one, independent of the school's own scale
// (a school with a large class shouldn't hit this; a compromised or
// misbehaving client spamming the button should).
const suggestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI requests. Please try again later.' },
});

// Two Gemini calls per request (intent interpretation + result summary),
// admin-only — a tighter budget than the remark suggester's.
const queryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI requests. Please try again later.' },
});

router.use(authenticate, authorize('admin', 'teacher'));

router.post('/remarks/suggest', suggestLimiter, suggestRemarkValidator, validate, controller.suggestRemark);
// Admin-only, narrower than this router's own admin+teacher default above —
// authorize() checks stack, so this further restricts just this one route.
router.post('/query', authorize('admin'), queryLimiter, adminQueryValidator, validate, queryController.runQuery);
// Admin-only, matching who can actually create an announcement (announcements.routes.js).
router.post('/compose-announcement', authorize('admin'), suggestLimiter, composeAnnouncementValidator, validate, controller.composeAnnouncement);
router.get('/performance-summary', authorize('admin'), performanceSummaryValidator, validate, controller.performanceSummary);

module.exports = router;
