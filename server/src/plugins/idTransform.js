// Shared toJSON/toObject transform so every API response keeps the same
// shape it had under Sequelize: an `id` field (now a string ObjectId
// instead of an int) and no `_id`/`__v` noise.
const transform = (doc, ret) => {
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  return ret;
};

const idTransformPlugin = (schema) => {
  schema.set('toJSON', { virtuals: true, transform });
  schema.set('toObject', { virtuals: true, transform });
};

module.exports = idTransformPlugin;
