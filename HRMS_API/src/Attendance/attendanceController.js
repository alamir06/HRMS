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
    const { date, time, status = "Present", lateMinutes, notes, notesAmharic, shiftId } = req.body;

    const { date: defaultDate, time: defaultTime } = getCurrentDateTime();
    const attendanceDate = date || defaultDate;
    const checkInTime = normalizeTime(time || defaultTime);

    const lateMinutesParsed = normalizeMinutes(lateMinutes);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      if (!shiftId) {
        return res.status(400).json({ success: false, error: "shiftId is required for Check-In" });
      }

      const [existing] = await connection.query(
        "SELECT id, checkIn FROM attendance WHERE employeeId = UUID_TO_BIN(?) AND Date = ? AND shiftId = UUID_TO_BIN(?) FOR UPDATE",
        [employeeId, attendanceDate, shiftId]
      );

      if (existing.length > 0 && existing[0].checkIn) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: "Employee already checked in for the day",
        });
      }

      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO attendance (
            employeeId,
            Date,
            checkIn,
            status,
            lateMinutes,
            overtimeMinutes,
            notes,
            notesAmharic,
            shiftId
          ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, 0, ?, ?, UUID_TO_BIN(?))`,
          [
            employeeId,
            attendanceDate,
            checkInTime,
            status,
            lateMinutesParsed,
            notes || null,
            notesAmharic || null,
            shiftId
          ]
        );
      } else {
        await connection.query(
          `UPDATE attendance
             SET checkIn = ?,
                 status = ?,
                 lateMinutes = ?,
                 notes = COALESCE(?, notes),
                 notesAmharic = COALESCE(?, notesAmharic),
                 updatedAt = CURRENT_TIMESTAMP
           WHERE employeeId = UUID_TO_BIN(?) AND Date = ? AND shiftId = UUID_TO_BIN(?)`,
          [
            checkInTime,
            status,
            lateMinutesParsed,
            notes || null,
            notesAmharic || null,
            employeeId,
            attendanceDate,
            shiftId
          ]
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: "Check-in recorded",
        data: {
          employeeId: employeeId,
          date: attendanceDate,
          checkIn: checkInTime,
          status,
          lateMinutes: lateMinutesParsed,
          shiftId: shiftId,
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
    const { date, time, overtimeMinutes, notes, notesAmharic, shiftId } = req.body;

    const { date: defaultDate, time: defaultTime } = getCurrentDateTime();
    const attendanceDate = date || defaultDate;
    const checkOutTime = normalizeTime(time || defaultTime);

    const overtimeMinutesParsed = normalizeMinutes(overtimeMinutes);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      if (!shiftId) {
        return res.status(400).json({ success: false, error: "shiftId is required for Check-Out" });
      }

      const [existing] = await connection.query(
        "SELECT id, checkIn, checkOut FROM attendance WHERE employeeId = UUID_TO_BIN(?) AND Date = ? AND shiftId = UUID_TO_BIN(?) FOR UPDATE",
        [employeeId, attendanceDate, shiftId]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: "Attendance record not found for employee on selected date",
        });
      }

      if (existing[0].checkOut) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: "Employee already checked out for the day",
        });
      }

      await connection.query(
        `UPDATE attendance
           SET checkOut = ?,
              overtimeMinutes = ?,
               notes = COALESCE(?, notes),
               notesAmharic = COALESCE(?, notesAmharic),
               updatedAt = CURRENT_TIMESTAMP
         WHERE employeeId = UUID_TO_BIN(?) AND Date = ? AND shiftId = UUID_TO_BIN(?)`,
        [
          checkOutTime,
          overtimeMinutesParsed,
          notes || null,
          notesAmharic || null,
          employeeId,
          attendanceDate,
          shiftId
        ]
      );

      await connection.commit();

      res.json({
        success: true,
        message: "Check-out recorded",
        data: {
          employeeId: employeeId,
          date: attendanceDate,
          checkOut: checkOutTime,
          overtimeMinutes: overtimeMinutesParsed,
          shiftId,
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
        startDate,
        endDate,
        status,
        page = 1,
        limit = 20,
      } = req.query;

      const pageInt = parseInt(page, 10) || 1;
      const limitInt = Math.min(parseInt(limit, 10) || 20, 100);
      const offset = (pageInt - 1) * limitInt;

      const conditions = ["employeeId = UUID_TO_BIN(?)"];
      const params = [employeeId];

      if (startDate) {
        conditions.push("date >= ?");
        params.push(startDate);
      }

      if (endDate) {
        conditions.push("date <= ?");
        params.push(endDate);
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
            TIME_FORMAT(checkIn, '%H:%i:%s') as checkIn,
            TIME_FORMAT(checkOut, '%H:%i:%s') as checkOut,
            status,
            lateMinutes,
            overtimeMinutes,
            notes,
            notesAmharic
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
      const { startDate, endDate } = req.query;

      const conditions = ["employeeId = UUID_TO_BIN(?)"];
      const params = [employeeId];

      if (startDate) {
        conditions.push("date >= ?");
        params.push(startDate);
      }

      if (endDate) {
        conditions.push("date <= ?");
        params.push(endDate);
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
            COALESCE(SUM(lateMinutes), 0) as totalLateMinutes,
            COALESCE(SUM(overtimeMinutes), 0) as totalOvertimeMinutes
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
