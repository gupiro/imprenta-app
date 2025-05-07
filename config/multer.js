// config/multer.js
const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const original = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}-${original}`);
  }
});

const upload = multer({ storage });

module.exports = upload;
