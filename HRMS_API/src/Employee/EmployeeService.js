import pool from "../../config/database.js";
import { CrudService } from "../Commons/CommonServices.js";
import { fileUploadService } from "../../Commons/FileUploadService.js";
import { v4 as uuidv4 } from "uuid";

export class EmployeeService extends CrudService {
  constructor() {
    super("employee", "id", true);
  }

  async assignAsDepartmentManagerIfNeeded(connection, employeeId) {
    // Find designation assigned to this employee (1:1)
    const [designationRows] = await connection.query(
      `SELECT des.id,
              des.title,
              BIN_TO_UUID(des.department_id) AS department_id,
              BIN_TO_UUID(des.college_id) AS college_id,
              d.department_type
         FROM designations des
         LEFT JOIN department d ON des.department_id = d.id
        WHERE des.employee_id = UUID_TO_BIN(?)
        LIMIT 1`,
      [employeeId]
    );

    if (!designationRows.length) return;

    const { title, department_id: deptId, department_type: deptType } = designationRows[0];
    const t = (title || "").toLowerCase();
    const isAcademic = deptType === "academic";
    const isHead = t.includes("head");
    const isManager = t.includes("manager");
    const isDea = t.includes("dea") || t.includes("dean");

    // College-level DEA/Dean has no department manager to set
    if (!deptId || isDea) return;

    const shouldAssign = (isAcademic && isHead) || (!isAcademic && (isManager || !isHead));

    if (shouldAssign) {
      await connection.query(
        `UPDATE department SET manager_id = UUID_TO_BIN(?) WHERE id = UUID_TO_BIN(?)`,
        [employeeId, deptId]
      );
    }
  }

  async createEmployee(fullData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { personal, employment, academic, hr, outsource, ...employeeData } = fullData;

      // Generate UUID for the new employee
      const employeeUUID = uuidv4();

      // 1. Insert into employee table with generated UUID
      const employeeQuery = `
      INSERT INTO employee (
        id, employee_code, company_id, employee_type, employee_category,
        employee_role, department_id, manager_id, hire_date,
        employment_type, employment_status, termination_date
      ) VALUES (UUID_TO_BIN(?), ?, UUID_TO_BIN(?), ?, ?, ?, UUID_TO_BIN(?), 
               UUID_TO_BIN(?), ?, ?, ?, ?)
    `;

      await connection.query(employeeQuery, [
        employeeUUID,
        employeeData.employee_code,
        employeeData.company_id,
        employeeData.employee_type,
        employeeData.employee_category,
        employeeData.employee_role || "employee",
        employeeData.department_id,
        employeeData.manager_id || null,
        employeeData.hire_date,
        employeeData.employment_type,
        employeeData.employment_status || "active",
        employeeData.termination_date || null,
      ]);

      // 2. Insert into employee_personal using the same UUID
      const personalQuery = `
      INSERT INTO employee_personal (
        employee_id, first_name, first_name_amharic, middle_name,
        middle_name_amharic, last_name, last_name_amharic, gender,
        date_of_birth, personal_email, personal_phone, emergency_contact_name,
        emergency_contact_name_amharic, emergency_contact_phone, profile_picture,
        address, address_amharic
      ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      await connection.query(personalQuery, [
        employeeUUID,
        personal.first_name,
        personal.first_name_amharic || null,
        personal.middle_name || null,
        personal.middle_name_amharic || null,
        personal.last_name,
        personal.last_name_amharic || null,
        personal.gender || null,
        personal.date_of_birth || null,
        personal.personal_email || null,
        personal.personal_phone || null,
        personal.emergency_contact_name || null,
        personal.emergency_contact_name_amharic || null,
        personal.emergency_contact_phone || null,
        personal.profile_picture || null,
        personal.address || null,
        personal.address_amharic || null,
      ]);

      // 3. Insert into employee_employment if provided
      if (employment) {
        const employmentQuery = `
        INSERT INTO employee_employment (
          employee_id, official_email, official_phone, salary, qualification, qualification_amharic
        ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?)
      `;

        await connection.query(employmentQuery, [
          employeeUUID,
          employment.official_email || null,
          employment.official_phone || null,
          employment.salary || null,
          employment.qualification || null,
          employment.qualification_amharic || null,
        ]);
      }

      // 4. Insert type-specific data - FIXED THIS PART
      if (employeeData.employee_category === "academic" && academic) {
        const academicQuery = `
        INSERT INTO employee_academic (
          employee_id, college_id, academic_rank, academic_rank_amharic,
          academic_status, field_of_specialization, field_of_specialization_amharic
        ) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, ?, ?)
      `;

        await connection.query(academicQuery, [
          employeeUUID,
          academic.college_id || null,
          academic.academic_rank || null,
          academic.academic_rank_amharic || null,
          academic.academic_status || "active",
          academic.field_of_specialization || null,
          academic.field_of_specialization_amharic || null,
        ]);
      }

      // FIXED: Use correct column names for employee_hr table
      if (employeeData.employee_category === "hr_officer" && hr) {
        const hrQuery = `
        INSERT INTO employee_hr (
          employee_id, hr_specialization, hr_level, certifications
        ) VALUES (UUID_TO_BIN(?), ?, ?, ?)
      `;

        await connection.query(hrQuery, [
          employeeUUID,
          hr.hr_specialization || "generalist",
          hr.hr_level || "officer",
          hr.certifications ? JSON.stringify(hr.certifications) : null,
        ]);
      }

      // FIXED: Use correct column names for employee_outsource table
      if (employeeData.employee_category === "outsource" && outsource) {
        const outsourceQuery = `
        INSERT INTO employee_outsource (
          employee_id, outsourcing_company_id, contract_start_date, contract_end_date, service_type
        ) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?)
      `;

        await connection.query(outsourceQuery, [
          employeeUUID,
          outsource.outsourcing_company_id,
          outsource.contract_start_date || null,
          outsource.contract_end_date || null,
          outsource.service_type,
        ]);
      }

      // If designation exists for this employee, assign as department manager when applicable
      await this.assignAsDepartmentManagerIfNeeded(connection, employeeUUID);

      await connection.commit();

      // Return basic employee data
      return await this.getEmployeeBasic(employeeUUID);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get basic employee data without complex joins to avoid ambiguous column errors
  async getEmployeeBasic(employeeId) {
    try {
      const query = `
        SELECT 
          BIN_TO_UUID(id) as id,
          employee_code,
          employee_category,
          employee_type,
          BIN_TO_UUID(company_id) as company_id,
          BIN_TO_UUID(department_id) as department_id,
          BIN_TO_UUID(manager_id) as manager_id,
          hire_date,
          employment_type,
          employment_status,
          termination_date,
          created_at,
          updated_at
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
          e.employee_code,
          e.employee_category,
          e.employee_type,
          BIN_TO_UUID(e.company_id) as company_id,
          BIN_TO_UUID(e.department_id) as department_id,
          BIN_TO_UUID(e.manager_id) as manager_id,
          e.hire_date,
          e.employment_type,
          e.employment_status,
          e.termination_date,
          e.created_at,
          e.updated_at,
          ep.first_name,
          ep.first_name_amharic,
          ep.middle_name,
          ep.middle_name_amharic,
          ep.last_name,
          ep.last_name_amharic,
          ep.gender,
          ep.date_of_birth,
          ep.personal_email,
          ep.personal_phone,
          ep.emergency_contact_name,
          ep.emergency_contact_name_amharic,
          ep.emergency_contact_phone,
          ep.address,
          ep.address_amharic,
          ep.profile_picture,
          ee.official_email,
          ee.official_phone,
          ee.salary,
          ee.qualification,
          ee.qualification_amharic,
          c.company_name,
          c.company_name_amharic,
          d.department_name,
          d.department_name_amharic,
          des.title as designation_title,
          des.title_amharic as designation_title_amharic,
          des.grade_level as designation_grade_level
        FROM employee e
        LEFT JOIN employee_personal ep ON e.id = ep.employee_id
        LEFT JOIN employee_employment ee ON e.id = ee.employee_id
        LEFT JOIN company c ON e.company_id = c.id
        LEFT JOIN department d ON e.department_id = d.id
        LEFT JOIN designations des ON des.employee_id = e.id
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
      const fileUrl = fileUploadService.generateFileUrl(file.filename);

      // Update employee_personal table
      const updateQuery = `
        UPDATE employee_personal 
        SET profile_picture = ? 
        WHERE employee_id = UUID_TO_BIN(?)
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
        profile_picture: fileUrl,
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
        "SELECT profile_picture FROM employee_personal WHERE employee_id = UUID_TO_BIN(?)",
        [employeeId]
      );

      if (current.length === 0) {
        throw new Error("Employee not found");
      }

      const currentPicture = current[0].profile_picture;

      // Update to remove profile picture
      const [result] = await connection.query(
        "UPDATE employee_personal SET profile_picture = NULL WHERE employee_id = UUID_TO_BIN(?)",
        [employeeId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Employee not found");
      }

      // Delete file from storage
      if (currentPicture) {
        const filename = currentPicture.split("/").pop();
        await fileUploadService.deleteFile(filename);
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

  // In EmployeeService.js - add this method
  async updateEmployee(employeeId, fullData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { personal, employment, academic, hr, outsource, ...employeeData } =
        fullData;

      // 1. Update employee table (basic info)
      if (Object.keys(employeeData).length > 0) {
        const employeeFields = [];
        const employeeValues = [];

        Object.keys(employeeData).forEach((key) => {
          // Handle UUID fields
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
          SET ${employeeFields.join(", ")}, updated_at = NOW()
          WHERE id = UUID_TO_BIN(?)
        `;

          await connection.query(employeeQuery, [
            ...employeeValues,
            employeeId,
          ]);
        }
      }

      // 2. Update employee_personal table
      if (personal && Object.keys(personal).length > 0) {
        const personalFields = [];
        const personalValues = [];

        Object.keys(personal).forEach((key) => {
          personalFields.push(`${key} = ?`);
          personalValues.push(personal[key]);
        });

        if (personalFields.length > 0) {
          const personalQuery = `
          UPDATE employee_personal 
          SET ${personalFields.join(", ")}
          WHERE employee_id = UUID_TO_BIN(?)
        `;

          await connection.query(personalQuery, [
            ...personalValues,
            employeeId,
          ]);
        }
      }

      // 3. Update employee_employment table
      if (employment && Object.keys(employment).length > 0) {
        const employmentFields = [];
        const employmentValues = [];

        Object.keys(employment).forEach((key) => {
          employmentFields.push(`${key} = ?`);
          employmentValues.push(employment[key]);
        });

        if (employmentFields.length > 0) {
          // Check if employment record exists
          const [existing] = await connection.query(
            "SELECT * FROM employee_employment WHERE employee_id = UUID_TO_BIN(?)",
            [employeeId]
          );

          if (existing.length > 0) {
            // Update existing record
            const employmentQuery = `
            UPDATE employee_employment 
            SET ${employmentFields.join(", ")}
            WHERE employee_id = UUID_TO_BIN(?)
          `;
            await connection.query(employmentQuery, [
              ...employmentValues,
              employeeId,
            ]);
          } else {
            // Insert new record
            const employmentQuery = `
            INSERT INTO employee_employment (employee_id, ${Object.keys(
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

      // 4. Update type-specific tables based on employee_category
      const [currentEmployee] = await connection.query(
        "SELECT employee_category FROM employee WHERE id = UUID_TO_BIN(?)",
        [employeeId]
      );

      const currentCategory = currentEmployee[0]?.employee_category;

      // Update academic data
      if (
        academic &&
        Object.keys(academic).length > 0 &&
        currentCategory === "academic"
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
            "SELECT * FROM employee_academic WHERE employee_id = UUID_TO_BIN(?)",
            [employeeId]
          );

          if (existing.length > 0) {
            const academicQuery = `
            UPDATE employee_academic 
            SET ${academicFields.join(", ")}
            WHERE employee_id = UUID_TO_BIN(?)
          `;
            await connection.query(academicQuery, [
              ...academicValues,
              employeeId,
            ]);
          } else {
            const academicQuery = `
            INSERT INTO employee_academic (employee_id, ${Object.keys(
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
        hr &&
        Object.keys(hr).length > 0 &&
        currentCategory === "hr_officer"
      ) {
        const [existing] = await connection.query(
          "SELECT * FROM employee_hr WHERE employee_id = UUID_TO_BIN(?)",
          [employeeId]
        );

        if (existing.length > 0) {
          const hrFields = [];
          const hrValues = [];

          Object.keys(hr).forEach((key) => {
            if (
              ["hr_specialization", "hr_level", "certifications"].includes(key)
            ) {
              hrFields.push(`${key} = ?`);
              if (key === "certifications" && hr[key]) {
                hrValues.push(JSON.stringify(hr[key]));
              } else {
                hrValues.push(hr[key]);
              }
            }
          });

          if (hrFields.length > 0) {
            const hrQuery = `
        UPDATE employee_hr 
        SET ${hrFields.join(", ")}
        WHERE employee_id = UUID_TO_BIN(?)
      `;
            await connection.query(hrQuery, [...hrValues, employeeId]);
          }
        } else {
          const hrQuery = `
      INSERT INTO employee_hr (employee_id, hr_specialization, hr_level, certifications) 
      VALUES (UUID_TO_BIN(?), ?, ?, ?)
    `;
          await connection.query(hrQuery, [
            employeeId,
            hr.hr_specialization || "generalist",
            hr.hr_level || "officer",
            hr.certifications ? JSON.stringify(hr.certifications) : null,
          ]);
        }
      }

      // Update outsource data
      if (
        outsource &&
        Object.keys(outsource).length > 0 &&
        currentCategory === "outsource"
      ) {
        const [existing] = await connection.query(
          "SELECT * FROM employee_outsource WHERE employee_id = UUID_TO_BIN(?)",
          [employeeId]
        );

        if (existing.length > 0) {
          const outsourceQuery = `
          UPDATE employee_outsource 
          SET outsourcing_company_id = UUID_TO_BIN(?)
          WHERE employee_id = UUID_TO_BIN(?)
        `;
          await connection.query(outsourceQuery, [
            outsource.outsourcing_company_id,
            employeeId,
          ]);
        } else {
          const outsourceQuery = `
          INSERT INTO employee_outsource (employee_id, outsourcing_company_id) 
          VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?))
        `;
          await connection.query(outsourceQuery, [
            employeeId,
            outsource.outsourcing_company_id,
          ]);
        }
      }

      await this.assignAsDepartmentManagerIfNeeded(connection, employeeId);

      await connection.commit();

      // Return the updated employee with all data
      return await this.getEmployeeWithDetails(employeeId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  // Search employees with filters
  async searchEmployees(filters = {}, include = []) {
    const {
      page = 1,
      limit = 10,
      search = "",
      company_id,
      department_id,
      employee_category,
      employment_status,
      employment_type,
    } = filters;

    const offset = (page - 1) * limit;
    const defaultIncludes = ["personal", "company", "department"];
    const allIncludes = [...new Set([...defaultIncludes, ...include])];

    let query = `
      SELECT 
        BIN_TO_UUID(e.id) as id,
        e.employee_code,
        e.employee_category,
        e.employment_type,
        e.employment_status,
        e.hire_date
    `;

    let countQuery = `SELECT COUNT(*) as total FROM employee e`;
    const params = [];
    const countParams = [];

    // Add related fields with explicit table aliases
    if (allIncludes.includes("personal")) {
      query += `,
        ep.first_name,
        ep.last_name,
        ep.profile_picture
      `;
    }

    if (allIncludes.includes("company")) {
      query += `,
        c.company_name
      `;
    }

    if (allIncludes.includes("department")) {
      query += `,
        d.department_name
      `;
    }

    query += ` FROM employee e`;

    // Add joins
    if (allIncludes.includes("personal")) {
      query += ` LEFT JOIN employee_personal ep ON e.id = ep.employee_id`;
      countQuery += ` LEFT JOIN employee_personal ep ON e.id = ep.employee_id`;
    }

    if (allIncludes.includes("company")) {
      query += ` LEFT JOIN company c ON e.company_id = c.id`;
      countQuery += ` LEFT JOIN company c ON e.company_id = c.id`;
    }

    if (allIncludes.includes("department")) {
      query += ` LEFT JOIN department d ON e.department_id = d.id`;
      countQuery += ` LEFT JOIN department d ON e.department_id = d.id`;
    }

    // Build WHERE conditions
    const whereConditions = [];

    if (search) {
      whereConditions.push(`(
        e.employee_code LIKE ? OR 
        ep.first_name LIKE ? OR 
        ep.last_name LIKE ? OR
        ep.personal_email LIKE ?
      )`);
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    if (company_id) {
      whereConditions.push(`e.company_id = UUID_TO_BIN(?)`);
      params.push(company_id);
      countParams.push(company_id);
    }

    if (department_id) {
      whereConditions.push(`e.department_id = UUID_TO_BIN(?)`);
      params.push(department_id);
      countParams.push(department_id);
    }

    if (employee_category) {
      whereConditions.push(`e.employee_category = ?`);
      params.push(employee_category);
      countParams.push(employee_category);
    }

    if (employment_status) {
      whereConditions.push(`e.employment_status = ?`);
      params.push(employment_status);
      countParams.push(employment_status);
    }

    if (employment_type) {
      whereConditions.push(`e.employment_type = ?`);
      params.push(employment_type);
      countParams.push(employment_type);
    }

    // Add WHERE clause
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(" AND ")}`;
      query += whereClause;
      countQuery += whereClause;
    }

    // Add sorting and pagination
    query += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [employees] = await pool.query(query, params);
    const [countResult] = await pool.query(countQuery, countParams);

    return {
      data: employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit),
      },
    };
  }

  // Helper method to get employees by category
  async getEmployeesByCategory(category, include = []) {
    try {
      const query = `
        SELECT 
          BIN_TO_UUID(e.id) as id,
          e.employee_code,
          e.employee_category,
          e.employee_type,
          e.employment_type,
          e.employment_status,
          ep.first_name,
          ep.last_name,
          ep.profile_picture
        FROM employee e
        LEFT JOIN employee_personal ep ON e.id = ep.employee_id
        WHERE e.employee_category = ?
      `;

      const [rows] = await pool.query(query, [category]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Update employee category
  async updateEmployeeCategory(employeeId, newCategory) {
    const validCategories = ["hr_officer", "academic", "outsource"];

    if (!validCategories.includes(newCategory)) {
      throw new Error(
        `Invalid employee category. Must be one of: ${validCategories.join(
          ", "
        )}`
      );
    }

    const query = `
      UPDATE employee 
      SET employee_category = ?, updated_at = NOW() 
      WHERE id = UUID_TO_BIN(?)
    `;

    const [result] = await pool.query(query, [newCategory, employeeId]);

    if (result.affectedRows === 0) {
      throw new Error("Employee not found");
    }

    return {
      message: "Employee category updated successfully",
      employee_category: newCategory,
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
      INSERT INTO employee_education (
        employee_id, institution_name, institution_name_amharic,
        qualification, qualification_amharic, field_of_study, field_of_study_amharic,
        start_date, end_date, graduation_date, grade, description, description_amharic,
        document_id
      ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UUID_TO_BIN(?))
    `;

      const [result] = await connection.query(query, [
        employeeId,
        educationData.institution_name,
        educationData.institution_name_amharic || null,
        educationData.qualification,
        educationData.qualification_amharic || null,
        educationData.field_of_study || null,
        educationData.field_of_study_amharic || null,
        educationData.start_date,
        educationData.end_date || null,
        educationData.graduation_date || null,
        educationData.grade || null,
        educationData.description || null,
        educationData.description_amharic || null,
        educationData.document_id || null,
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
        BIN_TO_UUID(employee_id) as employee_id,
        institution_name,
        institution_name_amharic,
        qualification,
        qualification_amharic,
        field_of_study,
        field_of_study_amharic,
        start_date,
        end_date,
        graduation_date,
        grade,
        description,
        description_amharic,
        BIN_TO_UUID(document_id) as document_id,
        is_verified,
        created_at,
        updated_at
      FROM employee_education 
      WHERE employee_id = UUID_TO_BIN(?)
      ORDER BY start_date DESC
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
          INSERT INTO employee_documents (
            employee_id, document_type, document_name, document_name_amharic,
            file_name, file_path, file_size, mime_type, issue_date, expiry_date,
            issuing_authority, description, description_amharic
          ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

          await connection.query(documentQuery, [
            employeeUUID,
            doc.document_type,
            doc.document_name,
            doc.document_name_amharic || null,
            doc.file_name,
            doc.file_path,
            doc.file_size || null,
            doc.mime_type || null,
            doc.issue_date || null,
            doc.expiry_date || null,
            doc.issuing_authority || null,
            doc.description || null,
            doc.description_amharic || null,
          ]);
        }
      }

      // 3. Create education records if provided
      if (education && education.length > 0) {
        for (const edu of education) {
          await connection.query(
            `INSERT INTO employee_education (
            employee_id, institution_name, institution_name_amharic,
            qualification, qualification_amharic, field_of_study, field_of_study_amharic,
            start_date, end_date, graduation_date, grade, description, description_amharic,
            document_id
          ) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UUID_TO_BIN(?))`,
            [
              employeeUUID,
              edu.institution_name,
              edu.institution_name_amharic || null,
              edu.qualification,
              edu.qualification_amharic || null,
              edu.field_of_study || null,
              edu.field_of_study_amharic || null,
              edu.start_date,
              edu.end_date || null,
              edu.graduation_date || null,
              edu.grade || null,
              edu.description || null,
              edu.description_amharic || null,
              edu.document_id || null,
            ]
          );
        }
      }

      await connection.commit();

      // Return employee with all details
      return await this.getEmployeeWithDetails(employeeUUID, [
        "documents",
        "education",
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
