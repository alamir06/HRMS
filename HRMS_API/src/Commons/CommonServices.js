import pool from "../../config/database.js";

export class CrudService {
  constructor(
    tableName,
    idField = "id",
    uuidEnabled = true,
    uuidFields) {
    this.tableName = tableName;
    this.idField = idField;
    this.uuidEnabled = uuidEnabled;
    this.uuidFields=uuidFields
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

      const [result] = await pool.execute(query, values);

      // Return the created record
      if (this.uuidEnabled) {
        const [rows] = await pool.execute(
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

  // READ - Find record by ID (FIXED for UUID)
  async findById(id, fields = ["*"]) {
    try {
      const selectFields = this.getSelectFields(fields);

      // FIX: Proper UUID handling
      let query, params;

      if (this.uuidEnabled) {
        query = `SELECT ${selectFields} FROM ${this.tableName} WHERE id = UUID_TO_BIN(?)`;
        params = [id];
      } else {
        query = `SELECT ${selectFields} FROM ${this.tableName} WHERE id = ?`;
        params = [id];
      }

      const [records] = await pool.execute(query, params);

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

  // Helper method to select fields with UUID conversion - FIXED
  getSelectFields(fields = ["*"]) {
    if (!this.uuidEnabled) {
      return fields.join(", ");
    }

    // Handle the case where we want all fields (*)
    if (fields[0] === "*") {
      // Get all column names except id, then add converted id
      const allColumns = this.getAllColumnNames();
      const otherColumns = allColumns.filter((col) => col !== "id");
      if (otherColumns.length > 0) {
        return `BIN_TO_UUID(id) as id, ${otherColumns.join(", ")}`;
      } else {
        return `BIN_TO_UUID(id) as id, *`;
      }
    }

    // Handle specific fields - convert id field
    return fields
      .map((field) =>
        field === "id" && this.uuidEnabled
          ? `BIN_TO_UUID(${field}) as ${field}`
          : field
      )
      .join(", ");
  }

  // Helper to get all column names for the table
  getAllColumnNames() {
    // Define column names for common tables
    const tableSchemas = {
      company: [
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
        "role_name",
        "role_name_amharic",
        "role_code",
        "role_description",
        "role_description_amharic",
        "role_permissions",
        "status",
        "created_at",
      ],
      // Add more tables as needed
    };

    return tableSchemas[this.tableName] || [];
  }

  // Alternative simple method that always converts UUID
  getSelectFieldsSimple(fields = ["*"]) {
    if (!this.uuidEnabled) {
      return fields.join(", ");
    }

    // Always convert UUID for id field, regardless of fields parameter
    if (fields[0] === "*") {
      return `BIN_TO_UUID(id) as id, *`;
    }

    return fields
      .map((field) =>
        field === "id" ? `BIN_TO_UUID(${field}) as ${field}` : field
      )
      .join(", ");
  }
}
