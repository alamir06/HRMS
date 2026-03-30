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
      employeeId,
      benefitId,
      enrollmentDate,
      coverageAmount,
      employeeContribution,
      companyContribution,
      status = "ACTIVE",
      endDate,
    } = req.body;

    try {
      const [existing] = await pool.query(
        `SELECT id
           FROM employeeBenefits
          WHERE employeeId = UUID_TO_BIN(?)
            AND benefitId = UUID_TO_BIN(?)
            AND status = 'ACTIVE'`,
        [employeeId, benefitId]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: "Employee already enrolled in this benefit",
        });
      }

      const [result] = await pool.query(
        `INSERT INTO employeeBenefits (
           employeeId,
           benefitId,
           enrollmentDate,
           coverageAmount,
           employeeContribution,
           companyContribution,
           status,
           endDate
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
          employeeId,
          benefitId,
          enrollmentDate,
          parseMoney(coverageAmount),
          parseMoney(employeeContribution),
          parseMoney(companyContribution),
          status,
          endDate || null,
        ]
      );

      res.status(201).json({
        success: true,
        message: "Employee enrolled",
        data: {
          id: result.insertId,
          employeeId,
          benefitId,
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
    const { status, endDate } = req.body;

    try {
      const [result] = await pool.query(
        `UPDATE employeeBenefits
            SET status = ?,
                endDate = ?,
                updatedAt = CURRENT_TIMESTAMP
          WHERE id = UUID_TO_BIN(?)`,
        [status, endDate || null, id]
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
           benefitName,
           benefitType,
           description,
           costToCompany,
           isActive,
           createdAt
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
           SUM(status = 'ACTIVE') as activeEnrollments,
           SUM(status = 'CANCELLED') as cancelledEnrollments,
           SUM(status = 'SUSPENDED') as suspendedEnrollments,
           COALESCE(SUM(employeeContribution), 0) as totalEmployeeContribution,
           COALESCE(SUM(companyContribution), 0) as totalCompanyContribution
         FROM employeeBenefits
         WHERE benefitId = UUID_TO_BIN(?)`,
        [id]
      );

      const [recentEnrollments] = await pool.query(
        `SELECT 
           BIN_TO_UUID(eb.id) as id,
           BIN_TO_UUID(eb.employeeId) as employeeId,
           eb.enrollmentDate,
           eb.status,
           ep.firstName,
           ep.lastName
         FROM employeeBenefits eb
         LEFT JOIN employeePersonal ep ON eb.employeeId = ep.employeeId
         WHERE eb.benefitId = UUID_TO_BIN(?)
         ORDER BY eb.enrollmentDate DESC
         LIMIT 20`,
        [id]
      );

      res.json({
        success: true,
        data: {
          benefit: benefitRows[0],
          stats: {
            activeEnrollments: Number(enrollmentStats[0].activeEnrollments || 0),
            cancelledEnrollments: Number(enrollmentStats[0].cancelledEnrollments || 0),
            suspendedEnrollments: Number(enrollmentStats[0].suspendedEnrollments || 0),
            totalEmployeeContribution: Number(enrollmentStats[0].totalEmployeeContribution || 0),
            totalCompanyContribution: Number(enrollmentStats[0].totalCompanyContribution || 0),
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

      const conditions = ["eb.employeeId = UUID_TO_BIN(?)"];
      const params = [employeeId];

      if (status) {
        conditions.push("eb.status = ?");
        params.push(status);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      const [records] = await pool.query(
        `SELECT 
           BIN_TO_UUID(eb.id) as enrollmentId,
           BIN_TO_UUID(eb.benefitId) as benefitId,
           b.benefitName,
           eb.enrollmentDate,
           eb.status,
           eb.coverageAmount,
           eb.employeeContribution,
           eb.companyContribution,
           eb.endDate
         FROM employeeBenefits eb
         JOIN benefits b ON eb.benefitId = b.id
         ${whereClause}
         ORDER BY eb.enrollmentDate DESC`,
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
