// DeepSeek's own API (api.deepseek.com) — an OpenAI-compatible chat
// endpoint, independent of NVIDIA Build (whose deprecation timeline we
// couldn't fully confirm for a provider swap this close to a defense).
// Follows the same isConfigured() gate as email.service.js: if the key
// isn't set, every call fails fast and predictably rather than wasting a
// network round-trip only to fail deep inside a fetch. No documented key
// prefix to validate here (unlike NVIDIA's "nvapi-"), so this only checks
// presence. Node 18+ ships a global fetch, so no new HTTP dependency is
// needed for this.
const isAIConfigured = () => Boolean(process.env.DEEPSEEK_API_KEY);

// deepseek-v4-flash is the current fast/general-purpose tier (verified
// directly against DeepSeek's live docs) — the legacy "deepseek-chat" /
// "deepseek-reasoner" model IDs are no longer listed there. "flash" over
// "pro" for the same reason llama-3.2-3b was picked over 70b: everything
// this app generates is short and structured (a few sentences or bullet
// points), not deep multi-step reasoning.
const DEEPSEEK_MODEL = () => process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

// Shared by every AI-backed generator below — one fetch/error-handling path
// instead of eight near-identical copies. Every caller here already has its
// own deterministic fallback for when this throws (see each
// generateFallback* function), so failing loudly to the SERVER LOG here —
// not just a generic "AI_REQUEST_FAILED" code to the client — is what makes
// a real production failure (bad key, wrong model name, quota) actually
// diagnosable instead of indistinguishable from "not configured".
const callAI = async (prompt) => {
  let res;
  try {
    res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL(),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });
  } catch (fetchErr) {
    console.error('[ai.service] DeepSeek request never reached a response (network/URL error):', fetchErr.message);
    const err = new Error('AI request failed before a response was received');
    err.code = 'AI_REQUEST_FAILED';
    throw err;
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    console.error(`[ai.service] DeepSeek request failed with status ${res.status}:`, bodyText.slice(0, 500));
    const err = new Error(`AI request failed with status ${res.status}`);
    err.code = 'AI_REQUEST_FAILED';
    throw err;
  }

  return res.json();
};

// Deliberately built from only what's actually known and already
// tenant/role-authorized by the caller (see ai.controller.js) — never the
// student's admission number, address, or any other identifying detail
// beyond a first name, and never another student's data. The model is asked
// not to invent facts, since it has no way to verify anything it wasn't
// given.
const buildRemarkPrompt = ({
  studentFirstName, averageScore, classPosition, classSize, attendancePercent,
}) => {
  const lines = [
    'You are helping a teacher at a Ghanaian basic school write a remark for a',
    "student's term report card. Use only the facts given below — never invent",
    'or assume anything beyond them.',
    '',
    `Student: ${studentFirstName}`,
    `Term average: ${averageScore}%`,
    classPosition && classSize ? `Class position: ${classPosition} of ${classSize}` : null,
    attendancePercent != null ? `Attendance: ${attendancePercent}%` : null,
    '',
    'Write exactly 3 different remark options. Each should be 1-2 sentences,',
    'in a warm but professional teacher\'s voice suitable for a report card.',
    'Return ONLY a JSON array of exactly 3 strings — no markdown, no code',
    'fences, no extra commentary before or after the array.',
  ].filter(Boolean);
  return lines.join('\n');
};

// The model often wraps JSON in ```json fences despite being told not to, and
// occasionally adds a leading/trailing sentence — this recovers the actual
// array either way rather than failing the whole request over formatting.
const parseSuggestions = (text) => {
  const stripped = text.replace(/```json|```/g, '').trim();
  const match = stripped.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')) {
        return parsed.slice(0, 3).map((s) => s.trim()).filter(Boolean);
      }
    } catch {
      // fall through to the line-splitting fallback below
    }
  }
  return stripped
    .split('\n')
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
};

const generateRemarkSuggestions = async (context) => {
  if (!isAIConfigured()) {
    const err = new Error('AI is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const prompt = buildRemarkPrompt(context);
  const data = await callAI(prompt);
  const text = data?.choices?.[0]?.message?.content || '';
  const suggestions = parseSuggestions(text);
  if (suggestions.length === 0) {
    const err = new Error('AI returned no usable suggestions');
    err.code = 'AI_EMPTY_RESPONSE';
    throw err;
  }
  return suggestions;
};

const positionPhrase = ({ classPosition, classSize }) => (
  classPosition && classSize ? ` (ranked ${classPosition} of ${classSize})` : ''
);
const attendancePhrase = ({ attendancePercent }) => (
  attendancePercent != null ? ` Attendance stood at ${attendancePercent}%.` : ''
);

// Same facts as buildRemarkPrompt, no external call — used whenever a live
// AI suggestion isn't available (unconfigured, or the AI request itself
// failed/timed out) so "Suggest Remark" always returns something usable
// instead of dead-ending the teacher. Banded on the term average: A (80+),
// B (60-79), C (below 60).
const FALLBACK_TEMPLATES = {
  A: (ctx) => [
    `${ctx.studentFirstName} has had an excellent term, consistently demonstrating mastery of the material${positionPhrase(ctx)}. Keep up this outstanding standard of work.`,
    `An outstanding academic performance from ${ctx.studentFirstName} this term, with a strong average of ${ctx.averageScore}%. This is a great foundation to keep building on.`,
    `${ctx.studentFirstName} continues to lead by example, combining strong results with consistent effort.${attendancePhrase(ctx)} Well done this term.`,
  ],
  B: (ctx) => [
    `${ctx.studentFirstName} put in solid, consistent work this term, averaging ${ctx.averageScore}%. With a bit more focus on the weaker areas, even better results are within reach.`,
    `A steady term for ${ctx.studentFirstName}${positionPhrase(ctx)}. Reviewing class notes more regularly would help push this average even higher.`,
    `${ctx.studentFirstName} is making reasonable progress and shows real potential.${attendancePhrase(ctx)} More consistent revision would help turn that potential into stronger scores.`,
  ],
  C: (ctx) => [
    `${ctx.studentFirstName} needs additional support to strengthen the basics this term. Regular practice and extra attention in class would help build a firmer foundation.`,
    `This term's results suggest ${ctx.studentFirstName} would benefit from closer attention to foundational topics and more consistent class participation.${attendancePhrase(ctx)}`,
    `${ctx.studentFirstName} has room to grow this term. Focused revision, regular attendance, and extra practice at home would go a long way toward improvement.`,
  ],
};

const scoreBand = (averageScore) => {
  if (averageScore >= 80) return 'A';
  if (averageScore >= 60) return 'B';
  return 'C';
};

const generateFallbackRemarkSuggestions = (context) => FALLBACK_TEMPLATES[scoreBand(Number(context.averageScore) || 0)](context);

// Announcements are a single message string in this app (no separate
// headline/body field — see Announcement.model.js), so this drafts one
// cohesive message per option, not a title+body pair. targetLabel is
// context only ("Whole School" / a class name) — never a specific
// student's name or any other identifying detail.
const buildAnnouncementPrompt = ({ objective, tone, targetLabel }) => {
  const lines = [
    'You are helping a Ghanaian basic school admin draft a short announcement',
    'for the school\'s notice board. Use only the facts given below — never',
    'invent details (dates, times, places) that were not provided.',
    '',
    `What it's about: ${objective}`,
    `Audience: ${targetLabel}`,
    `Tone: ${tone}`,
    '',
    'Write exactly 3 different ready-to-post message options (no headline —',
    'just the message body itself), each 1-3 sentences.',
    'Return ONLY a JSON array of exactly 3 strings — no markdown, no code',
    'fences, no extra commentary before or after the array.',
  ];
  return lines.join('\n');
};

const generateAnnouncementSuggestions = async ({ objective, tone, targetLabel }) => {
  if (!isAIConfigured()) {
    const err = new Error('AI is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const prompt = buildAnnouncementPrompt({ objective, tone, targetLabel });
  const data = await callAI(prompt);
  const text = data?.choices?.[0]?.message?.content || '';
  const suggestions = parseSuggestions(text);
  if (suggestions.length === 0) {
    const err = new Error('AI returned no usable suggestions');
    err.code = 'AI_EMPTY_RESPONSE';
    throw err;
  }
  return suggestions;
};

// Same reasoning as the remark assistant's fallback — the tone the admin
// picked still gets 3 distinct phrasings, just template-based instead of
// generated, so the objective's actual details (dates/times/places) show
// up verbatim rather than being paraphrased.
const ANNOUNCEMENT_FALLBACK_TEMPLATES = {
  friendly: (objective) => [
    `Hi everyone! Just a quick note: ${objective}. Thanks so much!`,
    `Hello! We wanted to let you know: ${objective}. We appreciate you taking a moment to read this.`,
    `Quick heads-up: ${objective}. Thank you for staying in the loop!`,
  ],
  formal: (objective) => [
    `Dear Parents and Guardians, we would like to inform you that ${objective}. Kindly take note. Regards, School Administration.`,
    `This is to formally notify all concerned that ${objective}. Your attention to this matter is appreciated.`,
    `Please be advised that ${objective}. We thank you for your continued cooperation.`,
  ],
  urgent: (objective) => [
    `IMPORTANT NOTICE: ${objective}. Please take immediate note of this update.`,
    `URGENT: ${objective}. This requires your prompt attention.`,
    `Please read carefully: ${objective}. Immediate action or awareness is required.`,
  ],
};

const generateFallbackAnnouncementSuggestions = ({ objective, tone }) => (
  (ANNOUNCEMENT_FALLBACK_TEMPLATES[tone] || ANNOUNCEMENT_FALLBACK_TEMPLATES.formal)(objective)
);

// subjectPerf: [{ subjectName, average, passRate, resultCount }] — already
// computed, tenant-scoped, school-wide aggregates (see
// ai.controller.js's computeSubjectPerformance). No student-level data
// ever reaches this prompt, only per-subject numbers.
const buildPerformanceSummaryPrompt = (subjectPerf) => {
  const lines = [
    'You are helping a school admin understand overall academic performance',
    'this term across all subjects. Use only the data given below — never',
    'invent numbers or subjects not listed.',
    '',
    'Subject performance this term:',
    ...subjectPerf.map((s) => `- ${s.subjectName}: ${s.average}% average, ${s.passRate}% pass rate (${s.resultCount} results)`),
    '',
    'Return a JSON object with exactly these three keys, each an array of',
    '1-3 short, plain-sentence bullet points (no markdown):',
    '{"keyStrengths": [...], "areasForAttention": [...], "recommendations": [...]}',
    'Return ONLY that JSON object — no markdown, no code fences, no',
    'commentary before or after it.',
  ];
  return lines.join('\n');
};

// Same recovery reasoning as parseSuggestions — the model sometimes wraps
// JSON in fences or adds stray commentary despite being told not to.
const parseSummaryResponse = (text) => {
  const stripped = text.replace(/```json|```/g, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    const toStringArray = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === 'string' && s.trim()).slice(0, 3) : []);
    return {
      keyStrengths: toStringArray(parsed.keyStrengths),
      areasForAttention: toStringArray(parsed.areasForAttention),
      recommendations: toStringArray(parsed.recommendations),
    };
  } catch {
    return null;
  }
};

const generatePerformanceSummary = async (subjectPerf) => {
  if (!isAIConfigured()) {
    const err = new Error('AI is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const prompt = buildPerformanceSummaryPrompt(subjectPerf);
  const data = await callAI(prompt);
  const text = data?.choices?.[0]?.message?.content || '';
  const parsed = parseSummaryResponse(text);
  const isEmpty = !parsed || (parsed.keyStrengths.length === 0 && parsed.areasForAttention.length === 0 && parsed.recommendations.length === 0);
  if (isEmpty) {
    const err = new Error('AI returned no usable summary');
    err.code = 'AI_EMPTY_RESPONSE';
    throw err;
  }
  return parsed;
};

// Same "always return something usable" reasoning as the other fallbacks —
// derived directly from the same computed averages/pass-rates, just phrased
// with fixed sentence templates instead of a generated narrative.
const generateFallbackPerformanceSummary = (subjectPerf) => {
  const sorted = [...subjectPerf].sort((a, b) => b.average - a.average); // best first
  const n = sorted.length;
  // Index-based split (not "top 2 / bottom 2" independently) so the two
  // lists never overlap even when there are only 1-3 subjects total.
  const weakCount = Math.min(2, Math.floor(n / 2));
  const strongCount = Math.min(2, n - weakCount);
  const strong = sorted.slice(0, strongCount);
  const weak = sorted.slice(n - weakCount, n).reverse(); // weakest first
  return {
    keyStrengths: strong.map((s) => `${s.subjectName} is performing well — ${s.average}% average, ${s.passRate}% pass rate.`),
    areasForAttention: weak.map((s) => `${s.subjectName} needs attention — ${s.average}% average, ${s.passRate}% pass rate.`),
    recommendations: weak.length > 0
      ? weak.map((s) => `Consider extra support or a review session for ${s.subjectName}.`)
      : ['Performance is consistent across subjects this term — no single subject stands out as needing extra attention.'],
  };
};

// Deliberately given only flag TYPES (e.g. 'performance_drop'), never a
// studentId or name — this summary is a general "what to expect" note for
// the whole review screen, not a per-student narrative, so there's no
// reason for any per-student identifier to leave the server at all.
const buildAnomalySummaryPrompt = (flags) => {
  const lines = [
    "You are helping a school admin understand, in one glance, why some",
    "students' scores were flagged for a second look before approving a",
    'class\'s results. Use only the facts given — never invent anything',
    'beyond them, and never refer to a specific student.',
    '',
    `${flags.length} student(s) were flagged. Flag types seen:`,
    ...flags.map((f) => `- ${f.flags.map((x) => x.type).join(', ')}`),
    '',
    'Write ONE short sentence (max 25 words) giving the admin a general',
    'sense of what to expect — e.g. whether the flags look more like likely',
    'data-entry slips or genuine performance changes worth a closer look.',
    'Return ONLY that sentence, no extra text.',
  ];
  return lines.join('\n');
};

const generateAnomalySummary = async (flags) => {
  if (!isAIConfigured()) {
    const err = new Error('AI is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const prompt = buildAnomalySummaryPrompt(flags);
  const data = await callAI(prompt);
  const text = data?.choices?.[0]?.message?.content || '';
  const summary = text.replace(/```/g, '').trim();
  if (!summary) {
    const err = new Error('AI returned no usable summary');
    err.code = 'AI_EMPTY_RESPONSE';
    throw err;
  }
  return summary;
};

// Only a first name plus already-computed, non-identifying summaries
// (subject names, a trend direction/magnitude) — never a raw score history,
// never a surname. Same privacy posture as the Remark Assistant prompt.
const buildPerformanceNarrativePrompt = ({
  studentFirstName, trend, strongestSubjects, needsAttentionSubjects,
}) => {
  const trendLine = trend.direction
    ? `Overall trend across their last ${trend.termsCompared} terms: ${trend.direction}`
      + (trend.deltaPercent != null ? ` (${trend.deltaPercent > 0 ? '+' : ''}${trend.deltaPercent}% vs. the previous term).` : '.')
    : 'Not enough term history yet for a trend.';

  const lines = [
    "You are helping summarize a student's academic progress for a report",
    'that a teacher, admin, or parent will read. Use only the facts given —',
    'never invent grades, subjects, or events not listed here.',
    '',
    `Student: ${studentFirstName}`,
    trendLine,
    strongestSubjects.length ? `Strongest subjects this term: ${strongestSubjects.join(', ')}` : null,
    needsAttentionSubjects.length ? `Subjects that may need attention: ${needsAttentionSubjects.join(', ')}` : null,
    '',
    "Write 2-3 sentences summarizing this student's holistic academic",
    'progress: their overall trajectory, a highlight, and — only if a',
    'needs-attention subject was actually given above — a growth area. Warm,',
    'professional tone suitable for a parent or teacher to read. Return ONLY',
    'those sentences, no extra commentary.',
  ].filter(Boolean);
  return lines.join('\n');
};

const generatePerformanceNarrative = async (context) => {
  if (!isAIConfigured()) {
    const err = new Error('AI is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const prompt = buildPerformanceNarrativePrompt(context);
  const data = await callAI(prompt);
  const text = data?.choices?.[0]?.message?.content || '';
  const narrative = text.replace(/```/g, '').trim();
  if (!narrative) {
    const err = new Error('AI returned no usable narrative');
    err.code = 'AI_EMPTY_RESPONSE';
    throw err;
  }
  return narrative;
};

// One batched call for the whole flagged list, not one per student — keeps
// cost bounded regardless of class size. First names are sent (unlike the
// other three AI calls in this file) because this synthesis is meant to be
// directly actionable for someone who already has full legitimate access to
// these students — but the boundary rules below are non-negotiable and
// stated as hard constraints, not suggestions, matching the original
// "never diagnose, never a disciplinary decision" spec for this feature.
const buildInterventionSynthesisPrompt = (flaggedStudents) => {
  const lines = [
    'You are helping a headteacher or school counselor get a quick,',
    'actionable overview of students who may benefit from additional',
    'support this term. Use ONLY the facts given below — never invent',
    'anything beyond them.',
    '',
    'HARD RULES — do not violate these:',
    '- Never diagnose a student or suggest a medical/psychological cause.',
    '- Never recommend or imply any disciplinary action.',
    '- Frame every mention supportively (e.g. "may benefit from additional',
    '  academic attention") — never as a fault or a warning about the student.',
    '- An outstanding fee balance is a separate, practical matter for the',
    "  school office — never imply it explains a student's academic flags,",
    '  and never suggest withholding anything over it.',
    '',
    `${flaggedStudents.length} student(s) flagged this term:`,
    ...flaggedStudents.map((s) => {
      const flagTypes = s.academicFlags.map((f) => f.type).join(', ');
      const feeNote = s.outstandingBalance > 0 ? ', family has an outstanding fee balance' : '';
      return `- ${s.firstName}: ${flagTypes}${feeNote}`;
    }),
    '',
    'Write ONE short paragraph (max 80 words) giving the reader a sense of',
    'the overall picture and a general, supportive next step (e.g. "worth a',
    'quiet check-in"). Return ONLY that paragraph, no extra commentary.',
  ];
  return lines.join('\n');
};

const generateInterventionSynthesis = async (flaggedStudents) => {
  if (!isAIConfigured()) {
    const err = new Error('AI is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const prompt = buildInterventionSynthesisPrompt(flaggedStudents);
  const data = await callAI(prompt);
  const text = data?.choices?.[0]?.message?.content || '';
  const synthesis = text.replace(/```/g, '').trim();
  if (!synthesis) {
    const err = new Error('AI returned no usable synthesis');
    err.code = 'AI_EMPTY_RESPONSE';
    throw err;
  }
  return synthesis;
};

// Phase 5 — Natural-Language Admin Assistant. The AI's ONLY job here is
// picking one of a small, fixed set of intents and extracting a few typed
// parameters from a plain-English question — it never writes or executes a
// database query itself, and its output is never trusted as-is: every field
// below is individually type-checked and allowlisted before anything reads
// it, so a malformed or adversarial model response degrades to "unsupported"
// rather than ever being passed through as a query.
const SUPPORTED_INTENTS = ['fee_arrears_by_class', 'subject_average_scores', 'at_risk_students', 'unsupported'];

const buildQueryInterpretationPrompt = (question) => {
  const lines = [
    "You translate a school admin's plain-English question into ONE of a",
    'fixed set of supported query intents. You do not answer the question',
    'yourself and you do not write any database query — you only classify',
    'intent and extract parameters.',
    '',
    'Supported intents, and the parameters each one accepts:',
    '- "fee_arrears_by_class": students with an outstanding fee balance.',
    '  params: { "classNameHint": string or null, "minBalance": number or null }',
    '- "subject_average_scores": average score per subject, for a term.',
    '  params: { "academicTermHint": string or null }',
    '- "at_risk_students": students flagged by low attendance, a declining',
    '  trend, or multiple failing subjects this term.',
    '  params: {}',
    '- "unsupported": the question does not clearly match any of the above.',
    '  params: {}',
    '',
    `Admin's question: "${question}"`,
    '',
    'Respond with ONLY a JSON object: { "intent": "...", "params": {...} }.',
    'No markdown, no extra text. If genuinely unsure, use "unsupported"',
    'rather than guessing at one of the other intents.',
  ];
  return lines.join('\n');
};

const parseIntentResponse = (text) => {
  const stripped = text.replace(/```json|```/g, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  let parsed = null;
  if (match) {
    try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
  }
  if (!parsed || typeof parsed.intent !== 'string' || !SUPPORTED_INTENTS.includes(parsed.intent)) {
    return { intent: 'unsupported', params: {} };
  }

  const raw = (parsed.params && typeof parsed.params === 'object') ? parsed.params : {};
  let params = {};
  if (parsed.intent === 'fee_arrears_by_class') {
    params = {
      classNameHint: typeof raw.classNameHint === 'string' ? raw.classNameHint.slice(0, 100) : null,
      minBalance: typeof raw.minBalance === 'number' && raw.minBalance >= 0 ? raw.minBalance : null,
    };
  } else if (parsed.intent === 'subject_average_scores') {
    params = { academicTermHint: typeof raw.academicTermHint === 'string' ? raw.academicTermHint.slice(0, 100) : null };
  }
  // at_risk_students and unsupported take no params — params stays {}

  return { intent: parsed.intent, params };
};

const interpretAdminQuery = async (question) => {
  if (!isAIConfigured()) {
    const err = new Error('AI is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const prompt = buildQueryInterpretationPrompt(question);
  const data = await callAI(prompt);
  const text = data?.choices?.[0]?.message?.content || '';
  return parseIntentResponse(text);
};

// The second AI call — given data the system has ALREADY computed and
// authorized (never raw AI-supplied content), just phrase it in plain
// English. Rows are capped in size before being embedded in the prompt as a
// defensive limit against an unexpectedly huge result set, not because
// truncated data is ever silently substituted for the real answer — the
// caller (aiQuery.controller.js) always returns the full, untruncated rows
// separately regardless of what this summary says.
const buildQuerySummaryPrompt = (question, rows) => {
  const rowsJson = JSON.stringify(rows).slice(0, 4000);
  const lines = [
    "You are summarizing the RESULT of a school admin's query, already",
    'computed by the system below — you are not answering from your own',
    'knowledge, and must not state any fact not present in this data.',
    '',
    `Original question: "${question}"`,
    `Result data (JSON, already correct — just describe it): ${rowsJson}`,
    '',
    'Write a short, plain-English answer (max 60 words) summarizing this',
    'data for the admin. If the data is empty, say so plainly rather than',
    'padding with unrelated commentary. Return ONLY that answer.',
  ];
  return lines.join('\n');
};

const summarizeQueryResult = async (question, rows) => {
  if (!isAIConfigured()) {
    const err = new Error('AI is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const prompt = buildQuerySummaryPrompt(question, rows);
  const data = await callAI(prompt);
  const text = data?.choices?.[0]?.message?.content || '';
  return text.replace(/```/g, '').trim() || null;
};

module.exports = {
  isAIConfigured,
  generateRemarkSuggestions,
  generateFallbackRemarkSuggestions,
  buildRemarkPrompt,
  parseSuggestions,
  generateAnnouncementSuggestions,
  generateFallbackAnnouncementSuggestions,
  buildAnnouncementPrompt,
  generatePerformanceSummary,
  generateFallbackPerformanceSummary,
  buildPerformanceSummaryPrompt,
  parseSummaryResponse,
  generateAnomalySummary,
  buildAnomalySummaryPrompt,
  generatePerformanceNarrative,
  buildPerformanceNarrativePrompt,
  generateInterventionSynthesis,
  buildInterventionSynthesisPrompt,
  interpretAdminQuery,
  buildQueryInterpretationPrompt,
  parseIntentResponse,
  summarizeQueryResult,
  buildQuerySummaryPrompt,
  SUPPORTED_INTENTS,
};
