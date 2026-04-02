import pool from "../../config/database.js";

const designationCustomController = {
  getDesignationsByDepartment: async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { page = 1, limit = 10, search, status, gradeLevel } = req.query;

      const offset = (page - 1) * limit;
      let query = `
        SELECT 
          BIN_TO_UUID(d.id) as id,
          BIN_TO_UUID(d.departmentId) as departmentId,
          d.title,
          d.titleAmharic,
          d.jobDescription,
          d.gradeLevel,
          d.minSalary,
          d.maxSalary,
          d.status,
          dep.departmentName,
          dep.departmentNameAmharic,
          d.createdAt,
          d.updatedAt
        FROM designations d
        LEFT JOIN department dep ON d.departmentId = dep.id
        WHERE d.departmentId = UUID_TO_BIN(?)
      `;

      let countQuery = `
        SELECT COUNT(*) as total 
        FROM designations 
        WHERE departmentId = UUID_TO_BIN(?)
      `;

      const params = [departmentId];
      const countParams = [departmentId];

      if (status && ["ACTIVE", "INACTIVE"].includes(status)) {
        query += ` AND d.status = ?`;
        countQuery += ` AND status = ?`;
        params.push(status);
        countParams.push(status);
      }

      if (gradeLevel) {
        query += ` AND d.gradeLevel = ?`;
        countQuery += ` AND gradeLevel = ?`;
        params.push(gradeLevel);
        countParams.push(gradeLevel);
      }

      if (search && search.trim() !== "") {
        query += ` AND (
          d.title LIKE ? OR 
          d.titleAmharic LIKE ? OR 
          d.jobDescription LIKE ? OR
          d.gradeLevel LIKE ?
        )`;
        countQuery += ` AND (
          title LIKE ? OR 
          titleAmharic LIKE ? OR 
          jobDescription LIKE ? OR
          gradeLevel LIKE ?
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
        'SELECT COUNT(*) as active FROM designations WHERE status = "ACTIVE"'
      );

      // Designations per department
      const [designationsPerDepartment] = await pool.query(`
        SELECT 
          dep.departmentName,
          COUNT(d.id) as designationCount
        FROM department dep
        LEFT JOIN designations d ON dep.id = d.departmentId
        GROUP BY dep.id, dep.departmentName
        ORDER BY designationCount DESC
      `);

      // Designations by grade level
      const [designationsByGrade] = await pool.query(`
        SELECT 
          gradeLevel,
          COUNT(*) as count
        FROM designations 
        WHERE gradeLevel IS NOT NULL
        GROUP BY gradeLevel
        ORDER BY count DESC
      `);

      // Salary statistics
      const [salaryStats] = await pool.query(`
        SELECT 
          COUNT(*) as total,
          AVG(minSalary) as avgMinSalary,
          AVG(maxSalary) as avgMaxSalary,
          MIN(minSalary) as minSalaryOverall,
          MAX(maxSalary) as maxSalaryOverall
        FROM designations 
        WHERE minSalary IS NOT NULL AND maxSalary IS NOT NULL
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
          BIN_TO_UUID(d.departmentId) as departmentId,
          d.title,
          d.titleAmharic,
          d.gradeLevel,
          d.minSalary,
          d.maxSalary,
          d.status,
          dep.departmentName,
          dep.departmentNameAmharic,
          comp.companyName,
          d.createdAt
        FROM designations d
        LEFT JOIN department dep ON d.departmentId = dep.id
        LEFT JOIN company comp ON dep.companyId = comp.id
        WHERE 1=1
      `;

      let countQuery = `
        SELECT COUNT(*) as total
        FROM designations d
        LEFT JOIN department dep ON d.departmentId = dep.id
        LEFT JOIN company comp ON dep.companyId = comp.id
        WHERE 1=1
      `;

      const params = [];
      const countParams = [];

      if (query && query.trim() !== "") {
        sqlQuery += ` AND (
          d.title LIKE ? OR 
          d.titleAmharic LIKE ? OR 
          d.jobDescription LIKE ? OR
          d.gradeLevel LIKE ? OR
          dep.departmentName LIKE ?
        )`;
        countQuery += ` AND (
          d.title LIKE ? OR 
          d.titleAmharic LIKE ? OR 
          d.jobDescription LIKE ? OR
          d.gradeLevel LIKE ? OR
          dep.departmentName LIKE ?
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
        sqlQuery += ` AND d.departmentId = UUID_TO_BIN(?)`;
        countQuery += ` AND d.departmentId = UUID_TO_BIN(?)`;
        params.push(departmentId);
        countParams.push(departmentId);
      }

      if (companyId) {
        sqlQuery += ` AND dep.companyId = UUID_TO_BIN(?)`;
        countQuery += ` AND dep.companyId = UUID_TO_BIN(?)`;
        params.push(companyId);
        countParams.push(companyId);
      }

      if (status && ["ACTIVE", "INACTIVE"].includes(status)) {
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

      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Status must be either "ACTIVE" or "INACTIVE"',
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
