import { v4 as uuidv4 } from "uuid";
import pool from "../../config/database.js";

const DEFAULT_LIMIT = 50;

const mapNotificationRecord = (record) => ({
  id: record.id,
  userId: record.user_id,
  title: record.title,
  titleAmharic: record.title_amharic,
  message: record.message,
  messageAmharic: record.message_amharic,
  notificationType: record.notification_type,
  relatedModule: record.related_module,
  relatedId: record.related_id,
  isRead: Boolean(record.is_read),
  createdAt: record.created_at,
  user: {
    username: record.username,
    preferredLanguage: record.preferred_language,
    employeeId: record.employee_id,
    employeeName: record.employee_name,
  },
});

const buildFilterClause = ({ userId, isRead, notificationType, relatedModule }) => {
  const conditions = [];
  const params = [];

  if (userId) {
    conditions.push("n.user_id = UUID_TO_BIN(?)");
    params.push(userId);
  }

  if (typeof isRead === "boolean") {
    conditions.push("n.is_read = ?");
    params.push(isRead ? 1 : 0);
  }

  if (notificationType) {
    conditions.push("n.notification_type = ?");
    params.push(notificationType);
  }

  if (relatedModule) {
    conditions.push("n.related_module = ?");
    params.push(relatedModule);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
};

const buildSelectQuery = (whereClause) => `
  SELECT
    BIN_TO_UUID(n.id) AS id,
    BIN_TO_UUID(n.user_id) AS user_id,
    n.title,
    n.title_amharic,
    n.message,
    n.message_amharic,
    n.notification_type,
    n.related_module,
    BIN_TO_UUID(n.related_id) AS related_id,
    n.is_read,
    n.created_at,
    u.username,
    u.preferred_language,
    BIN_TO_UUID(u.employee_id) AS employee_id,
    CONCAT_WS(' ', ep.first_name, ep.middle_name, ep.last_name) AS employee_name
  FROM notifications n
  LEFT JOIN users u ON n.user_id = u.id
  LEFT JOIN employee_personal ep ON u.employee_id = ep.employee_id
  ${whereClause}
  ORDER BY n.created_at DESC
`;

export const createNotification = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const id = uuidv4();
    const {
      user_id,
      title,
      title_amharic,
      message,
      message_amharic,
      notification_type = "info",
      related_module = "general",
      related_id,
      is_read = false,
    } = req.body;

    await connection.beginTransaction();

    const insertQuery = `
      INSERT INTO notifications (
        id,
        user_id,
        title,
        title_amharic,
        message,
        message_amharic,
        notification_type,
        related_module,
        related_id,
        is_read
      ) VALUES (
        UUID_TO_BIN(?),
        UUID_TO_BIN(?),
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ${related_id ? "UUID_TO_BIN(?)" : "NULL"},
        ?
      )
    `;

    const values = [
      id,
      user_id,
      title,
      title_amharic || null,
      message,
      message_amharic || null,
      notification_type,
      related_module,
    ];

    if (related_id) {
      values.push(related_id);
    }

    values.push(is_read ? 1 : 0);

    await connection.execute(insertQuery, values);
    await connection.commit();

    res.status(201).json({
      success: true,
      data: { id },
      message: "Notification created successfully",
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const listNotifications = async (req, res, next) => {
  try {
    const {
      user_id,
      is_read,
      notification_type,
      related_module,
      limit,
      offset,
    } = req.query;

    const { whereClause, params } = buildFilterClause({
      userId: user_id,
      isRead: typeof is_read === "boolean" ? is_read : undefined,
      notificationType: notification_type,
      relatedModule: related_module,
    });

    const limitValue = typeof limit === "number" ? limit : DEFAULT_LIMIT;
    const offsetValue = typeof offset === "number" ? offset : 0;

    const query = `${buildSelectQuery(whereClause)} LIMIT ? OFFSET ?`;

    const [rows] = await pool.query(query, [...params, limitValue, offsetValue]);

    res.json({
      success: true,
      data: rows.map(mapNotificationRecord),
    });
  } catch (error) {
    next(error);
  }
};

export const getNotificationById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const { whereClause, params } = buildFilterClause({ userId: undefined });
    const query = `${buildSelectQuery(`${whereClause}${whereClause ? " AND" : "WHERE"} n.id = UUID_TO_BIN(?)`)} LIMIT 1`;

    const [rows] = await pool.query(query, [...params, id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, data: mapNotificationRecord(rows[0]) });
  } catch (error) {
    next(error);
  }
};

export const getUserNotifications = async (req, res, next) => {
  const { userId } = req.params;
  try {
    const {
      is_read,
      notification_type,
      related_module,
      limit,
      offset,
    } = req.query;

    const { whereClause, params } = buildFilterClause({
      userId,
      isRead: typeof is_read === "boolean" ? is_read : undefined,
      notificationType: notification_type,
      relatedModule: related_module,
    });

    const limitValue = typeof limit === "number" ? limit : DEFAULT_LIMIT;
    const offsetValue = typeof offset === "number" ? offset : 0;

    const query = `${buildSelectQuery(whereClause)} LIMIT ? OFFSET ?`;

    const [rows] = await pool.query(query, [...params, limitValue, offsetValue]);

    res.json({
      success: true,
      data: rows.map(mapNotificationRecord),
    });
  } catch (error) {
    next(error);
  }
};

export const updateNotification = async (req, res, next) => {
  const { id } = req.params;
  const fields = req.body;

  const allowedFields = [
    "title",
    "title_amharic",
    "message",
    "message_amharic",
    "notification_type",
    "related_module",
    "related_id",
    "is_read",
  ];

  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(fields)) {
    if (!allowedFields.includes(key)) {
      continue;
    }

    if (key === "related_id") {
      if (value) {
        setClauses.push("related_id = UUID_TO_BIN(?)");
        values.push(value);
      } else {
        setClauses.push("related_id = NULL");
      }
      continue;
    }

    if (key === "is_read") {
      setClauses.push("is_read = ?");
      values.push(value ? 1 : 0);
      continue;
    }

    setClauses.push(`${key} = ?`);
    values.push(value);
  }

  if (!setClauses.length) {
    return res.status(400).json({ success: false, message: "No valid fields provided" });
  }

  const query = `UPDATE notifications SET ${setClauses.join(", ")} WHERE id = UUID_TO_BIN(?)`;

  values.push(id);

  try {
    const [result] = await pool.execute(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, message: "Notification updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  const { id } = req.params;
  const { is_read = true } = req.body;

  try {
    const [result] = await pool.execute(
      "UPDATE notifications SET is_read = ? WHERE id = UUID_TO_BIN(?)",
      [is_read ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, message: "Notification status updated" });
  } catch (error) {
    next(error);
  }
};

export const markUserNotificationsRead = async (req, res, next) => {
  const { userId } = req.params;
  const { notification_ids = [], is_read = true, mark_all = false } = req.body;

  try {
    const values = [is_read ? 1 : 0, userId];
    let query = "UPDATE notifications SET is_read = ? WHERE user_id = UUID_TO_BIN(?)";

    if (!mark_all) {
      const placeholders = notification_ids.map(() => "UUID_TO_BIN(?)").join(", ");
      query += ` AND id IN (${placeholders})`;
      values.push(...notification_ids);
    }

    const [result] = await pool.execute(query, values);

    res.json({
      success: true,
      message: "Notifications updated",
      data: { updatedCount: result.affectedRows },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [result] = await pool.execute("DELETE FROM notifications WHERE id = UUID_TO_BIN(?)", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    next(error);
  }
};
