import pool from "../../config/database.js";

class HrRoleController {
  // Create new HR role
  async createHrRole(req, res) {
    try {
      const {
        role_name,
        role_name_amharic,
        role_code,
        role_description,
        role_description_amharic,
        role_permissions,
        status = "active",
      } = req.validatedData;

      // Check if role code already exists
      const [existingRoles] = await pool.execute(
        "SELECT id FROM hr_roles WHERE role_code = ?",
        [role_code]
      );

      if (existingRoles.length > 0) {
        return res.status(409).json({
          success: false,
          error: "Role code already exists",
        });
      }

      // Insert new role
      const query = `
        INSERT INTO hr_roles (
          role_name, role_name_amharic, role_code, role_description,
          role_description_amharic, role_permissions, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const permissionsJson = role_permissions
        ? JSON.stringify(role_permissions)
        : null;

      const [result] = await pool.execute(query, [
        role_name,
        role_name_amharic || null,
        role_code,
        role_description || null,
        role_description_amharic || null,
        permissionsJson,
        status,
      ]);

      // Get the created role
      const [roles] = await pool.execute(
        `SELECT 
          BIN_TO_UUID(id) as id,
          role_name,
          role_name_amharic,
          role_code,
          role_description,
          role_description_amharic,
          role_permissions,
          status,
          created_at
         FROM hr_roles WHERE id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: "HR role created successfully",
        data: roles[0],
      });
    } catch (error) {
      console.error("Create HR role error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message,
      });
    }
  }

  // Get all HR roles with pagination and search
  async getAllHrRoles(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Build base query
      let query = `
        SELECT 
          BIN_TO_UUID(id) as id,
          role_name,
          role_name_amharic,
          role_code,
          role_description,
          role_description_amharic,
          role_permissions,
          status,
          created_at
        FROM hr_roles
        WHERE 1=1
      `;

      const params = [];
      const countParams = [];

      // Add search filter
      if (search && search.trim() !== "") {
        query += ` AND (
          role_name LIKE ? OR 
          role_name_amharic LIKE ? OR 
          role_code LIKE ? OR
          role_description LIKE ?
        )`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Add status filter
      if (status && ["active", "inactive"].includes(status)) {
        query += ` AND status = ?`;
        params.push(status);
        countParams.push(status);
      }

      // Add sorting
      const allowedSortFields = [
        "role_name",
        "role_code",
        "status",
        "created_at",
      ];
      const validSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "created_at";
      const validSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

      query += ` ORDER BY ${validSortBy} ${validSortOrder}`;

      // Add pagination
      query += ` LIMIT ? OFFSET ?`;
      params.push(limitNum, offset);

      // Execute query
      const [roles] = await pool.query(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM hr_roles WHERE 1=1`;

      if (search && search.trim() !== "") {
        countQuery += ` AND (
          role_name LIKE ? OR 
          role_name_amharic LIKE ? OR 
          role_code LIKE ? OR
          role_description LIKE ?
        )`;
      }

      if (status && ["active", "inactive"].includes(status)) {
        countQuery += ` AND status = ?`;
      }

      const [countResult] = await pool.query(countQuery, countParams);
      const total = countResult[0].total;

      res.json({
        success: true,
        data: roles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("Get HR roles error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message,
      });
    }
  }

  // Get HR role by ID
  async getHrRoleById(req, res) {
    try {
      const { id } = req.params;

      const [roles] = await pool.execute(
        `SELECT 
          BIN_TO_UUID(id) as id,
          role_name,
          role_name_amharic,
          role_code,
          role_description,
          role_description_amharic,
          role_permissions,
          status,
          created_at
         FROM hr_roles 
         WHERE id = UUID_TO_BIN(?)`,
        [id]
      );

      if (roles.length === 0) {
        return res.status(404).json({
          success: false,
          error: "HR role not found",
        });
      }

      res.json({
        success: true,
        data: roles[0],
      });
    } catch (error) {
      console.error("Get HR role by ID error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message,
      });
    }
  }

  // Update HR role
  async updateHrRole(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.validatedData;

      // Check if role exists
      const [existingRoles] = await pool.execute(
        "SELECT id FROM hr_roles WHERE id = UUID_TO_BIN(?)",
        [id]
      );

      if (existingRoles.length === 0) {
        return res.status(404).json({
          success: false,
          error: "HR role not found",
        });
      }

      // Check if role code already exists (excluding current role)
      if (updateData.role_code) {
        const [duplicateRoles] = await pool.execute(
          "SELECT id FROM hr_roles WHERE role_code = ? AND id != UUID_TO_BIN(?)",
          [updateData.role_code, id]
        );

        if (duplicateRoles.length > 0) {
          return res.status(409).json({
            success: false,
            error: "Role code already exists",
          });
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const updateParams = [];

      Object.keys(updateData).forEach((key) => {
        if (key === "role_permissions" && updateData[key] !== undefined) {
          updateFields.push(`${key} = ?`);
          updateParams.push(JSON.stringify(updateData[key]));
        } else if (updateData[key] !== undefined) {
          updateFields.push(`${key} = ?`);
          updateParams.push(updateData[key]);
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No valid fields to update",
        });
      }

      updateParams.push(id);

      const query = `
        UPDATE hr_roles 
        SET ${updateFields.join(", ")} 
        WHERE id = UUID_TO_BIN(?)
      `;

      await pool.execute(query, updateParams);

      // Get updated role
      const [updatedRoles] = await pool.execute(
        `SELECT 
          BIN_TO_UUID(id) as id,
          role_name,
          role_name_amharic,
          role_code,
          role_description,
          role_description_amharic,
          role_permissions,
          status,
          created_at
         FROM hr_roles 
         WHERE id = UUID_TO_BIN(?)`,
        [id]
      );

      res.json({
        success: true,
        message: "HR role updated successfully",
        data: updatedRoles[0],
      });
    } catch (error) {
      console.error("Update HR role error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message,
      });
    }
  }

  // Delete HR role
  async deleteHrRole(req, res) {
    try {
      const { id } = req.params;

      // Check if role exists
      const [existingRoles] = await pool.execute(
        "SELECT id FROM hr_roles WHERE id = UUID_TO_BIN(?)",
        [id]
      );

      if (existingRoles.length === 0) {
        return res.status(404).json({
          success: false,
          error: "HR role not found",
        });
      }

      // Delete the role
      await pool.execute("DELETE FROM hr_roles WHERE id = UUID_TO_BIN(?)", [
        id,
      ]);

      res.json({
        success: true,
        message: "HR role deleted successfully",
      });
    } catch (error) {
      console.error("Delete HR role error:", error);

      // Check if it's a foreign key constraint error
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({
          success: false,
          error: "Cannot delete role. It is being used by other records.",
        });
      }

      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message,
      });
    }
  }
}

export default new HrRoleController();
