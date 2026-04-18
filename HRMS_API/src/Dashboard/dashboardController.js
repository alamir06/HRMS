import pool from "../../config/database.js";

class DashboardController {
  async getOverview(req, res) {
    try {
      const connection = await pool.getConnection();

      try {
        const period = (req.query.period || 'YEARLY').toUpperCase();
        
        let leaveCondition = `YEAR(createdAt) = YEAR(CURDATE())`;
        let attCondition = `DATE(date) = CURDATE()`; // By default attendance is daily
        
        if (period === 'DAILY') {
          leaveCondition = `DATE(createdAt) = CURDATE()`;
          attCondition = `DATE(date) = CURDATE()`;
        } else if (period === 'WEEKLY') {
          leaveCondition = `YEARWEEK(createdAt, 1) = YEARWEEK(CURDATE(), 1)`;
          attCondition = `YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)`;
        } else if (period === 'MONTHLY') {
          leaveCondition = `MONTH(createdAt) = MONTH(CURDATE()) AND YEAR(createdAt) = YEAR(CURDATE())`;
          attCondition = `MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())`;
        } else if (period === 'YEARLY') {
          leaveCondition = `YEAR(createdAt) = YEAR(CURDATE())`;
          attCondition = `YEAR(date) = YEAR(CURDATE())`;
        }

        // 1. Total Employees, Academic, Administrative, Outsourced
        const [empStats] = await connection.query(`
          SELECT 
            COUNT(*) as totalEmployees,
            SUM(CASE WHEN employeeType = 'ACADEMIC' THEN 1 ELSE 0 END) as totalAcademic,
            SUM(CASE WHEN employeeType = 'ADMINISTRATIVE' THEN 1 ELSE 0 END) as totalAdministrative,
            SUM(CASE WHEN employmentType = 'OUTSOURCED' THEN 1 ELSE 0 END) as totalOutsourced
          FROM employee 
          WHERE employmentStatus = 'ACTIVE'
        `);

        // 2. Total Colleges
        const [collegeStats] = await connection.query(`SELECT COUNT(*) as totalColleges FROM college`);

        // 3. Total Departments
        const [deptStats] = await connection.query(`SELECT COUNT(*) as totalDepartments FROM department`);

        // 4. Leave Requests by Status (Current Year)
        const [leaveStats] = await connection.query(`
          SELECT 
            MONTH(createdAt) as monthIndex, 
            status, 
            COUNT(*) as count 
          FROM leaveRequest
          WHERE ${leaveCondition}
          GROUP BY MONTH(createdAt), status
        `);

        // 5. Today's Attendance Status
        const [attendanceStats] = await connection.query(`
          SELECT status, COUNT(*) as count 
          FROM attendance 
          WHERE ${attCondition}
          GROUP BY status
        `);

        // 6. Workforce Velocity (Aggregating hire dates or created dates by year)
        const [velocityStats] = await connection.query(`
          SELECT 
            YEAR(COALESCE(hireDate, createdAt)) as year, 
            COUNT(*) as count 
          FROM employee 
          WHERE (hireDate IS NOT NULL OR createdAt IS NOT NULL) 
            AND employmentStatus = 'ACTIVE'
          GROUP BY YEAR(COALESCE(hireDate, createdAt)) 
          ORDER BY year ASC
        `);

        // 7. Recent Academic Appointments (Designations + employee details)
        const [recentAppointments] = await connection.query(`
          SELECT 
            BIN_TO_UUID(d.id) as id,
            d.title,
            d.createdAt,
            ep.firstName,
            ep.lastName,
            ep.profilePicture,
            col.collegeName,
            dept.departmentName
          FROM designations d
          JOIN employee e ON d.employeeId = e.id
          LEFT JOIN employeePersonal ep ON e.id = ep.employeeId
          LEFT JOIN college col ON d.collegeId = col.id
          LEFT JOIN department dept ON d.departmentId = dept.id
          WHERE d.title IN ('HEAD', 'DEAN') OR d.title LIKE '%head%' OR d.title LIKE '%dean%'
          ORDER BY d.createdAt DESC 
          LIMIT 5
        `);

        // 8. Recent Transfers (Approximated by recently updated employees)
        const [recentTransfers] = await connection.query(`
          SELECT 
            BIN_TO_UUID(e.id) as id,
            'TRANSFER' as title,
            e.updatedAt as createdAt,
            ep.firstName,
            ep.lastName,
            ep.profilePicture,
            dept.departmentName
          FROM employee e
          LEFT JOIN employeePersonal ep ON e.id = ep.employeeId
          LEFT JOIN department dept ON e.departmentId = dept.id
          ORDER BY e.updatedAt DESC 
          LIMIT 5
        `);

        res.json({
          success: true,
          data: {
            metrics: {
              totalEmployees: empStats[0].totalEmployees || 0,
              totalAcademic: Number(empStats[0].totalAcademic) || 0,
              totalAdministrative: Number(empStats[0].totalAdministrative) || 0,
              totalOutsourced: Number(empStats[0].totalOutsourced) || 0,
              totalColleges: collegeStats[0].totalColleges || 0,
              totalDepartments: deptStats[0].totalDepartments || 0,
            },
            leaves: leaveStats,
            attendance: attendanceStats,
            velocity: velocityStats,
            recentAppointments: recentAppointments,
            recentTransfers: recentTransfers
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Dashboard Overview Error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch dashboard metrics" });
    }
  }
}

export const dashboardController = new DashboardController();
