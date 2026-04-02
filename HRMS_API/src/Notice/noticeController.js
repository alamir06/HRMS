import { v4 as uuidv4 } from "uuid";
import pool from "../../config/database.js";

const mapNoticeRecord = (record) => ({
  id: record.id,
  title: record.title,
  titleAmharic: record.titleAmharic,
  content: record.content,
  contentAmharic: record.contentAmharic,
  noticeType: record.noticeType,
  targetAudience: record.targetAudience,
  targetDepartmentId: record.targetDepartmentId,
  targetDepartmentName: record.targetDepartmentName,
  targetEmployeeId: record.targetEmployeeId,
  targetEmployeeName: record.targetEmployeeName,
  publishDate: record.publishDate,
  expiryDate: record.expiryDate,
  isPublished: Boolean(record.isPublished),
  createdBy: record.createdBy,
  createdByUsername: record.createdByUsername,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

export const createNotice = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const id = uuidv4();
    const {
      title,
      titleAmharic,
      content,
      contentAmharic,
      noticeType = "GENERAL",
      targetAudience = "ALL",
      targetDepartmentId,
      targetEmployeeId,
      publishDate,
      expiryDate,
      isPublished = false,
      createdBy,
    } = req.body;

    await connection.beginTransaction();

    const insertQuery = `
      INSERT INTO notices (
        id,
        title,
        titleAmharic,
        content,
        contentAmharic,
        noticeType,
        targetAudience,
        targetDepartmentId,
        targetEmployeeId,
        publishDate,
        expiryDate,
        isPublished,
        createdBy
      ) VALUES (
        UUID_TO_BIN(?),
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ${targetDepartmentId ? "UUID_TO_BIN(?)" : "NULL"},
        ${targetEmployeeId ? "UUID_TO_BIN(?)" : "NULL"},
        ?,
        ?,
        ?,
        UUID_TO_BIN(?)
      )
    `;

    const values = [
      id,
      title,
      titleAmharic || null,
      content,
      contentAmharic || null,
      noticeType,
      targetAudience,
    ];

    if (targetDepartmentId) {
      values.push(targetDepartmentId);
    }

    if (targetEmployeeId) {
      values.push(targetEmployeeId);
    }

    values.push(publishDate);
    values.push(expiryDate || null);
    values.push(isPublished ? 1 : 0);
    values.push(createdBy);

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
      noticeType,
      targetAudience,
      departmentId,
      employeeId,
      isPublished,
      activeOnly,
    } = req.query;

    const conditions = [];
    const params = [];

    if (noticeType) {
      conditions.push("n.noticeType = ?");
      params.push(noticeType);
    }

    if (targetAudience) {
      conditions.push("n.targetAudience = ?");
      params.push(targetAudience);
    }

    if (typeof isPublished === "boolean") {
      conditions.push("n.isPublished = ?");
      params.push(isPublished ? 1 : 0);
    }

    if (departmentId) {
      conditions.push("n.targetDepartmentId = UUID_TO_BIN(?)");
      params.push(departmentId);
    }

    if (employeeId) {
      conditions.push("n.targetEmployeeId = UUID_TO_BIN(?)");
      params.push(employeeId);
    }

    if (activeOnly) {
      conditions.push(
        "(n.isPublished = TRUE AND n.publishDate <= CURDATE() AND (n.expiryDate IS NULL OR n.expiryDate >= CURDATE()))"
      );
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        BIN_TO_UUID(n.id) AS id,
        n.title,
        n.titleAmharic,
        n.content,
        n.contentAmharic,
        n.noticeType,
        n.targetAudience,
        BIN_TO_UUID(n.targetDepartmentId) AS targetDepartmentId,
        BIN_TO_UUID(n.targetEmployeeId) AS targetEmployeeId,
        n.publishDate,
        n.expiryDate,
        n.isPublished,
        BIN_TO_UUID(n.createdBy) AS createdBy,
        n.createdAt,
        n.updatedAt,
        d.departmentName AS targetDepartmentName,
        CONCAT_WS(' ', ep.firstName, ep.middleName, ep.lastName) AS targetEmployeeName,
        u.username AS createdByUsername
      FROM notices n
      LEFT JOIN department d ON n.targetDepartmentId = d.id
      LEFT JOIN employeePersonal ep ON n.targetEmployeeId = ep.employeeId
      LEFT JOIN users u ON n.createdBy = u.id
      ${whereClause}
      ORDER BY n.publishDate DESC, n.createdAt DESC
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
        n.titleAmharic,
        n.content,
        n.contentAmharic,
        n.noticeType,
        n.targetAudience,
        BIN_TO_UUID(n.targetDepartmentId) AS targetDepartmentId,
        BIN_TO_UUID(n.targetEmployeeId) AS targetEmployeeId,
        n.publishDate,
        n.expiryDate,
        n.isPublished,
        BIN_TO_UUID(n.createdBy) AS createdBy,
        n.createdAt,
        n.updatedAt,
        d.departmentName AS targetDepartmentName,
        CONCAT_WS(' ', ep.firstName, ep.middleName, ep.lastName) AS targetEmployeeName,
        u.username AS createdByUsername
      FROM notices n
      LEFT JOIN department d ON n.targetDepartmentId = d.id
      LEFT JOIN employeePersonal ep ON n.targetEmployeeId = ep.employeeId
      LEFT JOIN users u ON n.createdBy = u.id
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
    "titleAmharic",
    "content",
    "contentAmharic",
    "noticeType",
    "targetAudience",
    "targetDepartmentId",
    "targetEmployeeId",
    "publishDate",
    "expiryDate",
    "isPublished",
  ];

  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(fields)) {
    if (!allowedFields.includes(key)) {
      continue;
    }

    if (key === "targetDepartmentId" || key === "targetEmployeeId") {
      if (value) {
        setClauses.push(`${key} = UUID_TO_BIN(?)`);
        values.push(value);
      } else {
        setClauses.push(`${key} = NULL`);
      }
      continue;
    }

    if (key === "isPublished") {
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
    SET ${setClauses.join(", ")}, updatedAt = CURRENT_TIMESTAMP
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
  const { isPublished, publishDate, expiryDate } = req.body;

  const setClauses = ["isPublished = ?"];
  const values = [isPublished ? 1 : 0];

  if (publishDate) {
    setClauses.push("publishDate = ?");
    values.push(publishDate);
  } else if (isPublished) {
    setClauses.push("publishDate = CURDATE()");
  }

  if (typeof expiryDate !== "undefined") {
    if (expiryDate) {
      setClauses.push("expiryDate = ?");
      values.push(expiryDate);
    } else {
      setClauses.push("expiryDate = NULL");
    }
  }

  const query = `
    UPDATE notices
    SET ${setClauses.join(", ")}, updatedAt = CURRENT_TIMESTAMP
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
