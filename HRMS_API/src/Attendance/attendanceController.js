import pool from "../../config/database.js";
import { translatePairs } from "../../utils/translationService.js";
import { toEthiopianDateString } from "../../utils/ethiopianDate.js";

const normalizeTime = (time) => {
  if (!time) return null;
  const t = time.trim().toUpperCase();
  const ampm = t.slice(-2);
  if (ampm === "AM" || ampm === "PM") {
    let [hours, mins] = t.slice(0, -2).split(":");
    let h = parseInt(hours, 10);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${mins}:00`;
  }
  return time.length === 5 ? `${time}:00` : time;
};

const compareTimes = (timeStr1, timeStr2) => {
  if (!timeStr1 || !timeStr2) return 0;
  const t1Parts = timeStr1.split(':');
  const t2Parts = timeStr2.split(':');
  const mins1 = parseInt(t1Parts[0]) * 60 + parseInt(t1Parts[1]);
  const mins2 = parseInt(t2Parts[0]) * 60 + parseInt(t2Parts[1]);
  return mins1 - mins2;
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
    
    // Process translations
    const translatedBody = await translatePairs(req.body, [
      { enKey: "notes", amKey: "notesAmharic" }
    ]);
    const { date, time, status = "Present", lateMinutes, notes, notesAmharic, shiftName } = translatedBody;

    const { date: defaultDate, time: defaultTime } = getCurrentDateTime();
    const attendanceDate = date || defaultDate;
    const checkInTime = normalizeTime(time || defaultTime);

    const lateMinutesParsed = normalizeMinutes(lateMinutes);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      let shiftId = translatedBody.shiftId;
      let shiftStartTime = "08:00:00"; // fallback

      if (!shiftId && shiftName) {
        const [shiftRows] = await connection.query("SELECT BIN_TO_UUID(id) as id, startTime FROM shiftSchedule WHERE shiftName LIKE ?", [`%${shiftName}%`]);
        if (shiftRows.length > 0) {
           shiftId = shiftRows[0].id;
           shiftStartTime = shiftRows[0].startTime;
        }
      } else if (shiftId) {
         const [shiftRows] = await connection.query("SELECT startTime FROM shiftSchedule WHERE id = UUID_TO_BIN(?)", [shiftId]);
         if (shiftRows.length > 0) shiftStartTime = shiftRows[0].startTime;
      }

      if (!shiftId) {
        return res.status(400).json({ success: false, error: "Valid shiftId or shiftName is required for Check-In" });
      }

      // Auto-calculate Status and Late Minutes
      let calcStatus = "Present";
      let calcLateMins = 0;
      
      const lateDiff = compareTimes(checkInTime, shiftStartTime);
      if (lateDiff > 0) {
         calcLateMins = lateDiff;
         calcStatus = "Late";
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
             calcStatus,
             calcLateMins,
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
            calcStatus,
            calcLateMins,
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
          dateEth: toEthiopianDateString(attendanceDate),
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
    
    // Process translations
    const translatedBody = await translatePairs(req.body, [
      { enKey: "notes", amKey: "notesAmharic" }
    ]);
    const { date, time, overtimeMinutes, notes, notesAmharic, shiftName } = translatedBody;

    const { date: defaultDate, time: defaultTime } = getCurrentDateTime();
    const attendanceDate = date || defaultDate;
    const checkOutTime = normalizeTime(time || defaultTime);

    const overtimeMinutesParsed = normalizeMinutes(overtimeMinutes);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      let shiftId = translatedBody.shiftId;
      let shiftEndTime = "17:00:00"; // fallback

      if (!shiftId && shiftName) {
        const [shiftRows] = await connection.query("SELECT BIN_TO_UUID(id) as id, endTime FROM shiftSchedule WHERE shiftName LIKE ?", [`%${shiftName}%`]);
        if (shiftRows.length > 0) {
           shiftId = shiftRows[0].id;
           shiftEndTime = shiftRows[0].endTime;
        }
      } else if (shiftId) {
         const [shiftRows] = await connection.query("SELECT endTime FROM shiftSchedule WHERE id = UUID_TO_BIN(?)", [shiftId]);
         if (shiftRows.length > 0) shiftEndTime = shiftRows[0].endTime;
      }

      if (!shiftId) {
        return res.status(400).json({ success: false, error: "Valid shiftId or shiftName is required for Check-Out" });
      }

      let calcOvertimeMins = 0;
      const overtimeDiff = compareTimes(checkOutTime, shiftEndTime);
      if (overtimeDiff > 0) {
         calcOvertimeMins = overtimeDiff;
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
          calcOvertimeMins,
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
          dateEth: toEthiopianDateString(attendanceDate),
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
        period,
        page = 1,
        limit = 20,
      } = req.query;

      const pageInt = parseInt(page, 10) || 1;
      const limitInt = Math.min(parseInt(limit, 10) || 20, 100);
      const offset = (pageInt - 1) * limitInt;

      const conditions = ["a.employeeId = UUID_TO_BIN(?)"];
      const params = [employeeId];

      if (startDate) {
        conditions.push("a.date >= ?");
        params.push(startDate);
      }

      if (endDate) {
        conditions.push("a.date <= ?");
        params.push(endDate);
      }

      if (status) {
        conditions.push("a.status = ?");
        params.push(status);
      }

      if (period) {
        const normalizedPeriod = String(period).toUpperCase();
        let periodClause = "";

        if (normalizedPeriod === "DAILY") {
          periodClause = "a.date = CURDATE()";
        } else if (normalizedPeriod === "WEEKLY") {
          periodClause = "YEARWEEK(a.date, 1) = YEARWEEK(CURDATE(), 1)";
        } else if (normalizedPeriod === "MONTHLY") {
          periodClause = "YEAR(a.date) = YEAR(CURDATE()) AND MONTH(a.date) = MONTH(CURDATE())";
        } else if (normalizedPeriod === "YEARLY") {
          periodClause = "YEAR(a.date) = YEAR(CURDATE())";
        }

        if (periodClause) {
          conditions.push(periodClause);
        }
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const [records] = await pool.query(
        `SELECT 
            BIN_TO_UUID(a.id) as id,
            DATE_FORMAT(a.date, '%Y-%m-%d') as date,
            TIME_FORMAT(a.checkIn, '%h:%i %p') as checkIn,
            TIME_FORMAT(a.checkOut, '%h:%i %p') as checkOut,
            a.status,
            a.lateMinutes,
            a.overtimeMinutes,
            a.notes,
            a.notesAmharic,
            BIN_TO_UUID(a.shiftId) as shiftId,
            s.shiftName
         FROM attendance a
         LEFT JOIN shiftSchedule s ON a.shiftId = s.id
         ${whereClause}
         ORDER BY a.date DESC
         LIMIT ? OFFSET ?`,
        [...params, limitInt, offset]
      );

      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM attendance a ${whereClause}`,
        params
      );

      const recordsWithEthDates = records.map(record => ({
        ...record,
        dateEth: record.date ? toEthiopianDateString(record.date) : null
      }));

      res.json({
        success: true,
        data: recordsWithEthDates,
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
      const { startDate, endDate, period } = req.query;

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

      if (period) {
        const normalizedPeriod = String(period).toUpperCase();
        let periodClause = "";

        if (normalizedPeriod === "DAILY") {
          periodClause = "date = CURDATE()";
        } else if (normalizedPeriod === "WEEKLY") {
          periodClause = "YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)";
        } else if (normalizedPeriod === "MONTHLY") {
          periodClause = "YEAR(date) = YEAR(CURDATE()) AND MONTH(date) = MONTH(CURDATE())";
        } else if (normalizedPeriod === "YEARLY") {
          periodClause = "YEAR(date) = YEAR(CURDATE())";
        }

        if (periodClause) {
          conditions.push(periodClause);
        }
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

  getAllScopedAttendance: async (req, res) => {
    try {
      const userRole = req.user.role;
      const { startDate, endDate, status, period, page = 1, limit = 20 } = req.query;

      const pageInt = parseInt(page, 10) || 1;
      const limitInt = Math.min(parseInt(limit, 10) || 20, 100);
      const offset = (pageInt - 1) * limitInt;

      // Base query setup
      let selectClause = `
          SELECT 
            BIN_TO_UUID(a.id) as id,
            DATE_FORMAT(a.date, '%Y-%m-%d') as date,
            TIME_FORMAT(a.checkIn, '%h:%i %p') as checkIn,
            TIME_FORMAT(a.checkOut, '%h:%i %p') as checkOut,
            a.status,
            a.lateMinutes,
            a.overtimeMinutes,
            a.notes,
            a.notesAmharic,
            BIN_TO_UUID(a.shiftId) as shiftId,
            s.shiftName,
            BIN_TO_UUID(a.employeeId) as employeeId,
            ep.firstName,
            ep.lastName,
            e.employeeType,
            BIN_TO_UUID(e.departmentId) as departmentId
          FROM attendance a
          JOIN employee e ON a.employeeId = e.id
          LEFT JOIN shiftSchedule s ON a.shiftId = s.id
          LEFT JOIN employeePersonal ep ON a.employeeId = ep.employeeId
          LEFT JOIN employeeAcademic ea ON e.id = ea.employeeId
          LEFT JOIN department d ON e.departmentId = d.id
      `;
      let countSelect = `
          SELECT COUNT(*) as total 
          FROM attendance a 
          JOIN employee e ON a.employeeId = e.id
          LEFT JOIN employeeAcademic ea ON e.id = ea.employeeId
          LEFT JOIN department d ON e.departmentId = d.id
      `;

      const conditions = [];
      const params = [];

      // Filter by requestor scope
      if (userRole === 'HRMANAGER') {
         // HRManager sees everyone
         conditions.push("1=1");
      } else if (userRole === 'DEAN') {
         // Need requestor's collegeId
         const [reqDetails] = await pool.query(
            "SELECT BIN_TO_UUID(ea.collegeId) as c1, BIN_TO_UUID(d.collegeId) as c2 FROM employee e LEFT JOIN employeeAcademic ea ON e.id = ea.employeeId LEFT JOIN department d ON e.departmentId = d.id WHERE e.id = UUID_TO_BIN(?)",
            [req.user.employeeId]
         );
         const collegeId = reqDetails[0].c1 || reqDetails[0].c2;
         if (!collegeId) return res.status(403).json({ error: "DEAN has no associated college." });
         conditions.push("(BIN_TO_UUID(ea.collegeId) = ? OR BIN_TO_UUID(d.collegeId) = ?)");
         params.push(collegeId, collegeId);
      } else if (userRole === 'HEAD') {
         // Need requestor's departmentId
         const [reqDetails] = await pool.query(
            "SELECT BIN_TO_UUID(departmentId) as d1 FROM employee WHERE id = UUID_TO_BIN(?)",
            [req.user.employeeId]
         );
         const deptId = reqDetails[0].d1;
         if (!deptId) return res.status(403).json({ error: "HEAD has no associated department." });
         conditions.push("BIN_TO_UUID(e.departmentId) = ?");
         params.push(deptId);
      } else {
         return res.status(403).json({ error: "Unauthorized role for global attendance view." });
      }

      // Query Filters
      if (startDate) {
        conditions.push("a.date >= ?");
        params.push(startDate);
      }
      if (endDate) {
        conditions.push("a.date <= ?");
        params.push(endDate);
      }
      if (status) {
        conditions.push("a.status = ?");
        params.push(status);
      }
      if (period) {
        const normalizedPeriod = String(period).toUpperCase();
        let periodClause = "";

        if (normalizedPeriod === "DAILY") {
          periodClause = "a.date = CURDATE()";
        } else if (normalizedPeriod === "WEEKLY") {
          periodClause = "YEARWEEK(a.date, 1) = YEARWEEK(CURDATE(), 1)";
        } else if (normalizedPeriod === "MONTHLY") {
          periodClause = "YEAR(a.date) = YEAR(CURDATE()) AND MONTH(a.date) = MONTH(CURDATE())";
        } else if (normalizedPeriod === "YEARLY") {
          periodClause = "YEAR(a.date) = YEAR(CURDATE())";
        }

        if (periodClause) {
          conditions.push(periodClause);
        }
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const [records] = await pool.query(
        `${selectClause} ${whereClause} ORDER BY a.date DESC LIMIT ? OFFSET ?`,
        [...params, limitInt, offset]
      );

      const [countResult] = await pool.query(`${countSelect} ${whereClause}`, params);

      const recordsWithEthDates = records.map(record => ({
        ...record,
        dateEth: record.date ? toEthiopianDateString(record.date) : null
      }));

      res.json({
        success: true,
        data: recordsWithEthDates,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limitInt) || 0,
        },
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch scoped attendance",
        message: error.message
      });
    }
  }
};
