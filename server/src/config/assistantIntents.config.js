// Single source of truth for the Natural-Language Assistant's fixed intent
// set: which roles may invoke each one, and the prompt text describing it to
// the model. ai.service.js builds each caller's prompt from ONLY the
// entries their own role is allowed to use (so the model is never even
// offered an intent the caller couldn't run), and aiQuery.controller.js
// re-checks `allowedRoles` again server-side before dispatching -- the
// prompt-side filtering is a UX/cost optimization, never the actual
// security boundary. Real role enum, confirmed against user.model.js:
// ['admin', 'teacher', 'student', 'parent'] -- no 'headteacher'/'bursar'.
const ASSISTANT_INTENTS = {
  fee_arrears_by_class: {
    allowedRoles: ['admin'],
    promptLine: '- "fee_arrears_by_class": students with an outstanding fee balance.\n'
      + '  params: { "classNameHint": string or null, "minBalance": number or null }',
  },
  subject_average_scores: {
    allowedRoles: ['admin'],
    promptLine: '- "subject_average_scores": average score per subject, for a term.\n'
      + '  params: { "academicTermHint": string or null }',
  },
  at_risk_students: {
    allowedRoles: ['admin'],
    promptLine: '- "at_risk_students": students flagged by low attendance, a declining\n'
      + '  trend, or multiple failing subjects this term.\n'
      + '  params: {}',
  },
  subjects_below_pass_rate: {
    allowedRoles: ['admin'],
    promptLine: '- "subjects_below_pass_rate": subjects where the pass rate is below a\n'
      + '  threshold (e.g. "subjects with pass rates below 50%").\n'
      + '  params: { "academicTermHint": string or null, "threshold": number or null }',
  },
  class_performance_ranking: {
    allowedRoles: ['admin'],
    promptLine: '- "class_performance_ranking": classes ranked by average score, for a\n'
      + '  term (e.g. "which class performed best").\n'
      + '  params: { "academicTermHint": string or null }',
  },
  teachers_unsubmitted_marksheets: {
    allowedRoles: ['admin'],
    promptLine: '- "teachers_unsubmitted_marksheets": teachers who have not yet submitted\n'
      + '  one or more of their assigned class/subject result sheets this term.\n'
      + '  params: { "academicTermHint": string or null }',
  },
  guardians_without_portal_login: {
    allowedRoles: ['admin'],
    promptLine: '- "guardians_without_portal_login": guardian contacts who don\'t yet have\n'
      + '  a parent portal login set up.\n'
      + '  params: {}',
  },
  classes_without_homeroom_teacher: {
    allowedRoles: ['admin'],
    promptLine: '- "classes_without_homeroom_teacher": classes with no homeroom/form\n'
      + '  teacher assigned.\n'
      + '  params: {}',
  },
  my_class_attendance_summary: {
    allowedRoles: ['teacher'],
    promptLine: '- "my_class_attendance_summary": attendance counts (present/absent/late/\n'
      + '  excused) for the teacher\'s OWN classes this term.\n'
      + '  params: { "academicTermHint": string or null }',
  },
  my_class_unsubmitted_marksheets: {
    allowedRoles: ['teacher'],
    promptLine: '- "my_class_unsubmitted_marksheets": which of the teacher\'s OWN\n'
      + '  class/subject result sheets are still unsubmitted this term.\n'
      + '  params: { "academicTermHint": string or null }',
  },
  my_child_fee_balance: {
    allowedRoles: ['parent'],
    promptLine: '- "my_child_fee_balance": outstanding fee balance for the parent\'s OWN\n'
      + '  linked child(ren) this term.\n'
      + '  params: { "academicTermHint": string or null }',
  },
  my_child_results_summary: {
    allowedRoles: ['parent'],
    promptLine: '- "my_child_results_summary": average score and attendance for the\n'
      + '  parent\'s OWN linked child(ren) this term.\n'
      + '  params: { "academicTermHint": string or null }',
  },
  unsupported: {
    allowedRoles: ['admin', 'teacher', 'parent'],
    promptLine: '- "unsupported": the question does not clearly match any of the above.\n'
      + '  params: {}',
  },
};

// Intents that accept an academicTermHint param -- shared by the model-
// response normalizer so it doesn't need one big if/else per intent.
const TERM_HINT_INTENTS = new Set([
  'subject_average_scores', 'subjects_below_pass_rate', 'class_performance_ranking',
  'teachers_unsubmitted_marksheets', 'my_class_attendance_summary', 'my_class_unsubmitted_marksheets',
  'my_child_fee_balance', 'my_child_results_summary',
]);

const intentsForRole = (role) => Object.entries(ASSISTANT_INTENTS)
  .filter(([, def]) => def.allowedRoles.includes(role))
  .map(([key]) => key);

module.exports = { ASSISTANT_INTENTS, TERM_HINT_INTENTS, intentsForRole };
