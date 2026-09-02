const { validateClassScoreConfig, computeClassScoreFromDetails } = require('../src/services/result.service');

describe('result.service — validateClassScoreConfig', () => {
  test('accepts components whose maxMarks sum exactly to classScoreMax', () => {
    const components = [
      { key: 'exercise', label: 'Class Exercises', maxMarks: 20 },
      { key: 'assignment', label: 'Assignments', maxMarks: 15 },
      { key: 'project', label: 'Group Project', maxMarks: 15 },
    ];
    expect(validateClassScoreConfig(components, 50)).toBe(true);
  });

  test('rejects components that sum to less than classScoreMax', () => {
    const components = [{ key: 'exercise', label: 'Class Exercises', maxMarks: 20 }];
    expect(() => validateClassScoreConfig(components, 50)).toThrow('Component maximums must sum to exactly 50 (currently 20)');
  });

  test('rejects components that sum to more than classScoreMax', () => {
    const components = [
      { key: 'exercise', label: 'Class Exercises', maxMarks: 30 },
      { key: 'assignment', label: 'Assignments', maxMarks: 30 },
    ];
    expect(() => validateClassScoreConfig(components, 50)).toThrow('currently 60');
  });

  test('respects a non-default classScoreMax (a school need not use 50)', () => {
    const components = [
      { key: 'exercise', label: 'Class Exercises', maxMarks: 24 },
      { key: 'project', label: 'Group Project', maxMarks: 16 },
    ];
    expect(validateClassScoreConfig(components, 40)).toBe(true);
    expect(() => validateClassScoreConfig(components, 50)).toThrow();
  });

  test('rejects duplicate component keys', () => {
    const components = [
      { key: 'exercise', label: 'Exercises A', maxMarks: 25 },
      { key: 'exercise', label: 'Exercises B', maxMarks: 25 },
    ];
    expect(() => validateClassScoreConfig(components, 50)).toThrow('Component keys must be unique');
  });

  test('rejects an empty component list', () => {
    expect(() => validateClassScoreConfig([], 50)).toThrow('At least one component is required');
  });

  test('rejects a non-array components value', () => {
    expect(() => validateClassScoreConfig(undefined, 50)).toThrow('At least one component is required');
  });
});

describe('result.service — computeClassScoreFromDetails', () => {
  const components = [
    { key: 'exercise', label: 'Class Exercises', maxMarks: 20 },
    { key: 'assignment', label: 'Assignments', maxMarks: 15 },
    { key: 'project', label: 'Group Project', maxMarks: 15 },
  ];

  test('sums per-component marks into a single classScore', () => {
    const total = computeClassScoreFromDetails({ exercise: 18, assignment: 12, project: 14 }, components);
    expect(total).toBe(44);
  });

  test('accepts a partial breakdown (a component left at 0/omitted just contributes nothing)', () => {
    const total = computeClassScoreFromDetails({ exercise: 20 }, components);
    expect(total).toBe(20);
  });

  test('accepts a Mongoose Map the same as a plain object (re-validating an already-loaded Result)', () => {
    const map = new Map([['exercise', 18], ['assignment', 12], ['project', 14]]);
    expect(computeClassScoreFromDetails(map, components)).toBe(44);
  });

  test('returns 0 for empty/absent details', () => {
    expect(computeClassScoreFromDetails({}, components)).toBe(0);
    expect(computeClassScoreFromDetails(null, components)).toBe(0);
  });

  test('rejects a key that is not a configured component', () => {
    expect(() => computeClassScoreFromDetails({ exercise: 18, extra: 5 }, components))
      .toThrow('"extra" is not a configured class score component');
  });

  test('rejects a component value that exceeds its own maxMarks, even if the overall total would still be <= classScoreMax', () => {
    expect(() => computeClassScoreFromDetails({ exercise: 20, assignment: 20 }, components))
      .toThrow('"Assignments" cannot exceed 15');
  });

  test('rejects a negative component value', () => {
    expect(() => computeClassScoreFromDetails({ exercise: -5 }, components))
      .toThrow('"Class Exercises" must be a non-negative number');
  });

  test('rejects a non-numeric component value', () => {
    expect(() => computeClassScoreFromDetails({ exercise: 'eighteen' }, components))
      .toThrow('"Class Exercises" must be a non-negative number');
  });
});
