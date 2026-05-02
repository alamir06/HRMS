import pool from "../../config/database.js";

const determineShift = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Before 12:30 PM is morning, after is afternoon
  const isMorning = (currentHour < 12) || (currentHour === 12 && currentMinute < 30);
  
  return {
    name: isMorning ? 'Morning' : 'Afternoon',
    startTime: isMorning ? '08:30:00' : '13:30:00',
    endTime: isMorning ? '12:00:00' : '17:00:00'
  };
};

const getOrSeedShift = async (connection, shiftParams) => {
  const [rows] = await connection.query(
    "SELECT BIN_TO_UUID(id) as id FROM shiftSchedule WHERE shiftName = ? LIMIT 1",
    [shiftParams.name]
  );
  if (rows.length > 0) return rows[0].id;
  
  await connection.query(
    `INSERT INTO shiftSchedule (shiftName, shiftNameAmharic, startTime, endTime, breakDurationMinutes) 
     VALUES (?, ?, ?, ?, 0)`,
    [shiftParams.name, shiftParams.name, shiftParams.startTime, shiftParams.endTime]
  );
  
  const [newRows] = await connection.query(
    "SELECT BIN_TO_UUID(id) as id FROM shiftSchedule WHERE shiftName = ? LIMIT 1",
    [shiftParams.name]
  );
  return newRows[0].id;
};

const compareTimes = (timeStr1, timeStr2) => {
  if (!timeStr1 || !timeStr2) return 0;
  const t1Parts = timeStr1.split(':');
  const t2Parts = timeStr2.split(':');
  const mins1 = parseInt(t1Parts[0]) * 60 + parseInt(t1Parts[1]);
  const mins2 = parseInt(t2Parts[0]) * 60 + parseInt(t2Parts[1]);
  return mins1 - mins2;
};

export const attendanceService = {
  seedDailyAbsentRecords: async () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return; // Skip weekends

    const date = now.toISOString().slice(0, 10);
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const morningShiftId = await getOrSeedShift(connection, { name: 'Morning', startTime: '08:30:00', endTime: '12:00:00' });
      const afternoonShiftId = await getOrSeedShift(connection, { name: 'Afternoon', startTime: '13:30:00', endTime: '17:00:00' });

      const [employees] = await connection.query(
        "SELECT id FROM employee WHERE employmentStatus IS NULL OR employmentStatus != 'TERMINATED'"
      );

      for (const emp of employees) {
         // Check if employee is on approved leave today
         const [leaveRows] = await connection.query(
           `SELECT id FROM leaveRequest 
            WHERE employeeId = ? 
            AND status = 'APPROVED' 
            AND ? BETWEEN startDate AND endDate`,
           [emp.id, date]
         );
         
         const isOnLeave = leaveRows.length > 0;
         const attendanceStatus = isOnLeave ? 'ON_LEAVE' : 'ABSENT';
         const notes = isOnLeave ? 'System generated: On Leave' : 'System generated default absence';

         await connection.query(
           `INSERT IGNORE INTO attendance (employeeId, Date, status, shiftId, notes) 
            VALUES (?, ?, ?, UUID_TO_BIN(?), ?)`,
           [emp.id, date, attendanceStatus, morningShiftId, notes]
         );
         await connection.query(
           `INSERT IGNORE INTO attendance (employeeId, Date, status, shiftId, notes) 
            VALUES (?, ?, ?, UUID_TO_BIN(?), ?)`,
           [emp.id, date, attendanceStatus, afternoonShiftId, notes]
         );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error("Daily Absent Seeding Failed:", error);
    } finally {
      connection.release();
    }
  },

  autoCheckIn: async (employeeId) => {
    if (!employeeId) return;
    
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);
    
    const shiftParams = determineShift();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const shiftId = await getOrSeedShift(connection, shiftParams);

      let calcStatus = "PRESENT";
      let calcLateMins = 0;
      
      const lateDiff = compareTimes(time, shiftParams.startTime);
      if (lateDiff > 0) {
         calcLateMins = lateDiff;
         calcStatus = "LATE";
      }

      const [existing] = await connection.query(
        "SELECT id, checkIn, status FROM attendance WHERE employeeId = UUID_TO_BIN(?) AND Date = ? AND shiftId = UUID_TO_BIN(?) FOR UPDATE",
        [employeeId, date, shiftId]
      );

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
             shiftId
           ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, 0, 'Auto check-in from login', UUID_TO_BIN(?))`,
           [employeeId, date, time, calcStatus, calcLateMins, shiftId]
        );
      } else if (existing[0].checkIn === null && String(existing[0].status).toUpperCase() === 'ABSENT') {
        await connection.query(
           `UPDATE attendance 
            SET checkIn = ?, status = ?, lateMinutes = ?, notes = 'Auto check-in from login'
            WHERE id = ?`,
           [time, calcStatus, calcLateMins, existing[0].id]
        );
      }
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error("Auto Check-In Failed:", error);
    } finally {
      connection.release();
    }
  },

  autoCheckOut: async (employeeId) => {
    if (!employeeId) return;

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);
    
    const shiftParams = determineShift();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const shiftId = await getOrSeedShift(connection, shiftParams);

      const [existing] = await connection.query(
        "SELECT id, checkIn, checkOut FROM attendance WHERE employeeId = UUID_TO_BIN(?) AND Date = ? AND shiftId = UUID_TO_BIN(?) FOR UPDATE",
        [employeeId, date, shiftId]
      );

      if (existing.length > 0) {
        let calcOvertimeMins = 0;
        const overtimeDiff = compareTimes(time, shiftParams.endTime);
        if (overtimeDiff > 0) {
           calcOvertimeMins = overtimeDiff;
        }

        await connection.query(
          `UPDATE attendance
             SET checkOut = ?,
                 overtimeMinutes = ?,
                 updatedAt = CURRENT_TIMESTAMP
           WHERE employeeId = UUID_TO_BIN(?) AND Date = ? AND shiftId = UUID_TO_BIN(?)`,
          [
            time,
            calcOvertimeMins,
            employeeId,
            date,
            shiftId
          ]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error("Auto Check-Out Failed:", error);
    } finally {
      connection.release();
    }
  }
};
