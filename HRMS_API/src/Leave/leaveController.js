import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import pool from "../../config/database.js";

const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");
const uuidSchema = z.string().uuid("Invalid UUID format");

const leaveApplicationSchema = z.object({
  employee_id: uuidSchema,
  leave_type_id: uuidSchema,
  start_date: dateSchema,
  end_date: dateSchema,
  reason: z.string().optional().nullable(),
  reason_amharic: z.string().optional().nullable(),
});

const approvalSchema = z.object({
  approver_id: uuidSchema,
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
  leave_type_id: row.leave_type_id,
  leave_name: row.leave_name,
  year: row.year,
  total_allocated_days: Number(row.total_allocated_days),
  used_days: Number(row.used_days || 0),
  remaining_days: Number(row.remaining_days || 0),
  carry_forward_days: Number(row.carry_forward_days || 0),
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

    const { employee_id, leave_type_id, start_date, end_date, reason, reason_amharic } = validation.data;

    let totalDays;
    try {
      totalDays = calculateInclusiveDays(start_date, end_date);
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

      const year = parseInt(start_date.substring(0, 4), 10);

      const [balanceRows] = await connection.query(
        `SELECT 
           BIN_TO_UUID(id) as id,
           total_allocated_days,
           used_days,
           remaining_days,
           carry_forward_days
         FROM leave_balance
         WHERE employee_id = UUID_TO_BIN(?)
           AND leave_type_id = UUID_TO_BIN(?)
           AND year = ?
         FOR UPDATE`,
        [employee_id, leave_type_id, year]
      );

      if (balanceRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: "Leave balance not found for employee and leave type",
        });
      }

      const balance = balanceRows[0];
      const used = Number(balance.used_days || 0);
      const remaining = Number(
        balance.remaining_days !== null && balance.remaining_days !== undefined
          ? balance.remaining_days
          : Number(balance.total_allocated_days || 0) + Number(balance.carry_forward_days || 0) - used
      );

      if (totalDays > remaining) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: "Insufficient leave balance",
          details: {
            requested_days: totalDays,
            available_days: remaining,
          },
        });
      }

      const [overlapRows] = await connection.query(
        `SELECT COUNT(*) as count
           FROM leave_request
          WHERE employee_id = UUID_TO_BIN(?)
            AND status IN ('pending', 'approved')
            AND NOT (end_date < ? OR start_date > ?)`,
        [employee_id, start_date, end_date]
      );

      if (overlapRows[0].count > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: "Overlapping leave request exists for the selected period",
        });
      }

      await connection.query(
        `INSERT INTO leave_request (
           id,
           employee_id,
           leave_type_id,
           start_date,
           end_date,
           total_days,
           reason,
           reason_amharic,
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
           'pending'
         )`,
        [
          requestId,
          employee_id,
          leave_type_id,
          start_date,
          end_date,
          totalDays,
          reason || null,
          reason_amharic || null,
        ]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: "Leave request submitted",
        data: {
          id: requestId,
          employee_id,
          leave_type_id,
          start_date,
          end_date,
          total_days: totalDays,
          status: "pending",
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

    const { approver_id, comments } = validation.data;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [requestRows] = await connection.query(
        `SELECT 
           BIN_TO_UUID(employee_id) as employee_id,
           BIN_TO_UUID(leave_type_id) as leave_type_id,
           start_date,
           end_date,
           total_days,
           status
         FROM leave_request
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

      if (request.status === "approved") {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: "Leave request already approved",
        });
      }

      if (request.status === "rejected") {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: "Leave request already rejected",
        });
      }

      const totalDays = Number(request.total_days) || calculateInclusiveDays(request.start_date, request.end_date);
      const year = parseInt(request.start_date.substring(0, 4), 10);

      const [balanceRows] = await connection.query(
        `SELECT 
           BIN_TO_UUID(id) as id,
           total_allocated_days,
           used_days,
           remaining_days,
           carry_forward_days
         FROM leave_balance
        WHERE employee_id = UUID_TO_BIN(?)
          AND leave_type_id = UUID_TO_BIN(?)
          AND year = ?
        FOR UPDATE`,
        [request.employee_id, request.leave_type_id, year]
      );

      if (balanceRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: "Leave balance not found for approval",
        });
      }

      const balance = balanceRows[0];
      const used = Number(balance.used_days || 0);
      const remaining = Number(
        balance.remaining_days !== null && balance.remaining_days !== undefined
          ? balance.remaining_days
          : Number(balance.total_allocated_days || 0) + Number(balance.carry_forward_days || 0) - used
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
        `UPDATE leave_balance
            SET used_days = ?,
                remaining_days = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)`,
        [newUsed, newRemaining, balance.id]
      );

      await connection.query(
        `UPDATE leave_request
            SET status = 'approved',
                approved_by = UUID_TO_BIN(?),
                approved_at = CURRENT_TIMESTAMP,
                total_days = ?,
                comments = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)`,
        [approver_id, totalDays, comments || null, id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: "Leave request approved",
        data: {
          id,
          total_days: totalDays,
          used_days: newUsed,
          remaining_days: newRemaining,
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

    const { approver_id, comments } = validation.data;

    try {
      const [result] = await pool.query(
        `UPDATE leave_request
            SET status = 'rejected',
                approved_by = UUID_TO_BIN(?),
                approved_at = CURRENT_TIMESTAMP,
                comments = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)
            AND status = 'pending'`,
        [approver_id, comments || null, id]
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
           BIN_TO_UUID(lb.leave_type_id) as leave_type_id,
           lt.leave_name,
           lb.year,
           lb.total_allocated_days,
           lb.used_days,
           lb.remaining_days,
           lb.carry_forward_days
         FROM leave_balance lb
         JOIN leave_types lt ON lb.leave_type_id = lt.id
        WHERE lb.employee_id = UUID_TO_BIN(?)
          AND lb.year = ?`,
        [employeeId, year]
      );

      const [requests] = await pool.query(
        `SELECT status, COUNT(*) as count
           FROM leave_request
          WHERE employee_id = UUID_TO_BIN(?)
            AND YEAR(start_date) = ?
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

      const conditions = ["lr.employee_id = UUID_TO_BIN(?)"];
      const params = [employeeId];

      if (status) {
        conditions.push("lr.status = ?");
        params.push(status);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      const [records] = await pool.query(
        `SELECT 
           BIN_TO_UUID(lr.id) as id,
           BIN_TO_UUID(lr.leave_type_id) as leave_type_id,
           lt.leave_name,
           lr.start_date,
           lr.end_date,
           lr.total_days,
           lr.status,
           lr.reason,
           lr.comments,
           lr.created_at,
           lr.updated_at
         FROM leave_request lr
         JOIN leave_types lt ON lr.leave_type_id = lt.id
         ${whereClause}
         ORDER BY lr.start_date DESC
         LIMIT ? OFFSET ?`,
        [...params, limitInt, offset]
      );

      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total
           FROM leave_request lr
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
