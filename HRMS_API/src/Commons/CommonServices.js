import pool from "../../config/database.js";

export class CrudService {
  constructor(
    tableName,
    idField = "id",
    uuidEnabled = true,
    uuidFields = ["id"]
  ) {
    this.tableName = tableName;
    this.idField = idField;
    this.uuidEnabled = uuidEnabled;
    this.uuidFields = uuidFields || ["id"]; // Default to ['id'] if not provided
  }

  async create(data, fields = ["*"]) {
    try {
      const columns = [];
      const placeholders = [];
      const values = [];

      for (const [key, value] of Object.entries(data)) {
        columns.push(key);

        if (this.uuidFields.includes(key) && value) {
          // Use UUID_TO_BIN for UUID fields
          placeholders.push(`UUID_TO_BIN(?)`);
          values.push(value);
        } else {
          placeholders.push(`?`);
          values.push(value);
        }
      }

      const query = `INSERT INTO ${this.tableName} (${columns.join(
        ", "
      )}) VALUES (${placeholders.join(", ")})`;

      const [result] = await pool.query(query, values);

      // Return the created record
      if (this.uuidEnabled) {
        const [rows] = await pool.query(
          `SELECT BIN_TO_UUID(id) as id FROM ${this.tableName} ORDER BY created_at DESC LIMIT 1`
        );

        if (rows.length > 0) {
          return await this.findById(rows[0].id, fields);
        } else {
          throw new Error("Failed to retrieve created record");
        }
      } else {
        return await this.findById(result.insertId, fields);
      }
    } catch (error) {
      throw error;
    }
  }

  // READ - Find record by ID
  async findById(id, fields = ["*"]) {
    try {
      const selectFields = this.getSelectFields(fields);

      let query, params;

      if (this.uuidEnabled) {
        query = `SELECT ${selectFields} FROM ${this.tableName} WHERE id = UUID_TO_BIN(?)`;
        params = [id];
      } else {
        query = `SELECT ${selectFields} FROM ${this.tableName} WHERE id = ?`;
        params = [id];
      }

      const [records] = await pool.query(query, params);

      if (records.length === 0) {
        throw new Error("Record not found");
      }

      return records[0];
    } catch (error) {
      throw error;
    }
  }

  // READ - Find all records with pagination, search, and filtering
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        searchFields = [],
        filters = {},
        sortBy = "created_at",
        sortOrder = "DESC",
        fields = ["*"],
      } = options;

      const offset = (page - 1) * limit;
      const selectFields = this.getSelectFields(fields);

      let query = `SELECT ${selectFields} FROM ${this.tableName}`;
      let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const params = [];
      const countParams = [];

      // Build WHERE clause
      const whereConditions = [];

      // Add search conditions
      if (search && searchFields.length > 0) {
        const searchConditions = searchFields.map((field) => `${field} LIKE ?`);
        whereConditions.push(`(${searchConditions.join(" OR ")})`);
        const searchTerm = `%${search}%`;
        searchFields.forEach(() => {
          params.push(searchTerm);
          countParams.push(searchTerm);
        });
      }

      // Add filter conditions
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          whereConditions.push(`${key} = ?`);
          params.push(value);
          countParams.push(value);
        }
      });

      // Add WHERE clause if conditions exist
      if (whereConditions.length > 0) {
        const whereClause = ` WHERE ${whereConditions.join(" AND ")}`;
        query += whereClause;
        countQuery += whereClause;
      }

      // Add sorting
      query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

      // Add pagination
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      // Execute queries
      const [records] = await pool.query(query, params);
      const [countResult] = await pool.query(countQuery, countParams);

      const total = countResult[0].total;

      return {
        data: records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // UPDATE - Update record by ID
  async update(id, data, fields = ["*"]) {
    try {
      const setClause = Object.keys(data)
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = [...Object.values(data)];

      let query, queryParams;

      if (this.uuidEnabled) {
        query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = UUID_TO_BIN(?)`;
        queryParams = [...values, id];
      } else {
        query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
        queryParams = [...values, id];
      }

      const [result] = await pool.execute(query, queryParams);

      if (result.affectedRows === 0) {
        throw new Error("Record not found");
      }

      // Return updated record
      return await this.findById(id, fields);
    } catch (error) {
      throw error;
    }
  }

  // DELETE - Delete record by ID
  async delete(id) {
    try {
      let query;

      if (this.uuidEnabled) {
        query = `DELETE FROM ${this.tableName} WHERE id = UUID_TO_BIN(?)`;
      } else {
        query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      }

      const [result] = await pool.execute(query, [id]);

      if (result.affectedRows === 0) {
        throw new Error("Record not found");
      }

      return { message: "Record deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  // Check if record exists
  async exists(id) {
    try {
      let query;

      if (this.uuidEnabled) {
        query = `SELECT 1 FROM ${this.tableName} WHERE id = UUID_TO_BIN(?)`;
      } else {
        query = `SELECT 1 FROM ${this.tableName} WHERE id = ?`;
      }

      const [records] = await pool.execute(query, [id]);
      return records.length > 0;
    } catch (error) {
      throw error;
    }
  }

  // Helper method to select fields with UUID conversion - SINGLE VERSION
  getSelectFields(fields = ["*"]) {
    if (!this.uuidEnabled) {
      return fields.join(", ");
    }

    // For specific fields
    if (fields[0] !== "*") {
      return fields
        .map((field) =>
          this.isUuidField(field) ? `BIN_TO_UUID(${field}) as ${field}` : field
        )
        .join(", ");
    }

    // For "*" - Handle all tables with explicit column listing
    const tableColumns = this.getAllColumnNames();

    if (tableColumns[0] === "*") {
      // Fallback if we don't have specific columns
      return `BIN_TO_UUID(id) as id, ${this.tableName}.*`;
    } else {
      // Convert all UUID fields and include all other columns
      const convertedColumns = tableColumns.map((col) => {
        if (this.isUuidField(col)) {
          return `BIN_TO_UUID(${col}) as ${col}`;
        }
        return col;
      });
      return convertedColumns.join(", ");
    }
  }

  // Helper to check if a field is a UUID field
  isUuidField(fieldName) {
    const uuidFields = {
      college: ["id", "company_id"],
      company: ["id"],
      hr_roles: ["id"],
      department: ["id", "company_id", "college_id", "manager_id"],
      // Add new tables here as you create them
    };

    return (
      uuidFields[this.tableName]?.includes(fieldName) || fieldName === "id"
    );
  }

  // Helper to get all column names for the table - CORRECTED
  getAllColumnNames() {
    // Define column names for common tables (just the column names, no BIN_TO_UUID)
    const tableSchemas = {
      company: [
        "id",
        "company_name",
        "company_name_amharic",
        "company_address",
        "company_address_amharic",
        "company_phone",
        "company_email",
        "company_website",
        "company_logo",
        "company_established_date",
        "company_tin_number",
        "created_at",
        "updated_at",
      ],
      hr_roles: [
        "id",
        "role_name",
        "role_name_amharic",
        "role_code",
        "role_description",
        "role_description_amharic",
        "role_permissions",
        "status",
        "created_at",
      ],
      college: [
        "id",
        "company_id",
        "college_name",
        "college_name_amharic",
        "college_description",
        "college_description_amharic",
        "created_at",
        "updated_at",
      ],
      department: [
        "id",
        "company_id",
        "college_id",
        "department_name",
        "department_name_amharic",
        "department_description",
        "department_description_amharic",
        "manager_id",
        "department_status",
        "created_at",
        "updated_at",
      ],
    };

    return tableSchemas[this.tableName] || [];
  }
}
