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
    const { asset_id, employee_id, assigned_date, expected_return_date, assignment_reason, assignment_reason_amharic, condition_assigned, condition_assigned_amharic, assigned_by } = req.body;

    const assignmentId = uuidv4();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [assetRows] = await connection.query(
        "SELECT status FROM assets WHERE id = UUID_TO_BIN(?) FOR UPDATE",
        [asset_id]
      );

      if (assetRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: "Asset not found",
        });
      }

      const assetStatus = assetRows[0].status;
      if (assetStatus !== "available") {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: `Asset is currently ${assetStatus}`,
        });
      }

      await connection.query(
        `INSERT INTO asset_assignment (
           id,
           asset_id,
           employee_id,
           assigned_date,
           expected_return_date,
           assignment_reason,
           assignment_reason_amharic,
           condition_assigned,
           condition_assigned_amharic,
           status,
           assigned_by
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
           'assigned',
           UUID_TO_BIN(?)
         )`,
        [
          assignmentId,
          asset_id,
          employee_id,
          assigned_date,
          expected_return_date || null,
          assignment_reason || null,
          assignment_reason_amharic || null,
          condition_assigned || null,
          condition_assigned_amharic || null,
          assigned_by,
        ]
      );

      await connection.query(
        `UPDATE assets
            SET status = 'assigned',
                updated_at = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)`,
        [asset_id]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: "Asset assigned",
        data: {
          id: assignmentId,
          asset_id,
          employee_id,
          assigned_date,
          expected_return_date: expected_return_date || null,
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
    const { actual_return_date, condition_returned, condition_returned_amharic, status = "returned" } = req.body;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [assignmentRows] = await connection.query(
        `SELECT 
           BIN_TO_UUID(asset_id) as asset_id,
           status
         FROM asset_assignment
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
      if (assignment.status !== "assigned") {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: "Asset is not currently assigned",
        });
      }

      await connection.query(
        `UPDATE asset_assignment
            SET actual_return_date = ?,
                condition_returned = ?,
                condition_returned_amharic = ?,
                status = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)`,
        [
          actual_return_date || new Date().toISOString().slice(0, 10),
          condition_returned || null,
          condition_returned_amharic || null,
          status,
          id,
        ]
      );

      await connection.query(
        `UPDATE assets
            SET status = 'available',
                updated_at = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)`,
        [assignment.asset_id]
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
           a.asset_name,
           a.status,
           c.category_name,
           a.serial_number,
           a.purchase_date,
           a.purchase_cost,
           a.current_value
         FROM assets a
         LEFT JOIN asset_category c ON a.asset_category_id = c.id
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
           SUM(status = 'assigned') as active_assignments,
           SUM(status = 'returned') as returned_count,
           SUM(status = 'overdue') as overdue_count
         FROM asset_assignment
         WHERE asset_id = UUID_TO_BIN(?)`,
        [id]
      );

      const [history] = await pool.query(
        `SELECT 
           BIN_TO_UUID(id) as id,
           BIN_TO_UUID(employee_id) as employee_id,
           assigned_date,
           expected_return_date,
           actual_return_date,
           status
         FROM asset_assignment
         WHERE asset_id = UUID_TO_BIN(?)
         ORDER BY assigned_date DESC
         LIMIT 20`,
        [id]
      );

      res.json({
        success: true,
        data: {
          asset: assetRows[0],
          stats: {
            active_assignments: Number(assignmentStats[0].active_assignments || 0),
            returned_count: Number(assignmentStats[0].returned_count || 0),
            overdue_count: Number(assignmentStats[0].overdue_count || 0),
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
      const { category_id } = req.query;
      const params = [];
      let whereClause = "WHERE a.status = 'available'";

      if (category_id) {
        whereClause += " AND a.asset_category_id = UUID_TO_BIN(?)";
        params.push(category_id);
      }

      const [assets] = await pool.query(
        `SELECT 
           BIN_TO_UUID(a.id) as id,
           a.asset_name,
           a.serial_number,
           c.category_name,
           a.location,
           a.current_value
         FROM assets a
         LEFT JOIN asset_category c ON a.asset_category_id = c.id
         ${whereClause}
         ORDER BY a.asset_name`,
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

      const conditions = ["aa.employee_id = UUID_TO_BIN(?)"];
      const params = [employeeId];

      if (status) {
        conditions.push("aa.status = ?");
        params.push(status);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      const [records] = await pool.query(
        `SELECT 
           BIN_TO_UUID(aa.id) as assignment_id,
           BIN_TO_UUID(aa.asset_id) as asset_id,
           a.asset_name,
           a.serial_number,
           aa.assigned_date,
           aa.expected_return_date,
           aa.actual_return_date,
           aa.status
         FROM asset_assignment aa
         JOIN assets a ON aa.asset_id = a.id
         ${whereClause}
         ORDER BY aa.assigned_date DESC`,
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
