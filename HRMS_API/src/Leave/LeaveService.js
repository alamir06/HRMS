import pool from "../../config/database.js";
import { CrudService } from "../Commons/CommonServices.js";

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

  async requestLeave(payload) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { employeeId, leaveType, startDate, endDate, reason, reasonAmharic, supportDocument } = payload;
      const totalDays = calculateWorkingDays(startDate, endDate);
      const year = new Date(startDate).getFullYear();

      if (totalDays <= 0) {
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
        // Trigger generic soft delete/resignation
        await connection.query(
          `UPDATE employee 
           SET employmentStatus = 'RESIGNED', terminationDate = ? 
           WHERE id = UUID_TO_BIN(?)`,
          [startDate, employeeId]
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
      }

      // Update the request status
      const { comments, commentsAmharic } = payload;
      await connection.query(
        `UPDATE leaveRequest 
         SET status = 'APPROVED', approvedBy = UUID_TO_BIN(?), approvedAt = NOW(), comments = ?, commentsAmharic = ?
         WHERE id = UUID_TO_BIN(?)`,
        [approvedBy, comments || null, commentsAmharic || null, requestId]
      );

      await connection.commit();
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

      return {
        balances,
        requests
      };
    } catch (error) {
      throw error;
    }
  }

  async getAllRequests(filters = {}) {
    const { page = 1, limit = 10, status, search } = filters;
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
        ep.firstName,
        ep.lastName,
        ep.profilePicture
      FROM leaveRequest lr
      LEFT JOIN employeePersonal ep ON lr.employeeId = ep.employeeId
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM leaveRequest lr LEFT JOIN employeePersonal ep ON lr.employeeId = ep.employeeId WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (status) {
      query += ` AND lr.status = ?`;
      countQuery += ` AND lr.status = ?`;
      params.push(status);
      countParams.push(status);
    }
    
    if (search) {
      const s = `%${search}%`;
      const searchClause = ` AND (ep.firstName LIKE ? OR ep.lastName LIKE ? OR lr.leaveType LIKE ?)`;
      query += searchClause;
      countQuery += searchClause;
      params.push(s, s, s);
      countParams.push(s, s, s);
    }

    query += ` ORDER BY lr.createdAt DESC LIMIT ? OFFSET ?`;
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
}

export const leaveService = new LeaveService();
