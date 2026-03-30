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

  getMulterConfig(config, fileType = "image") {
    const storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: async (req, file) => {
        // ALWAYS use auto so Cloudinary can process PDFs as documents natively.
        // The 401 errors are Cloudinary account security settings blocking raw files!
        const resourceType = "auto";
        
        // Extract original extension
        const originalNameParts = file.originalname.split('.');
        const ext = originalNameParts.length > 1 ? `.${originalNameParts.pop()}` : '';
        
        // Force the extension onto the public_id so Cloudinary URLs include it
        const publicId = `${uuidv4()}${ext}`;

        return {
          folder: config.folder,
          resource_type: resourceType,
          public_id: publicId,
        };
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

  // Extract public ID and resource type from Cloudinary URL
  extractCloudinaryInfo(url) {
    if (!url) return null;
    try {
      const parts = url.split('/');
      const filenameWithExt = parts.pop();
      const folderPart = parts.pop(); 
      const baseFolder = parts.pop(); 
      
      // Look for resource type in the URL (usually before /upload/)
      const isRaw = url.includes('/raw/upload/');
      const resourceType = isRaw ? 'raw' : 'image';
      
      // For raw files, Cloudinary public_id INCLUDES the extension.
      // For images, it typically does not.
      const filename = isRaw ? filenameWithExt : filenameWithExt.split('.')[0];
      
      return {
        publicId: `${baseFolder}/${folderPart}/${filename}`,
        resourceType
      };
    } catch {
      return null;
    }
  }

  // Delete file from storage
  deleteFile(publicIdOrUrl, fileType = "image") {
    return new Promise((resolve, reject) => {
      let publicId = publicIdOrUrl;
      let resourceType = fileType === "document" ? "raw" : "image"; // Fallback default

      if (publicIdOrUrl && publicIdOrUrl.startsWith('http')) {
        const info = this.extractCloudinaryInfo(publicIdOrUrl);
        if (info) {
          publicId = info.publicId;
          resourceType = info.resourceType;
        }
      }
      
      cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (err, result) => {
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
