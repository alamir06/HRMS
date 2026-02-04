import pool from "../../config/database.js";

const normalizeTime = (time) => {
  if (!time) return null;
  return time.length === 5 ? `${time}:00` : time;
};

const normalizeMinutes = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

const getCurrentDateTime = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8);
  return { date, time };
};

export const attendanceController = {
  checkIn: async (req, res) => {
    const { employeeId } = req.params;
    const { date, time, status = "Present", late_minutes, notes, notes_amharic } = req.body;

    const { date: defaultDate, time: defaultTime } = getCurrentDateTime();
    const attendanceDate = date || defaultDate;
    const checkInTime = normalizeTime(time || defaultTime);

    const lateMinutes = normalizeMinutes(late_minutes);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [existing] = await connection.query(
        "SELECT id, check_in FROM attendance WHERE employee_id = UUID_TO_BIN(?) AND date = ? FOR UPDATE",
        [employeeId, attendanceDate]
      );

      if (existing.length > 0 && existing[0].check_in) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: "Employee already checked in for the day",
        });
      }

      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO attendance (
            employee_id,
            date,
            check_in,
            status,
            late_minutes,
            overtime_minutes,
            notes,
            notes_amharic
          ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, 0, ?, ?)`,
          [
            employeeId,
            attendanceDate,
            checkInTime,
            status,
            lateMinutes,
            notes || null,
            notes_amharic || null,
          ]
        );
      } else {
        await connection.query(
          `UPDATE attendance
             SET check_in = ?,
                 status = ?,
                     late_minutes = ?,
                 notes = COALESCE(?, notes),
                 notes_amharic = COALESCE(?, notes_amharic),
                 updated_at = CURRENT_TIMESTAMP
           WHERE employee_id = UUID_TO_BIN(?) AND date = ?`,
          [
            checkInTime,
            status,
                lateMinutes,
            notes || null,
            notes_amharic || null,
            employeeId,
            attendanceDate,
          ]
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: "Check-in recorded",
        data: {
          employee_id: employeeId,
          date: attendanceDate,
          check_in: checkInTime,
          status,
          late_minutes: lateMinutes,
        },
      });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({
        success: false,
        error: "Failed to record check-in",
        message: error.message,
      });
    } finally {
      connection.release();
    }
  },

  checkOut: async (req, res) => {
    const { employeeId } = req.params;
    const { date, time, overtime_minutes, notes, notes_amharic } = req.body;

    const { date: defaultDate, time: defaultTime } = getCurrentDateTime();
    const attendanceDate = date || defaultDate;
    const checkOutTime = normalizeTime(time || defaultTime);

    const overtimeMinutes = normalizeMinutes(overtime_minutes);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [existing] = await connection.query(
        "SELECT id, check_in, check_out FROM attendance WHERE employee_id = UUID_TO_BIN(?) AND date = ? FOR UPDATE",
        [employeeId, attendanceDate]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: "Attendance record not found for employee on selected date",
        });
      }

      if (existing[0].check_out) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: "Employee already checked out for the day",
        });
      }

      await connection.query(
        `UPDATE attendance
           SET check_out = ?,
              overtime_minutes = ?,
               notes = COALESCE(?, notes),
               notes_amharic = COALESCE(?, notes_amharic),
               updated_at = CURRENT_TIMESTAMP
         WHERE employee_id = UUID_TO_BIN(?) AND date = ?`,
        [
          checkOutTime,
            overtimeMinutes,
          notes || null,
          notes_amharic || null,
          employeeId,
          attendanceDate,
        ]
      );

      await connection.commit();

      res.json({
        success: true,
        message: "Check-out recorded",
        data: {
          employee_id: employeeId,
          date: attendanceDate,
          check_out: checkOutTime,
          overtime_minutes: overtimeMinutes,
        },
      });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({
        success: false,
        error: "Failed to record check-out",
        message: error.message,
      });
    } finally {
      connection.release();
    }
  },

  getEmployeeAttendance: async (req, res) => {
    try {
      const { employeeId } = req.params;
      const {
        start_date,
        end_date,
        status,
        page = 1,
        limit = 20,
      } = req.query;

      const pageInt = parseInt(page, 10) || 1;
      const limitInt = Math.min(parseInt(limit, 10) || 20, 100);
      const offset = (pageInt - 1) * limitInt;

      const conditions = ["employee_id = UUID_TO_BIN(?)"];
      const params = [employeeId];

      if (start_date) {
        conditions.push("date >= ?");
        params.push(start_date);
      }

      if (end_date) {
        conditions.push("date <= ?");
        params.push(end_date);
      }

      if (status) {
        conditions.push("status = ?");
        params.push(status);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const [records] = await pool.query(
        `SELECT 
            BIN_TO_UUID(id) as id,
            DATE_FORMAT(date, '%Y-%m-%d') as date,
            TIME_FORMAT(check_in, '%H:%i:%s') as check_in,
            TIME_FORMAT(check_out, '%H:%i:%s') as check_out,
            status,
            late_minutes,
            overtime_minutes,
            notes,
            notes_amharic
         FROM attendance
         ${whereClause}
         ORDER BY date DESC
         LIMIT ? OFFSET ?`,
        [...params, limitInt, offset]
      );

      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM attendance ${whereClause}`,
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
        error: "Failed to fetch attendance records",
        message: error.message,
      });
    }
  },

  getEmployeeSummary: async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { start_date, end_date } = req.query;

      const conditions = ["employee_id = UUID_TO_BIN(?)"];
      const params = [employeeId];

      if (start_date) {
        conditions.push("date >= ?");
        params.push(start_date);
      }

      if (end_date) {
        conditions.push("date <= ?");
        params.push(end_date);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const [statusCounts] = await pool.query(
        `SELECT status, COUNT(*) as count
           FROM attendance
           ${whereClause}
           GROUP BY status`,
        params
      );

      const [totals] = await pool.query(
        `SELECT 
            COALESCE(SUM(late_minutes), 0) as total_late_minutes,
            COALESCE(SUM(overtime_minutes), 0) as total_overtime_minutes
         FROM attendance
         ${whereClause}`,
        params
      );

      const summary = statusCounts.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          statusBreakdown: summary,
          totals: totals[0],
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to build attendance summary",
        message: error.message,
      });
    }
  },
};
