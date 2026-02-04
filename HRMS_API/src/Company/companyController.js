import pool from "../../config/database.js";

// Custom controller functions
const companyCustomController = {
  // 1. Company Statistics Dashboard
  getCompanyStats: async (req, res) => {
    try {
      const [totalCompanies] = await pool.query(
        "SELECT COUNT(*) as total FROM company"
      );
      const [activeCompanies] = await pool.query(
        'SELECT COUNT(*) as active FROM company WHERE status = "active"'
      );
      const [recentCompanies] = await pool.query(
        "SELECT COUNT(*) as recent FROM company WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
      );
      res.json({
        success: true,
        data: {
          totalCompanies: totalCompanies[0].total,
          activeCompanies: activeCompanies[0].active,
          recentCompanies: recentCompanies[0].recent,
          inactiveCompanies:
            totalCompanies[0].total - activeCompanies[0].active,
        },
      });
    } catch (error) {
      console.error("Get company stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch company statistics",
        message: error.message,
      });
    }
  },

  // 2. Advanced Search with Multiple Criteria
  advancedSearch: async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        location,
        establishedAfter,
        establishedBefore,
        tinNumber,
        status,
        page = 1,
        limit = 10,
      } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          BIN_TO_UUID(id) as id,
          company_name,
          company_name_amharic,
          company_email,
          company_phone,
          company_address,
          company_established_date,
          company_tin_number,
          status
        FROM company 
        WHERE 1=1
      `;

      let countQuery = `SELECT COUNT(*) as total FROM company WHERE 1=1`;
      const params = [];
      const countParams = [];

      if (name) {
        query += ` AND (company_name LIKE ? OR company_name_amharic LIKE ?)`;
        countQuery += ` AND (company_name LIKE ? OR company_name_amharic LIKE ?)`;
        params.push(`%${name}%`, `%${name}%`);
        countParams.push(`%${name}%`, `%${name}%`);
      }

      if (email) {
        query += ` AND company_email LIKE ?`;
        countQuery += ` AND company_email LIKE ?`;
        params.push(`%${email}%`);
        countParams.push(`%${email}%`);
      }

      if (phone) {
        query += ` AND company_phone LIKE ?`;
        countQuery += ` AND company_phone LIKE ?`;
        params.push(`%${phone}%`);
        countParams.push(`%${phone}%`);
      }

      if (location) {
        query += ` AND (company_address LIKE ? OR company_address_amharic LIKE ?)`;
        countQuery += ` AND (company_address LIKE ? OR company_address_amharic LIKE ?)`;
        params.push(`%${location}%`, `%${location}%`);
        countParams.push(`%${location}%`, `%${location}%`);
      }

      if (establishedAfter) {
        query += ` AND company_established_date >= ?`;
        countQuery += ` AND company_established_date >= ?`;
        params.push(establishedAfter);
        countParams.push(establishedAfter);
      }

      if (establishedBefore) {
        query += ` AND company_established_date <= ?`;
        countQuery += ` AND company_established_date <= ?`;
        params.push(establishedBefore);
        countParams.push(establishedBefore);
      }

      if (tinNumber) {
        query += ` AND company_tin_number LIKE ?`;
        countQuery += ` AND company_tin_number LIKE ?`;
        params.push(`%${tinNumber}%`);
        countParams.push(`%${tinNumber}%`);
      }

      if (status && ["active", "inactive"].includes(status)) {
        query += ` AND status = ?`;
        countQuery += ` AND status = ?`;
        params.push(status);
        countParams.push(status);
      }

      query += ` ORDER BY company_name ASC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      const [companies] = await pool.query(query, params);
      const [countResult] = await pool.query(countQuery, countParams);

      res.json({
        success: true,
        data: companies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit),
        },
      });
    } catch (error) {
      console.error("Advanced search error:", error);
      res.status(500).json({
        success: false,
        error: "Advanced search failed",
        message: error.message,
      });
    }
  },

  // 3. Bulk Operations - Update multiple companies status
  bulkUpdateStatus: async (req, res) => {
    try {
      const { companyIds, status } = req.body;

      if (
        !companyIds ||
        !Array.isArray(companyIds) ||
        companyIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Company IDs array is required",
        });
      }

      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Status must be either "active" or "inactive"',
        });
      }

      // Convert UUIDs to binary for the query
      const placeholders = companyIds.map(() => "UUID_TO_BIN(?)").join(", ");

      const query = `UPDATE company SET status = ? WHERE id IN (${placeholders})`;
      const params = [status, ...companyIds];

      const [result] = await pool.query(query, params);

      res.json({
        success: true,
        message: `Updated status for ${result.affectedRows} companies`,
        affectedRows: result.affectedRows,
      });
    } catch (error) {
      console.error("Bulk update error:", error);
      res.status(500).json({
        success: false,
        error: "Bulk update failed",
        message: error.message,
      });
    }
  },

  // 4. Export Companies Data
  exportCompanies: async (req, res) => {
    try {
      const { format = "json" } = req.query;

      const [companies] = await pool.query(`
        SELECT 
          BIN_TO_UUID(id) as id,
          company_name,
          company_name_amharic,
          company_email,
          company_phone,
          company_address,
          company_address_amharic,
          company_website,
          company_established_date,
          company_tin_number,
          status,
          created_at
        FROM company 
        ORDER BY company_name
      `);

      if (format === "csv") {
        // Convert to CSV format
        const csvData = convertToCSV(companies);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=companies.csv"
        );
        return res.send(csvData);
      }

      // Default JSON response
      res.json({
        success: true,
        data: companies,
        exportInfo: {
          format: "json",
          totalRecords: companies.length,
          exportedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({
        success: false,
        error: "Export failed",
        message: error.message,
      });
    }
  },

  // 5. Company Validation (Check if TIN number or email exists)
  validateCompany: async (req, res) => {
    try {
      const { tinNumber, email, companyName } = req.query;

      let query =
        "SELECT BIN_TO_UUID(id) as id, company_name, company_tin_number, company_email FROM company WHERE 1=1";
      const params = [];
      const checks = [];

      if (tinNumber) {
        query += " AND company_tin_number = ?";
        params.push(tinNumber);
        checks.push("TIN number");
      }

      if (email) {
        query += " AND company_email = ?";
        params.push(email);
        checks.push("email");
      }

      if (companyName) {
        query += " AND company_name = ?";
        params.push(companyName);
        checks.push("company name");
      }

      const [companies] = await pool.query(query, params);

      res.json({
        success: true,
        data: {
          exists: companies.length > 0,
          companies: companies,
          checkedFields: checks,
          message:
            companies.length > 0
              ? `Company with matching ${checks.join(", ")} already exists`
              : "No duplicate company found",
        },
      });
    } catch (error) {
      console.error("Validation error:", error);
      res.status(500).json({
        success: false,
        error: "Validation failed",
        message: error.message,
      });
    }
  },
  getCompaniesByYear: async (req, res) => {
    try {
      const { year } = req.params;

      const query = `
        SELECT 
          BIN_TO_UUID(id) as id,
          company_name,
          company_email,
          company_phone,
          company_established_date
        FROM company 
        WHERE YEAR(company_established_date) = ?
        ORDER BY company_name
      `;

      const [companies] = await pool.query(query, [year]);

      res.json({
        success: true,
        data: companies,
        summary: {
          year: year,
          totalCompanies: companies.length,
        },
      });
    } catch (error) {
      console.error("Get companies by year error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch companies by year",
        message: error.message,
      });
    }
  },
};

// Helper function for CSV conversion
const convertToCSV = (data) => {
  if (!data || data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header] || "";
      return `"${value.toString().replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
};

export default companyCustomController;
