import pool from "../../config/database.js";
import { tableSchemaService } from "../../Commons/TableSchemaService.js";
import { v4 as uuidv4 } from "uuid";


// Extract duplicate field for department unique constraints
function extractDuplicateField(error) {
  if (!error || !error.sqlMessage) return null;
  const match = error.sqlMessage.match(/for key '([^']+)'/);
  if (!match) return null;
  const key = match[1];
  // Map known unique keys to user-friendly field names
  if (key.includes('uniq_academic_department')) {
    return 'department_name (academic, per college)';
  }
  if (key.includes('uniq_admin_department')) {
    return 'department_name (administrative, per parent/branch)';
  }
  if (key.includes('department_name')) {
    return 'department_name';
  }
  return key;
}

const resolveFetch = async () => {
  if (typeof fetch === "function") {
    return fetch;
  }
  try {
    const module = await import("node-fetch");
    return module.default;
  } catch (error) {
    console.error("Failed to load fetch implementation", error);
    return null;
  }
};

export const buildJobAnnouncement = (job) => {
  if (!job?.title) {
    return null;
  }

  const sections = [`New job: ${job.title}`];

  if (job.vacancies) {
    sections.push(`Vacancies: ${job.vacancies}`);
  }

  if (job.closingDate) {
    sections.push(`Apply before: ${job.closingDate}`);
  }

  if (job.description) {
    sections.push("", job.description);
  }

  if (job.requirements) {
    sections.push("", "Requirements:", job.requirements);
  }

  return sections.join("\n");
};

export const createTelegramNotifier = () => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_CHAT_ID;
  const enabled = Boolean(botToken && chatId);

  return {
    async notifyJobPosting(job) {
      if (!enabled) {
        return;
      }

      const message = buildJobAnnouncement(job);
      if (!message) {
        return;
      }

      const fetchImpl = await resolveFetch();
      if (!fetchImpl) {
        return;
      }

      try {
        await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            disable_web_page_preview: true,
          }),
        });
      } catch (error) {
        console.error("Telegram notification failed", error);
      }
    },
  };
};

export class CrudService {
  constructor(config) {
    const {
      tableName,
      idField = "id",
      uuidEnabled = true,
      uuidFields,
      softDeleteEnabled = false,
      softDeleteField = "deleted_at",
    } = config;

    this.tableName = tableName;
    this.idField = idField;
    this.uuidEnabled = uuidEnabled;
    this.softDeleteEnabled = softDeleteEnabled;
    this.softDeleteField = softDeleteField;
    this.uuidFields = uuidFields || tableSchemaService.getUuidFields(tableName);
    this.extractDuplicateField = extractDuplicateField;
  }

  async create(data, fields = ["*"], connection = null) {
    const db = connection || pool;

    try {
      if (this.uuidEnabled && !data[this.idField]) {
        data[this.idField] = uuidv4();
      }

      const columns = [];
      const placeholders = [];
      const values = [];
      const primaryId = data[this.idField] || null;

      for (const [key, value] of Object.entries(data)) {
        columns.push(key);

        if (this.uuidFields.includes(key) && value !== null && value !== undefined) {
          placeholders.push("UUID_TO_BIN(?)");
        } else {
          placeholders.push("?");
        }

        values.push(value);
      }

      const query = `
        INSERT INTO ${this.tableName} (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
      `;
      await db.query(query, values);

      return await this.findById(primaryId, fields, [], db);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw {
          type: "DUPLICATE",
          field: this.extractDuplicateField?.(error) || "unknown",
        };
      }
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

      if (include.length > 0) {
        selectFields = tableSchemaService.addRelatedFields(
          this.tableName,
          selectFields,
          include
        );
      }

      let query = `SELECT ${selectFields} FROM ${this.tableName}`;
      if (include.length > 0) {
        query += tableSchemaService.buildJoins(this.tableName, include);
      }

      const params = [id];
      let whereClause = this.softDeleteEnabled
        ? ` WHERE ${this.tableName}.${this.softDeleteField} IS NULL`
        : " WHERE 1=1";

      if (this.uuidEnabled) {
        whereClause += ` AND ${this.tableName}.${this.idField} = UUID_TO_BIN(?)`;
      } else {
        whereClause += ` AND ${this.tableName}.${this.idField} = ?`;
      }

      query += whereClause;

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

      if (include.length > 0) {
        selectFields = tableSchemaService.addRelatedFields(
          this.tableName,
          selectFields,
          include
        );
      }

      let query = `SELECT ${selectFields} FROM ${this.tableName}`;
      let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName}`;

      if (include.length > 0) {
        query += tableSchemaService.buildJoins(this.tableName, include);
        countQuery += tableSchemaService.buildJoins(this.tableName, include);
      }

      const { clause: whereClause, params: whereParams } = this.buildWhereClause(
        filters,
        search,
        searchFields
      );
      const countParams = [...whereParams];

      if (whereClause) {
        query += ` ${whereClause}`;
        countQuery += ` ${whereClause}`;
      }

      const safeSortBy = this.validateSortField(sortBy);
      query += ` ORDER BY ${safeSortBy} ${sortOrder.toUpperCase()}`;
      query += " LIMIT ? OFFSET ?";

      const queryParams = [...whereParams, limit, offset];

      const [records] = await pool.query(query, queryParams);
      const [countResult] = await pool.query(countQuery, countParams);

      const total = countResult[0].total;

      return {
        data: records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async update(id, data, fields = ["*"]) {
    if (!Object.keys(data).length) {
      throw new Error("No fields provided for update");
    }

    try {
      const setClause = Object.keys(data)
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = [...Object.values(data)];

      let whereClause = "";
      if (this.softDeleteEnabled) {
        whereClause = ` AND ${this.softDeleteField} IS NULL`;
      }

      let query;
      if (this.uuidEnabled) {
        query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.idField} = UUID_TO_BIN(?)${whereClause}`;
      } else {
        query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.idField} = ?${whereClause}`;
      }

      const [result] = await pool.execute(query, [...values, id]);

      if (result.affectedRows === 0) {
        throw new Error("Record not found");
      }

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
      } else if (this.uuidEnabled) {
        query = `DELETE FROM ${this.tableName} WHERE ${this.idField} = UUID_TO_BIN(?)`;
      } else {
        query = `DELETE FROM ${this.tableName} WHERE ${this.idField} = ?`;
      }

      const [result] = await pool.execute(query, [id]);

      if (result.affectedRows === 0) {
        throw new Error("Record not found");
      }

      return {
        message: this.softDeleteEnabled
          ? "Record soft deleted successfully"
          : "Record deleted successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  async exists(id) {
    try {
      let whereClause = "";
      if (this.softDeleteEnabled) {
        whereClause = ` AND ${this.softDeleteField} IS NULL`;
      }

      let query;
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

    if (this.softDeleteEnabled) {
      conditions.push(`${this.tableName}.${this.softDeleteField} IS NULL`);
    }

    if (search && searchFields.length > 0) {
      const searchConditions = searchFields.map((field) => `${field} LIKE ?`);
      conditions.push(`(${searchConditions.join(" OR ")})`);
      const searchTerm = `%${search}%`;
      searchFields.forEach(() => {
        params.push(searchTerm);
      });
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      if (key.includes("__")) {
        const [field, operator] = key.split("__");

        switch (operator) {
          case "gt":
            conditions.push(`${field} > ?`);
            params.push(value);
            break;
          case "gte":
            conditions.push(`${field} >= ?`);
            params.push(value);
            break;
          case "lt":
            conditions.push(`${field} < ?`);
            params.push(value);
            break;
          case "lte":
            conditions.push(`${field} <= ?`);
            params.push(value);
            break;
          case "like":
            conditions.push(`${field} LIKE ?`);
            params.push(`%${value}%`);
            break;
          case "in": {
            const values = Array.isArray(value) ? value : value.split(",");
            const placeholders = values.map(() => "?").join(",");
            conditions.push(`${field} IN (${placeholders})`);
            params.push(...values);
            break;
          }
          case "not_in": {
            const values = Array.isArray(value) ? value : value.split(",");
            const placeholders = values.map(() => "?").join(",");
            conditions.push(`${field} NOT IN (${placeholders})`);
            params.push(...values);
            break;
          }
          case "null":
            conditions.push(`${field} IS NULL`);
            break;
          case "not_null":
            conditions.push(`${field} IS NOT NULL`);
            break;
          default:
            conditions.push(`${field} = ?`);
            params.push(value);
        }
      } else {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
      params,
    };
  }

  validateSortField(field) {
    const validFieldRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

    if (!validFieldRegex.test(field)) {
      return "created_at";
    }

    return field;
  }

  getSelectFields(fields = ["*"]) {
    if (!this.uuidEnabled) {
      return fields.join(", ");
    }

    if (fields[0] !== "*") {
      return fields
        .map((field) =>
          this.isUuidField(field) ? `BIN_TO_UUID(${field}) as ${field}` : field
        )
        .join(", ");
    }

    const tableColumns = tableSchemaService.getAllColumnNames(this.tableName);

    if (tableColumns[0] === "*") {
      return `BIN_TO_UUID(${this.idField}) as ${this.idField}, ${this.tableName}.*`;
    }

    return tableColumns
      .map((col) =>
        this.isUuidField(col) ? `BIN_TO_UUID(${col}) as ${col}` : col
      )
      .join(", ");
  }

  isUuidField(fieldName) {
    const cleanFieldName = fieldName.includes(".")
      ? fieldName.split(".")[1]
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

