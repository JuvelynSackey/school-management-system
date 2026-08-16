const jwt = require('jsonwebtoken');
const config = require('../config');

const signToken = (user) => jwt.sign({ id: user.id, role: user.role }, config.jwt.secret, {
  expiresIn: config.jwt.expiresIn,
});

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  status: user.status,
});

module.exports = { signToken, toPublicUser };
