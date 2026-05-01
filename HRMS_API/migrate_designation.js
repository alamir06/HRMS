import mysql from 'mysql2/promise';

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Alamir@mysql1',
    database: 'HRMS'
  });

  try {
    console.log("Adding academicDepartmentId to designations...");
    await connection.query('ALTER TABLE designations ADD COLUMN academicDepartmentId BINARY(16) NULL AFTER departmentId;');
    console.log("Migration successful.");
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists.");
    } else {
      console.error("Migration failed:", error);
    }
  } finally {
    await connection.end();
  }
}

runMigration();
