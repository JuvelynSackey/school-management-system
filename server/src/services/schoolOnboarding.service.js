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

// A finer split than Class.stage: Basic 1-3 and Basic 4-6 share a stage
// ('Primary') but not a NaCCA subject list (French starts at Basic 4;
// Basic 1-3 keeps Physical Education & Health in that slot instead), and
// Nursery/KG both sit under no single existing stage split.
const CURRICULUM_BUCKET_FOR_CLASS = (name) => {
  if (name.startsWith('Nursery')) return 'nursery';
  if (name.startsWith('KG')) return 'kg';
  if (['Basic 1', 'Basic 2', 'Basic 3'].includes(name)) return 'lowerPrimary';
  if (['Basic 4', 'Basic 5', 'Basic 6'].includes(name)) return 'upperPrimary';
  if (name.startsWith('JHS')) return 'jhs';
  return null;
};

// NaCCA-aligned subject list per bucket. Deliberately no core/elective
// flag -- Subject and ClassSubject have no such field in this schema, and
// nothing here treats one subject as more "core" than another; the BECE
// Candidate Readiness Dashboard's own subjects_configured check only asks
// whether a class has ANY ClassSubject links at all, not which ones.
const NACCA_SUBJECTS_BY_BUCKET = {
  nursery: [
    { name: 'Language and Literacy', code: 'LANG' },
    { name: 'Numeracy', code: 'NUM' },
    { name: 'Creative Arts', code: 'CA' },
    { name: 'Our World Our People', code: 'OWOP' },
    { name: 'Social and Emotional Development', code: 'SED' },
  ],
  kg: [
    { name: 'Language and Literacy', code: 'LANG' },
    { name: 'Numeracy', code: 'NUM' },
    { name: 'Our World Our People', code: 'OWOP' },
    { name: 'Creative Arts', code: 'CA' },
  ],
  lowerPrimary: [
    { name: 'English Language', code: 'ENG' },
    { name: 'Mathematics', code: 'MATH' },
    { name: 'Science', code: 'SCI' },
    { name: 'Ghanaian Language and Culture', code: 'GLC' },
    { name: 'Religious and Moral Education', code: 'RME' },
    { name: 'Creative Arts', code: 'CA' },
    { name: 'Computing', code: 'ICT' },
    { name: 'Physical Education and Health', code: 'PEH' },
  ],
  upperPrimary: [
    { name: 'English Language', code: 'ENG' },
    { name: 'Mathematics', code: 'MATH' },
    { name: 'Science', code: 'SCI' },
    { name: 'Ghanaian Language and Culture', code: 'GLC' },
    { name: 'Religious and Moral Education', code: 'RME' },
    { name: 'Creative Arts', code: 'CA' },
    { name: 'Computing', code: 'ICT' },
    { name: 'French', code: 'FRE' },
  ],
  jhs: [
    { name: 'English Language', code: 'ENG' },
    { name: 'Mathematics', code: 'MATH' },
    { name: 'Integrated Science', code: 'ISCI' },
    { name: 'Social Studies', code: 'SOC' },
    { name: 'Ghanaian Language and Culture', code: 'GLC' },
    { name: 'Religious and Moral Education', code: 'RME' },
    { name: 'Creative Arts and Design', code: 'CAD' },
    { name: 'Career Technology', code: 'CTECH' },
    { name: 'Computing', code: 'ICT' },
    { name: 'French', code: 'FRE' },
  ],
};

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

    // Subject.name is unique per school, so a subject shared across
    // buckets (e.g. "English Language" for both Basic 3 and JHS 2) is
    // only ever inserted once -- deduplicated here by name before the
    // single insertMany, across only the buckets this template's classes
    // actually touch (a jhs_only school never gets a Nursery-only
    // subject like "Social and Emotional Development" created for it).
    const bucketsInUse = new Set(classNames.map((name) => CURRICULUM_BUCKET_FOR_CLASS(name)).filter(Boolean));
    const subjectByName = new Map();
    bucketsInUse.forEach((bucket) => {
      (NACCA_SUBJECTS_BY_BUCKET[bucket] || []).forEach((s) => subjectByName.set(s.name, s));
    });
    const subjects = await Subject.insertMany(
      [...subjectByName.values()].map((s) => ({ schoolId, name: s.name, code: s.code })),
    );
    const subjectIdByName = new Map(subjects.map((s) => [s.name, s._id]));

    // academicTermId: null — a brand-new school has no AcademicTerm yet;
    // the existing subjects.controller.js assignToClass action already
    // treats a null term as "applies to every term" (its own unique index
    // is a partial index that excludes null-typed academicTermId docs).
    const links = [];
    classes.forEach((c) => {
      const bucket = CURRICULUM_BUCKET_FOR_CLASS(c.name);
      (NACCA_SUBJECTS_BY_BUCKET[bucket] || []).forEach((s) => {
        links.push({
          schoolId, classId: c._id, subjectId: subjectIdByName.get(s.name), academicTermId: null,
        });
      });
    });
    await ClassSubject.insertMany(links);

    return { classesCreated: classes.length, subjectsCreated: subjects.length };
  });
};

module.exports = { seedSchoolDefaults, CURRICULUM_TEMPLATES, NACCA_SUBJECTS_BY_BUCKET };
