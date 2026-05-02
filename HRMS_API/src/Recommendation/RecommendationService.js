import pool from "../../config/database.js";
import { CrudService } from "../Commons/CommonServices.js";
import { sendEmail } from "../../utils/emailService.js";
import { generateRecommendationHTML, getRecommendationImageAttachments } from "../utils/RecommendationDocumentBuilder.js";

export class RecommendationService extends CrudService {
  constructor() {
    super("recommendations", "id", true);
  }

  async requestRecommendation(payload) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { employeeId, recommendationType, reason, degreeProgram, institutionName } = payload;

      // Ensure employee exists
      const [empRows] = await connection.query(
        `SELECT e.id FROM employee e WHERE e.id = UUID_TO_BIN(?)`,
        [employeeId]
      );
      if (!empRows.length) throw new Error("Employee not found");

      // Check for an already pending request of the same type to avoid spam
      const [pendingRequests] = await connection.query(
        `SELECT id FROM recommendations 
         WHERE employeeId = UUID_TO_BIN(?) AND recommendationType = ? AND status = 'PENDING'`,
        [employeeId, recommendationType]
      );
      if (pendingRequests.length > 0) {
        throw new Error("You already have a pending recommendation request of this type.");
      }

      const insertQuery = `
        INSERT INTO recommendations (
          id, employeeId, recommendationType, reason, degreeProgram, institutionName, status, requestDate
        ) VALUES (UUID_TO_BIN(UUID()), UUID_TO_BIN(?), ?, ?, ?, ?, 'PENDING', CURDATE())
      `;
      
      await connection.query(insertQuery, [
        employeeId, 
        recommendationType, 
        reason || null, 
        degreeProgram || null, 
        institutionName || null
      ]);

      await connection.commit();
      return { success: true, message: "Recommendation request submitted successfully." };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getAllRequests(filters = {}) {
    const { page = 1, limit = 10, status, search, type, employeeId } = filters;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        BIN_TO_UUID(r.id) as id,
        BIN_TO_UUID(r.employeeId) as employeeId,
        r.recommendationType,
        r.reason,
        r.degreeProgram,
        r.institutionName,
        r.status,
        r.requestDate,
        r.approvedDate,
        r.rejectionReason,
        r.createdAt,
        ep.firstName,
        ep.middleName,
        ep.lastName,
        ep.profilePicture,
        d.departmentName
      FROM recommendations r
      LEFT JOIN employeePersonal ep ON r.employeeId = ep.employeeId
      LEFT JOIN employee e ON r.employeeId = e.id
      LEFT JOIN department d ON e.departmentId = d.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM recommendations r 
      LEFT JOIN employeePersonal ep ON r.employeeId = ep.employeeId 
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    if (employeeId) {
      query += ` AND r.employeeId = UUID_TO_BIN(?)`;
      countQuery += ` AND r.employeeId = UUID_TO_BIN(?)`;
      params.push(employeeId);
      countParams.push(employeeId);
    }

    if (status) {
      query += ` AND r.status = ?`;
      countQuery += ` AND r.status = ?`;
      params.push(status);
      countParams.push(status);
    }

    if (type) {
      query += ` AND r.recommendationType = ?`;
      countQuery += ` AND r.recommendationType = ?`;
      params.push(type);
      countParams.push(type);
    }
    
    if (search) {
      const s = `%${search}%`;
      const searchClause = ` AND (ep.firstName LIKE ? OR ep.lastName LIKE ?)`;
      query += searchClause;
      countQuery += searchClause;
      params.push(s, s);
      countParams.push(s, s);
    }

    query += ` ORDER BY r.createdAt DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [data] = await pool.query(query, params);
    const [countResult] = await pool.query(countQuery, countParams);

    return {
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    };
  }

  async getRequestById(id) {
    const [rows] = await pool.query(`
      SELECT 
        BIN_TO_UUID(r.id) as id,
        BIN_TO_UUID(r.employeeId) as employeeId,
        r.recommendationType,
        r.reason,
        r.degreeProgram,
        r.institutionName,
        r.status,
        r.requestDate,
        r.approvedDate,
        r.rejectionReason,
        r.createdAt,
        ep.firstName,
        ep.middleName,
        ep.lastName,
        d.departmentName
      FROM recommendations r
      LEFT JOIN employeePersonal ep ON r.employeeId = ep.employeeId
      LEFT JOIN employee e ON r.employeeId = e.id
      LEFT JOIN department d ON e.departmentId = d.id
      WHERE r.id = UUID_TO_BIN(?)
    `, [id]);
    
    if (!rows.length) throw new Error("Recommendation request not found");
    return rows[0];
  }

  async updateStatus(requestId, status, approvedByUserId, hrName, payload = {}) {
    const connection = await pool.getConnection();
    let approvalEmailPayload = null;
    
    try {
      await connection.beginTransaction();

      const [requestRows] = await connection.query(
        `SELECT BIN_TO_UUID(employeeId) as employeeId, recommendationType, status, degreeProgram, institutionName
         FROM recommendations WHERE id = UUID_TO_BIN(?)`,
        [requestId]
      );

      if (!requestRows.length) throw new Error("Recommendation request not found");
      const reqDetails = requestRows[0];
      
      if (reqDetails.status !== "PENDING") {
        throw new Error(`Cannot update request. Status is already ${reqDetails.status}`);
      }

      const { rejectionReason } = payload;

      await connection.query(
        `UPDATE recommendations 
         SET status = ?, approvedBy = UUID_TO_BIN(?), approvedDate = CURDATE(), rejectionReason = ?
         WHERE id = UUID_TO_BIN(?)`,
        [status, approvedByUserId, rejectionReason || null, requestId]
      );

      // Create Notification
      const [userRows] = await connection.query(
        `SELECT BIN_TO_UUID(id) as userId FROM users WHERE employeeId = UUID_TO_BIN(?)`, 
        [reqDetails.employeeId]
      );
      
      if (userRows.length > 0) {
        const notifType = status === 'APPROVED' ? 'SUCCESS' : 'ERROR';
        const msg = status === 'APPROVED' ? 
          `Your recommendation request (${reqDetails.recommendationType}) has been approved.` : 
          `Your recommendation request (${reqDetails.recommendationType}) was rejected.`;
          
        await connection.query(
          `INSERT INTO notifications (
            id, userId, title, message, notificationType, relatedModule, relatedId
          ) VALUES (UUID_TO_BIN(UUID()), UUID_TO_BIN(?), ?, ?, ?, 'GENERAL', UUID_TO_BIN(?))`,
          [userRows[0].userId, `Recommendation ${status}`, msg, notifType, requestId]
        );
      }

      // If APPROVED, prepare HTML email
      if (status === 'APPROVED') {
        const [empRows] = await connection.query(
          `SELECT ep.firstName, ep.middleName, ep.lastName, ep.personalEmail, ee.officialEmail, d.departmentName, e.hireDate
           FROM employee e
           LEFT JOIN employeePersonal ep ON e.id = ep.employeeId
           LEFT JOIN employeeEmployment ee ON e.id = ee.employeeId
           LEFT JOIN department d ON e.departmentId = d.id
           WHERE e.id = UUID_TO_BIN(?)`,
           [reqDetails.employeeId]
        );

        if (empRows.length > 0) {
          const employee = empRows[0];
          const recData = {
            id: requestId,
            recommendationType: reqDetails.recommendationType,
            degreeProgram: reqDetails.degreeProgram,
            institutionName: reqDetails.institutionName
          };

          try {
            const htmlContent = generateRecommendationHTML(employee, recData, hrName);
            const inlineAttachments = getRecommendationImageAttachments();
            
            const targetEmail = employee.officialEmail || employee.personalEmail || null;

            if (targetEmail) {
              approvalEmailPayload = {
                to: targetEmail,
                subject: 'Approved Recommendation Letter - Injibara University',
                text: `Dear ${employee.firstName}, your recommendation letter request has been approved. Please view the attached inline document content in this email.`,
                html: htmlContent,
                attachments: inlineAttachments,
              };
            }
          } catch (emailErr) {
            console.error("Failed to build approval email payload:", emailErr);
          }
        }
      }

      await connection.commit();

      if (approvalEmailPayload) {
        try {
          await sendEmail(approvalEmailPayload);
        } catch (emailErr) {
          console.error("Failed to send approval email:", emailErr);
        }
      }

      return { success: true, message: `Recommendation request ${status.toLowerCase()} successfully` };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export const recommendationService = new RecommendationService();
