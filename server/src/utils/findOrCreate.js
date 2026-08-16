// Mongoose equivalent of Sequelize's `Model.findOrCreate`. Returns
// [doc, wasCreated] so call sites can keep the same destructuring they
// used against Sequelize.
const findOrCreate = async (Model, { where, defaults = {}, session } = {}) => {
  const result = await Model.findOneAndUpdate(
    where,
    { $setOnInsert: { ...where, ...defaults } },
    { upsert: true, new: true, includeResultMetadata: true, session },
  );
  const wasCreated = !result.lastErrorObject.updatedExisting;
  const doc = Model.hydrate(result.value);
  return [doc, wasCreated];
};

module.exports = { findOrCreate };
