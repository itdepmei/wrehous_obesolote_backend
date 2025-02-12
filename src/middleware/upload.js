const { diskStorage } = require("multer");
const { extname } = require("path");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer storage
const storage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'src/upload_Data/';
    // Check if directory exists
    if (!fs.existsSync(uploadPath)) {
      // Create the directory if it doesn't exist
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, file.fieldname + '-' + Date.now() + ext);
  },
});

// Define custom file filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Allow file upload
  } else {
    cb(
      new Error("Only images (jpeg, png) or documents (pdf, docx, xlsx) are allowed"),
      false
    ); // Reject file upload
  }
};

// Initialize multer middleware with storage and file filter
const upload = multer({
  storage,
  fileFilter,
});

module.exports = upload;
