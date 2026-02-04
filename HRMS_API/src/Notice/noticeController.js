import { v4 as uuidv4 } from "uuid";
import pool from "../../config/database.js";

const mapNoticeRecord = (record) => ({
  id: record.id,
  title: record.title,
  titleAmharic: record.title_amharic,
  content: record.content,
  contentAmharic: record.content_amharic,
  noticeType: record.notice_type,
  targetAudience: record.target_audience,
  targetDepartmentId: record.target_department_id,
  targetDepartmentName: record.target_department_name,
  targetEmployeeId: record.target_employee_id,
  targetEmployeeName: record.target_employee_name,
  publishDate: record.publish_date,
  expiryDate: record.expiry_date,
  isPublished: Boolean(record.is_published),
  createdBy: record.created_by,
  createdByUsername: record.created_by_username,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

export const createNotice = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const id = uuidv4();
    const {
      title,
      title_amharic,
      content,
      content_amharic,
      notice_type = "general",
      target_audience = "all",
      target_department_id,
      target_employee_id,
      publish_date,
      expiry_date,
      is_published = false,
      created_by,
    } = req.body;

    await connection.beginTransaction();

    const insertQuery = `
      INSERT INTO notices (
        id,
        title,
        title_amharic,
        content,
        content_amharic,
        notice_type,
        target_audience,
        target_department_id,
        target_employee_id,
        publish_date,
        expiry_date,
        is_published,
        created_by
      ) VALUES (
        UUID_TO_BIN(?),
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ${target_department_id ? "UUID_TO_BIN(?)" : "NULL"},
        ${target_employee_id ? "UUID_TO_BIN(?)" : "NULL"},
        ?,
        ?,
        ?,
        UUID_TO_BIN(?)
      )
    `;

    const values = [
      id,
      title,
      title_amharic || null,
      content,
      content_amharic || null,
      notice_type,
      target_audience,
    ];

    if (target_department_id) {
      values.push(target_department_id);
    }

    if (target_employee_id) {
      values.push(target_employee_id);
    }

    values.push(publish_date);
    values.push(expiry_date || null);
    values.push(is_published ? 1 : 0);
    values.push(created_by);

    await connection.execute(insertQuery, values);
    await connection.commit();

    res.status(201).json({
      success: true,
      data: { id },
      message: "Notice created successfully",
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const listNotices = async (req, res, next) => {
  try {
    const {
      notice_type,
      target_audience,
      department_id,
      employee_id,
      is_published,
      active_only,
    } = req.query;

    const conditions = [];
    const params = [];

    if (notice_type) {
      conditions.push("n.notice_type = ?");
      params.push(notice_type);
    }

    if (target_audience) {
      conditions.push("n.target_audience = ?");
      params.push(target_audience);
    }

    if (typeof is_published === "boolean") {
      conditions.push("n.is_published = ?");
      params.push(is_published ? 1 : 0);
    }

    if (department_id) {
      conditions.push("n.target_department_id = UUID_TO_BIN(?)");
      params.push(department_id);
    }

    if (employee_id) {
      conditions.push("n.target_employee_id = UUID_TO_BIN(?)");
      params.push(employee_id);
    }

    if (active_only) {
      conditions.push(
        "(n.is_published = TRUE AND n.publish_date <= CURDATE() AND (n.expiry_date IS NULL OR n.expiry_date >= CURDATE()))"
      );
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        BIN_TO_UUID(n.id) AS id,
        n.title,
        n.title_amharic,
        n.content,
        n.content_amharic,
        n.notice_type,
        n.target_audience,
        BIN_TO_UUID(n.target_department_id) AS target_department_id,
        BIN_TO_UUID(n.target_employee_id) AS target_employee_id,
        n.publish_date,
        n.expiry_date,
        n.is_published,
        BIN_TO_UUID(n.created_by) AS created_by,
        n.created_at,
        n.updated_at,
        d.department_name AS target_department_name,
        CONCAT_WS(' ', ep.first_name, ep.middle_name, ep.last_name) AS target_employee_name,
        u.username AS created_by_username
      FROM notices n
      LEFT JOIN department d ON n.target_department_id = d.id
      LEFT JOIN employee_personal ep ON n.target_employee_id = ep.employee_id
      LEFT JOIN users u ON n.created_by = u.id
      ${whereClause}
      ORDER BY n.publish_date DESC, n.created_at DESC
    `;

    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      data: rows.map(mapNoticeRecord),
    });
  } catch (error) {
    next(error);
  }
};

export const getNoticeById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT
        BIN_TO_UUID(n.id) AS id,
        n.title,
        n.title_amharic,
        n.content,
        n.content_amharic,
        n.notice_type,
        n.target_audience,
        BIN_TO_UUID(n.target_department_id) AS target_department_id,
        BIN_TO_UUID(n.target_employee_id) AS target_employee_id,
        n.publish_date,
        n.expiry_date,
        n.is_published,
        BIN_TO_UUID(n.created_by) AS created_by,
        n.created_at,
        n.updated_at,
        d.department_name AS target_department_name,
        CONCAT_WS(' ', ep.first_name, ep.middle_name, ep.last_name) AS target_employee_name,
        u.username AS created_by_username
      FROM notices n
      LEFT JOIN department d ON n.target_department_id = d.id
      LEFT JOIN employee_personal ep ON n.target_employee_id = ep.employee_id
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.id = UUID_TO_BIN(?)
    `;

    const [rows] = await pool.query(query, [id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    res.json({
      success: true,
      data: mapNoticeRecord(rows[0]),
    });
  } catch (error) {
    next(error);
  }
};

export const updateNotice = async (req, res, next) => {
  const { id } = req.params;
  const fields = req.body;

  const allowedFields = [
    "title",
    "title_amharic",
    "content",
    "content_amharic",
    "notice_type",
    "target_audience",
    "target_department_id",
    "target_employee_id",
    "publish_date",
    "expiry_date",
    "is_published",
  ];

  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(fields)) {
    if (!allowedFields.includes(key)) {
      continue;
    }

    if (key === "target_department_id" || key === "target_employee_id") {
      if (value) {
        setClauses.push(`${key} = UUID_TO_BIN(?)`);
        values.push(value);
      } else {
        setClauses.push(`${key} = NULL`);
      }
      continue;
    }

    if (key === "is_published") {
      setClauses.push(`${key} = ?`);
      values.push(value ? 1 : 0);
      continue;
    }

    setClauses.push(`${key} = ?`);
    values.push(value);
  }

  if (!setClauses.length) {
    return res.status(400).json({ success: false, message: "No valid fields provided" });
  }

  const query = `
    UPDATE notices
    SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = UUID_TO_BIN(?)
  `;

  values.push(id);

  try {
    const [result] = await pool.execute(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    res.json({ success: true, message: "Notice updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const publishNotice = async (req, res, next) => {
  const { id } = req.params;
  const { is_published, publish_date, expiry_date } = req.body;

  const setClauses = ["is_published = ?"];
  const values = [is_published ? 1 : 0];

  if (publish_date) {
    setClauses.push("publish_date = ?");
    values.push(publish_date);
  } else if (is_published) {
    setClauses.push("publish_date = CURDATE()");
  }

  if (typeof expiry_date !== "undefined") {
    if (expiry_date) {
      setClauses.push("expiry_date = ?");
      values.push(expiry_date);
    } else {
      setClauses.push("expiry_date = NULL");
    }
  }

  const query = `
    UPDATE notices
    SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = UUID_TO_BIN(?)
  `;

  values.push(id);

  try {
    const [result] = await pool.execute(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    res.json({ success: true, message: "Notice publish state updated" });
  } catch (error) {
    next(error);
  }
};

export const deleteNotice = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [result] = await pool.execute("DELETE FROM notices WHERE id = UUID_TO_BIN(?)", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    res.json({ success: true, message: "Notice deleted successfully" });
  } catch (error) {
    next(error);
  }
};
