import pool from "../../config/database.js";
const departmentCustomController = {
  getDepartmentParentHierarchy: async (req, res) => {
    try {
      const { departmentId } = req.params;
      const query = `
        WITH RECURSIVE parentHierarchy AS (
          SELECT 
            BIN_TO_UUID(d.id) as id,
            BIN_TO_UUID(d.parentDepartmentId) as parentDepartmentId,
            d.departmentName,
            d.departmentNameAmharic,
            d.departmentType,
            d.departmentStatus,
            d.departmentLevel,
            d.createdAt,
            d.updatedAt
          FROM department d
          WHERE d.id = UUID_TO_BIN(?)
          UNION ALL
          SELECT 
            BIN_TO_UUID(parent.id) as id,
            BIN_TO_UUID(parent.parentDepartmentId) as parentDepartmentId,
            parent.departmentName,
            parent.departmentNameAmharic,
            parent.departmentType,
            parent.departmentStatus,
            parent.departmentLevel,
            parent.createdAt,
            parent.updatedAt
          FROM department parent
          INNER JOIN parentHierarchy ph ON parent.id = ph.parentDepartmentId
        )
        SELECT * FROM parentHierarchy;
      `;
      const [rows] = await pool.execute(query, [departmentId]);
      res.json({
        success: true,
        data: rows,
        message: "Hierarchy from this department up to the root (first row is the child, last is the root)"
      });
    } catch (error) {
      console.error("Get department parent hierarchy error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch department parent hierarchy",
        message: error.message,
      });
    }
  },
  getDepartmentsByCompany: async (req, res) => {
    try {
      const { companyId } = req.params;
      const { page = 1, limit = 10, search, collegeId, status } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          BIN_TO_UUID(d.id) as id,
          BIN_TO_UUID(d.companyId) as companyId,
          BIN_TO_UUID(d.collegeId) as collegeId,
          BIN_TO_UUID(d.managerId) as managerId,
          d.departmentName,
          d.departmentNameAmharic,
          d.departmentDescription,
          d.departmentStatus,
          c.collegeName,
          comp.companyName,
          mp.firstName as managerFirstName,
          mp.lastName as managerLastName,
          ee.officialEmail as managerEmail,
          d.createdAt,
          d.updatedAt
        FROM department d
        LEFT JOIN college c ON d.collegeId = c.id
        LEFT JOIN company comp ON d.companyId = comp.id
        LEFT JOIN employee e ON d.managerId = e.id
        LEFT JOIN employeePersonal mp ON d.managerId = mp.employeeId
        LEFT JOIN employeeEmployment ee ON d.managerId = ee.employeeId
        WHERE d.companyId = UUID_TO_BIN(?)
      `;

      let countQuery = `
        SELECT COUNT(*) as total 
        FROM department 
        WHERE companyId = UUID_TO_BIN(?)
      `;

      const params = [companyId];
      const countParams = [companyId];

      if (collegeId) {
        query += ` AND d.collegeId = UUID_TO_BIN(?)`;
        countQuery += ` AND collegeId = UUID_TO_BIN(?)`;
        params.push(collegeId);
        countParams.push(collegeId);
      }

      if (status && ["ACTIVE", "INACTIVE"].includes(status)) {
        query += ` AND d.departmentStatus = ?`;
        countQuery += ` AND departmentStatus = ?`;
        params.push(status);
        countParams.push(status);
      }

      if (search && search.trim() !== "") {
        query += ` AND (
          d.departmentName LIKE ? OR 
          d.departmentNameAmharic LIKE ? OR 
          d.departmentDescription LIKE ?
        )`;
        countQuery += ` AND (
          departmentName LIKE ? OR 
          departmentNameAmharic LIKE ? OR 
          departmentDescription LIKE ?
        )`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      query += ` ORDER BY d.departmentName ASC LIMIT ? OFFSET ?`;
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
          BIN_TO_UUID(d.companyId) as companyId,
          BIN_TO_UUID(d.collegeId) as collegeId,
          BIN_TO_UUID(d.managerId) as managerId,
          d.departmentName,
          d.departmentNameAmharic,
          d.departmentDescription,
          d.departmentStatus,
          c.collegeName,
          mp.firstName as managerFirstName,
          mp.lastName as managerLastName,
          ee.officialEmail as managerEmail,
          d.createdAt,
          d.updatedAt
        FROM department d
        LEFT JOIN college c ON d.collegeId = c.id
        LEFT JOIN employee e ON d.managerId = e.id
        LEFT JOIN employeePersonal mp ON d.managerId = mp.employeeId
        LEFT JOIN employeeEmployment ee ON d.managerId = ee.employeeId
        WHERE d.collegeId = UUID_TO_BIN(?)
        ${
          status && ["ACTIVE", "INACTIVE"].includes(status)
            ? "AND d.departmentStatus = ?"
            : ""
        }
        ORDER BY d.departmentName ASC 
        LIMIT ? OFFSET ?
      `;

      const countQuery = `
        SELECT COUNT(*) as total 
        FROM department 
        WHERE collegeId = UUID_TO_BIN(?)
        ${
          status && ["ACTIVE", "INACTIVE"].includes(status)
            ? "AND departmentStatus = ?"
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
        'SELECT COUNT(*) as active FROM department WHERE departmentStatus = "ACTIVE"'
      );

      // Departments per company
      const [departmentsPerCompany] = await pool.execute(`
        SELECT 
          comp.companyName,
          COUNT(d.id) as departmentCount
        FROM company comp
        LEFT JOIN department d ON comp.id = d.companyId
        GROUP BY comp.id, comp.companyName
        ORDER BY departmentCount DESC
      `);

      // Departments per college
      const [departmentsPerCollege] = await pool.execute(`
        SELECT 
          c.collegeName,
          comp.companyName,
          COUNT(d.id) as departmentCount
        FROM college c
        LEFT JOIN department d ON c.id = d.collegeId
        LEFT JOIN company comp ON c.companyId = comp.id
        WHERE d.id IS NOT NULL
        GROUP BY c.id, c.collegeName, comp.companyName
        ORDER BY departmentCount DESC
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
      const { managerId } = req.body;

      if (!managerId) {
        return res.status(400).json({
          success: false,
          error: "Manager ID is required",
        });
      }

      const query = `
        UPDATE department 
        SET managerId = UUID_TO_BIN(?), updatedAt = CURRENT_TIMESTAMP 
        WHERE id = UUID_TO_BIN(?)
      `;

      const [result] = await pool.execute(query, [managerId, id]);

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
          BIN_TO_UUID(companyId) as companyId,
          BIN_TO_UUID(collegeId) as collegeId,
          BIN_TO_UUID(managerId) as managerId,
          departmentName,
          departmentStatus,
          createdAt,
          updatedAt
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

      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Status must be either "ACTIVE" or "INACTIVE"',
        });
      }

      const placeholders = departmentIds.map(() => "UUID_TO_BIN(?)").join(", ");
      const query = `UPDATE department SET departmentStatus = ? WHERE id IN (${placeholders})`;
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
          BIN_TO_UUID(d.companyId) as companyId,
          BIN_TO_UUID(d.collegeId) as collegeId,
          BIN_TO_UUID(d.managerId) as managerId,
          d.departmentName,
          d.departmentNameAmharic,
          d.departmentDescription,
          d.departmentDescriptionAmharic,
          d.departmentStatus,
          d.createdAt,
          d.updatedAt
      `;
      // Add related fields based on include parameter
      if (includeArray.includes("company")) {
        query += `,
          comp.companyName,
          comp.companyNameAmharic,
          comp.companyEmail,
          comp.companyPhone,
          comp.companyAddress
        `;
      }

      if (includeArray.includes("college")) {
        query += `,
          c.collegeName,
          c.collegeNameAmharic,
          c.collegeDescription
        `;
      }

      // if (includeArray.includes("manager")) {
      //   query += `,
      //     e.firstName as managerFirstName,
      //     e.lastName as managerLastName,
      //     e.email as managerEmail,
      //     e.phone as managerPhone
      //   `;
      // }

      query += `
        FROM department d
      `;

      // Add joins based on include parameter
      if (includeArray.includes("company")) {
        query += ` LEFT JOIN company comp ON d.companyId = comp.id`;
      }

      if (includeArray.includes("college")) {
        query += ` LEFT JOIN college c ON d.collegeId = c.id`;
      }

      // if (includeArray.includes("manager")) {
      //   // query += ` LEFT JOIN employee e ON d.managerId = e.id`;
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
        companyId,
        collegeId,
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
        BIN_TO_UUID(d.companyId) as companyId,
        BIN_TO_UUID(d.collegeId) as collegeId,
        BIN_TO_UUID(d.managerId) as managerId,
        d.departmentName,
        d.departmentNameAmharic,
        d.departmentStatus,
        d.createdAt
    `;

      let countQuery = `SELECT COUNT(*) as total FROM department d`;
      const params = [];
      const countParams = [];

      // Add WHERE conditions for filters
      const whereConditions = [];

      if (companyId) {
        whereConditions.push("d.companyId = UUID_TO_BIN(?)");
        params.push(companyId);
        countParams.push(companyId);
      }

      if (collegeId) {
        whereConditions.push("d.collegeId = UUID_TO_BIN(?)");
        params.push(collegeId);
        countParams.push(collegeId);
      }

      if (status && ["ACTIVE", "INACTIVE"].includes(status)) {
        whereConditions.push("d.departmentStatus = ?");
        params.push(status);
        countParams.push(status);
      }

      // Add related fields based on include parameter
      if (includeArray.includes("company")) {
        query += `,
        comp.companyName,
        comp.companyNameAmharic
      `;
        countQuery += ` LEFT JOIN company comp ON d.companyId = comp.id`;
      }

      if (includeArray.includes("college")) {
        query += `,
        c.collegeName,
        c.collegeNameAmharic
      `;
        if (!includeArray.includes("company")) {
          countQuery += ` LEFT JOIN college c ON d.collegeId = c.id`;
        }
      }

      if (includeArray.includes("manager")) {
        query += `,
        mp.firstName as managerFirstName,
        mp.lastName as managerLastName,
        ee.officialEmail as managerEmail
      `;
        countQuery += ` LEFT JOIN employee e ON d.managerId = e.id`;
        countQuery += ` LEFT JOIN employeePersonal mp ON d.managerId = mp.employeeId`;
        countQuery += ` LEFT JOIN employeeEmployment ee ON d.managerId = ee.employeeId`;
      }

      query += ` FROM department d`;

      // Add joins for main query
      if (includeArray.includes("company")) {
        query += ` LEFT JOIN company comp ON d.companyId = comp.id`;
      }

      if (includeArray.includes("college")) {
        query += ` LEFT JOIN college c ON d.collegeId = c.id`;
      }

      if (includeArray.includes("manager")) {
        query += ` LEFT JOIN employee e ON d.managerId = e.id`;
        query += ` LEFT JOIN employeePersonal mp ON d.managerId = mp.employeeId`;
        query += ` LEFT JOIN employeeEmployment ee ON d.managerId = ee.employeeId`;
      }

      // Add WHERE clause if conditions exist
      if (whereConditions.length > 0) {
        const whereClause = ` WHERE ${whereConditions.join(" AND ")}`;
        query += whereClause;
        countQuery += whereClause;
      }

      query += ` ORDER BY d.departmentName ASC LIMIT ? OFFSET ?`;

      // Convert to numbers explicitly and ensure they're valid
      const finalLimit = Number(limitInt);
      const finalOffset = Number(offset);

      // Push the final numeric values
      params.push(finalLimit, finalOffset);

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

  // 6. Get departments by parent (for administrative hierarchy)
  getDepartmentsByParent: async (req, res) => {
    try {
      const { parentId } = req.params;
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          BIN_TO_UUID(d.id) as id,
          BIN_TO_UUID(d.companyId) as companyId,
          BIN_TO_UUID(d.collegeId) as collegeId,
          BIN_TO_UUID(d.parentDepartmentId) as parentDepartmentId,
          d.departmentName,
          d.departmentNameAmharic,
          d.departmentStatus,
          d.departmentLevel,
          d.createdAt,
          d.updatedAt
        FROM department d
        WHERE d.parentDepartmentId = UUID_TO_BIN(?)
      `;
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM department 
        WHERE parentDepartmentId = UUID_TO_BIN(?)
      `;
      const params = [parentId];
      const countParams = [parentId];
      if (status && ["ACTIVE", "INACTIVE"].includes(status)) {
        query += ` AND d.departmentStatus = ?`;
        countQuery += ` AND departmentStatus = ?`;
        params.push(status);
        countParams.push(status);
      }
      query += ` ORDER BY d.departmentName ASC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);
      const [departments] = await pool.query(query, params);
      const [countResult] = await pool.query(countQuery, countParams);
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
      console.error("Get departments by parent error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch departments by parent",
        message: error.message,
      });
    }
  },
};

export default departmentCustomController;
