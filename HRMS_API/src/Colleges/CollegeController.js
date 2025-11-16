import pool from "../../config/database.js";

const collegeCustomController = {
  getCollegesByCompany: async (req, res) => {
    try {
      const { companyId } = req.params;
      const { page = 1, limit = 10, search } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          BIN_TO_UUID(c.id) as id,
          BIN_TO_UUID(c.company_id) as company_id,
          c.college_name,
          c.college_name_amharic,
          c.college_description,
          c.college_description_amharic,
          comp.company_name,
          c.created_at,
          c.updated_at
        FROM college c
        JOIN company comp ON c.company_id = comp.id
        WHERE c.company_id = UUID_TO_BIN(?)
      `;

      let countQuery = `
        SELECT COUNT(*) as total 
        FROM college 
        WHERE company_id = UUID_TO_BIN(?)
      `;

      const params = [companyId];
      const countParams = [companyId];

      if (search && search.trim() !== "") {
        query += ` AND (
          c.college_name LIKE ? OR 
          c.college_name_amharic LIKE ? OR 
          c.college_description LIKE ?
        )`;
        countQuery += ` AND (
          college_name LIKE ? OR 
          college_name_amharic LIKE ? OR 
          college_description LIKE ?
        )`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      query += ` ORDER BY c.college_name ASC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      const [colleges] = await pool.execute(query, params);
      const [countResult] = await pool.execute(countQuery, countParams);

      res.json({
        success: true,
        data: colleges,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit),
        },
      });
    } catch (error) {
      console.error("Get colleges by company error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch colleges",
        message: error.message,
      });
    }
  },

  // 2. College Statistics
  getCollegeStats: async (req, res) => {
    try {
      const [totalColleges] = await pool.execute(
        "SELECT COUNT(*) as total FROM college"
      );

      // Colleges per company
      const [collegesPerCompany] = await pool.execute(`
        SELECT 
          comp.company_name,
          COUNT(c.id) as college_count
        FROM company comp
        LEFT JOIN college c ON comp.id = c.company_id
        GROUP BY comp.id, comp.company_name
        ORDER BY college_count DESC
      `);

      // Recent colleges
      const [recentColleges] = await pool.execute(`
        SELECT COUNT(*) as recent 
        FROM college 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      res.json({
        success: true,
        data: {
          totalColleges: totalColleges[0].total,
          collegesPerCompany: collegesPerCompany,
          recentColleges: recentColleges[0].recent,
        },
      });
    } catch (error) {
      console.error("Get college stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch college statistics",
        message: error.message,
      });
    }
  },

  // 3. Bulk Create Colleges
  bulkCreateColleges: async (req, res) => {
    try {
      const { colleges } = req.body;

      if (!colleges || !Array.isArray(colleges) || colleges.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Colleges array is required",
        });
      }

      // Validate each college
      for (const college of colleges) {
        try {
          collegeValidationSchema.create.parse(college);
        } catch (validationError) {
          return res.status(400).json({
            success: false,
            error: `Validation failed for college: ${college.college_name}`,
            details: validationError.errors,
          });
        }
      }

      const results = [];
      for (const college of colleges) {
        const {
          company_id,
          college_name,
          college_name_amharic,
          college_description,
          college_description_amharic,
        } = college;

        const query = `
          INSERT INTO college (company_id, college_name, college_name_amharic, college_description, college_description_amharic) 
          VALUES (UUID_TO_BIN(?), ?, ?, ?, ?)
        `;

        const [result] = await pool.execute(query, [
          company_id,
          college_name,
          college_name_amharic || null,
          college_description || null,
          college_description_amharic || null,
        ]);

        // Get the created college
        const [createdCollege] = await pool.execute(
          `
          SELECT 
            BIN_TO_UUID(id) as id,
            BIN_TO_UUID(company_id) as company_id,
            college_name,
            college_name_amharic,
            college_description,
            college_description_amharic,
            created_at
          FROM college 
          WHERE id = ?
        `,
          [result.insertId]
        );

        results.push(createdCollege[0]);
      }

      res.status(201).json({
        success: true,
        message: `Successfully created ${results.length} colleges`,
        data: results,
      });
    } catch (error) {
      console.error("Bulk create colleges error:", error);
      res.status(500).json({
        success: false,
        error: "Bulk create failed",
        message: error.message,
      });
    }
  },

  // 4. Search Colleges Across Companies
  searchColleges: async (req, res) => {
    try {
      const { query, companyId, page = 1, limit = 10 } = req.query;

      const offset = (page - 1) * limit;

      let sqlQuery = `
        SELECT 
          BIN_TO_UUID(c.id) as id,
          BIN_TO_UUID(c.company_id) as company_id,
          c.college_name,
          c.college_name_amharic,
          c.college_description,
          comp.company_name,
          c.created_at
        FROM college c
        JOIN company comp ON c.company_id = comp.id
        WHERE 1=1
      `;

      let countQuery = `
        SELECT COUNT(*) as total
        FROM college c
        JOIN company comp ON c.company_id = comp.id
        WHERE 1=1
      `;

      const params = [];
      const countParams = [];

      if (query && query.trim() !== "") {
        sqlQuery += ` AND (
          c.college_name LIKE ? OR 
          c.college_name_amharic LIKE ? OR 
          c.college_description LIKE ? OR
          comp.company_name LIKE ?
        )`;
        countQuery += ` AND (
          c.college_name LIKE ? OR 
          c.college_name_amharic LIKE ? OR 
          c.college_description LIKE ? OR
          comp.company_name LIKE ?
        )`;
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (companyId) {
        sqlQuery += ` AND c.company_id = UUID_TO_BIN(?)`;
        countQuery += ` AND c.company_id = UUID_TO_BIN(?)`;
        params.push(companyId);
        countParams.push(companyId);
      }

      sqlQuery += ` ORDER BY c.college_name ASC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      const [colleges] = await pool.execute(sqlQuery, params);
      const [countResult] = await pool.execute(countQuery, countParams);

      res.json({
        success: true,
        data: colleges,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit),
        },
      });
    } catch (error) {
      console.error("Search colleges error:", error);
      res.status(500).json({
        success: false,
        error: "Search failed",
        message: error.message,
      });
    }
  },

  // 5. Validate College Name Uniqueness
  validateCollegeName: async (req, res) => {
    try {
      const { collegeName, companyId, collegeId } = req.query;

      if (!collegeName || !companyId) {
        return res.status(400).json({
          success: false,
          error: "College name and company ID are required",
        });
      }

      let query = `
        SELECT 
          BIN_TO_UUID(id) as id,
          college_name,
          BIN_TO_UUID(company_id) as company_id
        FROM college 
        WHERE college_name = ? AND company_id = UUID_TO_BIN(?)
      `;

      const params = [collegeName, companyId];

      // Exclude current college when updating
      if (collegeId) {
        query += ` AND id != UUID_TO_BIN(?)`;
        params.push(collegeId);
      }

      const [colleges] = await pool.execute(query, params);

      res.json({
        success: true,
        data: {
          exists: colleges.length > 0,
          college: colleges.length > 0 ? colleges[0] : null,
          message:
            colleges.length > 0
              ? "College name already exists in this company"
              : "College name is available",
        },
      });
    } catch (error) {
      console.error("Validate college name error:", error);
      res.status(500).json({
        success: false,
        error: "Validation failed",
        message: error.message,
      });
    }
  },

  // 6. Get College with Company Details
  getCollegeWithCompany: async (req, res) => {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          BIN_TO_UUID(c.id) as id,
          BIN_TO_UUID(c.company_id) as company_id,
          c.college_name,
          c.college_name_amharic,
          c.college_description,
          c.college_description_amharic,
          comp.company_name,
          comp.company_name_amharic,
          comp.company_email,
          comp.company_phone,
          c.created_at,
          c.updated_at
        FROM college c
        JOIN company comp ON c.company_id = comp.id
        WHERE c.id = UUID_TO_BIN(?)
      `;

      const [colleges] = await pool.execute(query, [id]);

      if (colleges.length === 0) {
        return res.status(404).json({
          success: false,
          error: "College not found",
        });
      }

      res.json({
        success: true,
        data: colleges[0],
      });
    } catch (error) {
      console.error("Get college with company error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch college details",
        message: error.message,
      });
    }
  },
};

export default collegeCustomController;
