import pool from '../config/database.js';

const createTable = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Create the recommendations table
    const createQuery = `
      CREATE TABLE IF NOT EXISTS recommendations (
        id BINARY(16) PRIMARY KEY,
        employeeId BINARY(16) NOT NULL,
        recommendationType ENUM('EDUCATION', 'PROFESSIONAL_LICENSE', 'MAYOR_OFFICE', 'MINISTRY_OF_EDUCATION', 'WORK_EXPERIENCE') NOT NULL,
        reason TEXT,
        degreeProgram VARCHAR(255) NULL,
        institutionName VARCHAR(255) NULL,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
        requestDate DATE NOT NULL,
        approvedDate DATE NULL,
        approvedBy BINARY(16) NULL,
        rejectionReason TEXT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE,
        FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    console.log("Executing query...");
    await connection.execute(createQuery);
    console.log("Recommendations table created successfully.");
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error("Error creating recommendations table:", error);
    process.exit(1);
  }
};

createTable();
