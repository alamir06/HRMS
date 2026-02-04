import pool from "../../config/database.js";

const parseMoney = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const benefitController = {
  enrollEmployee: async (req, res) => {
    const {
      employee_id,
      benefit_id,
      enrollment_date,
      coverage_amount,
      employee_contribution,
      company_contribution,
      status = "active",
      end_date,
    } = req.body;

    try {
      const [existing] = await pool.query(
        `SELECT id
           FROM employee_benefits
          WHERE employee_id = UUID_TO_BIN(?)
            AND benefit_id = UUID_TO_BIN(?)
            AND status = 'active'`,
        [employee_id, benefit_id]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: "Employee already enrolled in this benefit",
        });
      }

      const [result] = await pool.query(
        `INSERT INTO employee_benefits (
           employee_id,
           benefit_id,
           enrollment_date,
           coverage_amount,
           employee_contribution,
           company_contribution,
           status,
           end_date
         ) VALUES (
           UUID_TO_BIN(?),
           UUID_TO_BIN(?),
           ?,
           ?,
           ?,
           ?,
           ?,
           ?
         )`,
        [
          employee_id,
          benefit_id,
          enrollment_date,
          parseMoney(coverage_amount),
          parseMoney(employee_contribution),
          parseMoney(company_contribution),
          status,
          end_date || null,
        ]
      );

      res.status(201).json({
        success: true,
        message: "Employee enrolled",
        data: {
          id: result.insertId,
          employee_id,
          benefit_id,
          status,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to enroll employee",
        message: error.message,
      });
    }
  },

  updateEnrollmentStatus: async (req, res) => {
    const { id } = req.params;
    const { status, end_date } = req.body;

    try {
      const [result] = await pool.query(
        `UPDATE employee_benefits
            SET status = ?,
                end_date = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)`,
        [status, end_date || null, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: "Enrollment not found",
        });
      }

      res.json({
        success: true,
        message: "Enrollment updated",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to update enrollment",
        message: error.message,
      });
    }
  },

  getBenefitSummary: async (req, res) => {
    try {
      const { id } = req.params;

      const [benefitRows] = await pool.query(
        `SELECT 
           BIN_TO_UUID(id) as id,
           benefit_name,
           benefit_type,
           description,
           cost_to_company,
           is_active,
           created_at
         FROM benefits
         WHERE id = UUID_TO_BIN(?)`,
        [id]
      );

      if (benefitRows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Benefit not found",
        });
      }

      const [enrollmentStats] = await pool.query(
        `SELECT 
           SUM(status = 'active') as active_enrollments,
           SUM(status = 'cancelled') as cancelled_enrollments,
           SUM(status = 'suspended') as suspended_enrollments,
           COALESCE(SUM(employee_contribution), 0) as total_employee_contribution,
           COALESCE(SUM(company_contribution), 0) as total_company_contribution
         FROM employee_benefits
         WHERE benefit_id = UUID_TO_BIN(?)`,
        [id]
      );

      const [recentEnrollments] = await pool.query(
        `SELECT 
           BIN_TO_UUID(eb.id) as id,
           BIN_TO_UUID(eb.employee_id) as employee_id,
           eb.enrollment_date,
           eb.status,
           ep.first_name,
           ep.last_name
         FROM employee_benefits eb
         LEFT JOIN employee_personal ep ON eb.employee_id = ep.employee_id
         WHERE eb.benefit_id = UUID_TO_BIN(?)
         ORDER BY eb.enrollment_date DESC
         LIMIT 20`,
        [id]
      );

      res.json({
        success: true,
        data: {
          benefit: benefitRows[0],
          stats: {
            active_enrollments: Number(enrollmentStats[0].active_enrollments || 0),
            cancelled_enrollments: Number(enrollmentStats[0].cancelled_enrollments || 0),
            suspended_enrollments: Number(enrollmentStats[0].suspended_enrollments || 0),
            total_employee_contribution: Number(enrollmentStats[0].total_employee_contribution || 0),
            total_company_contribution: Number(enrollmentStats[0].total_company_contribution || 0),
          },
          recentEnrollments,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to build benefit summary",
        message: error.message,
      });
    }
  },

  getEmployeeBenefits: async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { status } = req.query;

      const conditions = ["eb.employee_id = UUID_TO_BIN(?)"];
      const params = [employeeId];

      if (status) {
        conditions.push("eb.status = ?");
        params.push(status);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      const [records] = await pool.query(
        `SELECT 
           BIN_TO_UUID(eb.id) as enrollment_id,
           BIN_TO_UUID(eb.benefit_id) as benefit_id,
           b.benefit_name,
           eb.enrollment_date,
           eb.status,
           eb.coverage_amount,
           eb.employee_contribution,
           eb.company_contribution,
           eb.end_date
         FROM employee_benefits eb
         JOIN benefits b ON eb.benefit_id = b.id
         ${whereClause}
         ORDER BY eb.enrollment_date DESC`,
        params
      );

      res.json({
        success: true,
        data: records,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch employee benefits",
        message: error.message,
      });
    }
  },
};
