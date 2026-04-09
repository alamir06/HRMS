import pool from "../../config/database.js";
import { CrudService } from "../Commons/CommonServices.js";
import { fileUploadService } from "../../Commons/FileUploadService.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { sendEmail } from "../../utils/emailService.js";
export class EmployeeService extends CrudService {
  constructor() {
    super({
      tableName: "employee",
      idField: "id",
      uuidEnabled: true
    });
  }

  async assignAsDepartmentManagerIfNeeded(connection, employeeId) {
    // Find designation assigned to this employee (1:1)
    const [designationRows] = await connection.query(
      `SELECT des.id,
              des.title,
              BIN_TO_UUID(des.departmentId) AS departmentId,
              BIN_TO_UUID(des.collegeId) AS collegeId,
              d.departmentType
         FROM designations des
         LEFT JOIN department d ON des.departmentId = d.id
        WHERE des.employeeId = UUID_TO_BIN(?)
        LIMIT 1`,
      [employeeId]
    );

    if (!designationRows.length) return;

    const { title, departmentId: deptId, departmentType: deptType } = designationRows[0];
    const t = (title || "").toLowerCase();
    const isAcademic = deptType === "ACADEMIC";
    const isHead = t.includes("HEAD");
    const isManager = t.includes("manager");
    const isDea = t.includes("dea") || t.includes("DEAN");

    // College-level DEA/Dean has no department manager to set
    if (!deptId || isDea) return;

    const shouldAssign = (isAcademic && isHead) || (!isAcademic && (isManager || !isHead));

    if (shouldAssign) {
      await connection.query(
        `UPDATE department SET managerId = UUID_TO_BIN(?) WHERE id = UUID_TO_BIN(?)`,
        [employeeId, deptId]
      );
    }
  }

  async createEmployee(fullData) {
    const { personal, employment, academic, outsource, ...employeeData } = fullData;
    const connection = await pool.getConnection();
    if (employeeData.employeeCode) {
      delete employeeData.employeeCode;
    }
    if (employeeData.departmentId) {
      try {
        const [deptRows] = await connection.query(
          `SELECT BIN_TO_UUID(collegeId) as collegeId, departmentType FROM department WHERE id = UUID_TO_BIN(?)`,
          [employeeData.departmentId]
        );
        
        if (!deptRows.length) {
          throw new Error("Invalid departmentId: department not found");
        }

        const { departmentType, collegeId: deptCollegeId } = deptRows[0];

        if (employeeData.employeeType === "ACADEMIC") {
          if (departmentType !== "ACADEMIC") {
            throw new Error("Invalid departmentId: ACADEMIC employees must belong to an ACADEMIC department");
          }
          
          if (academic) {
            if (!deptCollegeId || deptCollegeId !== academic.collegeId) {
              throw new Error("The selected ACADEMIC department does not belong to the provided collegeId");
            }
          }
        } else {
          if (departmentType !== "ADMINISTRATIVE") {
            throw new Error(`Invalid departmentId: ${employeeData.employeeType} employees must belong to an ADMINISTRATIVE department`);
          }
        }
      } catch (error) {
        connection.release();
        throw error;
      }
    }

    try {
      await connection.beginTransaction();
      const employeeUUID = uuidv4();
      const shortUUID = employeeUUID.split("-")[0].toUpperCase();
      const generatedEmployeeCode = `HRIMS${shortUUID}EMP`;
      const employeeQuery = `
        INSERT INTO employee (
          id, employeeCode, companyId, employeeType, employeeRole, departmentId, managerId, hireDate,
          employmentType, employmentStatus, terminationDate
        ) VALUES (
          UUID_TO_BIN(?), ?, UUID_TO_BIN(?), ?, ?, UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, ?
        )
      `;
      await connection.query(employeeQuery, [
        employeeUUID,
        generatedEmployeeCode,
        employeeData.companyId,
        employeeData.employeeType,
        employeeData.employeeRole || "EMPLOYEE",
        employeeData.departmentId,
        employeeData.managerId || null,
        employeeData.hireDate,
        employeeData.employmentType,
        employeeData.employmentStatus || "ACTIVE",
        employeeData.terminationDate || null,
      ]);
      const personalQuery = `
        INSERT INTO employeePersonal (
          employeeId, firstName, firstNameAmharic, middleName,
          middleNameAmharic, lastName, lastNameAmharic, gender,
          dateOfBirth, personalEmail, personalPhone, emergencyContactName,
          emergencyContactNameAmharic, emergencyContactPhone, profilePicture
        ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await connection.query(personalQuery, [
        employeeUUID,
        personal.firstName,
        personal.firstNameAmharic || null,
        personal.middleName || null,
        personal.middleNameAmharic || null,
        personal.lastName,
        personal.lastNameAmharic || null,
        personal.gender || null,
        personal.dateOfBirth || null,
        personal.personalEmail || null,
        personal.personalPhone || null,
        personal.emergencyContactName || null,
        personal.emergencyContactNameAmharic || null,
        personal.emergencyContactPhone || null,
        personal.profilePicture || null,
      ]);

      //Group one 3. Insert into employeeEmployment if provided
      if (employment) {
        const employmentQuery = `
        INSERT INTO employeeEmployment (
          employeeId, officialEmail, officialPhone, salary, qualification, qualificationAmharic
        ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?)
      `;

        await connection.query(employmentQuery, [
          employeeUUID,
          employment.officialEmail || null,
          employment.officialPhone || null,
          employment.salary || null,
          employment.qualification || null,
          employment.qualificationAmharic || null,
        ]);
      }

      //Group one 4. Insert type-specific data based on employeeType
      if (employeeData.employeeType === "ACADEMIC" && academic) {
        const academicQuery = `
          INSERT INTO employeeAcademic (
            employeeId, collegeId, academicRank, academicRankAmharic,
            academicStatus, fieldOfSpecialization, fieldOfSpecializationAmharic
          ) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, ?, ?)
        `;
        await connection.query(academicQuery, [
          employeeUUID,
          academic.collegeId || null,
          academic.academicRank || null,
          academic.academicRankAmharic || null,
          academic.academicStatus || "ACTIVE",
          academic.fieldOfSpecialization || null,
          academic.fieldOfSpecializationAmharic || null,
        ]);
      }
      if (employeeData.employeeType === "OUTSOURCE" && outsource) {
        const outsourceQuery = `
          INSERT INTO employeeOutsource (
            employeeId, outsourcingCompanyId, contractStartDate, contractEndDate, serviceType
          ) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)
        `;
        await connection.query(outsourceQuery, [
          employeeUUID,
          outsource.outsourcingCompanyId,
          outsource.contractStartDate || null,
          outsource.contractEndDate || null,
          outsource.serviceType,
        ]);
      }
      
      //Group one 5. Auto-generate leave balances for the current year
      const currentYear = new Date().getFullYear();
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
          employeeUUID, 
          leave.type, 
          currentYear, 
          leave.days, 
          leave.days
        ]);
      }

      // Auto-generate User Account for ACADEMIC and ADMINISTRATIVE employees
      let rawPassword = null;
      if (employeeData.employeeType === "ACADEMIC" || employeeData.employeeType === "ADMINISTRATIVE") {
        const username = generatedEmployeeCode;
        const suffix = Math.floor(1000 + Math.random() * 9000);
        rawPassword = `${username}@${suffix}`;
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        const userQuery = `
          INSERT INTO users (
            id, employeeId, username, systemRole, passwordHash, mustChangePassword, isActive
          ) VALUES (UUID_TO_BIN(UUID()), UUID_TO_BIN(?), ?, 'EMPLOYEE', ?, TRUE, TRUE)
        `;
        await connection.query(userQuery, [
          employeeUUID,
          username,
          hashedPassword
        ]);

        const employeeEmail = (personal && personal.personalEmail) || (employment && employment.officialEmail);
        if (employeeEmail) {
          try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const emailHtml = `
              <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
                <div style="background-color: #0b8255; padding: 24px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Welcome to INU HRMS!</h1>
                </div>
                <div style="padding: 32px; color: #111827;">
                  <p style="font-size: 16px; margin-bottom: 24px;">Hello <b>${personal.firstName}</b>,</p>
                  <p style="font-size: 16px; color: #4b5563; line-height: 1.5; margin-bottom: 24px;">
                    Your employee account has been successfully created. You can now log into the Injibara University HRMS portal using the following credentials:
                  </p>
                  <div style="background-color: #f8faf9; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Username:</strong> ${username}</p>
                    <p style="margin: 0; font-size: 15px;"><strong>Password:</strong> ${rawPassword}</p>
                  </div>
                  <p style="font-size: 14px; color: #dc2626; margin-bottom: 32px; font-style: italic;">
                    * Please note: You will be required to change your password immediately upon your first login.
                  </p>
                  <div style="text-align: center;">
                    <a href="${frontendUrl}/login" style="display: inline-block; background-color: #0b8255; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Login to HRMS</a>
                  </div>
                </div>
                <div style="background-color: #f8faf9; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-size: 13px; color: #6b7280;">Best Regards,<br/><b>HR Team</b><br/>Injibara University</p>
                </div>
              </div>
            `;

            await sendEmail({
              to: employeeEmail,
              subject: "Welcome to INU HRMS - Your Login Credentials",
              html: emailHtml,
              text: `Hello ${personal.firstName},\n\nYour employee account has been successfully created. You can now log into the HRMS portal (${frontendUrl}/login) using the following credentials:\n\nUsername: ${username}\nPassword: ${rawPassword}\n\nPlease note: You will be required to change your password upon your first login.\n\nBest Regards,\nHR Team`
            });
          } catch (emailErr) {
            console.error("Failed to send welcome email:", emailErr);
          }
        }
      }

      await this.assignAsDepartmentManagerIfNeeded(connection, employeeUUID);
      await connection.commit();
      
      //Group one: Return basic employee data
      const basicData = await this.getEmployeeBasic(employeeUUID);
      if (rawPassword) {
        basicData.credentials = {
          username: generatedEmployeeCode,
          password: rawPassword
        };
      }
      return basicData;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  //Group one:Get basic employee data without complex joins to avoid ambiguous column errors
  async getEmployeeBasic(employeeId) {
    try {
      const query = `
        SELECT 
          BIN_TO_UUID(id) as id,
          employeeCode,
          employeeType,
          BIN_TO_UUID(companyId) as companyId,
          BIN_TO_UUID(departmentId) as departmentId,
          BIN_TO_UUID(managerId) as managerId,
          hireDate,
          employmentType,
          employmentStatus,
          terminationDate,
          createdAt,
          updatedAt
        FROM employee 
        WHERE id = UUID_TO_BIN(?)
      `;
      const [rows] = await pool.query(query, [employeeId]);
      if (rows.length === 0) {
        return null;
      }
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get employee with all details using explicit column aliases
  async getEmployeeWithDetails(employeeId, include = []) {
    try {
      const query = `
        SELECT 
          BIN_TO_UUID(e.id) as id,
          e.employeeCode,
          e.employeeType,
          BIN_TO_UUID(e.companyId) as companyId,
          BIN_TO_UUID(e.departmentId) as departmentId,
          BIN_TO_UUID(e.managerId) as managerId,
          e.hireDate,
          e.employmentType,
          e.employmentStatus,
          e.terminationDate,
          e.createdAt,
          e.updatedAt,
          ep.firstName,
          ep.firstNameAmharic,
          ep.middleName,
          ep.middleNameAmharic,
          ep.lastName,
          ep.lastNameAmharic,
          ep.gender,
          ep.dateOfBirth,
          ep.personalEmail,
          ep.personalPhone,
          ep.emergencyContactName,
          ep.emergencyContactNameAmharic,
          ep.emergencyContactPhone,
          ep.profilePicture,
          ee.officialEmail,
          ee.officialPhone,
          ee.salary,
          ee.qualification,
          ee.qualificationAmharic,
          c.companyName,
          c.companyNameAmharic,
          d.departmentName,
          d.departmentNameAmharic,
          des.title as designationTitle,
          des.titleAmharic as designationTitleAmharic,
          des.gradeLevel as designationGradeLevel
        FROM employee e
        LEFT JOIN employeePersonal ep ON e.id = ep.employeeId
        LEFT JOIN employeeEmployment ee ON e.id = ee.employeeId
        LEFT JOIN company c ON e.companyId = c.id
        LEFT JOIN department d ON e.departmentId = d.id
        LEFT JOIN designations des ON des.employeeId = e.id
        WHERE e.id = UUID_TO_BIN(?)
      `;

      const [rows] = await pool.query(query, [employeeId]);

      if (rows.length === 0) {
        return null;
      }

      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Upload profile picture
  async uploadProfilePicture(employeeId, file) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Validate file
      fileUploadService.validateFile(file);

      // Generate file URL
      const fileUrl = fileUploadService.generateFileUrl(file);

      // Update employeePersonal table
      const updateQuery = `
        UPDATE employeePersonal 
        SET profilePicture = ? 
        WHERE employeeId = UUID_TO_BIN(?)
      `;

      const [result] = await connection.query(updateQuery, [
        fileUrl,
        employeeId,
      ]);

      if (result.affectedRows === 0) {
        throw new Error("Employee not found");
      }

      await connection.commit();

      return {
        profilePicture: fileUrl,
        message: "Profile picture uploaded successfully",
      };
    } catch (error) {
      await connection.rollback();

      // Delete uploaded file if transaction failed
      if (file) {
        await fileUploadService.deleteFile(file.filename).catch(console.error);
      }

      throw error;
    } finally {
      connection.release();
    }
  }

  // Delete profile picture
  async deleteProfilePicture(employeeId) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get current profile picture
      const [current] = await connection.query(
        "SELECT profilePicture FROM employeePersonal WHERE employeeId = UUID_TO_BIN(?)",
        [employeeId]
      );

      if (current.length === 0) {
        throw new Error("Employee not found");
      }

      const currentPicture = current[0].profilePicture;

      // Update to remove profile picture
      const [result] = await connection.query(
        "UPDATE employeePersonal SET profilePicture = NULL WHERE employeeId = UUID_TO_BIN(?)",
        [employeeId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Employee not found");
      }

      // Delete file from storage
      if (currentPicture) {
        await fileUploadService.deleteFile(currentPicture);
      }

      await connection.commit();

      return {
        message: "Profile picture deleted successfully",
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

 async updateEmployee(employeeId, fullData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
    const { personal, employment, academic, outsource, ...employeeData } =
        fullData;

      // Validate department logic if departmentId or employeeType are being updated
      if (employeeData.departmentId || employeeData.employeeType) {
        const [currentEmployee] = await connection.query(
          "SELECT BIN_TO_UUID(departmentId) as departmentId, employeeType FROM employee WHERE id = UUID_TO_BIN(?)",
          [employeeId]
        );
        
        const targetType = employeeData.employeeType || currentEmployee[0].employeeType;
        const targetDeptId = employeeData.departmentId || currentEmployee[0].departmentId;

        if (targetDeptId) {
          const [deptRows] = await connection.query(
            `SELECT BIN_TO_UUID(collegeId) as collegeId, departmentType FROM department WHERE id = UUID_TO_BIN(?)`,
            [targetDeptId]
          );
          
          if (!deptRows.length) throw new Error("Invalid departmentId: department not found");
          
          const { departmentType, collegeId: deptCollegeId } = deptRows[0];

          if (targetType === "ACADEMIC") {
            if (departmentType !== "ACADEMIC") throw new Error("Invalid departmentId: ACADEMIC employees must belong to an ACADEMIC department");
            if (academic && (!deptCollegeId || deptCollegeId !== academic.collegeId)) {
              throw new Error("The selected ACADEMIC department does not belong to the provided collegeId");
            }
          } else {
            if (departmentType !== "ADMINISTRATIVE") throw new Error(`Invalid departmentId: ${targetType} employees must belong to an ADMINISTRATIVE department`);
          }
        }
      }

      // Group one 1. Update employee table (basic info)
      if (Object.keys(employeeData).length > 0) {
        const employeeFields = [];
        const employeeValues = [];
        Object.keys(employeeData).forEach((key) => {
          if (key.endsWith("_id") && employeeData[key]) {
            employeeFields.push(`${key} = UUID_TO_BIN(?)`);
            employeeValues.push(employeeData[key]);
          } else {
            employeeFields.push(`${key} = ?`);
            employeeValues.push(employeeData[key]);
          }
        });
        if (employeeFields.length > 0) {
          const employeeQuery = `
          UPDATE employee 
          SET ${employeeFields.join(", ")}, updatedAt = NOW()
          WHERE id = UUID_TO_BIN(?)
        `;
          await connection.query(employeeQuery, [
            ...employeeValues,
            employeeId,
          ]);
        }
      }

      //Group one 2. Update employeePersonal table
      if (personal && Object.keys(personal).length > 0) {
        const personalFields = [];
        const personalValues = [];
        Object.keys(personal).forEach((key) => {
          personalFields.push(`${key} = ?`);
          personalValues.push(personal[key]);
        });
        if (personalFields.length > 0) {
          const personalQuery = `
          UPDATE employeePersonal 
          SET ${personalFields.join(", ")}
          WHERE employeeId = UUID_TO_BIN(?)
        `;
          await connection.query(personalQuery, [
            ...personalValues,
            employeeId,
          ]);
        }
      }
      //Group one 3. Update employeeEmployment table
      if (employment && Object.keys(employment).length > 0) {
        const employmentFields = [];
        const employmentValues = [];
        Object.keys(employment).forEach((key) => {
          employmentFields.push(`${key} = ?`);
          employmentValues.push(employment[key]);
        });
        if (employmentFields.length > 0) {
          const [existing] = await connection.query(
            "SELECT * FROM employeeEmployment WHERE employeeId = UUID_TO_BIN(?)",
            [employeeId]
          );
          if (existing.length > 0) {
            const employmentQuery = `
            UPDATE employeeEmployment 
            SET ${employmentFields.join(", ")}
            WHERE employeeId = UUID_TO_BIN(?)
          `;
            await connection.query(employmentQuery, [
              ...employmentValues,
              employeeId,
            ]);
          } else {
            const employmentQuery = `
            INSERT INTO employeeEmployment (employeeId, ${Object.keys(
              employment
            ).join(", ")})
            VALUES (UUID_TO_BIN(?), ${Object.keys(employment)
              .map(() => "?")
              .join(", ")})
          `;
            await connection.query(employmentQuery, [
              employeeId,
              ...employmentValues,
            ]);
          }
        }
      }
      //Group one 4. Update type-specific tables based on employeeType
      const [currentEmployee] = await connection.query(
        "SELECT employeeType FROM employee WHERE id = UUID_TO_BIN(?)",
        [employeeId]
      );
      const currentType = currentEmployee[0]?.employeeType;
      if (
        academic &&
        Object.keys(academic).length > 0 &&
        currentType === "ACADEMIC"
      ) {
        const academicFields = [];
        const academicValues = [];
        Object.keys(academic).forEach((key) => {
          if (key.endsWith("_id") && academic[key]) {
            academicFields.push(`${key} = UUID_TO_BIN(?)`);
            academicValues.push(academic[key]);
          } else {
            academicFields.push(`${key} = ?`);
            academicValues.push(academic[key]);
          }
        });
        if (academicFields.length > 0) {
          const [existing] = await connection.query(
            "SELECT * FROM employeeAcademic WHERE employeeId = UUID_TO_BIN(?)",
            [employeeId]
          );
          if (existing.length > 0) {
            const academicQuery = `
            UPDATE employeeAcademic 
            SET ${academicFields.join(", ")}
            WHERE employeeId = UUID_TO_BIN(?)
          `;
            await connection.query(academicQuery, [
              ...academicValues,
              employeeId,
            ]);
          } else {
            const academicQuery = `
            INSERT INTO employeeAcademic (employeeId, ${Object.keys(
              academic
            ).join(", ")})
            VALUES (UUID_TO_BIN(?), ${Object.keys(academic)
              .map(() => "?")
              .join(", ")})
          `;
            await connection.query(academicQuery, [
              employeeId,
              ...academicValues,
            ]);
          }
        }
      }
      if (
        outsource &&
        Object.keys(outsource).length > 0 &&
        currentType === "OUTSOURCE"
      ) {
        const [existing] = await connection.query(
          "SELECT * FROM employeeOutsource WHERE employeeId = UUID_TO_BIN(?)",
          [employeeId]
        );
        if (existing.length > 0) {
          const outsourceFields = [];
          const outsourceValues = [];
          Object.keys(outsource).forEach((key) => {
            if (key.endsWith("_id") && outsource[key]) {
              outsourceFields.push(`${key} = UUID_TO_BIN(?)`);
              outsourceValues.push(outsource[key]);
            } else {
              outsourceFields.push(`${key} = ?`);
              outsourceValues.push(outsource[key]);
            }
          });
          const outsourceQuery = `
            UPDATE employeeOutsource 
            SET ${outsourceFields.join(", ")}
            WHERE employeeId = UUID_TO_BIN(?)
          `;
          await connection.query(outsourceQuery, [
            ...outsourceValues,
            employeeId,
          ]);
        } else {
          const outsourceQuery = `
            INSERT INTO employeeOutsource (employeeId, ${Object.keys(outsource).join(", ")})
            VALUES (UUID_TO_BIN(?), ${Object.keys(outsource).map(() => "?").join(", ")})
          `;
          await connection.query(outsourceQuery, [
            employeeId,
            ...Object.values(outsource),
          ]);
        }
      }
      await this.assignAsDepartmentManagerIfNeeded(connection, employeeId);
      await connection.commit();
      return await this.getEmployeeWithDetails(employeeId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async searchEmployees(filters = {}, include = []) {
    const {
      page = 1,
      limit = 10,
      search = "",
      employeeName = "",
      companyId,
      departmentId,
      employeeType,
      employmentStatus,
      employmentType,
      period = "DAILY",
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = filters;
    const offset = (page - 1) * limit;
    const defaultIncludes = ["personal", "company", "DEPARTMENT", "EMPLOYMENT"];
    const allIncludes = [...new Set([...defaultIncludes, ...include])];
    let query = `
      SELECT 
        BIN_TO_UUID(e.id) as id,
        e.employeeCode,
        e.employmentType,
        e.employmentStatus,
        e.hireDate
    `;
    let countQuery = `SELECT COUNT(*) as total FROM employee e`;
    const params = [];
    const countParams = [];
    if (allIncludes.includes("personal")) {
      query += `,
        ep.firstName,
        ep.firstNameAmharic,
        ep.lastName,
        ep.lastNameAmharic,
        ep.personalEmail,
        ep.profilePicture
      `;
    }
    if (allIncludes.includes("company")) {
      query += `,
        c.companyName
      `;
    }
    if (allIncludes.includes("DEPARTMENT")) {
      query += `,
        d.departmentName
      `;
    }
    if (allIncludes.includes("EMPLOYMENT")) {
      query += `,
        ee.officialEmail
      `;
    }
    query += ` FROM employee e`;
    if (allIncludes.includes("personal")) {
      query += ` LEFT JOIN employeePersonal ep ON e.id = ep.employeeId`;
      countQuery += ` LEFT JOIN employeePersonal ep ON e.id = ep.employeeId`;
    }
    if (allIncludes.includes("company")) {
      query += ` LEFT JOIN company c ON e.companyId = c.id`;
      countQuery += ` LEFT JOIN company c ON e.companyId = c.id`;
    }
    if (allIncludes.includes("DEPARTMENT")) {
      query += ` LEFT JOIN department d ON e.departmentId = d.id`;
      countQuery += ` LEFT JOIN department d ON e.departmentId = d.id`;
    }
    if (allIncludes.includes("EMPLOYMENT")) {
      query += ` LEFT JOIN employeeEmployment ee ON e.id = ee.employeeId`;
      countQuery += ` LEFT JOIN employeeEmployment ee ON e.id = ee.employeeId`;
    }
    const whereConditions = ["(e.employeeRole != 'HRMANAGER' OR e.employeeRole IS NULL)"];

    const normalizedPeriod = String(period || "DAILY").toUpperCase();
    if (normalizedPeriod === "DAILY") {
      whereConditions.push(`DATE(e.hireDate) = CURDATE()`);
    } else if (normalizedPeriod === "WEEKLY") {
      whereConditions.push(`YEARWEEK(e.hireDate, 1) = YEARWEEK(CURDATE(), 1)`);
    } else if (normalizedPeriod === "MONTHLY") {
      whereConditions.push(`YEAR(e.hireDate) = YEAR(CURDATE()) AND MONTH(e.hireDate) = MONTH(CURDATE())`);
    } else if (normalizedPeriod === "YEARLY") {
      whereConditions.push(`YEAR(e.hireDate) = YEAR(CURDATE())`);
    }

    if (search) {
      whereConditions.push(`(
        e.employeeCode LIKE ? OR 
        ep.firstName LIKE ? OR 
        ep.firstNameAmharic LIKE ? OR 
        ep.lastName LIKE ? OR
        ep.lastNameAmharic LIKE ? OR
        ep.personalEmail LIKE ?
      )`);
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (employeeName) {
      whereConditions.push(`(
        ep.firstName LIKE ? OR 
        ep.firstNameAmharic LIKE ? OR 
        ep.middleName LIKE ? OR
        ep.middleNameAmharic LIKE ? OR
        ep.lastName LIKE ? OR
        ep.lastNameAmharic LIKE ? OR
        CONCAT(ep.firstName, ' ', ep.lastName) LIKE ?
      )`);
      const nameTerm = `%${employeeName}%`;
      params.push(nameTerm, nameTerm, nameTerm, nameTerm, nameTerm, nameTerm, nameTerm);
      countParams.push(nameTerm, nameTerm, nameTerm, nameTerm, nameTerm, nameTerm, nameTerm);
    }
    if (companyId) {
      whereConditions.push(`e.companyId = UUID_TO_BIN(?)`);
      params.push(companyId);
      countParams.push(companyId);
    }

    if (departmentId) {
      whereConditions.push(`e.departmentId = UUID_TO_BIN(?)`);
      params.push(departmentId);
      countParams.push(departmentId);
    }

    if (employeeType) {
      whereConditions.push(`e.employeeType = ?`);
      params.push(employeeType);
      countParams.push(employeeType);
    }

    if (employmentStatus) {
      whereConditions.push(`e.employmentStatus = ?`);
      params.push(employmentStatus);
      countParams.push(employmentStatus);
    }

    if (employmentType) {
      whereConditions.push(`e.employmentType = ?`);
      params.push(employmentType);
      countParams.push(employmentType);
    }

    // Add WHERE clause
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(" AND ")}`;
      query += whereClause;
      countQuery += whereClause;
    }

    const sortFieldMap = {
      createdAt: "e.createdAt",
      hireDate: "e.hireDate",
      firstName: "ep.firstName",
      firstNameAmharic: "ep.firstNameAmharic",
      employeeCode: "e.employeeCode",
      employmentStatus: "e.employmentStatus",
      employmentType: "e.employmentType",
    };
    const resolvedSortBy = sortFieldMap[sortBy] || "e.createdAt";
    const resolvedSortOrder = String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Add sorting and pagination
    query += ` ORDER BY ${resolvedSortBy} ${resolvedSortOrder} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [employees] = await pool.query(query, params);
    const [countResult] = await pool.query(countQuery, countParams);

    // Summary cards should reflect the selected period and structural filters,
    // but not the free-text search input.
    const summaryWhereConditions = [
      "(e.employeeRole != 'HRMANAGER' OR e.employeeRole IS NULL)",
    ];
    const summaryParams = [];

    if (normalizedPeriod === "DAILY") {
      summaryWhereConditions.push(`DATE(e.hireDate) = CURDATE()`);
    } else if (normalizedPeriod === "WEEKLY") {
      summaryWhereConditions.push(`YEARWEEK(e.hireDate, 1) = YEARWEEK(CURDATE(), 1)`);
    } else if (normalizedPeriod === "MONTHLY") {
      summaryWhereConditions.push(`YEAR(e.hireDate) = YEAR(CURDATE()) AND MONTH(e.hireDate) = MONTH(CURDATE())`);
    } else if (normalizedPeriod === "YEARLY") {
      summaryWhereConditions.push(`YEAR(e.hireDate) = YEAR(CURDATE())`);
    }

    if (companyId) {
      summaryWhereConditions.push(`e.companyId = UUID_TO_BIN(?)`);
      summaryParams.push(companyId);
    }

    if (departmentId) {
      summaryWhereConditions.push(`e.departmentId = UUID_TO_BIN(?)`);
      summaryParams.push(departmentId);
    }

    if (employeeType) {
      summaryWhereConditions.push(`e.employeeType = ?`);
      summaryParams.push(employeeType);
    }

    if (employmentStatus) {
      summaryWhereConditions.push(`e.employmentStatus = ?`);
      summaryParams.push(employmentStatus);
    }

    if (employmentType) {
      summaryWhereConditions.push(`e.employmentType = ?`);
      summaryParams.push(employmentType);
    }

    const summaryQuery = `
      SELECT
        SUM(CASE WHEN e.employmentStatus = 'ACTIVE' THEN 1 ELSE 0 END) AS activeNow,
        SUM(CASE WHEN e.employeeType = 'ACADEMIC' THEN 1 ELSE 0 END) AS academic,
        SUM(CASE WHEN e.employeeType = 'ADMINISTRATIVE' THEN 1 ELSE 0 END) AS administrative,
        SUM(CASE WHEN e.employeeType = 'OUTSOURCE' THEN 1 ELSE 0 END) AS outsource
      FROM employee e
      ${summaryWhereConditions.length ? `WHERE ${summaryWhereConditions.join(" AND ")}` : ""}
    `;

    const [summaryResult] = await pool.query(summaryQuery, summaryParams);
    const summaryRow = summaryResult?.[0] || {};

    return {
      data: employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit),
      },
      summary: {
        activeNow: Number(summaryRow.activeNow || 0),
        academic: Number(summaryRow.academic || 0),
        administrative: Number(summaryRow.administrative || 0),
        outsource: Number(summaryRow.outsource || 0),
      },
    };
  }

  // Helper method to get employees by category
  async getEmployeesByCategory(category, include = []) {
    try {
      const query = `
        SELECT 
          BIN_TO_UUID(e.id) as id,
          e.employeeCode,
          e.employeeCategory,
          e.employeeType,
          e.employmentType,
          e.employmentStatus,
          ep.firstName,
          ep.lastName,
          ep.profilePicture
        FROM employee e
        LEFT JOIN employeePersonal ep ON e.id = ep.employeeId
        WHERE e.employeeCategory = ? 
        AND (e.employeeRole != 'HRMANAGER' OR e.employeeRole IS NULL)
      `;

      // If search is passed down from a new signature over time, logic would go here.
      const [rows] = await pool.query(query, [category]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Update employee category
  async updateEmployeeCategory(employeeId, newCategory) {
    const validCategories = ["HROFFICER", "ACADEMIC", "OUTSOURCE"];

    if (!validCategories.includes(newCategory)) {
      throw new Error(
        `Invalid employee category. Must be one of: ${validCategories.join(
          ", "
        )}`
      );
    }

    const query = `
      UPDATE employee 
      SET employeeCategory = ?, updatedAt = NOW() 
      WHERE id = UUID_TO_BIN(?)
    `;

    const [result] = await pool.query(query, [newCategory, employeeId]);

    if (result.affectedRows === 0) {
      throw new Error("Employee not found");
    }

    return {
      message: "Employee category updated successfully",
      employeeCategory: newCategory,
    };
  }

  // Override findById to handle ambiguous columns
  async findById(id, columns = ["*"], include = []) {
    try {
      // Use our custom method instead of the parent class method to avoid ambiguous column errors
      if (include.length > 0) {
        return await this.getEmployeeWithDetails(id);
      } else {
        return await this.getEmployeeBasic(id);
      }
    } catch (error) {
      throw error;
    }
  }

  // In EmployeeService.js - add these methods

  async addEmployeeEducation(employeeId, educationData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const query = `
      INSERT INTO employeeEducation (
        employeeId, institutionName, institutionNameAmharic,
        qualification, qualificationAmharic, fieldOfStudy, fieldOfStudyAmharic,
        startDate, endDate, graduationDate, grade, description, descriptionAmharic,
        documentId
      ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UUID_TO_BIN(?))
    `;

      const [result] = await connection.query(query, [
        employeeId,
        educationData.institutionName,
        educationData.institutionNameAmharic || null,
        educationData.qualification,
        educationData.qualificationAmharic || null,
        educationData.fieldOfStudy || null,
        educationData.fieldOfStudyAmharic || null,
        educationData.startDate,
        educationData.endDate || null,
        educationData.graduationDate || null,
        educationData.grade || null,
        educationData.description || null,
        educationData.descriptionAmharic || null,
        educationData.documentId || null,
      ]);

      await connection.commit();

      return {
        id: result.insertId,
        message: "Education record added successfully",
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getEmployeeEducation(employeeId) {
    try {
      const query = `
      SELECT 
        BIN_TO_UUID(id) as id,
        BIN_TO_UUID(employeeId) as employeeId,
        institutionName,
        institutionNameAmharic,
        qualification,
        qualificationAmharic,
        fieldOfStudy,
        fieldOfStudyAmharic,
        startDate,
        endDate,
        graduationDate,
        grade,
        description,
        descriptionAmharic,
        BIN_TO_UUID(documentId) as documentId,
        isVerified,
        createdAt,
        updatedAt
      FROM employeeEducation 
      WHERE employeeId = UUID_TO_BIN(?)
      ORDER BY startDate DESC
    `;

      const [education] = await pool.query(query, [employeeId]);
      return education;
    } catch (error) {
      throw error;
    }
  }

  // Enhanced employee creation with document support
  async createEmployeeWithDocuments(fullData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const {
        personal,
        employment,
        academic,
        hr,
        outsource,
        documents,
        education,
        ...employeeData
      } = fullData;

      // Generate UUID for the new employee
      const employeeUUID = uuidv4();

      // 1. Create basic employee (your existing code)
      // ... existing employee creation code ...

      // 2. Create documents if provided
      if (documents && documents.length > 0) {
        for (const doc of documents) {
          // Handle document creation - you might need to adjust this based on your file handling
          const documentQuery = `
          INSERT INTO employeeDocuments (
            employeeId, documentType, documentName, documentNameAmharic,
            fileName, filePath, fileSize, mimeType, issueDate, expiryDate,
            issuingAuthority, description, descriptionAmharic
          ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

          await connection.query(documentQuery, [
            employeeUUID,
            doc.documentType,
            doc.documentName,
            doc.documentNameAmharic || null,
            doc.fileName,
            doc.filePath,
            doc.fileSize || null,
            doc.mimeType || null,
            doc.issueDate || null,
            doc.expiryDate || null,
            doc.issuingAuthority || null,
            doc.description || null,
            doc.descriptionAmharic || null,
          ]);
        }
      }

      // 3. Create education records if provided
      if (education && education.length > 0) {
        for (const edu of education) {
          await connection.query(
            `INSERT INTO employeeEducation (
            employeeId, institutionName, institutionNameAmharic,
            qualification, qualificationAmharic, fieldOfStudy, fieldOfStudyAmharic,
            startDate, endDate, graduationDate, grade, description, descriptionAmharic,
            documentId
          ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UUID_TO_BIN(?))`,
            [
              employeeUUID,
              edu.institutionName,
              edu.institutionNameAmharic || null,
              edu.qualification,
              edu.qualificationAmharic || null,
              edu.fieldOfStudy || null,
              edu.fieldOfStudyAmharic || null,
              edu.startDate,
              edu.endDate || null,
              edu.graduationDate || null,
              edu.grade || null,
              edu.description || null,
              edu.descriptionAmharic || null,
              edu.documentId || null,
            ]
          );
        }
      }

      await connection.commit();

      // Return employee with all details
      return await this.getEmployeeWithDetails(employeeUUID, [
        "documents",
        "EDUCATION",
      ]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export const employeeService = new EmployeeService();
