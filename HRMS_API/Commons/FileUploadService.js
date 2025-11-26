import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

export class FileUploadService {
  constructor() {
    this.uploadDir = "uploads/";

    // Image configurations
    this.imageConfig = {
      allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      subdirectory: "images/",
    };

    // Document configurations
    this.documentConfig = {
      allowedMimeTypes: [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      subdirectory: "documents/",
    };

    // Create upload directories if they don't exist
    this.createUploadDirectories();
  }

  createUploadDirectories() {
    const directories = [
      this.uploadDir,
      path.join(this.uploadDir, this.imageConfig.subdirectory),
      path.join(this.uploadDir, this.documentConfig.subdirectory),
    ];

    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Configure multer for specific file type
  getMulterConfig(config, fileType = "image") {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const subdir =
          fileType === "document"
            ? this.documentConfig.subdirectory
            : this.imageConfig.subdirectory;
        cb(null, path.join(this.uploadDir, subdir));
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    });

    const fileFilter = (req, file, cb) => {
      if (config.allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `Invalid file type. Allowed types: ${config.allowedMimeTypes.join(
              ", "
            )}`
          ),
          false
        );
      }
    };

    return multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: config.maxFileSize,
      },
    });
  }

  // Image upload methods
  uploadSingleImage(fieldName) {
    return this.getMulterConfig(this.imageConfig, "image").single(fieldName);
  }

  uploadMultipleImages(fieldName, maxCount = 5) {
    return this.getMulterConfig(this.imageConfig, "image").array(
      fieldName,
      maxCount
    );
  }

  // Document upload methods
  uploadSingleDocument(fieldName) {
    return this.getMulterConfig(this.documentConfig, "document").single(
      fieldName
    );
  }

  uploadMultipleDocuments(fieldName, maxCount = 10) {
    return this.getMulterConfig(this.documentConfig, "document").array(
      fieldName,
      maxCount
    );
  }

  // Generate file URL
  generateFileUrl(filename, fileType = "image") {
    const subdir =
      fileType === "document"
        ? this.documentConfig.subdirectory
        : this.imageConfig.subdirectory;
    return `/uploads/${subdir}${filename}`;
  }

  // Delete file from storage
  deleteFile(filename, fileType = "image") {
    return new Promise((resolve, reject) => {
      const subdir =
        fileType === "document"
          ? this.documentConfig.subdirectory
          : this.imageConfig.subdirectory;
      const filePath = path.join(this.uploadDir, subdir, filename);

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
  validateFile(file, fileType = "image") {
    if (!file) {
      throw new Error("No file provided");
    }

    const config =
      fileType === "document" ? this.documentConfig : this.imageConfig;

    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(
        `Invalid file type. Allowed types: ${config.allowedMimeTypes.join(
          ", "
        )}`
      );
    }

    if (file.size > config.maxFileSize) {
      throw new Error(
        `File size exceeds limit of ${config.maxFileSize / 1024 / 1024}MB`
      );
    }

    return true;
  }

  // Get file info
  getFileInfo(file, fileType = "image") {
    const config =
      fileType === "document" ? this.documentConfig : this.imageConfig;

    return {
      originalName: file.originalname,
      fileName: file.filename,
      filePath: this.generateFileUrl(file.filename, fileType),
      fileSize: file.size,
      mimeType: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase(),
    };
  }

  // Check if file exists
  fileExists(filename, fileType = "image") {
    const subdir =
      fileType === "document"
        ? this.documentConfig.subdirectory
        : this.imageConfig.subdirectory;
    const filePath = path.join(this.uploadDir, subdir, filename);

    return fs.existsSync(filePath);
  }

  // Get file statistics
  getFileStats(filename, fileType = "image") {
    return new Promise((resolve, reject) => {
      const subdir =
        fileType === "document"
          ? this.documentConfig.subdirectory
          : this.imageConfig.subdirectory;
      const filePath = path.join(this.uploadDir, subdir, filename);

      fs.stat(filePath, (err, stats) => {
        if (err) {
          reject(err);
        } else {
          resolve(stats);
        }
      });
    });
  }
}

export const fileUploadService = new FileUploadService();
