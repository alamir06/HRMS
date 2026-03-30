import multer from "multer";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class FileUploadService {
  constructor() {
    // Image configurations
    this.imageConfig = {
      allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      folder: "hrms/images",
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
      folder: "hrms/documents",
    };
  }

  // Configure multer for specific file type
  getMulterConfig(config, fileType = "image") {
    const storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: config.folder,
        resource_type: "auto",
        public_id: (req, file) => {
          return `${uuidv4()}`;
        },
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
  generateFileUrl(file) {
    if (!file) return null;
    return file.path;
  }

  // Extract public ID from Cloudinary URL
  extractPublicId(url) {
    if (!url) return null;
    try {
      const parts = url.split('/');
      const filenameWithExt = parts.pop();
      const folderPart = parts.pop(); 
      const baseFolder = parts.pop(); 
      const filename = filenameWithExt.split('.')[0];
      return `${baseFolder}/${folderPart}/${filename}`;
    } catch {
      return null;
    }
  }

  // Delete file from storage
  deleteFile(publicIdOrUrl, fileType = "image") {
    return new Promise((resolve, reject) => {
      let publicId = publicIdOrUrl;
      if (publicIdOrUrl && publicIdOrUrl.startsWith('http')) {
        publicId = this.extractPublicId(publicIdOrUrl) || publicIdOrUrl;
      }
      
      cloudinary.uploader.destroy(publicId, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
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
    return {
      originalName: file.originalname,
      fileName: file.filename, // This is the Cloudinary public_id and it includes the folder
      filePath: file.path,     // This is the Cloudinary secure URL
      fileSize: file.size,
      mimeType: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase(),
    };
  }
}

export const fileUploadService = new FileUploadService();
