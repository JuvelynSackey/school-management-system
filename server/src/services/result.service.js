// Class Score decomposition: a school can optionally have teachers enter
// granular sub-assessment marks (class exercises, assignments, a group
// project, ...) instead of one raw classScore number. This module owns
// both halves of that feature -- validating a school's chosen component
// breakdown (used by gradingScheme.controller.js's update) and summing a
// teacher's per-component entries into the single classScore that
// Result.classScore, the report card, and every grading/analytics feature
// already reads unchanged (results.controller.js's recordBulk).
//
// Deliberately its own file rather than folded into grading.service.js --
// that file is about turning a total into a grade; this one is about how a
// classScore total is arrived at in the first place, a different concern
// with its own validation rules.

// Thrown, not returned, so a caller's try/catch converts it straight into
// a 400 AppError with this exact message -- no separate error-code mapping
// to keep in sync.
const validateClassScoreConfig = (components, classScoreMax) => {
  if (!Array.isArray(components) || components.length === 0) {
    throw new Error('At least one component is required when class score decomposition is enabled');
  }
  const keys = components.map((c) => c.key);
  if (new Set(keys).size !== keys.length) {
    throw new Error('Component keys must be unique');
  }
  const total = components.reduce((sum, c) => sum + Number(c.maxMarks), 0);
  if (total !== Number(classScoreMax)) {
    throw new Error(`Component maximums must sum to exactly ${classScoreMax} (currently ${total})`);
  }
  return true;
};

// classScoreDetails may arrive as a plain object (a fresh request body) or
// a Mongoose Map (re-validating an already-loaded Result) -- normalized to
// entries once so callers never need to care which.
const detailEntries = (classScoreDetails) => {
  if (!classScoreDetails) return [];
  if (classScoreDetails instanceof Map) return [...classScoreDetails.entries()];
  return Object.entries(classScoreDetails);
};

// Sums a teacher's per-component entries into the single classScore value,
// validating each against its component's maxMarks along the way. Throws
// on an unrecognized key or an out-of-range value -- there is no partial
// "clamp to max" behavior, since silently altering a teacher's entered
// number is worse than asking them to fix it.
const computeClassScoreFromDetails = (classScoreDetails, components) => {
  const byKey = new Map((components || []).map((c) => [c.key, c]));
  let total = 0;
  detailEntries(classScoreDetails).forEach(([key, value]) => {
    const component = byKey.get(key);
    if (!component) throw new Error(`"${key}" is not a configured class score component`);
    const numeric = Number(value);
    if (Number.isNaN(numeric) || numeric < 0) throw new Error(`"${component.label}" must be a non-negative number`);
    if (numeric > component.maxMarks) throw new Error(`"${component.label}" cannot exceed ${component.maxMarks}`);
    total += numeric;
  });
  return total;
};

module.exports = { validateClassScoreConfig, computeClassScoreFromDetails };
