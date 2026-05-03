import db from './config/database.js';

async function updateEnum() {
  try {
    const alterQuery = `ALTER TABLE recommendations MODIFY COLUMN recommendationType ENUM('EDUCATION', 'PROFESSIONAL_LICENSE', 'MAYOR_OFFICE', 'MINISTRY_OF_EDUCATION', 'WORK_EXPERIENCE', 'GUARANTEE_LETTER', 'HOUSING_COOPERATIVE') NOT NULL;`;
    await db.query(alterQuery);
    console.log("Database ENUM updated successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error updating ENUM:", err);
    process.exit(1);
  }
}

updateEnum();
