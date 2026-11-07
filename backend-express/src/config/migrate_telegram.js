const db = require('./db');

async function runTelegramMigration() {
  console.log('Checking/running Telegram database migration...');
  try {
    // Check if column already exists
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'telegram_chat_id'
    `);

    if (columns.length > 0) {
      console.log("Column 'telegram_chat_id' already exists in 'users' table.");
      return;
    }

    // Add the column
    await db.execute('ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR(100) UNIQUE NULL');
    console.log("Successfully added column 'telegram_chat_id' to 'users' table!");
  } catch (error) {
    console.error('Telegram database migration failed:', error);
  }
}

module.exports = runTelegramMigration;
