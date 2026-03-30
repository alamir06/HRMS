import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import pool from "../../config/database.js";

const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");
const uuidSchema = z.string().uuid("Invalid UUID format");

const leaveApplicationSchema = z.object({
  employeeId: uuidSchema,
  leaveTypeId: uuidSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  reason: z.string().optional().nullable(),
  reasonAmharic: z.string().optional().nullable(),
});

const approvalSchema = z.object({
  approverId: uuidSchema,
  comments: z.string().optional().nullable(),
});

const rejectionSchema = approvalSchema.extend({
  comments: z.string().optional().nullable(),
});

const parseIsoDate = (value) => {
  const [year, month, day] = value.split("-").map((part) => parseInt(part, 10));
  return Date.UTC(year, month - 1, day);
};

const calculateInclusiveDays = (start, end) => {
  const startUtc = parseIsoDate(start);
  const endUtc = parseIsoDate(end);

  if (Number.isNaN(startUtc) || Number.isNaN(endUtc) || endUtc < startUtc) {
    throw new Error("Invalid date range");
  }

  const diff = endUtc - startUtc;
  return Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;
};

const mapBalanceRow = (row) => ({
  leaveTypeId: row.leaveTypeId,
  leaveName: row.leaveName,
  year: row.year,
  totalAllocatedDays: Number(row.totalAllocatedDays),
  usedDays: Number(row.usedDays || 0),
  remainingDays: Number(row.remainingDays || 0),
  carryForwardDays: Number(row.carryForwardDays || 0),
});

export const leaveController = {
  applyForLeave: async (req, res) => {
    const validation = leaveApplicationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    const { employeeId, leaveTypeId, startDate, endDate, reason, reasonAmharic } = validation.data;

    let totalDays;
    try {
      totalDays = calculateInclusiveDays(startDate, endDate);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    const requestId = uuidv4();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const year = parseInt(startDate.substring(0, 4), 10);

      const [balanceRows] = await connection.query(
        `SELECT 
           BIN_TO_UUID(id) as id,
           totalAllocatedDays,
           usedDays,
           remainingDays,
           carryForwardDays
         FROM leaveBalance
         WHERE employeeId = UUID_TO_BIN(?)
           AND leaveTypeId = UUID_TO_BIN(?)
           AND year = ?
         FOR UPDATE`,
        [employeeId, leaveTypeId, year]
      );

      if (balanceRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: "Leave balance not found for employee and leave type",
        });
      }

      const balance = balanceRows[0];
      const used = Number(balance.usedDays || 0);
      const remaining = Number(
        balance.remainingDays !== null && balance.remainingDays !== undefined
          ? balance.remainingDays
          : Number(balance.totalAllocatedDays || 0) + Number(balance.carryForwardDays || 0) - used
      );

      if (totalDays > remaining) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: "Insufficient leave balance",
          details: {
            requestedDays: totalDays,
            availableDays: remaining,
          },
        });
      }

      const [overlapRows] = await connection.query(
        `SELECT COUNT(*) as count
           FROM leaveRequest
          WHERE employeeId = UUID_TO_BIN(?)
            AND status IN ('PENDING', 'APPROVED')
            AND NOT (endDate < ? OR startDate > ?)`,
        [employeeId, startDate, endDate]
      );

      if (overlapRows[0].count > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: "Overlapping leave request exists for the selected period",
        });
      }

      await connection.query(
        `INSERT INTO leaveRequest (
           id,
           employeeId,
           leaveTypeId,
           startDate,
           endDate,
           totalDays,
           reason,
           reasonAmharic,
           status
         ) VALUES (
           UUID_TO_BIN(?),
           UUID_TO_BIN(?),
           UUID_TO_BIN(?),
           ?,
           ?,
           ?,
           ?,
           ?,
           'PENDING'
         )`,
        [
          requestId,
          employeeId,
          leaveTypeId,
          startDate,
          endDate,
          totalDays,
          reason || null,
          reasonAmharic || null,
        ]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: "Leave request submitted",
        data: {
          id: requestId,
          employeeId,
          leaveTypeId,
          startDate,
          endDate,
          totalDays: totalDays,
          status: "PENDING",
        },
      });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({
        success: false,
        error: "Failed to submit leave request",
        message: error.message,
      });
    } finally {
      connection.release();
    }
  },

  approveLeave: async (req, res) => {
    const { id } = req.params;
    const validation = approvalSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    const { approverId, comments } = validation.data;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [requestRows] = await connection.query(
        `SELECT 
           BIN_TO_UUID(employeeId) as employeeId,
           BIN_TO_UUID(leaveTypeId) as leaveTypeId,
           startDate,
           endDate,
           totalDays,
           status
         FROM leaveRequest
         WHERE id = UUID_TO_BIN(?)
         FOR UPDATE`,
        [id]
      );

      if (requestRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: "Leave request not found",
        });
      }

      const request = requestRows[0];

      if (request.status === "APPROVED") {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: "Leave request already approved",
        });
      }

      if (request.status === "REJECTED") {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: "Leave request already rejected",
        });
      }

      const totalDays = Number(request.totalDays) || calculateInclusiveDays(request.startDate, request.endDate);
      const year = parseInt(request.startDate.substring(0, 4), 10);

      const [balanceRows] = await connection.query(
        `SELECT 
           BIN_TO_UUID(id) as id,
           totalAllocatedDays,
           usedDays,
           remainingDays,
           carryForwardDays
         FROM leaveBalance
        WHERE employeeId = UUID_TO_BIN(?)
          AND leaveTypeId = UUID_TO_BIN(?)
          AND year = ?
        FOR UPDATE`,
        [request.employeeId, request.leaveTypeId, year]
      );

      if (balanceRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: "Leave balance not found for approval",
        });
      }

      const balance = balanceRows[0];
      const used = Number(balance.usedDays || 0);
      const remaining = Number(
        balance.remainingDays !== null && balance.remainingDays !== undefined
          ? balance.remainingDays
          : Number(balance.totalAllocatedDays || 0) + Number(balance.carryForwardDays || 0) - used
      );

      if (totalDays > remaining) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: "Insufficient leave balance to approve request",
        });
      }

      const newUsed = used + totalDays;
      const newRemaining = remaining - totalDays;

      await connection.query(
        `UPDATE leaveBalance
            SET usedDays = ?,
                remainingDays = ?,
                updatedAt = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)`,
        [newUsed, newRemaining, balance.id]
      );

      await connection.query(
        `UPDATE leaveRequest
            SET status = 'APPROVED',
                approvedBy = UUID_TO_BIN(?),
                approvedAt = CURRENT_TIMESTAMP,
                totalDays = ?,
                comments = ?,
                updatedAt = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)`,
        [approverId, totalDays, comments || null, id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: "Leave request approved",
        data: {
          id,
          totalDays: totalDays,
          usedDays: newUsed,
          remainingDays: newRemaining,
        },
      });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({
        success: false,
        error: "Failed to approve leave request",
        message: error.message,
      });
    } finally {
      connection.release();
    }
  },

  rejectLeave: async (req, res) => {
    const { id } = req.params;
    const validation = rejectionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    const { approverId, comments } = validation.data;

    try {
      const [result] = await pool.query(
        `UPDATE leaveRequest
            SET status = 'REJECTED',
                approvedBy = UUID_TO_BIN(?),
                approvedAt = CURRENT_TIMESTAMP,
                comments = ?,
                updatedAt = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)
            AND status = 'PENDING'`,
        [approverId, comments || null, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: "Leave request not found or already processed",
        });
      }

      res.json({
        success: true,
        message: "Leave request rejected",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to reject leave request",
        message: error.message,
      });
    }
  },

  getEmployeeLeaveSummary: async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { year = new Date().getFullYear() } = req.query;

      const [balances] = await pool.query(
        `SELECT 
           BIN_TO_UUID(lb.leaveTypeId) as leaveTypeId,
           lt.leaveName,
           lb.year,
           lb.totalAllocatedDays,
           lb.usedDays,
           lb.remainingDays,
           lb.carryForwardDays
         FROM leaveBalance lb
         JOIN leaveTypes lt ON lb.leaveTypeId = lt.id
        WHERE lb.employeeId = UUID_TO_BIN(?)
          AND lb.year = ?`,
        [employeeId, year]
      );

      const [requests] = await pool.query(
        `SELECT status, COUNT(*) as count
           FROM leaveRequest
          WHERE employeeId = UUID_TO_BIN(?)
            AND YEAR(startDate) = ?
          GROUP BY status`,
        [employeeId, year]
      );

      const statusTotals = requests.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          balances: balances.map(mapBalanceRow),
          requestStatus: statusTotals,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to build leave summary",
        message: error.message,
      });
    }
  },

  getEmployeeLeaveHistory: async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { limit = 50, page = 1, status } = req.query;

      const pageInt = parseInt(page, 10) || 1;
      const limitInt = Math.min(parseInt(limit, 10) || 50, 100);
      const offset = (pageInt - 1) * limitInt;

      const conditions = ["lr.employeeId = UUID_TO_BIN(?)"];
      const params = [employeeId];

      if (status) {
        conditions.push("lr.status = ?");
        params.push(status);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      const [records] = await pool.query(
        `SELECT 
           BIN_TO_UUID(lr.id) as id,
           BIN_TO_UUID(lr.leaveTypeId) as leaveTypeId,
           lt.leaveName,
           lr.startDate,
           lr.endDate,
           lr.totalDays,
           lr.status,
           lr.reason,
           lr.comments,
           lr.createdAt,
           lr.updatedAt
         FROM leaveRequest lr
         JOIN leaveTypes lt ON lr.leaveTypeId = lt.id
         ${whereClause}
         ORDER BY lr.startDate DESC
         LIMIT ? OFFSET ?`,
        [...params, limitInt, offset]
      );

      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total
           FROM leaveRequest lr
         ${whereClause}`,
        params
      );

      res.json({
        success: true,
        data: records,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limitInt) || 0,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch leave history",
        message: error.message,
      });
    }
  },
};
