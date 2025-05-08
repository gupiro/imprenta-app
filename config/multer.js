// config/multer.js
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// 1) Asegurar que exista el directorio de uploads
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 2) Configuración de almacenamiento
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    const ext  = path.extname(file.originalname);
    let base   = path.basename(file.originalname, ext)
                     .replace(/[^\w\-]/g, '_')  // deja solo letras, números, guiones y _
                     .slice(0, 50);              // limita a 50 caracteres
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

module.exports = multer({ storage });
