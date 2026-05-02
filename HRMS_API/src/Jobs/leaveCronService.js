import cron from 'node-cron';
import pool from "../../config/database.js";
import { v4 as uuidv4 } from "uuid";

// Runs every day at 00:01
const startLeaveCronJobs = () => {
  cron.schedule('1 0 * * *', async () => {
    console.log("Running daily leave expiration and auto-termination cron jobs...");
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayStr = today.toISOString().slice(0, 10);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);

      // 1. One Day Expiry Warning (Leaves ending tomorrow)
      const [expiringLeaves] = await connection.query(
        `SELECT lr.id, BIN_TO_UUID(lr.employeeId) as employeeId, e.firstName, e.lastName
         FROM leaveRequest lr
         JOIN employee e ON lr.employeeId = e.id
         WHERE lr.status = 'APPROVED' AND lr.endDate = ? AND (e.employmentStatus IS NULL OR e.employmentStatus != 'TERMINATED')`,
        [tomorrowStr]
      );

      // Fetch HR Managers for notifications
      const [hrManagers] = await connection.query(`SELECT BIN_TO_UUID(employeeId) as employeeId FROM users WHERE role = 'HRMANAGER'`);

      for (const leave of expiringLeaves) {
        // Notify employee
        await connection.query(
          `INSERT INTO notifications (id, recipientId, title, message, type, isRead) 
           VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, 'SYSTEM', false)`,
          [uuidv4(), leave.employeeId, "Leave Request Expiring Tomorrow", "Your approved leave request finishes tomorrow. Please ensure you return to work as scheduled to avoid being marked absent."]
        );

        // Notify HR Managers
        for (const hr of hrManagers) {
          if (!hr.employeeId) continue;
          await connection.query(
            `INSERT INTO notifications (id, recipientId, title, message, type, isRead) 
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, 'SYSTEM', false)`,
            [uuidv4(), hr.employeeId, "Employee Leave Expiring", `The leave request for ${leave.firstName} ${leave.lastName} will expire tomorrow.`]
          );
        }
      }

      // 2. Escalation & Auto-Termination (Leaves ended in the past, no login since)
      // DATEDIFF(?, lr.endDate) returns the number of days passed since the end date
      const [expiredLeaves] = await connection.query(
        `SELECT 
           lr.id as leaveId, 
           BIN_TO_UUID(lr.employeeId) as employeeId, 
           lr.endDate,
           e.firstName, e.lastName,
           DATEDIFF(?, lr.endDate) as daysAbsent
         FROM leaveRequest lr
         JOIN employee e ON lr.employeeId = e.id
         JOIN users u ON u.employeeId = lr.employeeId
         WHERE lr.status = 'APPROVED' 
           AND lr.endDate < ? 
           AND (e.employmentStatus IS NULL OR e.employmentStatus != 'TERMINATED')
           AND (u.lastLogin IS NULL OR u.lastLogin <= DATE_ADD(lr.endDate, INTERVAL 1 DAY))`,
        [todayStr, todayStr]
      );

      for (const leave of expiredLeaves) {
        const { daysAbsent, employeeId, firstName, lastName } = leave;
        
        if (daysAbsent >= 20) {
          // Auto-Terminate
          await connection.query(
            `UPDATE employee SET employmentStatus = 'TERMINATED' WHERE id = UUID_TO_BIN(?)`,
            [employeeId]
          );
          
          // Add termination record to employment table if it exists (assuming it exists for tracking)
          await connection.query(
            `UPDATE employeeEmployment SET endDate = CURRENT_TIMESTAMP WHERE employeeId = UUID_TO_BIN(?) AND endDate IS NULL`,
            [employeeId]
          );

          // Notify HR about termination
          for (const hr of hrManagers) {
            if (!hr.employeeId) continue;
            await connection.query(
              `INSERT INTO notifications (id, recipientId, title, message, type, isRead) 
               VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, 'SYSTEM', false)`,
              [uuidv4(), hr.employeeId, "Employee Auto-Terminated", `The system has automatically terminated ${firstName} ${lastName} for exceeding 20 days of absence after leave expiration.`]
            );
          }
        } else if (daysAbsent === 5 || daysAbsent === 10 || daysAbsent === 15) {
          // Send warnings
          await connection.query(
            `INSERT INTO notifications (id, recipientId, title, message, type, isRead) 
             VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, 'SYSTEM', false)`,
            [uuidv4(), employeeId, "Urgent: Unexcused Absence Warning", `Your leave request expired ${daysAbsent} days ago. You are currently marked as absent. Please return to work and log in immediately. Failure to return after 20 days will result in automatic termination.`]
          );
        }
      }

      await connection.commit();
      console.log("Daily leave cron jobs completed successfully.");
    } catch (error) {
      await connection.rollback();
      console.error("Error running leave cron jobs:", error);
    } finally {
      connection.release();
    }
  });
};

export default startLeaveCronJobs;
