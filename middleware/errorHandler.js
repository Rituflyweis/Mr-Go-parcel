const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Multer errors (bad file type from our fileFilter, wrong field name, size limit
  // exceeded, etc.) are the client's fault, not the server's — surface them as 400s.
  if (err.name === "MulterError" || err.message === "Only images and PDFs are allowed") {
    statusCode = 400;
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }

  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
