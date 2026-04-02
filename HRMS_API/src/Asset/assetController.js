import { v4 as uuidv4 } from "uuid";
import pool from "../../config/database.js";

const parseNumeric = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const assetController = {
  assignAsset: async (req, res) => {
    const { assetId, employeeId, assignedDate, expectedReturnDate, assignmentReason, assignmentReasonAmharic, conditionAssigned, conditionAssignedAmharic, assignedBy } = req.body;

    const assignmentId = uuidv4();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [assetRows] = await connection.query(
        "SELECT status FROM assets WHERE id = UUID_TO_BIN(?) FOR UPDATE",
        [assetId]
      );

      if (assetRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: "Asset not found",
        });
      }

      const assetStatus = assetRows[0].status;
      if (assetStatus !== "AVAILABLE") {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: `Asset is currently ${assetStatus}`,
        });
      }

      await connection.query(
        `INSERT INTO assetAssignment (
           id,
           assetId,
           employeeId,
           assignedDate,
           expectedReturnDate,
           assignmentReason,
           assignmentReasonAmharic,
           conditionAssigned,
           conditionAssignedAmharic,
           status,
           assignedBy
         ) VALUES (
           UUID_TO_BIN(?),
           UUID_TO_BIN(?),
           UUID_TO_BIN(?),
           ?,
           ?,
           ?,
           ?,
           ?,
           ?,
           'ASSIGNED',
           UUID_TO_BIN(?)
         )`,
        [
          assignmentId,
          assetId,
          employeeId,
          assignedDate,
          expectedReturnDate || null,
          assignmentReason || null,
          assignmentReasonAmharic || null,
          conditionAssigned || null,
          conditionAssignedAmharic || null,
          assignedBy,
        ]
      );

      await connection.query(
        `UPDATE assets
            SET status = 'ASSIGNED',
                updatedAt = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)`,
        [assetId]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: "Asset assigned",
        data: {
          id: assignmentId,
          assetId,
          employeeId,
          assignedDate,
          expectedReturnDate: expectedReturnDate || null,
        },
      });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({
        success: false,
        error: "Failed to assign asset",
        message: error.message,
      });
    } finally {
      connection.release();
    }
  },

  returnAsset: async (req, res) => {
    const { id } = req.params;
    const { actualReturnDate, conditionReturned, conditionReturnedAmharic, status = "RETURNED" } = req.body;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [assignmentRows] = await connection.query(
        `SELECT 
           BIN_TO_UUID(assetId) as assetId,
           status
         FROM assetAssignment
         WHERE id = UUID_TO_BIN(?)
         FOR UPDATE`,
        [id]
      );

      if (assignmentRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: "Asset assignment not found",
        });
      }

      const assignment = assignmentRows[0];
      if (assignment.status !== "ASSIGNED") {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: "Asset is not currently assigned",
        });
      }

      await connection.query(
        `UPDATE assetAssignment
            SET actualReturnDate = ?,
                conditionReturned = ?,
                conditionReturnedAmharic = ?,
                status = ?,
                updatedAt = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)`,
        [
          actualReturnDate || new Date().toISOString().slice(0, 10),
          conditionReturned || null,
          conditionReturnedAmharic || null,
          status,
          id,
        ]
      );

      await connection.query(
        `UPDATE assets
            SET status = 'AVAILABLE',
                updatedAt = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)`,
        [assignment.assetId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: "Asset returned",
      });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({
        success: false,
        error: "Failed to process asset return",
        message: error.message,
      });
    } finally {
      connection.release();
    }
  },

  getAssetSummary: async (req, res) => {
    try {
      const { id } = req.params;

      const [assetRows] = await pool.query(
        `SELECT 
           BIN_TO_UUID(a.id) as id,
           a.assetName,
           a.status,
           c.categoryName,
           a.serialNumber,
           a.purchaseDate,
           a.purchaseCost,
           a.currentValue
         FROM assets a
         LEFT JOIN assetCategory c ON a.assetCategoryId = c.id
         WHERE a.id = UUID_TO_BIN(?)`,
        [id]
      );

      if (assetRows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Asset not found",
        });
      }

      const [assignmentStats] = await pool.query(
        `SELECT 
           SUM(status = 'ASSIGNED') as activeAssignments,
           SUM(status = 'RETURNED') as returnedCount,
           SUM(status = 'OVERDUE') as overdueCount
         FROM assetAssignment
         WHERE assetId = UUID_TO_BIN(?)`,
        [id]
      );

      const [history] = await pool.query(
        `SELECT 
           BIN_TO_UUID(id) as id,
           BIN_TO_UUID(employeeId) as employeeId,
           assignedDate,
           expectedReturnDate,
           actualReturnDate,
           status
         FROM assetAssignment
         WHERE assetId = UUID_TO_BIN(?)
         ORDER BY assignedDate DESC
         LIMIT 20`,
        [id]
      );

      res.json({
        success: true,
        data: {
          asset: assetRows[0],
          stats: {
            activeAssignments: Number(assignmentStats[0].activeAssignments || 0),
            returnedCount: Number(assignmentStats[0].returnedCount || 0),
            overdueCount: Number(assignmentStats[0].overdueCount || 0),
          },
          history,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to build asset summary",
        message: error.message,
      });
    }
  },

  listAvailableAssets: async (req, res) => {
    try {
      const { categoryId } = req.query;
      const params = [];
      let whereClause = "WHERE a.status = 'AVAILABLE'";

      if (categoryId) {
        whereClause += " AND a.assetCategoryId = UUID_TO_BIN(?)";
        params.push(categoryId);
      }

      const [assets] = await pool.query(
        `SELECT 
           BIN_TO_UUID(a.id) as id,
           a.assetName,
           a.serialNumber,
           c.categoryName,
           a.location,
           a.currentValue
         FROM assets a
         LEFT JOIN assetCategory c ON a.assetCategoryId = c.id
         ${whereClause}
         ORDER BY a.assetName`,
        params
      );

      res.json({
        success: true,
        data: assets,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch available assets",
        message: error.message,
      });
    }
  },

  getEmployeeAssets: async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { status } = req.query;

      const conditions = ["aa.employeeId = UUID_TO_BIN(?)"];
      const params = [employeeId];

      if (status) {
        conditions.push("aa.status = ?");
        params.push(status);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      const [records] = await pool.query(
        `SELECT 
           BIN_TO_UUID(aa.id) as assignmentId,
           BIN_TO_UUID(aa.assetId) as assetId,
           a.assetName,
           a.serialNumber,
           aa.assignedDate,
           aa.expectedReturnDate,
           aa.actualReturnDate,
           aa.status
         FROM assetAssignment aa
         JOIN assets a ON aa.assetId = a.id
         ${whereClause}
         ORDER BY aa.assignedDate DESC`,
        params
      );

      res.json({
        success: true,
        data: records,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch employee assets",
        message: error.message,
      });
    }
  },
};
