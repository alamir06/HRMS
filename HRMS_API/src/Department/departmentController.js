import pool from "../../config/database.js";

const departmentCustomController = {
  getDepartmentsByCompany: async (req, res) => {
    try {
      const { companyId } = req.params;
      const { page = 1, limit = 10, search, collegeId, status } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          BIN_TO_UUID(d.id) as id,
          BIN_TO_UUID(d.company_id) as company_id,
          BIN_TO_UUID(d.college_id) as college_id,
          BIN_TO_UUID(d.manager_id) as manager_id,
          d.department_name,
          d.department_name_amharic,
          d.department_description,
          d.department_status,
          c.college_name,
          comp.company_name,
          e.first_name as manager_first_name,
          e.last_name as manager_last_name,
          d.created_at,
          d.updated_at
        FROM department d
        LEFT JOIN college c ON d.college_id = c.id
        LEFT JOIN company comp ON d.company_id = comp.id
        LEFT JOIN employee e ON d.manager_id = e.id
        WHERE d.company_id = UUID_TO_BIN(?)
      `;

      let countQuery = `
        SELECT COUNT(*) as total 
        FROM department 
        WHERE company_id = UUID_TO_BIN(?)
      `;

      const params = [companyId];
      const countParams = [companyId];

      if (collegeId) {
        query += ` AND d.college_id = UUID_TO_BIN(?)`;
        countQuery += ` AND college_id = UUID_TO_BIN(?)`;
        params.push(collegeId);
        countParams.push(collegeId);
      }

      if (status && ["active", "inactive"].includes(status)) {
        query += ` AND d.department_status = ?`;
        countQuery += ` AND department_status = ?`;
        params.push(status);
        countParams.push(status);
      }

      if (search && search.trim() !== "") {
        query += ` AND (
          d.department_name LIKE ? OR 
          d.department_name_amharic LIKE ? OR 
          d.department_description LIKE ?
        )`;
        countQuery += ` AND (
          department_name LIKE ? OR 
          department_name_amharic LIKE ? OR 
          department_description LIKE ?
        )`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      query += ` ORDER BY d.department_name ASC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      const [departments] = await pool.execute(query, params);
      const [countResult] = await pool.execute(countQuery, countParams);

      res.json({
        success: true,
        data: departments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit),
        },
      });
    } catch (error) {
      console.error("Get departments by company error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch departments",
        message: error.message,
      });
    }
  },

  // 2. Get departments by college ID
  getDepartmentsByCollege: async (req, res) => {
    try {
      const { collegeId } = req.params;
      const { page = 1, limit = 10, status } = req.query;

      const offset = (page - 1) * limit;

      const query = `
        SELECT 
          BIN_TO_UUID(d.id) as id,
          BIN_TO_UUID(d.company_id) as company_id,
          BIN_TO_UUID(d.college_id) as college_id,
          BIN_TO_UUID(d.manager_id) as manager_id,
          d.department_name,
          d.department_name_amharic,
          d.department_description,
          d.department_status,
          c.college_name,
          e.first_name as manager_first_name,
          e.last_name as manager_last_name,
          d.created_at,
          d.updated_at
        FROM department d
        LEFT JOIN college c ON d.college_id = c.id
        LEFT JOIN employee e ON d.manager_id = e.id
        WHERE d.college_id = UUID_TO_BIN(?)
        ${
          status && ["active", "inactive"].includes(status)
            ? "AND d.department_status = ?"
            : ""
        }
        ORDER BY d.department_name ASC 
        LIMIT ? OFFSET ?
      `;

      const countQuery = `
        SELECT COUNT(*) as total 
        FROM department 
        WHERE college_id = UUID_TO_BIN(?)
        ${
          status && ["active", "inactive"].includes(status)
            ? "AND department_status = ?"
            : ""
        }
      `;

      const params = [collegeId];
      const countParams = [collegeId];

      if (status) {
        params.push(status);
        countParams.push(status);
      }

      params.push(parseInt(limit), offset);

      const [departments] = await pool.execute(query, params);
      const [countResult] = await pool.execute(countQuery, countParams);

      res.json({
        success: true,
        data: departments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit),
        },
      });
    } catch (error) {
      console.error("Get departments by college error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch departments",
        message: error.message,
      });
    }
  },

  // 3. Department Statistics
  getDepartmentStats: async (req, res) => {
    try {
      const [totalDepartments] = await pool.execute(
        "SELECT COUNT(*) as total FROM department"
      );
      const [activeDepartments] = await pool.execute(
        'SELECT COUNT(*) as active FROM department WHERE department_status = "active"'
      );

      // Departments per company
      const [departmentsPerCompany] = await pool.execute(`
        SELECT 
          comp.company_name,
          COUNT(d.id) as department_count
        FROM company comp
        LEFT JOIN department d ON comp.id = d.company_id
        GROUP BY comp.id, comp.company_name
        ORDER BY department_count DESC
      `);

      // Departments per college
      const [departmentsPerCollege] = await pool.execute(`
        SELECT 
          c.college_name,
          comp.company_name,
          COUNT(d.id) as department_count
        FROM college c
        LEFT JOIN department d ON c.id = d.college_id
        LEFT JOIN company comp ON c.company_id = comp.id
        WHERE d.id IS NOT NULL
        GROUP BY c.id, c.college_name, comp.company_name
        ORDER BY department_count DESC
      `);

      res.json({
        success: true,
        data: {
          totalDepartments: totalDepartments[0].total,
          activeDepartments: activeDepartments[0].active,
          inactiveDepartments:
            totalDepartments[0].total - activeDepartments[0].active,
          departmentsPerCompany: departmentsPerCompany,
          departmentsPerCollege: departmentsPerCollege,
        },
      });
    } catch (error) {
      console.error("Get department stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch department statistics",
        message: error.message,
      });
    }
  },

  // 4. Update Department Manager
  updateDepartmentManager: async (req, res) => {
    try {
      const { id } = req.params;
      const { manager_id } = req.body;

      if (!manager_id) {
        return res.status(400).json({
          success: false,
          error: "Manager ID is required",
        });
      }

      const query = `
        UPDATE department 
        SET manager_id = UUID_TO_BIN(?), updated_at = CURRENT_TIMESTAMP 
        WHERE id = UUID_TO_BIN(?)
      `;

      const [result] = await pool.execute(query, [manager_id, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: "Department not found",
        });
      }

      // Get updated department
      const [updatedDepartment] = await pool.execute(
        `
        SELECT 
          BIN_TO_UUID(id) as id,
          BIN_TO_UUID(company_id) as company_id,
          BIN_TO_UUID(college_id) as college_id,
          BIN_TO_UUID(manager_id) as manager_id,
          department_name,
          department_status,
          created_at,
          updated_at
        FROM department 
        WHERE id = UUID_TO_BIN(?)
      `,
        [id]
      );

      res.json({
        success: true,
        message: "Department manager updated successfully",
        data: updatedDepartment[0],
      });
    } catch (error) {
      console.error("Update department manager error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update department manager",
        message: error.message,
      });
    }
  },

  // 5. Bulk Update Department Status
  bulkUpdateDepartmentStatus: async (req, res) => {
    try {
      const { departmentIds, status } = req.body;

      if (
        !departmentIds ||
        !Array.isArray(departmentIds) ||
        departmentIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Department IDs array is required",
        });
      }

      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Status must be either "active" or "inactive"',
        });
      }

      const placeholders = departmentIds.map(() => "UUID_TO_BIN(?)").join(", ");
      const query = `UPDATE department SET department_status = ? WHERE id IN (${placeholders})`;
      const params = [status, ...departmentIds];

      const [result] = await pool.execute(query, params);

      res.json({
        success: true,
        message: `Updated status for ${result.affectedRows} departments`,
        affectedRows: result.affectedRows,
      });
    } catch (error) {
      console.error("Bulk update department status error:", error);
      res.status(500).json({
        success: false,
        error: "Bulk update failed",
        message: error.message,
      });
    }
  },

  getDepartmentWithDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const { include = "company,college,manager" } = req.query;

      const includeArray = include
        .split(",")
        .filter((item) => item.trim() !== "");

      let query = `
        SELECT 
          BIN_TO_UUID(d.id) as id,
          BIN_TO_UUID(d.company_id) as company_id,
          BIN_TO_UUID(d.college_id) as college_id,
          BIN_TO_UUID(d.manager_id) as manager_id,
          d.department_name,
          d.department_name_amharic,
          d.department_description,
          d.department_description_amharic,
          d.department_status,
          d.created_at,
          d.updated_at
      `;
      // Add related fields based on include parameter
      if (includeArray.includes("company")) {
        query += `,
          comp.company_name,
          comp.company_name_amharic,
          comp.company_email,
          comp.company_phone,
          comp.company_address
        `;
      }

      if (includeArray.includes("college")) {
        query += `,
          c.college_name,
          c.college_name_amharic,
          c.college_description
        `;
      }

      // if (includeArray.includes("manager")) {
      //   query += `,
      //     e.first_name as manager_first_name,
      //     e.last_name as manager_last_name,
      //     e.email as manager_email,
      //     e.phone as manager_phone
      //   `;
      // }

      query += `
        FROM department d
      `;

      // Add joins based on include parameter
      if (includeArray.includes("company")) {
        query += ` LEFT JOIN company comp ON d.company_id = comp.id`;
      }

      if (includeArray.includes("college")) {
        query += ` LEFT JOIN college c ON d.college_id = c.id`;
      }

      // if (includeArray.includes("manager")) {
      //   // query += ` LEFT JOIN employee e ON d.manager_id = e.id`;
      // }

      query += ` WHERE d.id = UUID_TO_BIN(?)`;

      const [departments] = await pool.execute(query, [id]);

      if (departments.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Department not found",
        });
      }

      res.json({
        success: true,
        data: departments[0],
      });
    } catch (error) {
      console.error("Get department with details error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch department details",
        message: error.message,
      });
    }
  },

  // Get all departments with optional relationships
  getAllDepartmentsWithRelations: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        include = "company,college",
        company_id,
        college_id,
        status,
      } = req.query;

      // Convert to numbers and validate
      const pageInt = parseInt(page);
      const limitInt = parseInt(limit);
      const offset = (pageInt - 1) * limitInt;

      console.log(
        "Debug - Page:",
        page,
        "PageInt:",
        pageInt,
        "Type:",
        typeof pageInt
      );
      console.log(
        "Debug - Limit:",
        limit,
        "LimitInt:",
        limitInt,
        "Type:",
        typeof limitInt
      );
      console.log("Debug - Offset:", offset, "Type:", typeof offset);

      // Validate numbers
      if (isNaN(pageInt) || isNaN(limitInt) || pageInt < 1 || limitInt < 1) {
        return res.status(400).json({
          success: false,
          error: "Invalid page or limit parameters",
        });
      }

      const includeArray = include
        .split(",")
        .filter((item) => item.trim() !== "");

      let query = `
      SELECT 
        BIN_TO_UUID(d.id) as id,
        BIN_TO_UUID(d.company_id) as company_id,
        BIN_TO_UUID(d.college_id) as college_id,
        BIN_TO_UUID(d.manager_id) as manager_id,
        d.department_name,
        d.department_name_amharic,
        d.department_status,
        d.created_at
    `;

      let countQuery = `SELECT COUNT(*) as total FROM department d`;
      const params = [];
      const countParams = [];

      // Add WHERE conditions for filters
      const whereConditions = [];

      if (company_id) {
        whereConditions.push("d.company_id = UUID_TO_BIN(?)");
        params.push(company_id);
        countParams.push(company_id);
      }

      if (college_id) {
        whereConditions.push("d.college_id = UUID_TO_BIN(?)");
        params.push(college_id);
        countParams.push(college_id);
      }

      if (status && ["active", "inactive"].includes(status)) {
        whereConditions.push("d.department_status = ?");
        params.push(status);
        countParams.push(status);
      }

      // Add related fields based on include parameter
      if (includeArray.includes("company")) {
        query += `,
        comp.company_name,
        comp.company_name_amharic
      `;
        countQuery += ` LEFT JOIN company comp ON d.company_id = comp.id`;
      }

      if (includeArray.includes("college")) {
        query += `,
        c.college_name,
        c.college_name_amharic
      `;
        if (!includeArray.includes("company")) {
          countQuery += ` LEFT JOIN college c ON d.college_id = c.id`;
        }
      }

      if (includeArray.includes("manager")) {
        query += `,
        e.first_name as manager_first_name,
        e.last_name as manager_last_name
      `;
      }

      query += ` FROM department d`;

      // Add joins for main query
      if (includeArray.includes("company")) {
        query += ` LEFT JOIN company comp ON d.company_id = comp.id`;
      }

      if (includeArray.includes("college")) {
        query += ` LEFT JOIN college c ON d.college_id = c.id`;
      }

      if (includeArray.includes("manager")) {
        query += ` LEFT JOIN employee e ON d.manager_id = e.id`;
      }

      // Add WHERE clause if conditions exist
      if (whereConditions.length > 0) {
        const whereClause = ` WHERE ${whereConditions.join(" AND ")}`;
        query += whereClause;
        countQuery += whereClause;
      }

      query += ` ORDER BY d.department_name ASC LIMIT ? OFFSET ?`;

      // Convert to numbers explicitly and ensure they're valid
      const finalLimit = Number(limitInt);
      const finalOffset = Number(offset);

      console.log("Debug - Final Params:", {
        limit: finalLimit,
        offset: finalOffset,
        allParams: [...params, finalLimit, finalOffset],
      });

      // Push the final numeric values
      params.push(finalLimit, finalOffset);

      console.log("Debug - Final Query:", query);
      console.log("Debug - Params to execute:", params);

      const [departments] = await pool.query(query, params);
      const [countResult] = await pool.query(countQuery, countParams);

      res.json({
        success: true,
        data: departments,
        pagination: {
          page: pageInt,
          limit: limitInt,
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limitInt),
        },
      });
    } catch (error) {
      console.error("Get all departments with relations error:", error);
      console.error("Error details:", {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
      });
      res.status(500).json({
        success: false,
        error: "Failed to fetch departments",
        message: error.message,
      });
    }
  },
};

export default departmentCustomController;
