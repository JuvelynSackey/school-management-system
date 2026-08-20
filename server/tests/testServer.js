// Shared bootstrap for every test file: spins up an isolated in-memory
// MongoDB instance (mongodb-memory-server) so the suite never touches the
// real dev/Atlas database, sets the env vars server/src/config/index.js
// reads at require-time, and hands back the Express app for supertest.
//
// Each test FILE gets its own in-memory Mongo instance (Jest resets the
// module registry per file, so this is naturally isolated) — simpler and
// more robust than coordinating one shared instance across Jest's worker
// processes via globalSetup/globalTeardown.

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-jwt-secret-do-not-use-in-production';
process.env.CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
// Deliberately unconfigured so notifications.service.js's isEmailConfigured()
// is false and every send is skipped rather than hitting a real SMTP server.
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASSWORD = '';

const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

// A single-node replica set, not a plain standalone instance — the app
// genuinely uses multi-document transactions (studentEnrollment.service.js,
// students.controller.js's update), and MongoDB rejects transactions outright
// on a standalone mongod ("Transaction numbers are only allowed on a replica
// set member or mongos"). A 1-member replica set is still lightweight/in-memory
// but supports transactions like the real (Atlas) deployment does.
//
// Must be called from beforeAll before requiring anything that pulls in
// server/src/config (which reads process.env.MONGODB_URI at require-time).
const startTestServer = async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = mongod.getUri();
  // eslint-disable-next-line global-require
  const app = require('../src/app');
  await mongoose.connect(process.env.MONGODB_URI);
  return app;
};

const stopTestServer = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};

const clearTestDb = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

module.exports = { startTestServer, stopTestServer, clearTestDb };
