const { AsyncLocalStorage } = require('node:async_hooks');

// Carries the current request's schoolId across the async call chain so
// tenantScopePlugin can read it inside Mongoose query/save hooks without
// every controller/service having to thread it through explicitly.
const als = new AsyncLocalStorage();

const runWithSchool = (schoolId, fn) => als.run({ schoolId }, fn);
const getCurrentSchoolId = () => als.getStore()?.schoolId ?? null;

module.exports = { runWithSchool, getCurrentSchoolId };
