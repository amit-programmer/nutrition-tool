/**
 * errorHandler.js
 * -----------------------------------------------------------------------
 * Global Express error-handling middleware. Must be registered LAST,
 * after all routes. Ensures raw stack traces / SDK internals are never
 * leaked to the client, especially in production.
 * -----------------------------------------------------------------------
 */

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log full detail server-side for debugging.
  // eslint-disable-next-line no-console
  console.error('[errorHandler]', err);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode || err.status || 500;

  const isProduction = process.env.NODE_ENV === 'production';

  const body = {
    success: false,
    error: err.publicMessage || 'Something went wrong. Please try again shortly.',
  };

  if (!isProduction) {
    body.debug = {
      message: err.message,
      stack: err.stack,
    };
  }

  res.status(status).json(body);
}

module.exports = errorHandler;
