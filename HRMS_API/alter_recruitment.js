import pool from './config/database.js';

async function run() {
  try {
    await pool.query('ALTER TABLE recruitment MODIFY COLUMN departmentId BINARY(16) NULL;');
    console.log("Made departmentId column nullable in recruitment table");
  } catch (err) {
    console.error("Error modifying departmentId column:", err);
  }

  try {
    await pool.query('ALTER TABLE recruitment MODIFY COLUMN designationId BINARY(16) NULL;');
    console.log("Made designationId column nullable in recruitment table");
  } catch (err) {
    console.error("Error modifying designationId column:", err);
  }

  process.exit(0);
}

run();
