// File: DocumentService.js
import pool from "../../config/database.js";
import { fileUploadService } from "../FileUploadService.js";

export class DocumentService {
  constructor() {
    this.tableName = "employee_documents";
  }

  // Upload document with enhanced validation
  async uploadDocument(employeeId, file, documentData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Validate file as document
      fileUploadService.validateFile(file, 'document');

      // Generate file info
      const fileInfo = fileUploadService.getFileInfo(file, 'document');

      // Check for duplicate document types if needed
      if (documentData.document_type === 'id_document') {
        const [existingIdDocs] = await connection.query(
          `SELECT id FROM ${this.tableName} 
           WHERE employee_id = UUID_TO_BIN(?) AND document_type = 'id_document'`,
          [employeeId]
        );

        if (existingIdDocs.length > 0) {
          throw new Error("Employee already has an ID document. Please update the existing one.");
        }
      }

      // Insert document record
      const query = `
        INSERT INTO ${this.tableName} (
          employee_id, document_type, document_name, document_name_amharic,
          file_name, file_path, file_size, mime_type, issue_date, expiry_date,
          issuing_authority, description, description_amharic
        ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.query(query, [
        employeeId,
        documentData.document_type,
        documentData.document_name,
        documentData.document_name_amharic || null,
        fileInfo.originalName,
        fileInfo.filePath,
        fileInfo.fileSize,
        fileInfo.mimeType,
        documentData.issue_date || null,
        documentData.expiry_date || null,
        documentData.issuing_authority || null,
        documentData.description || null,
        documentData.description_amharic || null
      ]);

      await connection.commit();

      // Get the created document
      const [documents] = await connection.query(
        `SELECT 
          BIN_TO_UUID(id) as id,
          document_type,
          document_name,
          file_path,
          is_verified,
          created_at
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

        // Validate file
        fileUploadService.validateFile(file, 'document');
        const fileInfo = fileUploadService.getFileInfo(file, 'document');

        const query = `
          INSERT INTO ${this.tableName} (
            employee_id, document_type, document_name, document_name_amharic,
            file_name, file_path, file_size, mime_type, issue_date, expiry_date,
            issuing_authority, description, description_amharic
          ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await connection.query(query, [
          employeeId,
          documentData.document_type,
          documentData.document_name,
          documentData.document_name_amharic || null,
          fileInfo.originalName,
          fileInfo.filePath,
          fileInfo.fileSize,
          fileInfo.mimeType,
          documentData.issue_date || null,
          documentData.expiry_date || null,
          documentData.issuing_authority || null,
          documentData.description || null,
          documentData.description_amharic || null
        ]);

        results.push({
          document_id: result.insertId,
          file_path: fileInfo.filePath,
          document_name: documentData.document_name
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
        document_type = null,
        page = 1,
        limit = 10,
        verified_only = false
      } = options;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          BIN_TO_UUID(id) as id,
          BIN_TO_UUID(employee_id) as employee_id,
          document_type,
          document_name,
          document_name_amharic,
          file_name,
          file_path,
          file_size,
          mime_type,
          issue_date,
          expiry_date,
          issuing_authority,
          description,
          description_amharic,
          is_verified,
          BIN_TO_UUID(verified_by) as verified_by,
          verified_at,
          created_at,
          updated_at
        FROM ${this.tableName} 
        WHERE employee_id = UUID_TO_BIN(?)
      `;

      let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE employee_id = UUID_TO_BIN(?)`;
      const params = [employeeId];
      const countParams = [employeeId];

      // Add filters
      if (document_type) {
        query += ` AND document_type = ?`;
        countQuery += ` AND document_type = ?`;
        params.push(document_type);
        countParams.push(document_type);
      }

      if (verified_only) {
        query += ` AND is_verified = TRUE`;
        countQuery += ` AND is_verified = TRUE`;
      }

      // Add sorting and pagination
      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
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

      const allowedFields = [
        'document_name', 'document_name_amharic', 'issue_date', 
        'expiry_date', 'issuing_authority', 'description', 'description_amharic'
      ];

      const updateFields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error("No valid fields to update");
      }

      const query = `
        UPDATE ${this.tableName} 
        SET ${updateFields.join(', ')}, updated_at = NOW()
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
        `SELECT BIN_TO_UUID(id) as id, document_name, document_type FROM ${this.tableName} WHERE id = UUID_TO_BIN(?)`,
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
        `SELECT file_path, file_name FROM ${this.tableName} WHERE id = UUID_TO_BIN(?)`,
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
      if (document.file_name) {
        await fileUploadService.deleteFile(document.file_name, 'document');
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
        SET is_verified = TRUE, verified_by = UUID_TO_BIN(?), verified_at = NOW() 
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
          BIN_TO_UUID(d.employee_id) as employee_id,
          d.document_name,
          d.document_type,
          d.expiry_date,
          d.file_path,
          BIN_TO_UUID(e.id) as employee_uuid,
          ep.first_name,
          ep.last_name,
          e.employee_code
        FROM ${this.tableName} d
        LEFT JOIN employee e ON d.employee_id = e.id
        LEFT JOIN employee_personal ep ON e.id = ep.employee_id
        WHERE d.expiry_date IS NOT NULL 
          AND d.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
          AND d.is_verified = TRUE
        ORDER BY d.expiry_date ASC
      `;

      const [documents] = await pool.query(query, [daysThreshold]);
      return documents;
    } catch (error) {
      throw error;
    }
  }
}

export const documentService = new DocumentService();
