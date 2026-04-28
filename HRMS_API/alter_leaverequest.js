import pool from './config/database.js';

async function run() {
  try {
    await pool.query('ALTER TABLE leaveRequest ADD COLUMN documentNumber VARCHAR(255) NULL;');
    console.log("Added documentNumber column");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists");
    } else {
      console.error(err);
    }
  } finally {
    process.exit(0);
  }
}

run();
