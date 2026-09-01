// Canonical Ghanaian basic-education hierarchy, lowest -> highest. `value`
// intentionally matches the exact class `name` strings schoolOnboarding
// service seeds for template-generated classes, so gradeLevel can be
// backfilled by direct name match with zero ambiguity.
const GRADE_LEVELS = [
  { value: 'Creche', label: 'Creche', stage: 'Creche' },
  { value: 'Nursery 1', label: 'Nursery 1', stage: 'Nursery' },
  { value: 'Nursery 2', label: 'Nursery 2', stage: 'Nursery' },
  { value: 'KG 1', label: 'KG 1', stage: 'KG' },
  { value: 'KG 2', label: 'KG 2', stage: 'KG' },
  { value: 'Basic 1', label: 'Basic 1', stage: 'Primary' },
  { value: 'Basic 2', label: 'Basic 2', stage: 'Primary' },
  { value: 'Basic 3', label: 'Basic 3', stage: 'Primary' },
  { value: 'Basic 4', label: 'Basic 4', stage: 'Primary' },
  { value: 'Basic 5', label: 'Basic 5', stage: 'Primary' },
  { value: 'Basic 6', label: 'Basic 6', stage: 'Primary' },
  { value: 'JHS 1', label: 'JHS 1 (Basic 7)', stage: 'JHS' },
  { value: 'JHS 2', label: 'JHS 2 (Basic 8)', stage: 'JHS' },
  { value: 'JHS 3', label: 'JHS 3 (Basic 9)', stage: 'JHS' },
];

const GRADE_LEVEL_VALUES = GRADE_LEVELS.map((g) => g.value);
const LEVEL_ORDER_BY_GRADE = Object.fromEntries(GRADE_LEVELS.map((g, i) => [g.value, i]));
const STAGE_BY_GRADE_LEVEL = Object.fromEntries(GRADE_LEVELS.map((g) => [g.value, g.stage]));

// Custom/legacy classes with no gradeLevel sort LAST, never first -- Mongo
// sorts null ascending-first, which would put them above Creche.
const UNRANKED_LEVEL_ORDER = 999;

// JHS 3 (Basic 9) is the last rung -- pupils exit the basic-school system via
// BECE into SHS/TVET, which this app doesn't model, so there is no "next"
// class to promote into. Derived from the list's length rather than stored
// as a flag on Class, since this is a fixed fact of the Ghanaian basic-
// education ladder, not a per-school setting that could drift out of sync.
const TERMINAL_LEVEL_ORDER = GRADE_LEVELS.length - 1;

module.exports = {
  GRADE_LEVELS, GRADE_LEVEL_VALUES, LEVEL_ORDER_BY_GRADE, STAGE_BY_GRADE_LEVEL, UNRANKED_LEVEL_ORDER, TERMINAL_LEVEL_ORDER,
};
