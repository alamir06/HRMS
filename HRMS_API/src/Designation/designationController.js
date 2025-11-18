import pool from "../../config/database.js";

const designationCustomController = {
  getDesignationsByDepartment: async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { page = 1, limit = 10, search, status, grade_level } = req.query;

      const offset = (page - 1) * limit;
      let query = `
        SELECT 
          BIN_TO_UUID(d.id) as id,
          BIN_TO_UUID(d.department_id) as department_id,
          d.title,
          d.title_amharic,
          d.job_description,
          d.grade_level,
          d.min_salary,
          d.max_salary,
          d.status,
          dep.department_name,
          dep.department_name_amharic,
          d.created_at,
          d.updated_at
        FROM designations d
        LEFT JOIN department dep ON d.department_id = dep.id
        WHERE d.department_id = UUID_TO_BIN(?)
      `;

      let countQuery = `
        SELECT COUNT(*) as total 
        FROM designations 
        WHERE department_id = UUID_TO_BIN(?)
      `;

      const params = [departmentId];
      const countParams = [departmentId];

      if (status && ["active", "inactive"].includes(status)) {
        query += ` AND d.status = ?`;
        countQuery += ` AND status = ?`;
        params.push(status);
        countParams.push(status);
      }

      if (grade_level) {
        query += ` AND d.grade_level = ?`;
        countQuery += ` AND grade_level = ?`;
        params.push(grade_level);
        countParams.push(grade_level);
      }

      if (search && search.trim() !== "") {
        query += ` AND (
          d.title LIKE ? OR 
          d.title_amharic LIKE ? OR 
          d.job_description LIKE ? OR
          d.grade_level LIKE ?
        )`;
        countQuery += ` AND (
          title LIKE ? OR 
          title_amharic LIKE ? OR 
          job_description LIKE ? OR
          grade_level LIKE ?
        )`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      query += ` ORDER BY d.title ASC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      const [designations] = await pool.query(query, params);
      const [countResult] = await pool.query(countQuery, countParams);

      res.json({
        success: true,
        data: designations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit),
        },
      });
    } catch (error) {
      console.error("Get designations by department error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch designations",
        message: error.message,
      });
    }
  },

  // 2. Designation Statistics
  getDesignationStats: async (req, res) => {
    try {
      const [totalDesignations] = await pool.query(
        "SELECT COUNT(*) as total FROM designations"
      );
      const [activeDesignations] = await pool.query(
        'SELECT COUNT(*) as active FROM designations WHERE status = "active"'
      );

      // Designations per department
      const [designationsPerDepartment] = await pool.query(`
        SELECT 
          dep.department_name,
          COUNT(d.id) as designation_count
        FROM department dep
        LEFT JOIN designations d ON dep.id = d.department_id
        GROUP BY dep.id, dep.department_name
        ORDER BY designation_count DESC
      `);

      // Designations by grade level
      const [designationsByGrade] = await pool.query(`
        SELECT 
          grade_level,
          COUNT(*) as count
        FROM designations 
        WHERE grade_level IS NOT NULL
        GROUP BY grade_level
        ORDER BY count DESC
      `);

      // Salary statistics
      const [salaryStats] = await pool.query(`
        SELECT 
          COUNT(*) as total,
          AVG(min_salary) as avg_min_salary,
          AVG(max_salary) as avg_max_salary,
          MIN(min_salary) as min_salary_overall,
          MAX(max_salary) as max_salary_overall
        FROM designations 
        WHERE min_salary IS NOT NULL AND max_salary IS NOT NULL
      `);

      res.json({
        success: true,
        data: {
          totalDesignations: totalDesignations[0].total,
          activeDesignations: activeDesignations[0].active,
          inactiveDesignations:
            totalDesignations[0].total - activeDesignations[0].active,
          designationsPerDepartment: designationsPerDepartment,
          designationsByGrade: designationsByGrade,
          salaryStatistics: salaryStats[0],
        },
      });
    } catch (error) {
      console.error("Get designation stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch designation statistics",
        message: error.message,
      });
    }
  },

  // 3. Search designations across departments
  searchDesignations: async (req, res) => {
    try {
      const {
        query,
        departmentId,
        companyId,
        status,
        page = 1,
        limit = 10,
      } = req.query;

      const offset = (page - 1) * limit;

      let sqlQuery = `
        SELECT 
          BIN_TO_UUID(d.id) as id,
          BIN_TO_UUID(d.department_id) as department_id,
          d.title,
          d.title_amharic,
          d.grade_level,
          d.min_salary,
          d.max_salary,
          d.status,
          dep.department_name,
          dep.department_name_amharic,
          comp.company_name,
          d.created_at
        FROM designations d
        LEFT JOIN department dep ON d.department_id = dep.id
        LEFT JOIN company comp ON dep.company_id = comp.id
        WHERE 1=1
      `;

      let countQuery = `
        SELECT COUNT(*) as total
        FROM designations d
        LEFT JOIN department dep ON d.department_id = dep.id
        LEFT JOIN company comp ON dep.company_id = comp.id
        WHERE 1=1
      `;

      const params = [];
      const countParams = [];

      if (query && query.trim() !== "") {
        sqlQuery += ` AND (
          d.title LIKE ? OR 
          d.title_amharic LIKE ? OR 
          d.job_description LIKE ? OR
          d.grade_level LIKE ? OR
          dep.department_name LIKE ?
        )`;
        countQuery += ` AND (
          d.title LIKE ? OR 
          d.title_amharic LIKE ? OR 
          d.job_description LIKE ? OR
          d.grade_level LIKE ? OR
          dep.department_name LIKE ?
        )`;
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        countParams.push(
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm,
          searchTerm
        );
      }

      if (departmentId) {
        sqlQuery += ` AND d.department_id = UUID_TO_BIN(?)`;
        countQuery += ` AND d.department_id = UUID_TO_BIN(?)`;
        params.push(departmentId);
        countParams.push(departmentId);
      }

      if (companyId) {
        sqlQuery += ` AND dep.company_id = UUID_TO_BIN(?)`;
        countQuery += ` AND dep.company_id = UUID_TO_BIN(?)`;
        params.push(companyId);
        countParams.push(companyId);
      }

      if (status && ["active", "inactive"].includes(status)) {
        sqlQuery += ` AND d.status = ?`;
        countQuery += ` AND d.status = ?`;
        params.push(status);
        countParams.push(status);
      }

      sqlQuery += ` ORDER BY d.title ASC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      const [designations] = await pool.query(sqlQuery, params);
      const [countResult] = await pool.query(countQuery, countParams);

      res.json({
        success: true,
        data: designations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit),
        },
      });
    } catch (error) {
      console.error("Search designations error:", error);
      res.status(500).json({
        success: false,
        error: "Search failed",
        message: error.message,
      });
    }
  },

  // 4. Bulk update designation status
  bulkUpdateStatus: async (req, res) => {
    try {
      const { designationIds, status } = req.body;

      if (
        !designationIds ||
        !Array.isArray(designationIds) ||
        designationIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Designation IDs array is required",
        });
      }

      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Status must be either "active" or "inactive"',
        });
      }

      const placeholders = designationIds
        .map(() => "UUID_TO_BIN(?)")
        .join(", ");
      const query = `UPDATE designations SET status = ? WHERE id IN (${placeholders})`;
      const params = [status, ...designationIds];

      const [result] = await pool.query(query, params);

      res.json({
        success: true,
        message: `Updated status for ${result.affectedRows} designations`,
        affectedRows: result.affectedRows,
      });
    } catch (error) {
      console.error("Bulk update designation status error:", error);
      res.status(500).json({
        success: false,
        error: "Bulk update failed",
        message: error.message,
      });
    }
  },
};


export default designationCustomController;
