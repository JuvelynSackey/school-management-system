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

// Two AI calls per request (intent interpretation + result summary),
// admin-only — a tighter budget than the remark suggester's.
const queryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI requests. Please try again later.' },
});

// No router-level authorize() default — /query needs to reach parents too,
// who have no access to anything else in this file, so every route below
// states its own required role(s) explicitly instead of relying on a
// blanket default that would either lock parents out of /query or (worse)
// accidentally widen the other admin/teacher-only routes to parents too.
router.use(authenticate);

router.post('/remarks/suggest', authorize('admin', 'teacher'), suggestLimiter, suggestRemarkValidator, validate, controller.suggestRemark);
// Every authenticated role reaches the controller, even 'student' (who has
// no intents assigned in assistantIntents.config.js at all) — a role with
// nothing it's allowed to ask still gets the assistant's own graceful,
// config-driven refusal message, not a bare 403 from the route layer.
// aiQuery.controller.js re-checks the classified intent's allowedRoles
// server-side regardless of what this authorize() call allows through, and
// a teacher/parent's classId/studentId scope is always resolved from their
// own account there, never a request parameter.
router.post('/query', authorize('admin', 'teacher', 'student', 'parent'), queryLimiter, adminQueryValidator, validate, queryController.runQuery);
// Admin-only, matching who can actually create an announcement (announcements.routes.js).
router.post('/compose-announcement', authorize('admin'), suggestLimiter, composeAnnouncementValidator, validate, controller.composeAnnouncement);
router.get('/performance-summary', authorize('admin'), performanceSummaryValidator, validate, controller.performanceSummary);

module.exports = router;
