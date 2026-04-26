import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('d:/Major Course/Fifth Year/GC Document/HR/Implementation/HRMS/hrms_api/.env') });

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hrms'
  });

  try {
    console.log("Creating employee_surety table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employee_surety (
        id BINARY(16) PRIMARY KEY,
        employeeId BINARY(16) NOT NULL,
        suretyName VARCHAR(255) NOT NULL,
        suretyPhone VARCHAR(50) NOT NULL,
        suretyEmail VARCHAR(100),
        documentName VARCHAR(255),
        documentPath VARCHAR(1000),
        mimeType VARCHAR(100),
        fileSize INT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_employee_surety FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Table employee_surety created successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await connection.end();
  }
}

runMigration();
