// Gemini-backed remark suggestions. Follows the same isConfigured() gate as
// email.service.js: if GEMINI_API_KEY isn't set, every call fails fast with
// a clear, expected error rather than throwing deep inside a fetch. Node 18+
// ships a global fetch, so no new HTTP dependency is needed for this.
const isAIConfigured = () => Boolean(process.env.GEMINI_API_KEY);

const GEMINI_MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_URL = () => `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL()}:generateContent`;

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

// Gemini often wraps JSON in ```json fences despite being told not to, and
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
  const res = await fetch(`${GEMINI_URL()}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!res.ok) {
    const err = new Error(`Gemini request failed with status ${res.status}`);
    err.code = 'AI_REQUEST_FAILED';
    throw err;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const suggestions = parseSuggestions(text);
  if (suggestions.length === 0) {
    const err = new Error('AI returned no usable suggestions');
    err.code = 'AI_EMPTY_RESPONSE';
    throw err;
  }
  return suggestions;
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
  const res = await fetch(`${GEMINI_URL()}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!res.ok) {
    const err = new Error(`Gemini request failed with status ${res.status}`);
    err.code = 'AI_REQUEST_FAILED';
    throw err;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
  const res = await fetch(`${GEMINI_URL()}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!res.ok) {
    const err = new Error(`Gemini request failed with status ${res.status}`);
    err.code = 'AI_REQUEST_FAILED';
    throw err;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
  const res = await fetch(`${GEMINI_URL()}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!res.ok) {
    const err = new Error(`Gemini request failed with status ${res.status}`);
    err.code = 'AI_REQUEST_FAILED';
    throw err;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
  const res = await fetch(`${GEMINI_URL()}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!res.ok) {
    const err = new Error(`Gemini request failed with status ${res.status}`);
    err.code = 'AI_REQUEST_FAILED';
    throw err;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
  const res = await fetch(`${GEMINI_URL()}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!res.ok) {
    const err = new Error(`Gemini request failed with status ${res.status}`);
    err.code = 'AI_REQUEST_FAILED';
    throw err;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.replace(/```/g, '').trim() || null;
};

module.exports = {
  isAIConfigured,
  generateRemarkSuggestions,
  buildRemarkPrompt,
  parseSuggestions,
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
