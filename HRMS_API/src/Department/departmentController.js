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
};

export default departmentCustomController;
