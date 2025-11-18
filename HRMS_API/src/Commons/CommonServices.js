import pool from "../../config/database.js";
import { tableSchemaService } from "../../Commons/TableSchemaService.js";

export class CrudService {
  constructor(tableName, idField = "id", uuidEnabled = true, uuidFields) {
    this.tableName = tableName;
    this.idField = idField;
    this.uuidEnabled = uuidEnabled;

    // Use provided uuidFields or get from schema service
    this.uuidFields = uuidFields || tableSchemaService.getUuidFields(tableName);
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
  async findById(id, fields = ["*"], include = []) {
    try {
      let selectFields = this.getSelectFields(fields);

      // Add related fields if includes are specified
      if (include.length > 0) {
        selectFields = tableSchemaService.addRelatedFields(
          this.tableName,
          selectFields,
          include
        );
      }

      let query, params;

      if (this.uuidEnabled) {
        query = `SELECT ${selectFields} FROM ${this.tableName}`;

        // Add joins based on include parameter
        if (include.length > 0) {
          query += tableSchemaService.buildJoins(this.tableName, include);
        }

        query += ` WHERE ${this.tableName}.id = UUID_TO_BIN(?)`;
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
        include = [],
      } = options;

      const offset = (page - 1) * limit;
      let selectFields = this.getSelectFields(fields);

      // Add related fields if includes are specified
      if (include.length > 0) {
        selectFields = tableSchemaService.addRelatedFields(
          this.tableName,
          selectFields,
          include
        );
      }

      let query = `SELECT ${selectFields} FROM ${this.tableName}`;
      let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName}`;

      // Add joins for count query too if needed for WHERE conditions
      if (include.length > 0) {
        query += tableSchemaService.buildJoins(this.tableName, include);
        // For count query, only add joins if they affect the WHERE clause
        if (Object.keys(filters).some((key) => key.includes("."))) {
          countQuery += tableSchemaService.buildJoins(this.tableName, include);
        }
      }

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

  // Helper method to select fields with UUID conversion
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
    const tableColumns = tableSchemaService.getAllColumnNames(this.tableName);

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
    return tableSchemaService.isUuidField(this.tableName, fieldName);
  }

  // Get valid relations for this table
  getValidRelations() {
    return tableSchemaService.getValidRelations(this.tableName);
  }

  // Validate include parameters
  validateIncludes(includeArray) {
    return tableSchemaService.validateIncludes(this.tableName, includeArray);
  }
}
