const { getCurrentSchoolId } = require('../middleware/tenantContext');

// NOT YET ATTACHED to any schema (Phase 1, stage 1 — see the multi-tenant
// plan). Written now so the mechanism exists and can be reviewed, but
// `schema.plugin(tenantScopePlugin)` is only added to each model once the
// data migration (stage 2) and auth wiring (stage 3) are in place —
// attaching it earlier would make every query/save throw immediately,
// since nothing yet populates a schoolId to read from context.

const SCOPED_QUERY_OPS = [
  'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete',
  'countDocuments', 'updateMany', 'deleteMany', 'distinct',
];

function applyQueryScope() {
  if (this.getOptions().skipTenantScope) return;
  if (this.getFilter().schoolId !== undefined) return;

  const schoolId = getCurrentSchoolId();
  if (!schoolId) {
    throw new Error(`Tenant scope missing: ${this.model?.modelName || 'query'}.${this.op} ran without schoolId context`);
  }
  this.where({ schoolId });
}

function stampSchoolIdOnSave(next) {
  if (this.isNew && this.schoolId === undefined) {
    const schoolId = getCurrentSchoolId();
    if (!schoolId) {
      return next(new Error(`Tenant scope missing: cannot save a new ${this.constructor.modelName} without schoolId context`));
    }
    this.schoolId = schoolId;
  }
  return next();
}

function stampSchoolIdOnInsertMany(next, docs) {
  const schoolId = getCurrentSchoolId();
  for (const doc of docs) {
    if (doc.schoolId === undefined) {
      if (!schoolId) return next(new Error('Tenant scope missing: insertMany ran without schoolId context'));
      doc.schoolId = schoolId;
    }
  }
  return next();
}

const tenantScopePlugin = (schema) => {
  SCOPED_QUERY_OPS.forEach((op) => schema.pre(op, applyQueryScope));
  schema.pre('save', stampSchoolIdOnSave);
  schema.pre('insertMany', stampSchoolIdOnInsertMany);
};

module.exports = tenantScopePlugin;
