import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

export class FileUploadService {
  constructor() {
    this.uploadDir = "uploads/";
    this.allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    this.maxFileSize = 5 * 1024 * 1024; // 5MB

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // Configure multer for file upload
  getMulterConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    });

    const fileFilter = (req, file, cb) => {
      if (this.allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."
          ),
          false
        );
      }
    };

    return multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: this.maxFileSize,
      },
    });
  }

  // Upload single file
  uploadSingle(fieldName) {
    return this.getMulterConfig().single(fieldName);
  }

  // Upload multiple files
  uploadMultiple(fieldName, maxCount = 5) {
    return this.getMulterConfig().array(fieldName, maxCount);
  }

  // Generate file URL (for local storage - replace with cloud URL when deployed)
  generateFileUrl(filename) {
    return `/uploads/${filename}`;
  }

  // Delete file from storage
  deleteFile(filename) {
    return new Promise((resolve, reject) => {
      const filePath = path.join(this.uploadDir, filename);

      fs.unlink(filePath, (err) => {
        if (err) {
          if (err.code === "ENOENT") {
            resolve(true); // File doesn't exist, consider it deleted
          } else {
            reject(err);
          }
        } else {
          resolve(true);
        }
      });
    });
  }

  // Validate file
  validateFile(file) {
    if (!file) {
      throw new Error("No file provided");
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error("Invalid file type");
    }

    if (file.size > this.maxFileSize) {
      throw new Error("File size exceeds limit");
    }

    return true;
  }
}

export const fileUploadService = new FileUploadService();
