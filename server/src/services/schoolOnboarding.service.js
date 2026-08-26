const { Class, Subject, ClassSubject } = require('../models');
const { runWithSchool } = require('../middleware/tenantContext');
const { LEVEL_ORDER_BY_GRADE } = require('../constants/gradeLevels');

// Maps a seeded class name to the existing Class.stage enum
// (['Creche','Nursery','KG','Primary','JHS']) so seeded classes show up
// correctly wherever the app already groups/filters by stage.
const STAGE_FOR_CLASS = (name) => {
  if (name.startsWith('Nursery')) return 'Nursery';
  if (name.startsWith('KG')) return 'KG';
  if (name.startsWith('Basic')) return 'Primary';
  if (name.startsWith('JHS')) return 'JHS';
  return null;
};

const CURRICULUM_TEMPLATES = {
  full_basic: ['Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6', 'JHS 1', 'JHS 2', 'JHS 3'],
  primary_only: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'],
  jhs_only: ['JHS 1', 'JHS 2', 'JHS 3'],
  blank: [],
};

const STANDARD_SUBJECTS = [
  { name: 'Mathematics', code: 'MATH' },
  { name: 'English Language', code: 'ENG' },
  { name: 'Integrated Science', code: 'SCI' },
  { name: 'Social Studies', code: 'SOC' },
  { name: 'Computing / ICT', code: 'COMP' },
  { name: 'Religious & Moral Education', code: 'RME' },
];

// Seeds a brand-new school's starting class/subject structure so it's
// usable the moment the first admin logs in, instead of an empty shell.
// 'blank' (Private Curriculum) seeds nothing — the school builds its own
// structure from scratch via the normal class/subject create endpoints.
const seedSchoolDefaults = async (schoolId, curriculumTemplate) => {
  const classNames = CURRICULUM_TEMPLATES[curriculumTemplate] ?? CURRICULUM_TEMPLATES.full_basic;
  if (classNames.length === 0) {
    return { classesCreated: 0, subjectsCreated: 0 };
  }

  return runWithSchool(schoolId, async () => {
    const classes = await Class.insertMany(
      classNames.map((name) => ({
        schoolId,
        name,
        stage: STAGE_FOR_CLASS(name),
        // Template names already equal the canonical gradeLevel values
        // (e.g. 'Basic 4'), so onboarded classes come out correctly ordered
        // with no separate admin step.
        gradeLevel: LEVEL_ORDER_BY_GRADE[name] !== undefined ? name : null,
        levelOrder: LEVEL_ORDER_BY_GRADE[name],
      })),
    );
    const subjects = await Subject.insertMany(
      STANDARD_SUBJECTS.map((s) => ({ schoolId, name: s.name, code: s.code })),
    );

    // academicTermId: null — a brand-new school has no AcademicTerm yet;
    // the existing subjects.controller.js assignToClass action already
    // treats a null term as "applies to every term" (its own unique index
    // is a partial index that excludes null-typed academicTermId docs).
    const links = [];
    classes.forEach((c) => {
      subjects.forEach((s) => {
        links.push({
          schoolId, classId: c._id, subjectId: s._id, academicTermId: null,
        });
      });
    });
    await ClassSubject.insertMany(links);

    return { classesCreated: classes.length, subjectsCreated: subjects.length };
  });
};

module.exports = { seedSchoolDefaults, CURRICULUM_TEMPLATES, STANDARD_SUBJECTS };
