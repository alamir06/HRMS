import pool from './config/database.js';

async function seedShifts() {
  const shifts = [
    {
      shiftName: 'Morning',
      shiftNameAmharic: 'የጠዋት ፈረቃ',
      startTime: '08:00:00',
      endTime: '12:00:00',
      breakDurationMinutes: 0,
      description: 'Standard morning shift',
      descriptionAmharic: 'መደበኛ የጠዋት ፈረቃ'
    },
    {
      shiftName: 'Afternoon',
      shiftNameAmharic: 'የከሰዓት ፈረቃ',
      startTime: '13:00:00',
      endTime: '17:00:00',
      breakDurationMinutes: 0,
      description: 'Standard afternoon shift',
      descriptionAmharic: 'መደበኛ የከሰዓት ፈረቃ'
    },
    {
      shiftName: 'Full Day',
      shiftNameAmharic: 'ሙሉ ቀን',
      startTime: '08:00:00',
      endTime: '17:00:00',
      breakDurationMinutes: 60,
      description: 'Standard full day shift',
      descriptionAmharic: 'መደበኛ የሙሉ ቀን ፈረቃ'
    }
  ];

  try {
    for (const shift of shifts) {
      await pool.query(
        `INSERT INTO shiftSchedule 
         (shiftName, shiftNameAmharic, startTime, endTime, breakDurationMinutes, description, descriptionAmharic)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          shift.shiftName,
          shift.shiftNameAmharic,
          shift.startTime,
          shift.endTime,
          shift.breakDurationMinutes,
          shift.description,
          shift.descriptionAmharic
        ]
      );
      console.log(`Inserted shift: ${shift.shiftName}`);
    }
    console.log('Shifts seeded successfully!');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log('Shifts may already exist or naming conflict. Check database.');
    } else {
      console.error('Error seeding shifts:', err);
    }
    process.exit(1);
  }
}

seedShifts();
