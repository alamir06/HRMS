import pool from "../../config/database.js";
import { CrudService } from "../Commons/CommonServices.js";
import { sendEmail } from "../../utils/emailService.js";
import { generateLeaveDocumentHTML, getLeaveDocumentImageAttachments } from "../../utils/LeaveDocumentBuilder.js";
import { toEthiopianDateString } from "../../utils/ethiopianDate.js";

// Helper to calculate working days strictly excluding Saturday (6) and Sunday (0)
const calculateWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Reset time portions for accurate day counting
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let count = 0;
  let current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Exclude Sunday (0) and Saturday (6)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

export class LeaveService extends CrudService {
  constructor() {
    super("leaveRequest", "id", true);
  }

  withEthiopianLeaveFields(record = {}) {
    if (!record || typeof record !== "object") return record;

    const out = { ...record };
    const fieldMap = {
      startDate: "startDateEth",
      endDate: "endDateEth",
      createdAt: "createdAtEth",
      approvedAt: "approvedAtEth",
    };

    Object.entries(fieldMap).forEach(([sourceField, ethField]) => {
      if (!Object.prototype.hasOwnProperty.call(out, sourceField)) return;
      out[ethField] = out[sourceField] ? toEthiopianDateString(out[sourceField]) : null;
    });

    return out;
  }

  async requestLeave(payload) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { employeeId, leaveType, startDate, endDate, reason, reasonAmharic, supportDocument } = payload;
      const totalDays = calculateWorkingDays(startDate, endDate);
      const year = new Date(startDate).getFullYear();

      if (totalDays <= 0 && leaveType !== "ORGANIZATION_LEAVE") {
        throw new Error("Invalid leave duration. Must include at least one working day.");
      }

      // Check balance if it's not a clear-out organization leave
      if (leaveType !== "ORGANIZATION_LEAVE") {
        const [balanceCheck] = await connection.query(
          `SELECT BIN_TO_UUID(id) as id, remainingDays 
           FROM leaveBalance 
           WHERE employeeId = UUID_TO_BIN(?) AND leaveType = ? AND year = ?`,
          [employeeId, leaveType, year]
        );

        if (!balanceCheck || balanceCheck.length === 0) {
          throw new Error(`No balance record found for ${leaveType} in year ${year}.`);
        }

        if (balanceCheck[0].remainingDays < totalDays) {
          throw new Error(
            `Insufficient balance. Requested: ${totalDays} days, Remaining: ${balanceCheck[0].remainingDays} days.`
          );
        }
      }

      // Create Leave Request
      const insertQuery = `
        INSERT INTO leaveRequest (
          id, employeeId, leaveType, startDate, endDate, totalDays, reason, reasonAmharic, supportDocument, status
        ) VALUES (UUID_TO_BIN(UUID()), UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `;
      
      await connection.query(insertQuery, [
        employeeId, leaveType, startDate, endDate, totalDays, reason || null, reasonAmharic || null, supportDocument || null
      ]);

      await connection.commit();
      return { success: true, message: "Leave request submitted successfully." };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async approveLeave(requestId, approvedBy, payload = {}) {
    const connection = await pool.getConnection();
    let approvalEmailPayload = null;
    try {
      await connection.beginTransaction();

      // Retrieve Request Details
      const [requestRows] = await connection.query(
        `SELECT BIN_TO_UUID(employeeId) as employeeId, leaveType, startDate, totalDays, status
         FROM leaveRequest WHERE id = UUID_TO_BIN(?)`,
        [requestId]
      );

      if (!requestRows.length) throw new Error("Leave request not found");
      
      const reqDetails = requestRows[0];
      if (reqDetails.status !== "PENDING") {
        throw new Error(`Cannot approve request. Status is already ${reqDetails.status}`);
      }

      const { employeeId, leaveType, startDate, totalDays } = reqDetails;
      const year = new Date(startDate).getFullYear();

      // Handle Logic based on Type
      if (leaveType === "ORGANIZATION_LEAVE") {
        // Trigger soft offboarding: keep records but disable access.
        await connection.query(
          `UPDATE employee 
           SET employmentStatus = 'TERMINATED', terminationDate = ? 
           WHERE id = UUID_TO_BIN(?)`,
          [startDate, employeeId]
        );

        await connection.query(
          `UPDATE users
           SET isActive = FALSE,
               updatedAt = NOW()
           WHERE employeeId = UUID_TO_BIN(?)`,
          [employeeId]
        );
      } else {
        // Deduct from standard balance
        const [updateResult] = await connection.query(
          `UPDATE leaveBalance 
           SET usedDays = usedDays + ?, remainingDays = remainingDays - ? 
           WHERE employeeId = UUID_TO_BIN(?) AND leaveType = ? AND year = ?`,
          [totalDays, totalDays, employeeId, leaveType, year]
        );

        if (updateResult.affectedRows === 0) {
          throw new Error("Failed to update leave balance. Possibly no balance allocation exists.");
        }

        // Set employee status to ONLEAVE
        await connection.query(
          `UPDATE employee SET employmentStatus = 'ONLEAVE' WHERE id = UUID_TO_BIN(?)`,
          [employeeId]
        );
      }

      // Update the request status
      const { comments, commentsAmharic } = payload;
      await connection.query(
        `UPDATE leaveRequest 
         SET status = 'APPROVED', approvedBy = UUID_TO_BIN(?), approvedAt = NOW(), comments = ?, commentsAmharic = ?
         WHERE id = UUID_TO_BIN(?)`,
        [approvedBy, comments || null, commentsAmharic || null, requestId]
      );

      // Prepare HTML email payload (actual sending happens after successful commit)
      const [empRows] = await connection.query(
        `SELECT ep.firstName, ep.lastName, ee.officialEmail, ep.personalEmail, d.departmentName, ds.title, ee.salary, e.hireDate, c.collegeName, e.employeeCode, e.employeeRole AS role
         FROM employee e
         LEFT JOIN employeePersonal ep ON e.id = ep.employeeId
         LEFT JOIN employeeEmployment ee ON e.id = ee.employeeId
         LEFT JOIN department d ON e.departmentId = d.id
         LEFT JOIN college c ON d.collegeId = c.id
         LEFT JOIN designations ds ON e.id = ds.employeeId
         WHERE e.id = UUID_TO_BIN(?)`,
         [employeeId]
      );

      if (empRows.length > 0) {
        const fullEmployee = empRows[0];
        const [leaveRow] = await connection.query(
          `SELECT leaveType, startDate, endDate, totalDays, reason, comments, createdAt, approvedAt 
           FROM leaveRequest WHERE id = UUID_TO_BIN(?)`,
          [requestId]
        );
        const leaveData = leaveRow[0];
        
        let balanceData = null;
        if (leaveData.leaveType !== 'ORGANIZATION_LEAVE') {
          const [balanceRow] = await connection.query(
            `SELECT remainingDays, totalAllocatedDays, usedDays FROM leaveBalance WHERE employeeId = UUID_TO_BIN(?) AND leaveType = ? AND year = YEAR(CURRENT_DATE)`,
            [employeeId, leaveData.leaveType]
          );
          if (balanceRow.length > 0) balanceData = balanceRow[0];
        }

        try {
          const htmlContent = generateLeaveDocumentHTML(fullEmployee, leaveData, balanceData);
          const inlineAttachments = getLeaveDocumentImageAttachments();
          const emailSubject = leaveData.leaveType === 'ORGANIZATION_LEAVE'
            ? 'Termination Clearance Letter - Injibara University'
            : 'Formal Leave Request Approved - Injibara University';

          let targetEmail = null;
          if (leaveData.leaveType === 'ORGANIZATION_LEAVE') {
            // Organization leave documents must be sent only to personal email.
            targetEmail = fullEmployee.personalEmail || null;
          } else {
            targetEmail = fullEmployee.officialEmail || fullEmployee.personalEmail || null;
          }

          if (targetEmail) {
            approvalEmailPayload = {
              to: targetEmail,
              subject: emailSubject,
              text: `Dear ${fullEmployee.firstName || 'Employee'}, your leave request has been approved. Please view the attached inline document content in this email.`,
              html: htmlContent,
              attachments: inlineAttachments,
            };
          } else {
            console.warn(`Approval email skipped for employee ${employeeId}: no eligible recipient email found.`);
          }
        } catch (emailErr) {
          console.error("Failed to build approval email payload:", emailErr);
          // Non-blocking, continue with approval
        }
      }

      await connection.commit();

      if (approvalEmailPayload) {
        try {
          await sendEmail(approvalEmailPayload);
        } catch (emailErr) {
          console.error("Failed to send approval email:", emailErr);
          // Non-blocking: approval already committed
        }
      }

      return { success: true, message: "Leave request approved successfully" };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async rejectLeave(requestId, approvedBy, payload) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [requestRows] = await connection.query(
        `SELECT status FROM leaveRequest WHERE id = UUID_TO_BIN(?)`,
        [requestId]
      );

      if (!requestRows.length) throw new Error("Leave request not found");
      if (requestRows[0].status !== "PENDING") {
        throw new Error(`Cannot reject request. Status is already ${requestRows[0].status}`);
      }

      const { comments, commentsAmharic } = payload;
      await connection.query(
        `UPDATE leaveRequest 
         SET status = 'REJECTED', approvedBy = UUID_TO_BIN(?), approvedAt = NOW(), comments = ?, commentsAmharic = ?
         WHERE id = UUID_TO_BIN(?)`,
        [approvedBy, comments || null, commentsAmharic || null, requestId]
      );

      await connection.commit();
      return { success: true, message: "Leave request rejected successfully" };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getEmployeeLeaveData(employeeId, year = new Date().getFullYear()) {
    try {
      // 1. Get Balances
      const [balances] = await pool.query(
        `SELECT BIN_TO_UUID(id) as id, leaveType, year, totalAllocatedDays, usedDays, remainingDays, carryForwardDays 
         FROM leaveBalance WHERE employeeId = UUID_TO_BIN(?) AND year = ?`,
        [employeeId, year]
      );

      // 2. Get Requests
      const [requests] = await pool.query(
        `SELECT BIN_TO_UUID(id) as id, leaveType, startDate, endDate, totalDays, status, reason, reasonAmharic, 
         BIN_TO_UUID(approvedBy) as approvedBy, approvedAt, comments, commentsAmharic, createdAt 
         FROM leaveRequest WHERE employeeId = UUID_TO_BIN(?) ORDER BY createdAt DESC`,
        [employeeId]
      );

      const requestsWithEthDates = requests.map((record) => this.withEthiopianLeaveFields(record));

      return {
        balances,
        requests: requestsWithEthDates
      };
    } catch (error) {
      throw error;
    }
  }

  async getAllRequests(filters = {}) {
    const { page = 1, limit = 10, status, search, period } = filters;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        BIN_TO_UUID(lr.id) as id,
        BIN_TO_UUID(lr.employeeId) as employeeId,
        lr.leaveType,
        lr.startDate,
        lr.endDate,
        lr.totalDays,
        lr.reason,
        lr.status,
        lr.createdAt,
        lr.supportDocument,
        ep.firstName,
        ep.lastName,
        ep.profilePicture
      FROM leaveRequest lr
      LEFT JOIN employeePersonal ep ON lr.employeeId = ep.employeeId
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM leaveRequest lr LEFT JOIN employeePersonal ep ON lr.employeeId = ep.employeeId WHERE 1=1`;
    let summaryQuery = `
      SELECT
        SUM(lr.status = 'PENDING') AS pending,
        SUM(lr.status = 'APPROVED') AS approved,
        SUM(lr.status = 'REJECTED') AS rejected
      FROM leaveRequest lr
      LEFT JOIN employeePersonal ep ON lr.employeeId = ep.employeeId
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];
    const summaryParams = [];

    if (status) {
      query += ` AND lr.status = ?`;
      countQuery += ` AND lr.status = ?`;
      summaryQuery += ` AND lr.status = ?`;
      params.push(status);
      countParams.push(status);
      summaryParams.push(status);
    }
    
    if (search) {
      const s = `%${search}%`;
      const searchClause = ` AND (ep.firstName LIKE ? OR ep.lastName LIKE ? OR lr.leaveType LIKE ?)`;
      query += searchClause;
      countQuery += searchClause;
      summaryQuery += searchClause;
      params.push(s, s, s);
      countParams.push(s, s, s);
      summaryParams.push(s, s, s);
    }

    if (period) {
      const normalizedPeriod = String(period).toUpperCase();
      let periodClause = "";

      if (normalizedPeriod === "DAILY") {
        periodClause = ` AND DATE(lr.createdAt) = CURDATE()`;
      } else if (normalizedPeriod === "WEEKLY") {
        periodClause = ` AND YEARWEEK(lr.createdAt, 1) = YEARWEEK(CURDATE(), 1)`;
      } else if (normalizedPeriod === "MONTHLY") {
        periodClause = ` AND YEAR(lr.createdAt) = YEAR(CURDATE()) AND MONTH(lr.createdAt) = MONTH(CURDATE())`;
      } else if (normalizedPeriod === "YEARLY") {
        periodClause = ` AND YEAR(lr.createdAt) = YEAR(CURDATE())`;
      }

      if (periodClause) {
        query += periodClause;
        countQuery += periodClause;
        summaryQuery += periodClause;
      }
    }

    query += ` ORDER BY lr.createdAt DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [data] = await pool.query(query, params);
    const dataWithEthDates = data.map((record) => this.withEthiopianLeaveFields(record));
    const [countResult] = await pool.query(countQuery, countParams);
    const [summaryResult] = await pool.query(summaryQuery, summaryParams);
    const summaryRow = summaryResult?.[0] || {};

    return {
      data: dataWithEthDates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      },
      summary: {
        pending: Number(summaryRow.pending || 0),
        approved: Number(summaryRow.approved || 0),
        rejected: Number(summaryRow.rejected || 0)
      }
    };
  }
}

export const leaveService = new LeaveService();
