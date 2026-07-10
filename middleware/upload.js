const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|pdf/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error("Only images and PDFs are allowed"));
};

const multerInstance = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Controllers store `file.path` straight into the DB and serve it back via the
// `/uploads` static route, so it needs to stay a relative "uploads/<filename>" string
// even though the disk write itself uses an absolute, cwd-independent directory.
const toRelativePath = (file) => { file.path = path.join("uploads", file.filename); };
const relativizePaths = (req, res, next) => {
  if (req.file) toRelativePath(req.file);
  if (req.files) (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()).forEach(toRelativePath);
  next();
};

const wrap = (multerMiddleware) => (...args) => {
  const middleware = multerMiddleware(...args);
  return (req, res, next) => middleware(req, res, (err) => (err ? next(err) : relativizePaths(req, res, next)));
};

const upload = {
  single: wrap(multerInstance.single.bind(multerInstance)),
  array: wrap(multerInstance.array.bind(multerInstance)),
  fields: wrap(multerInstance.fields.bind(multerInstance)),
};

module.exports = upload;
