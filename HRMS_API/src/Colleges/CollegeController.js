import pool from "../../config/database.js";
import { translatePairs } from "../../utils/translationService.js";
import { collegeValidationSchema } from "./CollegeValidation.js";

const collegeCustomController = {
  getCollegesByCompany: async (req, res) => {
    try {
      const { companyId } = req.params;
      const { page = 1, limit = 10, search } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          BIN_TO_UUID(c.id) as id,
          BIN_TO_UUID(c.companyId) as companyId,
          c.collegeName,
          c.collegeNameAmharic,
          c.collegeDescription,
          c.collegeDescriptionAmharic,
          comp.companyName,
          c.createdAt,
          c.updatedAt
        FROM college c
        JOIN company comp ON c.companyId = comp.id
        WHERE c.companyId = UUID_TO_BIN(?)
      `;

      let countQuery = `
        SELECT COUNT(*) as total 
        FROM college 
        WHERE companyId = UUID_TO_BIN(?)
      `;

      const params = [companyId];
      const countParams = [companyId];

      if (search && search.trim() !== "") {
        query += ` AND (
          c.collegeName LIKE ? OR 
          c.collegeNameAmharic LIKE ? OR 
          c.collegeDescription LIKE ?
        )`;
        countQuery += ` AND (
          collegeName LIKE ? OR 
          collegeNameAmharic LIKE ? OR 
          collegeDescription LIKE ?
        )`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      query += ` ORDER BY c.collegeName ASC LIMIT ? OFFSET ?`;
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
          comp.companyName,
          COUNT(c.id) as collegeCount
        FROM company comp
        LEFT JOIN college c ON comp.id = c.companyId
        GROUP BY comp.id, comp.companyName
        ORDER BY collegeCount DESC
      `);

      // Recent colleges
      const [recentColleges] = await pool.execute(`
        SELECT COUNT(*) as recent 
        FROM college 
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
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
            error: `Validation failed for college: ${college.collegeName}`,
            details: validationError.errors,
          });
        }
      }

      const results = [];
      for (const college of colleges) {
        let payload = college;
        payload = await translatePairs(payload, [
          { enKey: "collegeName", amKey: "collegeNameAmharic" },
          { enKey: "collegeDescription", amKey: "collegeDescriptionAmharic" }
        ]);

        const {
          companyId,
          collegeName,
          collegeNameAmharic,
          collegeDescription,
          collegeDescriptionAmharic,
        } = payload;

        const query = `
          INSERT INTO college (companyId, collegeName, collegeNameAmharic, collegeDescription, collegeDescriptionAmharic) 
          VALUES (UUID_TO_BIN(?), ?, ?, ?, ?)
        `;

        const [result] = await pool.execute(query, [
          companyId,
          collegeName,
          collegeNameAmharic || null,
          collegeDescription || null,
          collegeDescriptionAmharic || null,
        ]);

        // Get the created college
        const [createdCollege] = await pool.execute(
          `
          SELECT 
            BIN_TO_UUID(id) as id,
            BIN_TO_UUID(companyId) as companyId,
            collegeName,
            collegeNameAmharic,
            collegeDescription,
            collegeDescriptionAmharic,
            createdAt
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
          BIN_TO_UUID(c.companyId) as companyId,
          c.collegeName,
          c.collegeNameAmharic,
          c.collegeDescription,
          comp.companyName,
          c.createdAt
        FROM college c
        JOIN company comp ON c.companyId = comp.id
        WHERE 1=1
      `;

      let countQuery = `
        SELECT COUNT(*) as total
        FROM college c
        JOIN company comp ON c.companyId = comp.id
        WHERE 1=1
      `;

      const params = [];
      const countParams = [];

      if (query && query.trim() !== "") {
        sqlQuery += ` AND (
          c.collegeName LIKE ? OR 
          c.collegeNameAmharic LIKE ? OR 
          c.collegeDescription LIKE ? OR
          comp.companyName LIKE ?
        )`;
        countQuery += ` AND (
          c.collegeName LIKE ? OR 
          c.collegeNameAmharic LIKE ? OR 
          c.collegeDescription LIKE ? OR
          comp.companyName LIKE ?
        )`;
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (companyId) {
        sqlQuery += ` AND c.companyId = UUID_TO_BIN(?)`;
        countQuery += ` AND c.companyId = UUID_TO_BIN(?)`;
        params.push(companyId);
        countParams.push(companyId);
      }

      sqlQuery += ` ORDER BY c.collegeName ASC LIMIT ? OFFSET ?`;
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
          collegeName,
          BIN_TO_UUID(companyId) as companyId
        FROM college 
        WHERE collegeName = ? AND companyId = UUID_TO_BIN(?)
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
          BIN_TO_UUID(c.companyId) as companyId,
          c.collegeName,
          c.collegeNameAmharic,
          c.collegeDescription,
          c.collegeDescriptionAmharic,
          comp.companyName,
          comp.companyNameAmharic,
          comp.companyEmail,
          comp.companyPhone,
          c.createdAt,
          c.updatedAt
        FROM college c
        JOIN company comp ON c.companyId = comp.id
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
