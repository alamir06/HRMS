import { v4 as uuidv4 } from "uuid";
import pool from "../../config/database.js";

const DEFAULT_LIMIT = 50;

const mapNotificationRecord = (record) => ({
  id: record.id,
  userId: record.userId,
  title: record.title,
  titleAmharic: record.titleAmharic,
  message: record.message,
  messageAmharic: record.messageAmharic,
  notificationType: record.notificationType,
  relatedModule: record.relatedModule,
  relatedId: record.relatedId,
  isRead: Boolean(record.isRead),
  createdAt: record.createdAt,
  user: {
    username: record.username,
    preferredLanguage: record.preferredLanguage,
    employeeId: record.employeeId,
    employeeName: record.employeeName,
  },
});

const buildFilterClause = ({ userId, isRead, notificationType, relatedModule }) => {
  const conditions = [];
  const params = [];

  if (userId) {
    conditions.push("n.userId = UUID_TO_BIN(?)");
    params.push(userId);
  }

  if (typeof isRead === "boolean") {
    conditions.push("n.isRead = ?");
    params.push(isRead ? 1 : 0);
  }

  if (notificationType) {
    conditions.push("n.notificationType = ?");
    params.push(notificationType);
  }

  if (relatedModule) {
    conditions.push("n.relatedModule = ?");
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
    BIN_TO_UUID(n.userId) AS userId,
    n.title,
    n.titleAmharic,
    n.message,
    n.messageAmharic,
    n.notificationType,
    n.relatedModule,
    BIN_TO_UUID(n.relatedId) AS relatedId,
    n.isRead,
    n.createdAt,
    u.username,
    u.preferredLanguage,
    BIN_TO_UUID(u.employeeId) AS employeeId,
    CONCAT_WS(' ', ep.firstName, ep.middleName, ep.lastName) AS employeeName
  FROM notifications n
  LEFT JOIN users u ON n.userId = u.id
  LEFT JOIN employeePersonal ep ON u.employeeId = ep.employeeId
  ${whereClause}
  ORDER BY n.createdAt DESC
`;

export const createNotification = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const id = uuidv4();
    const {
      userId,
      title,
      titleAmharic,
      message,
      messageAmharic,
      notificationType = "INFO",
      relatedModule = "GENERAL",
      relatedId,
      isRead = false,
    } = req.body;

    await connection.beginTransaction();

    const insertQuery = `
      INSERT INTO notifications (
        id,
        userId,
        title,
        titleAmharic,
        message,
        messageAmharic,
        notificationType,
        relatedModule,
        relatedId,
        isRead
      ) VALUES (
        UUID_TO_BIN(?),
        UUID_TO_BIN(?),
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ${relatedId ? "UUID_TO_BIN(?)" : "NULL"},
        ?
      )
    `;

    const values = [
      id,
      userId,
      title,
      titleAmharic || null,
      message,
      messageAmharic || null,
      notificationType,
      relatedModule,
    ];

    if (relatedId) {
      values.push(relatedId);
    }

    values.push(isRead ? 1 : 0);

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
      userId,
      isRead,
      notificationType,
      relatedModule,
      limit,
      offset,
    } = req.query;

    const { whereClause, params } = buildFilterClause({
      userId: userId,
      isRead: typeof isRead === "boolean" ? isRead : undefined,
      notificationType: notificationType,
      relatedModule: relatedModule,
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
      isRead,
      notificationType,
      relatedModule,
      limit,
      offset,
    } = req.query;

    const { whereClause, params } = buildFilterClause({
      userId,
      isRead: typeof isRead === "boolean" ? isRead : undefined,
      notificationType: notificationType,
      relatedModule: relatedModule,
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
    "titleAmharic",
    "message",
    "messageAmharic",
    "notificationType",
    "relatedModule",
    "relatedId",
    "isRead",
  ];

  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(fields)) {
    if (!allowedFields.includes(key)) {
      continue;
    }

    if (key === "relatedId") {
      if (value) {
        setClauses.push("relatedId = UUID_TO_BIN(?)");
        values.push(value);
      } else {
        setClauses.push("relatedId = NULL");
      }
      continue;
    }

    if (key === "isRead") {
      setClauses.push("isRead = ?");
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
  const { isRead = true } = req.body;

  try {
    const [result] = await pool.execute(
      "UPDATE notifications SET isRead = ? WHERE id = UUID_TO_BIN(?)",
      [isRead ? 1 : 0, id]
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
  const { notificationIds = [], isRead = true, markAll = false } = req.body;

  try {
    const values = [isRead ? 1 : 0, userId];
    let query = "UPDATE notifications SET isRead = ? WHERE userId = UUID_TO_BIN(?)";

    if (!markAll) {
      const placeholders = notificationIds.map(() => "UUID_TO_BIN(?)").join(", ");
      query += ` AND id IN (${placeholders})`;
      values.push(...notificationIds);
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
