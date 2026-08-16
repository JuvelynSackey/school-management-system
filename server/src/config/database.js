const mongoose = require('mongoose');
const config = require('./index');

mongoose.set('strictQuery', true);

async function connect() {
  await mongoose.connect(config.mongoUri);
}

module.exports = { mongoose, connect };
