// middleware/upload.js
const multer = require('multer');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const compressAndSave = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const filename = `report-${Date.now()}.jpg`;
    const outputPath = path.join(UPLOAD_DIR, filename);

    const image = await Jimp.read(req.file.buffer);

    // Resize if width > 1200
    if (image.getWidth() > 1200) {
      image.resize(1200, Jimp.AUTO);
    }

    await image.quality(80).writeAsync(outputPath);

    // If still over 500KB, reduce quality further
    let stats = fs.statSync(outputPath);
    if (stats.size > 500 * 1024) {
      image.resize(800, Jimp.AUTO).quality(60);
      await image.writeAsync(outputPath);
    }

    req.file.filename = filename;
    req.file.path = outputPath;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { upload, compressAndSave };
