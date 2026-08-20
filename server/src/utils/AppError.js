class AppError extends Error {
  // `code` is an optional machine-readable tag (e.g. 'RESULT_LOCKED') for
  // callers that need to distinguish error kinds programmatically —
  // undefined by default, so every existing `new AppError(message, status)`
  // call site is unaffected.
  constructor(message, statusCode = 500, errors = undefined, code = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = code;
  }
}

module.exports = AppError;
