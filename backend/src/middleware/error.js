export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, _req, res, _next) {
  console.error(error);

  let status = error.statusCode || 500;
  let message = error.message || 'Server error.';

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    status = 400;
  } else if (error.code === 11000) {
    status = 409;
    message = 'A record with this value already exists.';
  } else if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    status = 400;
    message = 'The request body contains invalid JSON.';
  }

  res.status(status).json({
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : message,
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  });
}
