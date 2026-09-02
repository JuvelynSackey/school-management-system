const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const aiService = require('../services/ai.service');
const aiQuery = require('../services/aiQuery.service');
const auditLog = require('../services/auditLog.service');
const { ASSISTANT_INTENTS, intentsForRole } = require('../config/assistantIntents.config');
const { getTeacherClassIds } = require('../services/teacherScope.service');
const { getParentStudentIds } = require('../services/parentScope.service');

const REFUSAL_MESSAGE = 'I cannot access or disclose information outside your authorized scope.';

// Plain-English topic labels for the "here's what I *can* answer" nudge —
// keyed by intent so it's always in sync with ASSISTANT_INTENTS' actual set.
const INTENT_TOPIC_LABEL = {
  fee_arrears_by_class: 'fee arrears',
  subject_average_scores: 'subject average scores',
  at_risk_students: 'at-risk students',
  subjects_below_pass_rate: 'subject pass rates',
  class_performance_ranking: 'class performance ranking',
  teachers_unsubmitted_marksheets: 'unsubmitted marksheets',
  guardians_without_portal_login: 'guardians without a portal login',
  classes_without_homeroom_teacher: 'classes without a homeroom teacher',
  my_class_attendance_summary: 'your classes\' attendance',
  my_class_unsubmitted_marksheets: 'your own unsubmitted marksheets',
  my_child_fee_balance: 'your child\'s fee balance',
  my_child_results_summary: 'your child\'s results',
};
const unsupportedMessageForRole = (role) => {
  const topics = intentsForRole(role).filter((k) => k !== 'unsupported').map((k) => INTENT_TOPIC_LABEL[k]);
  return `I can only answer questions about ${topics.join(', ')} right now — try rephrasing, or ask one of those.`;
};

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
  guardians_without_portal_login: 'Create a login for each from the Parents page so families can access the portal.',
  classes_without_homeroom_teacher: 'Assign a homeroom teacher to each from the Classes page.',
  my_class_unsubmitted_marksheets: 'Submit these result sheets before the review deadline.',
  my_child_fee_balance: 'Outstanding balances can be paid via the Fees page.',
};

const emptyOrNotFoundResponse = (res, intent, answer) => res.json({
  success: true, data: {
    answer, rows: [], intent, recommendation: null,
  },
});

// POST /ai/query { question }  (admin, teacher, or parent)
// JesManage Intelligence, Stage 6 Phase 5. Read-only, always: nothing in
// this file or anything it calls ever creates, updates, or deletes.
//
// Security flow: classify intent -> re-check the classified intent's
// allowedRoles against req.user.role server-side (never trust that the
// model only picked from what it was offered) -> for a teacher/parent,
// forcibly resolve their OWN classIds/studentIds server-side (never a
// client-supplied id) -> dispatch to one of a small, fixed set of
// pre-written, tenant-scoped service functions -> summarize (decorative;
// the structured rows are what the frontend actually renders).
const runQuery = asyncHandler(async (req, res, next) => {
  if (!aiService.isAIConfigured()) {
    return next(new AppError('The natural-language assistant is not yet configured for this deployment.', 503, undefined, 'AI_NOT_CONFIGURED'));
  }

  const { question } = req.body;
  const { role } = req.user;

  let interpretation;
  try {
    interpretation = await aiService.interpretUserQuery(question, role);
  } catch (err) {
    return next(new AppError('Could not process that question right now.', 502, undefined, err.code || 'AI_REQUEST_FAILED'));
  }

  const { intent, params } = interpretation;

  if (intent === 'unsupported') {
    return res.json({ success: true, data: { answer: unsupportedMessageForRole(role), rows: [], intent, recommendation: null } });
  }

  // Hard refusal boundary — re-derived here independently of anything
  // ai.service.js already filtered/checked, so a bug in one layer can never
  // by itself grant access the other layer would have denied.
  if (!ASSISTANT_INTENTS[intent]?.allowedRoles.includes(role)) {
    return res.json({ success: true, data: { answer: REFUSAL_MESSAGE, rows: [], intent: 'unsupported', recommendation: null } });
  }

  // Teacher/parent scope is always resolved server-side from the
  // authenticated user, never accepted as a request parameter — there is no
  // classId/studentId field anywhere in the request body this route reads.
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
    if (notFound) return emptyOrNotFoundResponse(res, intent, `I couldn't find a term matching "${params.academicTermHint}".`);
    rows = await aiQuery.runSubjectAverageQuery(academicTermId);
  } else if (intent === 'at_risk_students') {
    const { academicTermId } = await aiQuery.resolveTermHint(null);
    rows = await aiQuery.runAtRiskStudentsQuery(academicTermId, req.user.schoolId);
  } else if (intent === 'subjects_below_pass_rate') {
    const { academicTermId, notFound } = await aiQuery.resolveTermHint(params.academicTermHint);
    if (notFound) return emptyOrNotFoundResponse(res, intent, `I couldn't find a term matching "${params.academicTermHint}".`);
    rows = await aiQuery.runSubjectsBelowPassRateQuery(req.user.schoolId, academicTermId, params.threshold);
  } else if (intent === 'class_performance_ranking') {
    const { academicTermId, notFound } = await aiQuery.resolveTermHint(params.academicTermHint);
    if (notFound) return emptyOrNotFoundResponse(res, intent, `I couldn't find a term matching "${params.academicTermHint}".`);
    rows = await aiQuery.runClassPerformanceRankingQuery(req.user.schoolId, academicTermId);
  } else if (intent === 'teachers_unsubmitted_marksheets') {
    const { academicTermId, notFound } = await aiQuery.resolveTermHint(params.academicTermHint);
    if (notFound) return emptyOrNotFoundResponse(res, intent, `I couldn't find a term matching "${params.academicTermHint}".`);
    rows = await aiQuery.runTeachersUnsubmittedMarksheetsQuery(academicTermId);
  } else if (intent === 'guardians_without_portal_login') {
    rows = await aiQuery.runGuardiansWithoutLoginQuery();
  } else if (intent === 'classes_without_homeroom_teacher') {
    rows = await aiQuery.runClassesWithoutHomeroomQuery();
  } else if (intent === 'my_class_attendance_summary') {
    const { academicTermId, notFound } = await aiQuery.resolveTermHint(params.academicTermHint);
    if (notFound) return emptyOrNotFoundResponse(res, intent, `I couldn't find a term matching "${params.academicTermHint}".`);
    const { classIds } = await getTeacherClassIds(req.user.id);
    rows = await aiQuery.runMyClassAttendanceSummaryQuery(classIds, academicTermId);
  } else if (intent === 'my_class_unsubmitted_marksheets') {
    const { academicTermId, notFound } = await aiQuery.resolveTermHint(params.academicTermHint);
    if (notFound) return emptyOrNotFoundResponse(res, intent, `I couldn't find a term matching "${params.academicTermHint}".`);
    const { teacherId } = await getTeacherClassIds(req.user.id);
    rows = teacherId ? await aiQuery.runMyUnsubmittedMarksheetsQuery(teacherId, academicTermId) : [];
  } else if (intent === 'my_child_fee_balance') {
    const { academicTermId } = await aiQuery.resolveTermHint(params.academicTermHint);
    const { studentIds } = await getParentStudentIds(req.user.id);
    rows = await aiQuery.runMyChildFeeBalanceQuery(studentIds, academicTermId);
  } else if (intent === 'my_child_results_summary') {
    const { academicTermId, notFound } = await aiQuery.resolveTermHint(params.academicTermHint);
    if (notFound) return emptyOrNotFoundResponse(res, intent, `I couldn't find a term matching "${params.academicTermHint}".`);
    const { studentIds } = await getParentStudentIds(req.user.id);
    rows = await aiQuery.runMyChildResultsSummaryQuery(studentIds, academicTermId);
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
    req, action: 'ai.userQuery', entityType: 'Query', description: `${role} asked: "${question}"`, metadata: { intent },
  });

  res.json({ success: true, data: { answer, rows, intent, recommendation } });
});

module.exports = { runQuery };
