import pool from "../../config/database.js";
import { tableSchemaService } from "../../Commons/TableSchemaService.js";

export class CrudService {
  constructor(config) {
    const {
      tableName,
      idField = "id",
      uuidEnabled = true,
      uuidFields,
      softDeleteEnabled = false,
      softDeleteField = 'deleted_at'
    } = config;

    this.tableName = tableName;
    this.idField = idField;
    this.uuidEnabled = uuidEnabled;
    this.softDeleteEnabled = softDeleteEnabled;
    this.softDeleteField = softDeleteField;

    // Use provided uuidFields or get from schema service
    this.uuidFields = uuidFields || tableSchemaService.getUuidFields(tableName);
  }

  async create(data, fields = ["*"], connection = null) {
    const db = connection || pool;
    
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

      const [result] = await db.query(query, values);

      // Return the created record
      if (this.uuidEnabled) {
        const [rows] = await db.query(
          `SELECT BIN_TO_UUID(id) as id FROM ${this.tableName} WHERE id = ?`,
          [result.insertId]
        );

        if (rows.length > 0) {
          return await this.findById(rows[0].id, fields, [], db);
        } else {
          // Fallback: get the last inserted record
          const [lastRecords] = await db.query(
            `SELECT BIN_TO_UUID(id) as id FROM ${this.tableName} ORDER BY created_at DESC LIMIT 1`
          );
          
          if (lastRecords.length > 0) {
            return await this.findById(lastRecords[0].id, fields, [], db);
          } else {
            throw new Error("Failed to retrieve created record");
          }
        }
      } else {
        return await this.findById(result.insertId, fields, [], db);
      }
    } catch (error) {
      throw error;
    }
  }

  async bulkCreate(dataArray, fields = ["*"]) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const results = [];
      for (const data of dataArray) {
        const result = await this.create(data, fields, connection);
        results.push(result);
      }
      
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findById(id, fields = ["*"], include = [], connection = null) {
    const db = connection || pool;
    
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

      // Build base query with soft delete check
      let baseQuery = `SELECT ${selectFields} FROM ${this.tableName}`;

      // Add joins based on include parameter
      if (include.length > 0) {
        baseQuery += tableSchemaService.buildJoins(this.tableName, include);
      }

      // Add WHERE clause with soft delete check
      let whereClause = '';
      if (this.softDeleteEnabled) {
        whereClause = ` WHERE ${this.tableName}.${this.softDeleteField} IS NULL`;
      } else {
        whereClause = ` WHERE 1=1`;
      }

      if (this.uuidEnabled) {
        whereClause += ` AND ${this.tableName}.${this.idField} = UUID_TO_BIN(?)`;
        params = [id];
      } else {
        whereClause += ` AND ${this.tableName}.${this.idField} = ?`;
        params = [id];
      }

      query = baseQuery + whereClause;

      const [records] = await db.query(query, params);

      if (records.length === 0) {
        throw new Error("Record not found");
      }

      return records[0];
    } catch (error) {
      throw error;
    }
  }

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

      // Add joins for both queries
      if (include.length > 0) {
        query += tableSchemaService.buildJoins(this.tableName, include);
        countQuery += tableSchemaService.buildJoins(this.tableName, include);
      }

      const { clause: whereClause, params: whereParams } = this.buildWhereClause(filters, search, searchFields);
      const countParams = [...whereParams];

      // Add WHERE clause if conditions exist
      if (whereClause) {
        query += ` ${whereClause}`;
        countQuery += ` ${whereClause}`;
      }

      // Add sorting
      const safeSortBy = this.validateSortField(sortBy);
      query += ` ORDER BY ${safeSortBy} ${sortOrder.toUpperCase()}`;

      // Add pagination
      query += ` LIMIT ? OFFSET ?`;
      const queryParams = [...whereParams, limit, offset];

      // Execute queries
      const [records] = await pool.query(query, queryParams);
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

  async update(id, data, fields = ["*"]) {
    try {
      const setClause = Object.keys(data)
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = [...Object.values(data)];

      let query, queryParams;

      // Build WHERE clause with soft delete check
      let whereClause = '';
      if (this.softDeleteEnabled) {
        whereClause = ` AND ${this.softDeleteField} IS NULL`;
      }

      if (this.uuidEnabled) {
        query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.idField} = UUID_TO_BIN(?)${whereClause}`;
        queryParams = [...values, id];
      } else {
        query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.idField} = ?${whereClause}`;
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

  async delete(id) {
    try {
      let query;

      if (this.softDeleteEnabled) {
        query = `UPDATE ${this.tableName} SET ${this.softDeleteField} = NOW() WHERE ${this.idField} = ?`;
      } else {
        if (this.uuidEnabled) {
          query = `DELETE FROM ${this.tableName} WHERE ${this.idField} = UUID_TO_BIN(?)`;
        } else {
          query = `DELETE FROM ${this.tableName} WHERE ${this.idField} = ?`;
        }
      }

      const [result] = await pool.execute(query, [id]);

      if (result.affectedRows === 0) {
        throw new Error("Record not found");
      }

      return { 
        message: this.softDeleteEnabled 
          ? "Record soft deleted successfully" 
          : "Record deleted successfully" 
      };
    } catch (error) {
      throw error;
    }
  }

  async exists(id) {
    try {
      let query;

      // Build WHERE clause with soft delete check
      let whereClause = '';
      if (this.softDeleteEnabled) {
        whereClause = ` AND ${this.softDeleteField} IS NULL`;
      }

      if (this.uuidEnabled) {
        query = `SELECT 1 FROM ${this.tableName} WHERE ${this.idField} = UUID_TO_BIN(?)${whereClause}`;
      } else {
        query = `SELECT 1 FROM ${this.tableName} WHERE ${this.idField} = ?${whereClause}`;
      }

      const [records] = await pool.execute(query, [id]);
      return records.length > 0;
    } catch (error) {
      throw error;
    }
  }

  async count(filters = {}) {
    try {
      let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;

      // Build WHERE clause with soft delete check
      const { clause: whereClause, params } = this.buildWhereClause(filters);
      
      if (whereClause) {
        query += ` ${whereClause}`;
      }

      const [result] = await pool.query(query, params);
      return result[0].total;
    } catch (error) {
      throw error;
    }
  }

  buildWhereClause(filters = {}, search = "", searchFields = []) {
    const conditions = [];
    const params = [];

    // Add soft delete condition if enabled
    if (this.softDeleteEnabled) {
      conditions.push(`${this.tableName}.${this.softDeleteField} IS NULL`);
    }

    // Add search conditions
    if (search && searchFields.length > 0) {
      const searchConditions = searchFields.map((field) => `${field} LIKE ?`);
      conditions.push(`(${searchConditions.join(" OR ")})`);
      const searchTerm = `%${search}%`;
      searchFields.forEach(() => {
        params.push(searchTerm);
      });
    }

    // Add filter conditions
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;

      // Handle operator syntax: field__operator=value
      if (key.includes('__')) {
        const [field, operator] = key.split('__');
        
        switch (operator) {
          case 'gt':
            conditions.push(`${field} > ?`);
            params.push(value);
            break;
          case 'gte':
            conditions.push(`${field} >= ?`);
            params.push(value);
            break;
          case 'lt':
            conditions.push(`${field} < ?`);
            params.push(value);
            break;
          case 'lte':
            conditions.push(`${field} <= ?`);
            params.push(value);
            break;
          case 'like':
            conditions.push(`${field} LIKE ?`);
            params.push(`%${value}%`);
            break;
          case 'in':
            const values = Array.isArray(value) ? value : value.split(',');
            const placeholders = values.map(() => '?').join(',');
            conditions.push(`${field} IN (${placeholders})`);
            params.push(...values);
            break;
          case 'not_in':
            const notInValues = Array.isArray(value) ? value : value.split(',');
            const notInPlaceholders = notInValues.map(() => '?').join(',');
            conditions.push(`${field} NOT IN (${notInPlaceholders})`);
            params.push(...notInValues);
            break;
          case 'null':
            conditions.push(`${field} IS NULL`);
            break;
          case 'not_null':
            conditions.push(`${field} IS NOT NULL`);
            break;
          default:
            conditions.push(`${field} = ?`);
            params.push(value);
        }
      } else {
        // Simple equality
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }

  validateSortField(field) {
    // Basic SQL injection protection
    const validFieldRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    
    if (!validFieldRegex.test(field)) {
      return 'created_at'; // Default safe field
    }
    
    return field;
  }

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
      return `BIN_TO_UUID(${this.idField}) as ${this.idField}, ${this.tableName}.*`;
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

  isUuidField(fieldName) {
    const cleanFieldName = fieldName.includes('.') 
      ? fieldName.split('.')[1] 
      : fieldName;
    return this.uuidFields.includes(cleanFieldName);
  }

  getValidRelations() {
    return tableSchemaService.getValidRelations(this.tableName);
  }

  validateIncludes(includeArray) {
    return tableSchemaService.validateIncludes(this.tableName, includeArray);
  }
}