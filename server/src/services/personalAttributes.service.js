// Fixed report-card rating scale — not school-configurable (only the list of
// attributes a school tracks is, via the PersonalAttribute model). Kept as a
// single constant so terminalReports.controller.js's rating validation and
// the PersonalAttribute schema's embedded enum never drift apart.
const RATING_SCALE = ['Excellent', 'Very Good', 'Good', 'Fair', 'Needs Improvement'];

module.exports = { RATING_SCALE };
