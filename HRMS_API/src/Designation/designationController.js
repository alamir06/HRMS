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
  // 2. Designation Statistics
  getDesignationStats: async (req, res) => {
    try {
      const [heads] = await pool.query(
        "SELECT COUNT(*) as total, SUM(CASE WHEN createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent FROM designations WHERE LOWER(title) LIKE '%head%'"
      );
      const [deans] = await pool.query(
        "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active FROM designations WHERE LOWER(title) LIKE '%dean%' OR LOWER(title) LIKE '%dea%'"
      );
      const [others] = await pool.query(
        "SELECT COUNT(*) as total, SUM(CASE WHEN status != 'ACTIVE' THEN 1 ELSE 0 END) as inactive FROM designations WHERE LOWER(title) NOT LIKE '%head%' AND LOWER(title) NOT LIKE '%dean%' AND LOWER(title) NOT LIKE '%dea%'"
      );

      res.json({
        success: true,
        data: {
          totalHeads: heads[0].total || 0,
          newHeads: heads[0].recent || 0,
          totalDeans: deans[0].total || 0,
          activeDeans: deans[0].active || 0,
          totalOthers: others[0].total || 0,
          othersInactive: others[0].inactive || 0,
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
            BIN_TO_UUID(des.id) as id,
            BIN_TO_UUID(des.employeeId) as employeeId,
            COALESCE(BIN_TO_UUID(des.departmentId), BIN_TO_UUID(e.departmentId)) as departmentId,
            COALESCE(BIN_TO_UUID(des.collegeId), BIN_TO_UUID(dep.collegeId), BIN_TO_UUID(empDept.collegeId)) as collegeId,
            des.title,
            des.titleAmharic,
            des.gradeLevel,
            des.status,
            COALESCE(dep.departmentName, empDept.departmentName) as departmentName,
            COALESCE(c.collegeName, dCollege.collegeName, empCollege.collegeName) as collegeName,
            ep.firstName,
            ep.lastName,
            ep.personalEmail,
            ep.profilePicture,
            des.createdAt
          FROM designations des
          LEFT JOIN department dep ON des.departmentId = dep.id
          LEFT JOIN college c ON des.collegeId = c.id
          LEFT JOIN college dCollege ON dep.collegeId = dCollege.id
          LEFT JOIN employee e ON des.employeeId = e.id
          LEFT JOIN department empDept ON e.departmentId = empDept.id
          LEFT JOIN college empCollege ON empDept.collegeId = empCollege.id
          LEFT JOIN employeePersonal ep ON des.employeeId = ep.employeeId
          WHERE 1=1
      `;

      let countQuery = `
        SELECT COUNT(*) as total
        FROM designations des
        LEFT JOIN department dep ON des.departmentId = dep.id
        LEFT JOIN employeePersonal ep ON des.employeeId = ep.employeeId
        WHERE 1=1
      `;

      const params = [];
      const countParams = [];

      if (query && query.trim() !== "") {
        sqlQuery += ` AND (
          des.title LIKE ? OR 
          des.titleAmharic LIKE ? OR 
          des.jobDescription LIKE ? OR
          des.gradeLevel LIKE ? OR
          dep.departmentName LIKE ? OR
          ep.firstName LIKE ? OR
          ep.lastName LIKE ?
        )`;
        countQuery += ` AND (
          des.title LIKE ? OR 
          des.titleAmharic LIKE ? OR 
          des.jobDescription LIKE ? OR
          des.gradeLevel LIKE ? OR
          dep.departmentName LIKE ? OR
          ep.firstName LIKE ? OR
          ep.lastName LIKE ?
        )`;
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (departmentId) {
        sqlQuery += ` AND des.departmentId = UUID_TO_BIN(?)`;
        countQuery += ` AND des.departmentId = UUID_TO_BIN(?)`;
        params.push(departmentId);
        countParams.push(departmentId);
      }

      if (companyId) {
        sqlQuery += ` AND dep.companyId = UUID_TO_BIN(?)`;
        countQuery += ` AND dep.companyId = UUID_TO_BIN(?)`;
        params.push(companyId);
        countParams.push(companyId);
      }

      if (status && ["ACTIVE", "INACTIVE", "URGENT", "ARCHIVED", "PENDING"].includes(status)) {
        sqlQuery += ` AND des.status = ?`;
        countQuery += ` AND des.status = ?`;
        params.push(status);
        countParams.push(status);
      }

      sqlQuery += ` ORDER BY des.title ASC LIMIT ? OFFSET ?`;
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
