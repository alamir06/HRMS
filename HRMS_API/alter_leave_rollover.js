import pool from './config/database.js';

async function run() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS leaveRolloverRequest (
        id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
        employeeId BINARY(16) NOT NULL,
        sourceYear INT NOT NULL,
        leaveType ENUM('ANNUAL') NOT NULL,
        unusedDays INT NOT NULL,
        decision ENUM('PENDING', 'CARRY_FORWARD', 'ENCASH') DEFAULT 'PENDING',
        status ENUM('PENDING', 'PROCESSED') DEFAULT 'PENDING',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (employeeId)
      );
    `;
    await pool.query(createTableQuery);
    console.log("Created leaveRolloverRequest table");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
