const { Guardian, StudentGuardian } = require('../models');

// Returns the student ids a parent user is allowed to act on — every child
// linked to their Guardian record via StudentGuardian.
const getParentStudentIds = async (userId) => {
  const guardian = await Guardian.findOne({ userId });
  if (!guardian) return { guardianId: null, studentIds: [] };

  const links = await StudentGuardian.find({ guardianId: guardian.id }, { studentId: 1 });
  return { guardianId: guardian.id, studentIds: links.map((l) => l.studentId.toString()) };
};

module.exports = { getParentStudentIds };
