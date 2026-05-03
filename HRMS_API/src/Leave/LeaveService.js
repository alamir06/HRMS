import pool from "../../config/database.js";
import { CrudService } from "../Commons/CommonServices.js";
import { sendEmail } from "../../utils/emailService.js";
import { generateLeaveDocumentHTML, getLeaveDocumentImageAttachments } from "../../utils/LeaveDocumentBuilder.js";
import { toEthiopianDateString } from "../../utils/ethiopianDate.js";

// Helper to calculate working days strictly excluding Saturday (6) and Sunday (0)
const calculateWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays + 1;
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

      const [empRows] = await connection.query(
        `SELECT e.employeeType, ep.gender, e.hireDate 
         FROM employee e 
         LEFT JOIN employeePersonal ep ON e.id = ep.employeeId 
         WHERE e.id = UUID_TO_BIN(?)`,
        [employeeId]
      );
      if (!empRows.length) throw new Error("Employee not found");
      const { employeeType, gender, hireDate } = empRows[0];

      // Block if the employee has an active or pending leave request
      const today = new Date().toISOString().slice(0, 10);
      const [activeRequests] = await connection.query(
        `SELECT id FROM leaveRequest 
         WHERE employeeId = UUID_TO_BIN(?) 
         AND (status = 'PENDING' OR (status = 'APPROVED' AND endDate >= ?))`,
        [employeeId, today]
      );
      if (activeRequests.length > 0) {
        throw new Error("You already have an active or pending leave request. You cannot submit another request until your current one is completed or rejected.");
      }

      if (employeeType === 'ACADEMIC' && leaveType === 'ANNUAL') {
        throw new Error("Academic employees do not have annual leave.");
      }
      if (employeeType === 'ADMINISTRATIVE' && leaveType === 'SABBATICAL') {
        throw new Error("Administrative employees do not have sabbatical leave.");
      }
      if (leaveType === 'SABBATICAL') {
        if (!hireDate) throw new Error("Hire date is required to check Sabbatical eligibility.");
        const hireYear = new Date(hireDate).getFullYear();
        if (year - hireYear < 7) {
          throw new Error("Sabbatical leave requires 7 years of consistent work.");
        }
      }
      if ((gender || '').toUpperCase() === 'MALE' && leaveType === 'MATERNITY') {
        throw new Error("Male employees cannot request maternity leave.");
      }
      if ((gender || '').toUpperCase() === 'FEMALE' && leaveType === 'PATERNITY') {
        throw new Error("Female employees cannot request paternity leave.");
      }

      if (totalDays <= 0 && leaveType !== "ORGANIZATION_LEAVE") {
        throw new Error("Invalid leave duration. Must include at least one working day.");
      }

      // Check balance if it's not a clear-out organization leave and not SABBATICAL
      if (leaveType !== "ORGANIZATION_LEAVE" && leaveType !== "SABBATICAL") {
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

      // Generate sequence reference number
      const [seqRows] = await connection.query(`SELECT COUNT(*) as count FROM leaveRequest WHERE status = 'APPROVED' AND approvedAt <= (SELECT approvedAt FROM leaveRequest WHERE id = UUID_TO_BIN(?))`, [requestId]);
      const sequenceNumber = seqRows[0].count || 1;
      const refNumber = `እን/ዩኒ/የሰ-${sequenceNumber}`;

      await connection.query(
        `UPDATE leaveRequest SET documentNumber = ? WHERE id = UUID_TO_BIN(?)`,
        [refNumber, requestId]
      );

      // Create Notification
      const [userRows] = await connection.query(
        `SELECT BIN_TO_UUID(id) as userId FROM users WHERE employeeId = UUID_TO_BIN(?)`, 
        [employeeId]
      );
      if (userRows.length > 0) {
        await connection.query(
          `INSERT INTO notifications (
            id, userId, title, message, notificationType, relatedModule, relatedId
          ) VALUES (UUID_TO_BIN(UUID()), UUID_TO_BIN(?), ?, ?, 'SUCCESS', 'leave', UUID_TO_BIN(?))`,
          [userRows[0].userId, "Leave Approved", `Your ${leaveType} request has been approved.`, requestId]
        );
      }

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
          const htmlContent = generateLeaveDocumentHTML(fullEmployee, leaveData, balanceData, refNumber);
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
        `SELECT BIN_TO_UUID(employeeId) as employeeId, leaveType, status FROM leaveRequest WHERE id = UUID_TO_BIN(?)`,
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

      // Create Notification
      const { employeeId, leaveType } = requestRows[0];
      const [userRows] = await connection.query(
        `SELECT BIN_TO_UUID(id) as userId FROM users WHERE employeeId = UUID_TO_BIN(?)`, 
        [employeeId]
      );
      if (userRows.length > 0) {
        await connection.query(
          `INSERT INTO notifications (
            id, userId, title, message, notificationType, relatedModule, relatedId
          ) VALUES (UUID_TO_BIN(UUID()), UUID_TO_BIN(?), ?, ?, 'ERROR', 'leave', UUID_TO_BIN(?))`,
          [userRows[0].userId, "Leave Rejected", `Your ${leaveType} request has been rejected.`, requestId]
        );
      }

      await connection.commit();
      return { success: true, message: "Leave request rejected successfully" };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async syncAnniversaryBalances(employeeId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [empRows] = await connection.query(
        `SELECT employeeType, hireDate FROM employee WHERE id = UUID_TO_BIN(?)`,
        [employeeId]
      );
      if (!empRows.length || !empRows[0].hireDate) {
         connection.release();
         return;
      }

      const { employeeType, hireDate } = empRows[0];
      const hd = new Date(hireDate);
      const now = new Date();
      
      let anniversaryYear = now.getFullYear();
      const anniversaryThisYear = new Date(now.getFullYear(), hd.getMonth(), hd.getDate());
      if (now < anniversaryThisYear) {
         anniversaryYear--;
      }

      // Check if we have balances for this anniversary year
      const [currentBalances] = await connection.query(
        `SELECT * FROM leaveBalance WHERE employeeId = UUID_TO_BIN(?) AND year = ?`,
        [employeeId, anniversaryYear]
      );

      if (currentBalances.length === 0) {
        const prevYear = anniversaryYear - 1;
        
        if (employeeType === 'ADMINISTRATIVE') {
           const [prevAnnual] = await connection.query(
              `SELECT remainingDays FROM leaveBalance WHERE employeeId = UUID_TO_BIN(?) AND year = ? AND leaveType = 'ANNUAL'`,
              [employeeId, prevYear]
           );
           
           if (prevAnnual.length > 0 && prevAnnual[0].remainingDays > 0) {
              await connection.query(
                 `INSERT INTO leaveRolloverRequest (employeeId, sourceYear, leaveType, unusedDays, decision, status)
                  VALUES (UUID_TO_BIN(?), ?, 'ANNUAL', ?, 'PENDING', 'PENDING')`,
                 [employeeId, prevYear, prevAnnual[0].remainingDays]
              );
              
              const [userRows] = await connection.query(`SELECT BIN_TO_UUID(id) as userId FROM users WHERE employeeId = UUID_TO_BIN(?)`, [employeeId]);
              if (userRows.length > 0) {
                await connection.query(
                  `INSERT INTO notifications (id, userId, title, message, notificationType, relatedModule)
                   VALUES (UUID_TO_BIN(UUID()), UUID_TO_BIN(?), ?, ?, 'WARNING', 'leave')`,
                  [userRows[0].userId, "Leave Rollover Action Required", `You have ${prevAnnual[0].remainingDays} unused annual leave days from your previous year. Please choose whether to carry them forward or encash them.`]
                );
              }
           }
        }
        
        const leaveAllocations = [
          { type: 'ANNUAL', days: 20 },
          { type: 'SICK', days: 14 },
          { type: 'MEDICAL', days: 30 },
          { type: 'PERSONAL', days: 5 },
          { type: 'MATERNITY', days: 90 },
          { type: 'PATERNITY', days: 5 },
          { type: 'ORGANIZATION_LEAVE', days: 0 }
        ];

        const leaveQuery = `
          INSERT INTO leaveBalance (
            employeeId, leaveType, year, totalAllocatedDays, remainingDays
          ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?)
        `;
        
        for (const leave of leaveAllocations) {
          await connection.query(leaveQuery, [
            employeeId, 
            leave.type, 
            anniversaryYear, 
            leave.days, 
            leave.days
          ]);
        }
      }
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error("Error syncing anniversary balances:", error);
    } finally {
      connection.release();
    }
  }

  async getEmployeeLeaveData(employeeId, year = null) {
    try {
      await this.syncAnniversaryBalances(employeeId);
      
      const [empRows] = await pool.query(`SELECT e.employeeType, ep.gender, e.hireDate FROM employee e LEFT JOIN employeePersonal ep ON e.id = ep.employeeId WHERE e.id = UUID_TO_BIN(?)`, [employeeId]);
      const employee = empRows[0] || {};

      let queryYear = year;
      if (!queryYear) {
         if (employee.hireDate) {
            const hd = new Date(employee.hireDate);
            const now = new Date();
            let annYear = now.getFullYear();
            if (now < new Date(now.getFullYear(), hd.getMonth(), hd.getDate())) annYear--;
            queryYear = annYear;
         } else {
            queryYear = new Date().getFullYear();
         }
      }

      // 1. Get Balances
      let [balances] = await pool.query(
        `SELECT BIN_TO_UUID(id) as id, leaveType, year, totalAllocatedDays, usedDays, remainingDays, carryForwardDays 
         FROM leaveBalance WHERE employeeId = UUID_TO_BIN(?) AND year = ?`,
        [employeeId, queryYear]
      );

      // Filter balances based on rules
      balances = balances.filter(b => {
        if (employee.employeeType === 'ACADEMIC' && b.leaveType === 'ANNUAL') return false;
        if ((employee.gender || '').toUpperCase() === 'MALE' && b.leaveType === 'MATERNITY') return false;
        if ((employee.gender || '').toUpperCase() === 'FEMALE' && b.leaveType === 'PATERNITY') return false;
        return true;
      });

      if (employee.employeeType === 'ACADEMIC') {
         const hireYear = employee.hireDate ? new Date(employee.hireDate).getFullYear() : new Date().getFullYear();
         const currentYear = new Date().getFullYear();
         if (currentYear - hireYear >= 7) {
            balances.push({
               id: 'sabbatical-virtual',
               leaveType: 'SABBATICAL',
               year: currentYear,
               totalAllocatedDays: 365,
               usedDays: 0,
               remainingDays: 365,
               carryForwardDays: 0
            });
         }
      }

      // 2. Get Requests
      const [requests] = await pool.query(
        `SELECT BIN_TO_UUID(id) as id, leaveType, startDate, endDate, totalDays, status, reason, reasonAmharic, 
         BIN_TO_UUID(approvedBy) as approvedBy, approvedAt, comments, commentsAmharic, createdAt, documentNumber,
         (SELECT COUNT(*) FROM leaveRequest lr2 WHERE lr2.status = 'APPROVED' AND lr2.approvedAt <= leaveRequest.approvedAt) as sequenceNumber
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
        lr.approvedAt,
        lr.supportDocument,
        lr.documentNumber,
        ep.firstName,
        ep.lastName,
        ep.profilePicture,
        (SELECT COUNT(*) FROM leaveRequest lr2 WHERE lr2.status = 'APPROVED' AND lr2.approvedAt <= lr.approvedAt) as sequenceNumber
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
      const searchClause = ` AND (ep.firstName LIKE ? OR ep.lastName LIKE ? OR lr.leaveType LIKE ? OR lr.documentNumber LIKE ?)`;
      query += searchClause;
      countQuery += searchClause;
      summaryQuery += searchClause;
      params.push(s, s, s, s);
      countParams.push(s, s, s, s);
      summaryParams.push(s, s, s, s);
    }

    if (period) {
      const normalizedPeriod = String(period).toUpperCase();
      let periodClause = "";

      if (normalizedPeriod === "DAILY") {
        periodClause = ` AND DATE(lr.createdAt) = CURDATE()`;
      } else if (normalizedPeriod === "WEEKLY") {
        periodClause = ` AND lr.createdAt >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
      } else if (normalizedPeriod === "MONTHLY") {
        periodClause = ` AND lr.createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
      } else if (normalizedPeriod === "YEARLY") {
        periodClause = ` AND lr.createdAt >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)`;
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
  async getPendingRolloverDecisions(employeeId) {
    const [rows] = await pool.query(
       `SELECT BIN_TO_UUID(id) as id, sourceYear, leaveType, unusedDays, decision, status 
        FROM leaveRolloverRequest 
        WHERE employeeId = UUID_TO_BIN(?) AND status = 'PENDING'`,
       [employeeId]
    );
    return rows;
  }

  async submitRolloverDecision(employeeId, requestId, decision) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [requests] = await connection.query(
        `SELECT unusedDays, sourceYear FROM leaveRolloverRequest WHERE id = UUID_TO_BIN(?) AND employeeId = UUID_TO_BIN(?) AND status = 'PENDING'`,
        [requestId, employeeId]
      );
      if (requests.length === 0) throw new Error("Pending rollover request not found");
      
      const { unusedDays, sourceYear } = requests[0];
      const targetYear = sourceYear + 1;
      
      if (decision === 'CARRY_FORWARD') {
         await connection.query(
           `UPDATE leaveBalance 
            SET carryForwardDays = carryForwardDays + ?, remainingDays = remainingDays + ?
            WHERE employeeId = UUID_TO_BIN(?) AND year = ? AND leaveType = 'ANNUAL'`,
           [unusedDays, unusedDays, employeeId, targetYear]
         );
      } else if (decision === 'ENCASH') {
         const [emp] = await connection.query(
            `SELECT salary FROM employeeEmployment WHERE employeeId = UUID_TO_BIN(?)`,
            [employeeId]
         );
         if (emp.length === 0 || !emp[0].salary) throw new Error("No salary defined for this employee to perform encashment");
         
         const baseSalary = parseFloat(emp[0].salary);
         const encashmentAmount = (baseSalary / 30) * unusedDays;
         const newSalary = baseSalary + encashmentAmount;
         
         await connection.query(
            `UPDATE employeeEmployment SET salary = ? WHERE employeeId = UUID_TO_BIN(?)`,
            [newSalary, employeeId]
         );
      } else {
         throw new Error("Invalid decision. Must be CARRY_FORWARD or ENCASH");
      }
      
      await connection.query(
         `UPDATE leaveRolloverRequest SET decision = ?, status = 'PROCESSED' WHERE id = UUID_TO_BIN(?)`,
         [decision, requestId]
      );
      
      await connection.commit();
      return { success: true, message: `Successfully processed rollover decision as ${decision}` };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export const leaveService = new LeaveService();
