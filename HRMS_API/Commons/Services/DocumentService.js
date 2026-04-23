// File: DocumentService.js
import pool from "../../config/database.js";
import { fileUploadService } from "../FileUploadService.js";
import { translatePairs } from "../../utils/translationService.js";

export class DocumentService {
  constructor() {
    this.tableName = "employeeDocuments";
  }

  // Upload document with enhanced validation
  async uploadDocument(employeeId, file, documentData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const translatedDocument = await translatePairs(documentData, [
        { enKey: "documentName", amKey: "documentNameAmharic" },
        { enKey: "description", amKey: "descriptionAmharic" },
      ]);

      // Validate file as document
      fileUploadService.validateFile(file, 'document');

      // Generate file info
      const fileInfo = fileUploadService.getFileInfo(file, 'document');

      // Check for duplicate document types if needed
      if (documentData.documentType === 'IDDOCUMENT') {
        const [existingIdDocs] = await connection.query(
          `SELECT id FROM ${this.tableName} 
           WHERE employeeId = UUID_TO_BIN(?) AND documentType = 'IDDOCUMENT'`,
          [employeeId]
        );

        if (existingIdDocs.length > 0) {
          throw new Error("Employee already has an ID document. Please update the existing one.");
        }
      }

      // Insert document record
      const query = `
        INSERT INTO ${this.tableName} (
          employeeId, documentType, documentName, documentNameAmharic,
          fileName, filePath, fileSize, mimeType, issueDate, expiryDate,
          issuingAuthority, description, descriptionAmharic
        ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.query(query, [
        employeeId,
        translatedDocument.documentType,
        translatedDocument.documentName,
        translatedDocument.documentNameAmharic || null,
        fileInfo.originalName,
        fileInfo.filePath,
        fileInfo.fileSize,
        fileInfo.mimeType,
        translatedDocument.issueDate || null,
        translatedDocument.expiryDate || null,
        translatedDocument.issuingAuthority || null,
        translatedDocument.description || null,
        translatedDocument.descriptionAmharic || null
      ]);

      await connection.commit();

      // Get the created document
      const [documents] = await connection.query(
        `SELECT 
          BIN_TO_UUID(id) as id,
          documentType,
          documentName,
          filePath,
          isVerified,
          createdAt
         FROM ${this.tableName} WHERE id = ?`,
        [result.insertId]
      );

      return {
        document: documents[0],
        message: "Document uploaded successfully"
      };
    } catch (error) {
      await connection.rollback();
      
      // Delete uploaded file if transaction failed
      if (file) {
        await fileUploadService.deleteFile(file.filename, 'document').catch(console.error);
      }
      
      throw error;
    } finally {
      connection.release();
    }
  }

  // Upload multiple documents
  async uploadMultipleDocuments(employeeId, files, documentsData) {
    const connection = await pool.getConnection();
    const results = [];

    try {
      await connection.beginTransaction();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const documentData = documentsData[i];
        const translatedDocument = await translatePairs(documentData, [
          { enKey: "documentName", amKey: "documentNameAmharic" },
          { enKey: "description", amKey: "descriptionAmharic" },
        ]);

        // Validate file
        fileUploadService.validateFile(file, 'document');
        const fileInfo = fileUploadService.getFileInfo(file, 'document');

        const query = `
          INSERT INTO ${this.tableName} (
            employeeId, documentType, documentName, documentNameAmharic,
            fileName, filePath, fileSize, mimeType, issueDate, expiryDate,
            issuingAuthority, description, descriptionAmharic
          ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await connection.query(query, [
          employeeId,
          translatedDocument.documentType,
          translatedDocument.documentName,
          translatedDocument.documentNameAmharic || null,
          fileInfo.originalName,
          fileInfo.filePath,
          fileInfo.fileSize,
          fileInfo.mimeType,
          translatedDocument.issueDate || null,
          translatedDocument.expiryDate || null,
          translatedDocument.issuingAuthority || null,
          translatedDocument.description || null,
          translatedDocument.descriptionAmharic || null
        ]);

        results.push({
          documentId: result.insertId,
          filePath: fileInfo.filePath,
          documentName: documentData.documentName
        });
      }

      await connection.commit();
      return {
        documents: results,
        message: `${files.length} documents uploaded successfully`
      };
    } catch (error) {
      await connection.rollback();
      
      // Delete all uploaded files if transaction failed
      for (const file of files) {
        await fileUploadService.deleteFile(file.filename, 'document').catch(console.error);
      }
      
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get employee documents with filtering and pagination
  async getEmployeeDocuments(employeeId, options = {}) {
    try {
      const {
        documentType = null,
        page = 1,
        limit = 10,
        verifiedOnly = false
      } = options;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          BIN_TO_UUID(id) as id,
          BIN_TO_UUID(employeeId) as employeeId,
          documentType,
          documentName,
          documentNameAmharic,
          fileName,
          filePath,
          fileSize,
          mimeType,
          issueDate,
          expiryDate,
          issuingAuthority,
          description,
          descriptionAmharic,
          isVerified,
          BIN_TO_UUID(verifiedBy) as verifiedBy,
          verifiedAt,
          createdAt,
          updatedAt
        FROM ${this.tableName} 
        WHERE employeeId = UUID_TO_BIN(?)
      `;

      let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE employeeId = UUID_TO_BIN(?)`;
      const params = [employeeId];
      const countParams = [employeeId];

      // Add filters
      if (documentType) {
        query += ` AND documentType = ?`;
        countQuery += ` AND documentType = ?`;
        params.push(documentType);
        countParams.push(documentType);
      }

      if (verifiedOnly) {
        query += ` AND isVerified = TRUE`;
        countQuery += ` AND isVerified = TRUE`;
      }

      // Add sorting and pagination
      query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      const [documents] = await pool.query(query, params);
      const [countResult] = await pool.query(countQuery, countParams);

      return {
        documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Update document information
  async updateDocument(documentId, updateData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const translatedUpdate = await translatePairs(updateData, [
        { enKey: "documentName", amKey: "documentNameAmharic" },
        { enKey: "description", amKey: "descriptionAmharic" },
      ]);

      const allowedFields = [
        'documentName', 'documentNameAmharic', 'issueDate', 
        'expiryDate', 'issuingAuthority', 'description', 'descriptionAmharic'
      ];

      const updateFields = [];
      const values = [];

      Object.keys(translatedUpdate).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          values.push(translatedUpdate[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error("No valid fields to update");
      }

      const query = `
        UPDATE ${this.tableName} 
        SET ${updateFields.join(', ')}, updatedAt = NOW()
        WHERE id = UUID_TO_BIN(?)
      `;

      values.push(documentId);

      const [result] = await connection.query(query, values);

      if (result.affectedRows === 0) {
        throw new Error("Document not found");
      }

      await connection.commit();

      // Get updated document
      const [documents] = await connection.query(
        `SELECT BIN_TO_UUID(id) as id, documentName, documentType FROM ${this.tableName} WHERE id = UUID_TO_BIN(?)`,
        [documentId]
      );

      return {
        document: documents[0],
        message: "Document updated successfully"
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Delete document
  async deleteDocument(documentId) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get document info first
      const [documents] = await connection.query(
        `SELECT filePath, fileName FROM ${this.tableName} WHERE id = UUID_TO_BIN(?)`,
        [documentId]
      );

      if (documents.length === 0) {
        throw new Error("Document not found");
      }

      const document = documents[0];

      // Delete document record
      const [result] = await connection.query(
        `DELETE FROM ${this.tableName} WHERE id = UUID_TO_BIN(?)`,
        [documentId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Document not found");
      }

      // Delete physical file
      if (document.filePath) {
        await fileUploadService.deleteFile(document.filePath, 'document');
      }

      await connection.commit();

      return {
        message: "Document deleted successfully"
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Verify document
  async verifyDocument(documentId, verifiedBy) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET isVerified = TRUE, verifiedBy = UUID_TO_BIN(?), verifiedAt = NOW() 
        WHERE id = UUID_TO_BIN(?)
      `;

      const [result] = await pool.query(query, [verifiedBy, documentId]);

      if (result.affectedRows === 0) {
        throw new Error("Document not found");
      }

      return {
        message: "Document verified successfully"
      };
    } catch (error) {
      throw error;
    }
  }

  // Get documents expiring soon (for notifications)
  async getExpiringDocuments(daysThreshold = 30) {
    try {
      const query = `
        SELECT 
          BIN_TO_UUID(d.id) as id,
          BIN_TO_UUID(d.employeeId) as employeeId,
          d.documentName,
          d.documentType,
          d.expiryDate,
          d.filePath,
          BIN_TO_UUID(e.id) as employeeUuid,
          ep.firstName,
          ep.lastName,
          e.employeeCode
        FROM ${this.tableName} d
        LEFT JOIN employee e ON d.employeeId = e.id
        LEFT JOIN employeePersonal ep ON e.id = ep.employeeId
        WHERE d.expiryDate IS NOT NULL 
          AND d.expiryDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
          AND d.isVerified = TRUE
        ORDER BY d.expiryDate ASC
      `;

      const [documents] = await pool.query(query, [daysThreshold]);
      return documents;
    } catch (error) {
      throw error;
    }
  }
}

export const documentService = new DocumentService();
