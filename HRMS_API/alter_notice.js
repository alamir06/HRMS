import pool from './config/database.js';

async function run() {
  try {
    await pool.query("ALTER TABLE notices MODIFY COLUMN targetAudience ENUM('ALL','DEPARTMENT','INDIVIDUAL','COLLEGE','COLLEGE_HEADS','HR_MANAGER') DEFAULT 'ALL';");
    console.log("Updated targetAudience ENUM in notices table");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists");
    } else {
      console.error("Error adding column:", err);
    }
  } finally {
    process.exit(0);
  }
}

run();
