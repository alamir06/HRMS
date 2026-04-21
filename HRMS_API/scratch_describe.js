import pool from './config/database.js';

async function run() {
  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM recruitment LIKE 'id'");
    console.log(JSON.stringify(rows, null, 2));
    
    // Also check how departmentId is stored
    const [rows2] = await pool.query("SHOW COLUMNS FROM recruitment LIKE 'departmentId'");
    console.log(JSON.stringify(rows2, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
