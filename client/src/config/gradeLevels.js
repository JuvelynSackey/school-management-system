// Mirrors server/src/constants/gradeLevels.js's GRADE_LEVELS values/labels.
// The server derives stage/levelOrder authoritatively -- the client only
// needs this picklist.
export const GRADE_LEVELS = [
  { value: 'Creche', label: 'Creche' },
  { value: 'Nursery 1', label: 'Nursery 1' },
  { value: 'Nursery 2', label: 'Nursery 2' },
  { value: 'KG 1', label: 'KG 1' },
  { value: 'KG 2', label: 'KG 2' },
  { value: 'Basic 1', label: 'Basic 1' },
  { value: 'Basic 2', label: 'Basic 2' },
  { value: 'Basic 3', label: 'Basic 3' },
  { value: 'Basic 4', label: 'Basic 4' },
  { value: 'Basic 5', label: 'Basic 5' },
  { value: 'Basic 6', label: 'Basic 6' },
  { value: 'JHS 1', label: 'JHS 1 (Basic 7)' },
  { value: 'JHS 2', label: 'JHS 2 (Basic 8)' },
  { value: 'JHS 3', label: 'JHS 3 (Basic 9)' },
];

export const STAGE_BY_GRADE_LEVEL = {
  Creche: 'Creche',
  'Nursery 1': 'Nursery',
  'Nursery 2': 'Nursery',
  'KG 1': 'KG',
  'KG 2': 'KG',
  'Basic 1': 'Primary',
  'Basic 2': 'Primary',
  'Basic 3': 'Primary',
  'Basic 4': 'Primary',
  'Basic 5': 'Primary',
  'Basic 6': 'Primary',
  'JHS 1': 'JHS',
  'JHS 2': 'JHS',
  'JHS 3': 'JHS',
};

export const UNRANKED_LEVEL_ORDER = 999;

// JHS 3 (Basic 9) is the terminal rung -- pupils exit via BECE, no "next"
// class exists to promote into. Derived from the list length so it can
// never drift out of sync with GRADE_LEVELS above.
export const TERMINAL_LEVEL_ORDER = GRADE_LEVELS.length - 1;
