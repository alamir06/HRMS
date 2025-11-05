import pool from "../../config/database.js";

const companyController = {
async createCompany(req, res) {
  try {
    const {
      company_name,
      company_name_amharic,
      company_address,
      company_address_amharic,
      company_phone,
      company_email,
      company_website,
      company_logo,
      company_established_date,
      company_tin_number
    } = req.body;

    const [existingCompanies] = await pool.execute(
      `SELECT id FROM company WHERE company_email = ? OR company_tin_number = ?`,
      [company_email, company_tin_number]
    );

    if (existingCompanies.length > 0) {
      return res.status(409).json({
        error: 'Company already exists',
        message: 'A company with this email or TIN number already exists'
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO company (
        company_name, company_name_amharic, company_address, company_address_amharic,
        company_phone, company_email, company_website, company_logo,
        company_established_date, company_tin_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_name,
        company_name_amharic,
        company_address,
        company_address_amharic,
        company_phone,
        company_email,
        company_website,
        company_logo,
        company_established_date,
        company_tin_number
      ]
    );

    const [companies] = await pool.execute(
      `SELECT 
        BIN_TO_UUID(id) as id,
        company_name, company_name_amharic, company_address, company_address_amharic,
        company_phone, company_email, company_website, company_logo,
        company_established_date, company_tin_number,
        created_at, updated_at
       FROM company 
       WHERE id = (SELECT id FROM company ORDER BY created_at DESC LIMIT 1)`
    );

    if (companies.length === 0) {
      return res.status(500).json({
        error: 'Failed to retrieve created company'
      });
    }

    res.status(201).json({
      message: 'Company created successfully',
      company: companies[0]
    });

  } catch (error) {
    console.error('Create company error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Duplicate entry',
        message: 'A company with this email or TIN number already exists'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create company'
    });
  }
},
 async getAllCompanies(req, res) {
    try {
      console.log('getAllCompanies called with query:', req.query);
      
      const { 
        page = 1, 
        limit = 10, 
        search,
        sortBy = 'created_at', 
        sortOrder = 'DESC' 
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      console.log('Processed params:', { pageNum, limitNum, offset, search });

      // Build base query
      let query = `
        SELECT 
          BIN_TO_UUID(id) as id,
          company_name, 
          company_name_amharic, 
          company_address, 
          company_address_amharic,
          company_phone, 
          company_email, 
          company_website, 
          company_logo,
          company_established_date, 
          company_tin_number,
          created_at, 
          updated_at
        FROM company
        WHERE 1=1
      `;
      
      const params = [];

      // Add search if provided
      if (search && search.trim() !== '') {
        query += ` AND (
          company_name LIKE ? OR 
          company_name_amharic LIKE ? OR 
          company_email LIKE ? OR
          company_tin_number LIKE ?
        )`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Add sorting
      const allowedSortFields = ['company_name', 'company_email', 'created_at', 'updated_at'];
      const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      query += ` ORDER BY ${validSortBy} ${validSortOrder}`;

      // Add pagination
      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNum, offset);

      console.log('Final SQL:', query);
      console.log('Final Params:', params);

      // Execute query
      const [companies] = await pool.execute(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM company WHERE 1=1`;
      const countParams = [];
      
      if (search && search.trim() !== '') {
        countQuery += ` AND (
          company_name LIKE ? OR 
          company_name_amharic LIKE ? OR 
          company_email LIKE ? OR
          company_tin_number LIKE ?
        )`;
        const searchTerm = `%${search}%`;
        countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      console.log('Count SQL:', countQuery);
      console.log('Count Params:', countParams);

      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;

      res.json({
        success: true,
        data: companies,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      console.error('Get companies error details:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        sql: error.sql
      });
    }
  },

  // Other methods remain the same...
  async getCompanyById(req, res) {
    try {
      const { id } = req.params;
      console.log('getCompanyById called with id:', id);

      const [companies] = await pool.execute(
        `SELECT 
          BIN_TO_UUID(id) as id,
          company_name, company_name_amharic, company_address, company_address_amharic,
          company_phone, company_email, company_website, company_logo,
          company_established_date, company_tin_number,
          created_at, updated_at
         FROM company 
         WHERE id = UUID_TO_BIN(?)`,
        [id]
      );

      if (companies.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Company not found'
        });
      }

      res.json({
        success: true,
        data: companies[0]
      });

    } catch (error) {
      console.error('Get company by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  },

  // Update company
  async updateCompany(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if company exists
      const [existingCompanies] = await pool.execute(
        'SELECT id FROM company WHERE id = UUID_TO_BIN(?)',
        [id]
      );

      if (existingCompanies.length === 0) {
        return res.status(404).json({
          error: 'Company not found',
          message: 'The company you are trying to update does not exist'
        });
      }

      // Check for duplicate email or TIN (excluding current company)
      if (updateData.company_email || updateData.company_tin_number) {
        const [duplicateCompanies] = await pool.execute(
          `SELECT id FROM company 
           WHERE (company_email = ? OR company_tin_number = ?) 
           AND id != UUID_TO_BIN(?)`,
          [
            updateData.company_email,
            updateData.company_tin_number,
            id
          ]
        );

        if (duplicateCompanies.length > 0) {
          return res.status(409).json({
            error: 'Duplicate entry',
            message: 'Another company with this email or TIN number already exists'
          });
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const updateParams = [];

      Object.keys(updateData).forEach(key => {
        updateFields.push(`${key} = ?`);
        updateParams.push(updateData[key]);
      });

      if (updateFields.length === 0) {
        return res.status(400).json({
          error: 'No data provided',
          message: 'No fields to update'
        });
      }

      updateParams.push(id);

      const query = `
        UPDATE company 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = UUID_TO_BIN(?)
      `;

      await pool.execute(query, updateParams);

      // Get updated company
      const [updatedCompanies] = await pool.execute(
        `SELECT 
          BIN_TO_UUID(id) as id,
          company_name, company_name_amharic, company_address, company_address_amharic,
          company_phone, company_email, company_website, company_logo,
          company_established_date, company_tin_number,
          created_at, updated_at
         FROM company 
         WHERE id = UUID_TO_BIN(?)`,
        [id]
      );

      res.json({
        message: 'Company updated successfully',
        company: updatedCompanies[0]
      });

    } catch (error) {
      console.error('Update company error:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'Duplicate entry',
          message: 'Another company with this email or TIN number already exists'
        });
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update company'
      });
    }
  },

  // Delete company
  async deleteCompany(req, res) {
    try {
      const { id } = req.params;

      // Check if company exists
      const [existingCompanies] = await pool.execute(
        'SELECT id FROM company WHERE id = UUID_TO_BIN(?)',
        [id]
      );

      if (existingCompanies.length === 0) {
        return res.status(404).json({
          error: 'Company not found',
          message: 'The company you are trying to delete does not exist'
        });
      }

      // Check if company has related records (optional - for referential integrity)
      const [relatedRecords] = await pool.execute(
        `SELECT 
          (SELECT COUNT(*) FROM employee WHERE company_id = UUID_TO_BIN(?)) as employee_count,
          (SELECT COUNT(*) FROM department WHERE company_id = UUID_TO_BIN(?)) as department_count
        `,
        [id, id]
      );

      const { employee_count, department_count } = relatedRecords[0];
      
      if (employee_count > 0 || department_count > 0) {
        return res.status(409).json({
          error: 'Cannot delete company',
          message: 'Company has associated employees or departments. Please remove them first.',
          details: {
            employeeCount: employee_count,
            departmentCount: department_count
          }
        });
      }

      // Delete company
      await pool.execute(
        'DELETE FROM company WHERE id = UUID_TO_BIN(?)',
        [id]
      );

      res.json({
        message: 'Company deleted successfully'
      });

    } catch (error) {
      console.error('Delete company error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete company'
      });
    }
  }
};

export default companyController;