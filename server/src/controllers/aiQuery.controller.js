const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const aiService = require('../services/ai.service');
const aiQuery = require('../services/aiQuery.service');
const auditLog = require('../services/auditLog.service');

const UNSUPPORTED_MESSAGE = 'I can only answer questions about fee arrears, subject average scores, at-risk students, subject pass rates, class performance ranking, and unsubmitted marksheets right now — try rephrasing, or ask one of those.';

// A short, deterministic next-step suggestion per intent — never AI-written,
// so it can never invent an action the data doesn't support. Only shown
// when there's actually something to act on (empty rows means nothing to
// recommend).
const RECOMMENDATION_BY_INTENT = {
  fee_arrears_by_class: 'Consider sending fee reminders to the families listed above.',
  subject_average_scores: 'Consider reviewing teaching support or scheduling extra help for the lowest-scoring subjects.',
  at_risk_students: 'Open each student\'s profile — their specific flags there each include a tailored recommendation.',
  subjects_below_pass_rate: 'Consider extra tutoring sessions or a curriculum review for these subjects.',
  class_performance_ranking: 'Consider sharing teaching approaches from the top class with others, and checking in on the lowest.',
  teachers_unsubmitted_marksheets: 'Follow up with these teachers so their result sheets are submitted before the review deadline.',
};

// POST /ai/query { question }  (admin only)
// JesManage Intelligence, Stage 6 Phase 5. Read-only, always: nothing in
// this file or anything it calls ever creates, updates, or deletes. The
// AI's only role is classifying the question into one of a small, fixed
// intent enum and extracting a few typed parameters (ai.service.js
// individually type-checks and allowlists every field) — every actual data
// fetch below is an ordinary, already tenant-scoped Mongoose query, so a
// misread intent or hint can only ever return this school's own data (or
// nothing), never another tenant's.
const runQuery = asyncHandler(async (req, res, next) => {
  if (!aiService.isAIConfigured()) {
    return next(new AppError('The natural-language assistant is not yet configured for this deployment.', 503, undefined, 'AI_NOT_CONFIGURED'));
  }

  const { question } = req.body;

  let interpretation;
  try {
    interpretation = await aiService.interpretAdminQuery(question);
  } catch (err) {
    return next(new AppError('Could not process that question right now.', 502, undefined, err.code || 'AI_REQUEST_FAILED'));
  }

  const { intent, params } = interpretation;

  if (intent === 'unsupported') {
    return res.json({ success: true, data: { answer: UNSUPPORTED_MESSAGE, rows: [], intent, recommendation: null } });
  }

  let rows;
  let hintNote = null;

  if (intent === 'fee_arrears_by_class') {
    const { academicTermId } = await aiQuery.resolveTermHint(null);
    const { classId, notFound } = await aiQuery.resolveClassHint(params.classNameHint);
    if (params.classNameHint && notFound) {
      hintNote = `I couldn't find a class matching "${params.classNameHint}" — showing all classes instead.`;
    }
    rows = await aiQuery.runFeeArrearsQuery({ classId: notFound ? null : classId, minBalance: params.minBalance }, academicTermId);
  } else if (intent === 'subject_average_scores') {
    const { academicTermId, notFound } = await aiQuery.resolveTermHint(params.academicTermHint);
    if (notFound) {
      return res.json({
        success: true,
        data: {
          answer: `I couldn't find a term matching "${params.academicTermHint}".`, rows: [], intent, recommendation: null,
        },
      });
    }
    rows = await aiQuery.runSubjectAverageQuery(academicTermId);
  } else if (intent === 'at_risk_students') {
    const { academicTermId } = await aiQuery.resolveTermHint(null);
    rows = await aiQuery.runAtRiskStudentsQuery(academicTermId, req.user.schoolId);
  } else if (intent === 'subjects_below_pass_rate') {
    const { academicTermId, notFound } = await aiQuery.resolveTermHint(params.academicTermHint);
    if (notFound) {
      return res.json({
        success: true,
        data: {
          answer: `I couldn't find a term matching "${params.academicTermHint}".`, rows: [], intent, recommendation: null,
        },
      });
    }
    rows = await aiQuery.runSubjectsBelowPassRateQuery(req.user.schoolId, academicTermId, params.threshold);
  } else if (intent === 'class_performance_ranking') {
    const { academicTermId, notFound } = await aiQuery.resolveTermHint(params.academicTermHint);
    if (notFound) {
      return res.json({
        success: true,
        data: {
          answer: `I couldn't find a term matching "${params.academicTermHint}".`, rows: [], intent, recommendation: null,
        },
      });
    }
    rows = await aiQuery.runClassPerformanceRankingQuery(req.user.schoolId, academicTermId);
  } else if (intent === 'teachers_unsubmitted_marksheets') {
    const { academicTermId, notFound } = await aiQuery.resolveTermHint(params.academicTermHint);
    if (notFound) {
      return res.json({
        success: true,
        data: {
          answer: `I couldn't find a term matching "${params.academicTermHint}".`, rows: [], intent, recommendation: null,
        },
      });
    }
    rows = await aiQuery.runTeachersUnsubmittedMarksheetsQuery(academicTermId);
  }

  let answer = null;
  try {
    answer = await aiService.summarizeQueryResult(question, rows);
  } catch {
    answer = null; // the structured rows below are still valid and returned either way
  }
  if (hintNote) {
    answer = answer ? `${hintNote} ${answer}` : hintNote;
  }

  const recommendation = rows.length > 0 ? (RECOMMENDATION_BY_INTENT[intent] || null) : null;

  await auditLog.record({
    req, action: 'ai.adminQuery', entityType: 'Query', description: `Admin asked: "${question}"`, metadata: { intent },
  });

  res.json({ success: true, data: { answer, rows, intent, recommendation } });
});

module.exports = { runQuery };
